import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TeamMember } from "@/lib/home-sections-defaults";

const normalise = (value?: string | null) => (value || "").trim().toLowerCase();
const keyPart = (value?: string | null) => normalise(value).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const compositeKey = (name?: string | null, role?: string | null, specialty?: string | null) =>
  [keyPart(name), keyPart(role), keyPart(specialty)].filter(Boolean).join("|");

const teamMemberKey = (member: TeamMember) => {
  const saved = member.employeeKey?.trim();
  if (saved) return saved;
  return `cms-${[keyPart(member.name), keyPart(member.role), keyPart(member.specialty)].filter(Boolean).join("-") || "member"}`.slice(0, 96);
};

const legacyNameFromSubjectKey = (subjectKey?: string | null) => {
  const m = String(subjectKey || "").match(/^team_section:cms-\d+-(.+)$/);
  return m ? m[1].trim() : "";
};

/**
 * Fetch all issued EMP id_card_assignments and build lookup maps.
 *
 * - `bySubjectKey` is the PRIMARY lookup — each row has a unique subject_key
 *   (e.g. `team_section:cms-3-Marcus Chen`) so duplicate names never collide.
 * - `byEmail` / `byName` remain as fallbacks for legacy callers that don't
 *   know the subject_key yet.
 */
export const useTeamCardIds = () =>
  useQuery({
    queryKey: ["team-card-ids"],
    queryFn: async () => {
      // SECURITY: use sanitized RPC that returns only (card_id, subject_key)
      // — no employee names, emails or QR payloads are exposed to anonymous
      // visitors via this hook. Email/name/composite fallback maps are left
      // empty; callers should look up by subject_key (which the team list
      // already computes deterministically from index + name).
      const { data, error } = await supabase.rpc("list_team_card_ids");
      if (error) throw error;
      const bySubjectKey = new Map<string, string>();
      const byEmail = new Map<string, string>();
      const byComposite = new Map<string, string>();
      const byName = new Map<string, string>();
      for (const row of (data as Array<{ card_id: string; subject_key: string | null }>) || []) {
        if (row.subject_key) bySubjectKey.set(row.subject_key, row.card_id);
      }
      return { bySubjectKey, byEmail, byComposite, byName };
    },
    staleTime: 60_000,
  });

export type TeamCardMap = {
  bySubjectKey: Map<string, string>;
  byEmail: Map<string, string>;
  byComposite: Map<string, string>;
  byName: Map<string, string>;
};

/**
 * Look up a card_id. ALWAYS prefer subjectKey when available — it's the only
 * way to disambiguate two team members with the same name.
 */
export const lookupCardId = (
  map: TeamCardMap | undefined,
  emailOrSubjectKey?: string | null,
  name?: string | null,
  subjectKey?: string | null,
): string | null => {
  if (!map) return null;
  const sk = (subjectKey || "").trim();
  if (sk && map.bySubjectKey.has(sk)) return map.bySubjectKey.get(sk)!;
  const e = (emailOrSubjectKey || "").trim().toLowerCase();
  if (e && map.byEmail.has(e)) return map.byEmail.get(e)!;
  const n = (name || "").trim().toLowerCase();
  if (n && map.byName.has(n)) return map.byName.get(n)!;
  return null;
};

export const teamSectionLegacySubjectKey = (index: number, name: string) =>
  `team_section:cms-${index}-${name}`;

/** Build the canonical subject_key used for a team_section member. */
export const teamSectionSubjectKey = (index: number, memberOrName: TeamMember | string) => {
  if (typeof memberOrName !== "string") {
    return `team_section:${teamMemberKey(memberOrName)}`;
  }
  return teamSectionLegacySubjectKey(index, memberOrName);
};

export const teamSectionSubjectKeys = (index: number, member: TeamMember) =>
  Array.from(new Set([
    teamSectionSubjectKey(index, member),
    teamSectionLegacySubjectKey(index, member.name),
  ].filter(Boolean)));

export const lookupTeamCardId = (
  map: TeamCardMap | undefined,
  member: TeamMember,
  index: number,
): string | null => {
  if (!map) return null;
  for (const key of teamSectionSubjectKeys(index, member)) {
    if (map.bySubjectKey.has(key)) return map.bySubjectKey.get(key)!;
  }
  const email = normalise(member.email);
  if (email && map.byEmail.has(email)) return map.byEmail.get(email)!;
  const byPerson = compositeKey(member.name, member.role, member.specialty);
  if (byPerson && map.byComposite.has(byPerson)) return map.byComposite.get(byPerson)!;
  const name = normalise(member.name);
  if (name && map.byName.has(name)) return map.byName.get(name)!;
  return null;
};
