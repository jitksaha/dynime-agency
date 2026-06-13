import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  ShieldCheck, ShieldAlert, Mail, Globe, Calendar, IdCard,
  Sparkles, ArrowLeft, Briefcase, Loader2, Phone, UserCheck, CalendarClock,
} from "lucide-react";
import SiteLogo from "@/components/shared/SiteLogo";
import VerifiedBadge from "@/components/shared/VerifiedBadge";
import { useIdCardBrand } from "@/hooks/use-id-card-brand";
import { useHomeSections } from "@/hooks/use-home-sections";
import { teamSectionSubjectKeys } from "@/hooks/use-team-card-ids";
import { db } from "@/integrations/db/client";

const FALLBACK_SITE_NAME = "Dynime Inc.";

type Payload = {
  v: number;
  id: string;
  k: "EMP" | "INV";
  n: string;
  r?: string;
  e?: string;
  c?: string;
  m?: string;
  i: string;
  x?: string;
  o?: string;
  p?: string;
  s?: string;
  live_employee?: any;
};

const decodePayload = (raw: string | null): Payload | null => {
  if (!raw) return null;
  try {
    const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = decodeURIComponent(escape(atob(padded)));
    const data = JSON.parse(json) as Payload;
    if (!data || !data.id || !data.n || !data.k) return null;
    return data;
  } catch {
    return null;
  }
};

