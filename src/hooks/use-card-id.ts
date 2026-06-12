import { useEffect, useState } from "react";
import { db } from "@/integrations/db/client";

const shortCode = (companyName: string) => {
  const cleaned = (companyName || "").replace(/[^A-Za-z0-9 ]/g, " ").trim();
  if (!cleaned) return "ID";
  const words = cleaned.split(/\s+/);
  if (words.length >= 2) return words.map((w) => w[0]).join("").slice(0, 4).toUpperCase();
  return words[0].slice(0, 3).toUpperCase();
};

export const clampDigits = (digits?: number) =>
  Math.max(4, Math.min(8, Math.floor(Number(digits) || 6)));

/**
 * Sequential allocator — pulls the current MAX numeric suffix for rows that
 * share the same `<COMPANY><KIND_INITIAL>` prefix and returns prefix+max+offset.
 * Replaces the old FNV-hash approach so newly issued IDs read as a clean
 * running serial (DTLE000001, DTLE000002, DTLE000003…) and never collide
 * just because two subjects share the same name.
 */
const allocateSequential = async (
  kind: "EMP" | "INV",
  companyName: string,
  digits: number,
  offset: number,
): Promise<{ candidate: string; prefix: string }> => {
  const code = shortCode(companyName);
  const initial = (kind || "X")[0].toUpperCase();
  // No separator — the canonical format is `<COMPANY><KIND_INITIAL><serial>`
  // (e.g. DTLE983783). Keeps QR strings short and visually clean.
  const prefix = `${code}${initial}`;
  const d = clampDigits(digits);

  const { data } = await db
    .from("id_card_assignments")
    .select("card_id")
    .eq("kind", kind)
    .like("card_id", `${prefix}%`);

  let max = 0;
  const re = new RegExp(`^${prefix}(\\d+)$`);
  for (const row of data || []) {
    const m = String((row as any).card_id).match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  // Start at 1 so rebuilding by team-list order reads cleanly:
  // DTLE000001, DTLE000002, DTLE000003…
  const minStart = 1;
  const next = Math.max(max + 1 + offset, minStart + offset);
  const candidate = `${prefix}${String(next).padStart(d, "0")}`;
  return { candidate, prefix };
};

export type LockedCard = {
  id: string;
  /** Snapshot of QR payload taken at first issuance — never changes. */
  qrPayload: Record<string, any> | null;
};

/**
 * Returns a stable, locked card ID + QR snapshot for the given subject.
 * Once issued, both the card_id and the QR payload are persisted and
 * NEVER change, even if the subject's profile is later updated. This
 * preserves QR verification integrity for printed cards.
 *
 * IDs are allocated as a running serial per (kind, company short code),
 * collision-safe via the unique `card_id` constraint. The optional
 * `currentSnapshot` is only used when the row does not yet exist —
 * it is stored as the immutable payload.
 */
export const useCardId = (
  kind: "EMP" | "INV",
  subjectKey: string,
  companyName: string,
  digits = 6,
  currentSnapshot?: Record<string, any> | null,
): LockedCard => {
  const d = clampDigits(digits);
  const [state, setState] = useState<LockedCard>(() => ({ id: "", qrPayload: null }));

  useEffect(() => {
    let cancelled = false;
    setState({ id: "", qrPayload: null });

    const run = async () => {
      const { data: existing } = await db
        .from("id_card_assignments")
        .select("card_id, qr_payload")
        .eq("kind", kind)
        .eq("subject_key", subjectKey)
        .maybeSingle();

      if (cancelled) return;
      if (existing?.card_id) {
        setState({
          id: existing.card_id,
          qrPayload: (existing as any).qr_payload ?? null,
        });
        return;
      }

      // First-time issuance — try sequential, retry on the rare race condition
      // where two writers picked the same next number (unique constraint trips).
      for (let offset = 0; offset < 50; offset++) {
        const { candidate } = await allocateSequential(kind, companyName, d, offset);
        const payload = currentSnapshot
          ? { ...currentSnapshot, id: candidate }
          : null;
        const { error } = await db
          .from("id_card_assignments")
          .insert({
            kind,
            subject_key: subjectKey,
            card_id: candidate,
            company_short: shortCode(companyName),
            subject_name: currentSnapshot?.n || null,
            subject_email: currentSnapshot?.e || null,
            qr_payload: payload as any,
            locked_at: payload ? new Date().toISOString() : null,
          });
        if (!error) {
          if (!cancelled) setState({ id: candidate, qrPayload: payload });
          return;
        }
        if (error.code !== "23505") {
          // Not a uniqueness collision — surface the candidate locally so the
          // UI still has something to show, but don't keep retrying.
          if (!cancelled) setState({ id: candidate, qrPayload: payload });
          return;
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [kind, subjectKey, companyName, d]);

  return state;
};

// Kept for backwards compatibility with any caller that still imports it.
export const buildCardId = (
  kind: "EMP" | "INV",
  _subjectKey: string,
  companyName: string,
  offset = 0,
  digits = 6,
) => {
  const code = shortCode(companyName);
  const initial = (kind || "X")[0].toUpperCase();
  const d = clampDigits(digits);
  const minStart = 1;
  return `${code}${initial}${String(minStart + offset).padStart(d, "0")}`;
};