const fmtDate = (s: string) => {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

const initials = (n: string) =>
  n.trim().split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

const Verify = () => {
  const [params] = useSearchParams();
  const { data: brand } = useIdCardBrand();
  const { data: home } = useHomeSections();

  // Two supported QR formats:
  // 1) NEW & PREFERRED — short fixed URL: `?id=EMP-XXXXXX` → DB lookup of
  //    the locked snapshot stored in `id_card_assignments.qr_payload`.
  // 2) Legacy — `?d=<base64-payload>` (self-contained, still decoded inline).
  const shortId = params.get("id");
  const legacyPayload = useMemo(() => decodePayload(params.get("d")), [params]);

  const [dbData, setDbData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState<boolean>(!!shortId);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!shortId) { setLoading(false); return; }
    setLoading(true);
    setNotFound(false);
    (async () => {
      const { data: rows, error } = await db
        .rpc("verify_id_card", { _card_id: shortId });
      if (cancelled) return;
      const data: any = Array.isArray(rows) ? rows[0] : rows;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const payload = ((data as any).qr_payload as any) || {};
      // Legacy rows have a null qr_payload. Recover the team-member name from
      // `subject_key` (stored as `team_section:cms-<n>-<Name>`) so status
      // lookup against the live team list still works.
      let fallbackName: string | undefined;
      const sk = (data as any).subject_key as string | undefined;
      if (sk) {
        const m = sk.match(/^team_section:[^-]*-\d+-(.+)$/);
        if (m) fallbackName = m[1].trim();
      }
      setDbData({
        v: 1,
        id: data.card_id,
        k: (data.kind as "EMP" | "INV") ?? payload.k ?? "EMP",
        n: payload.n ?? fallbackName ?? data.card_id,
        r: payload.r,
        e: payload.e,
        c: payload.c,
        m: payload.m,
        i: payload.i ?? "",
        x: payload.x,
        o: payload.o,
        p: payload.p,
        s: sk,
        live_employee: data.live_employee,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [shortId]);

  const data: Payload | null = dbData ?? legacyPayload;

  const SITE_NAME = brand?.companyName || data?.o || FALLBACK_SITE_NAME;
  const supportEmail = brand?.supportEmail || "support@dynime.com";

  // (expired computed after teamMatch below)

  // Live employment status: look up the matching team member in site_settings
  // by email (preferred) or name. If the admin marked them as resigned/fired/
  // suspended/on_leave, the ID is no longer valid even though the QR is unchanged.
  const teamMatch = useMemo(() => {
    if (!data || data.k !== "EMP") return null;
    if (data.live_employee) {
      const emp = data.live_employee;
      const meta = emp.metadata || {};
      return {
        name: emp.full_name,
        role: emp.designation,
        photoUrl: emp.photo_url,
        email: emp.email,
        phone: emp.phone,
        country: emp.work_location,
        joinedAt: emp.joining_date,
        expiresAt: meta.expires_at || meta.contract_expires,
        status: emp.status,
        statusNote: meta.status_note,
        specialty: emp.department,
      };
    }
    if (!home?.team?.items?.length) return null;
    const emailKey = (data.e || "").trim().toLowerCase();
    const roleKey = (data.r || "").trim().toLowerCase();
    const metaKey = (data.m || "").trim().toLowerCase();
    const subjectKey = (data.s || "").trim();
    if (subjectKey) {
      const byKey = home.team.items.find((m, i) => teamSectionSubjectKeys(i, m).includes(subjectKey));
      if (byKey) return byKey;
    }
    const matches = home.team.items.filter((m) => {
      if (emailKey && (m.email || "").trim().toLowerCase() === emailKey) return true;
      if (
        m.name.trim().toLowerCase() === (data.n || "").trim().toLowerCase()
        && (!roleKey || m.role.trim().toLowerCase() === roleKey)
        && (!metaKey || (m.specialty || "").trim().toLowerCase() === metaKey)
      ) return true;
      return false;
    });
    return matches.length === 1 ? matches[0] : null;
  }, [data, home]);

  // SECURITY: An EMP card_id that was issued from `id_card_assignments` (DB
  // lookup via shortId) but whose subject was DELETED from the team list is
  // effectively a former employee. The plastic card still scans, but they are
  // no longer authorised. Treat as revoked so the badge says NOT VALID.
  // We only run this check once the team list has actually loaded — otherwise
  // we'd false-positive every employee on slow networks.
  const removedFromTeam = !!(
    dbData
    && dbData.k === "EMP"
    && home?.team?.items
    && home.team.items.length > 0
    && !teamMatch
  );

  const revokedStatus = removedFromTeam
    ? "removed"
    : (teamMatch?.status && teamMatch.status !== "active" ? teamMatch.status : null);
  const revokedLabels: Record<string, string> = {
    resigned: "Resigned — no longer with the company",
    terminated: "Terminated — no longer with the company",
    suspended: "Suspended — temporarily not authorised",
    on_leave: "On leave — temporarily inactive",
    removed: "No longer with the company — this ID has been revoked",
  };

  const expired = useMemo(() => {
    const raw = data?.x || teamMatch?.expiresAt;
    if (!raw) return false;
    const x = new Date(raw);
    return !Number.isNaN(x.getTime()) && x.getTime() < Date.now();
  }, [data, teamMatch]);

  const status: "loading" | "valid" | "expired" | "invalid" | "revoked" = loading
    ? "loading"
    : !data
      ? "invalid"
      : revokedStatus
        ? "revoked"
        : expired ? "expired" : "valid";
  const kindLabel = data?.k === "INV" ? "Investor" : "Employee";

  useEffect(() => {
    document.title = data
      ? `Verify ${kindLabel} ID · ${data.n} · ${SITE_NAME}`
      : `ID Verification · ${SITE_NAME}`;
  }, [data, kindLabel, SITE_NAME]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">

      <header className="border-b bg-background/70 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2"><SiteLogo /></Link>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to site
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <IdCard className="w-7 h-7 text-primary" /> ID Verification
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Scan results for an official {SITE_NAME} identification card.
        </p>

        {/* Status banner */}
        <div className={`mt-6 rounded-xl border p-4 flex items-start gap-3 ${
          status === "valid"
            ? "border-emerald-500/30 bg-emerald-500/5"
            : status === "expired"
              ? "border-amber-500/30 bg-amber-500/5"
              : status === "loading"
                ? "border-muted bg-muted/20"
                : "border-destructive/30 bg-destructive/5"
        }`}>
          {status === "loading" ? (
            <Loader2 className="w-6 h-6 text-muted-foreground shrink-0 mt-0.5 animate-spin" />
          ) : status === "valid" ? (
            <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className={`w-6 h-6 shrink-0 mt-0.5 ${status === "expired" ? "text-amber-500" : "text-destructive"}`} />
          )}
          <div className="min-w-0">
            <div className="font-semibold">
              {status === "loading" && "Looking up this ID…"}
              {status === "valid" && "Verified — this ID is authentic and active"}
              {status === "expired" && "This ID has expired"}
              {status === "revoked" && `This ID is no longer valid — ${revokedLabels[revokedStatus!] || "not active"}`}
              {status === "invalid" && (notFound ? "ID not found" : "Invalid or unreadable verification code")}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {status === "loading" && `Verifying with ${SITE_NAME}…`}
              {status === "valid" && `Issued by ${data?.o || SITE_NAME}.`}
              {status === "expired" && `Originally issued by ${data?.o || SITE_NAME}. Please request a renewed card.`}
              {status === "revoked" && (teamMatch?.statusNote
                ? `${teamMatch.statusNote} · Please disregard this ID — it is no longer authorised by ${SITE_NAME}.`
                : `This person is no longer authorised to represent ${SITE_NAME}. Please disregard this ID.`)}
              {status === "invalid" && (notFound
                ? `No ID matching "${shortId}" was issued by ${SITE_NAME}.`
                : `The QR code may be damaged or this URL was not generated by ${SITE_NAME}.`)}
            </div>
          </div>
        </div>

        {data && (
          <section className={`mt-6 rounded-2xl border overflow-hidden shadow-sm relative ${
            status === "revoked"
              ? "border-destructive/50 bg-destructive/5 ring-2 ring-destructive/30"
              : "bg-card"
          }`}>
            {status === "revoked" && (
              <>
                <div className="absolute inset-x-0 top-0 z-20 bg-destructive text-destructive-foreground text-center text-xs font-bold tracking-widest py-1.5 uppercase">
                  ⚠ Not Valid · {revokedLabels[revokedStatus!] || "Revoked"}
                </div>
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
                  <span className="text-destructive/15 font-black text-[5rem] sm:text-[7rem] tracking-widest rotate-[-18deg] select-none whitespace-nowrap border-4 border-destructive/20 px-6 rounded-lg">
                    NOT VALID
                  </span>
                </div>
              </>
            )}
            <div className={status === "revoked" ? "pt-8 opacity-80" : ""}>
            <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-5 flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 grid place-items-center text-xl font-bold text-primary ring-2 ring-primary/20 overflow-hidden">
                {teamMatch?.photoUrl ? (
                  <img
                    src={teamMatch.photoUrl}
                    alt={data.n}
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <span>{initials(data.n)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-[0.18em] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-muted-foreground" />
                  <span className="font-extrabold text-foreground">{SITE_NAME}</span>
                </div>
                <div className="text-lg sm:text-xl font-bold truncate flex items-center gap-1.5">
                  <span className="truncate">{data.n}</span>
                  {status === "valid" && brand?.verifiedBadgeEnabled !== false && (
                    <VerifiedBadge
                      size={18}
                      color={brand?.verifiedBadgeColor || "#1d9bf0"}
                      title={`Verified by ${SITE_NAME}`}
                      style={{ flexShrink: 0 }}
                    />
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">{data.r || teamMatch?.role || kindLabel}</div>
              </div>
              <div className="hidden sm:block px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wider bg-primary/10 text-primary ring-1 ring-primary/20">
                {data.k === "EMP" ? (brand?.staffLabel || "STAFF") : (brand?.investorLabel || "INVESTOR")}
              </div>
            </div>

            <dl className="divide-y">
              {(() => {
                const NA = <span className="text-muted-foreground/60 italic">N/A</span>;
                const position = data.r || teamMatch?.role || (data.k === "INV" ? "Investor" : "");
                const specialty = teamMatch?.specialty || "";
                const email = data.e || teamMatch?.email || "";
                const country = data.c || teamMatch?.country || "";
                const phone = teamMatch?.phone || "";
                const joined = teamMatch?.joinedAt || "";
                const reference = data.m || "";
                const issued = data.i || "";
                const expires = data.x || teamMatch?.expiresAt || "";
                return (
                  <>
                    <Row label="ID number" value={<span className="font-mono">{data.id}</span>} icon={<IdCard className="w-4 h-4" />} />
                    <Row label="Position" value={position || NA} icon={<Briefcase className="w-4 h-4" />} />
                    <Row label="Specialty" value={specialty || NA} icon={<Sparkles className="w-4 h-4" />} />
                    <Row label="Email" value={email ? <a href={`mailto:${email}`} className="text-primary hover:underline break-all">{email}</a> : NA} icon={<Mail className="w-4 h-4" />} />
                    <Row label="Phone" value={phone ? <a href={`tel:${phone}`} className="text-primary hover:underline">{phone}</a> : NA} icon={<Phone className="w-4 h-4" />} />
                    <Row label="Country" value={country || NA} icon={<Globe className="w-4 h-4" />} />
                    <Row label="Joined" value={joined ? fmtDate(joined) : NA} icon={<UserCheck className="w-4 h-4" />} />
                    <Row label="Reference" value={reference || NA} icon={<Sparkles className="w-4 h-4" />} />
                    <Row label="Issued" value={issued ? fmtDate(issued) : NA} icon={<Calendar className="w-4 h-4" />} />
                    <Row
                      label="Contract expires"
                      value={expires ? (
                        <span className={expired ? "text-destructive font-medium" : ""}>
                          {fmtDate(expires)} {expired && "· expired"}
                        </span>
                      ) : NA}
                      icon={<CalendarClock className="w-4 h-4" />}
                    />
                    <Row
                      label="Current status"
                      value={
                        <span className={revokedStatus ? "text-destructive font-medium" : "text-emerald-600 dark:text-emerald-400 font-medium"}>
                          {revokedStatus
                            ? (revokedLabels[revokedStatus] || revokedStatus)
                            : (teamMatch ? "Active employee" : (data.k === "INV" ? "Active investor" : "Active"))}
                          {teamMatch?.statusNote ? ` · ${teamMatch.statusNote}` : ""}
                        </span>
                      }
                      icon={<ShieldAlert className="w-4 h-4" />}
                    />
                  </>
                );
              })()}
            </dl>
            </div>
          </section>
        )}

        <p className="mt-6 text-xs text-muted-foreground text-center">
          To report a misused or fraudulent ID, contact{" "}
          <a className="text-primary hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
      </main>
    </div>
  );
};

const Row = ({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) => (
  <div className="flex items-center gap-3 px-5 py-3 text-sm">
    <span className="text-muted-foreground shrink-0">{icon}</span>
    <span className="text-muted-foreground w-32 shrink-0">{label}</span>
    <span className="min-w-0 flex-1 text-foreground break-words">{value}</span>
  </div>
);

export default Verify;
