import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { Linkedin, Twitter, Github, Sparkles, IdCard, Search, X } from "lucide-react";
import { useHomeSections } from "@/hooks/use-home-sections";
import type { TeamMember } from "@/lib/home-sections-defaults";
import { useTeamCardIds, lookupTeamCardId } from "@/hooks/use-team-card-ids";

const Social = ({ href, label, children }: { href?: string; label: string; children: React.ReactNode }) => {
  const base =
    "w-8 h-8 rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-white flex items-center justify-center transition-colors";
  if (!href) return <span aria-label={`${label} (not set)`} className={`${base} opacity-40 pointer-events-none`}>{children}</span>;
  return (
    <a aria-label={label} href={href} target="_blank" rel="noreferrer" className={base}>
      {children}
    </a>
  );
};

const TeamCard = ({ member, cardId }: { member: TeamMember; cardId: string | null }) => (
  <div className="w-[260px] flex-shrink-0 rounded-2xl border border-border/60 bg-card backdrop-blur-sm group hover:border-primary/50 transition-all duration-500 relative overflow-hidden hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.4)]">
    {/* Decorative top band — purely background, no overlapping content */}
    <div className={`relative h-16 bg-gradient-to-br ${member.color} overflow-hidden`}>
      <div
        aria-hidden
        className="absolute inset-0 opacity-25 text-foreground"
        style={{
          backgroundImage: "radial-gradient(circle at 30% 50%, currentColor 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-b from-transparent to-card" />
    </div>

    {/* Avatar — uses photoUrl when set, otherwise initials */}
    <div className="-mt-10 flex justify-center">
      <div className="relative">
        <span aria-hidden className="absolute inset-0 rounded-full bg-primary/20 blur-md group-hover:bg-primary/30 transition-colors" />
        <div className="relative w-20 h-20 rounded-full bg-card border-4 border-card shadow-md ring-2 ring-primary/40 group-hover:ring-primary/70 transition-all flex items-center justify-center overflow-hidden">
          {member.photoUrl ? (
            <img src={member.photoUrl} alt={member.name} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-heading font-bold text-primary">{member.initials}</span>
          )}
        </div>
      </div>
    </div>

    <div className="pt-3 pb-5 px-5 text-center">
      <h4 className="font-heading font-semibold text-base text-foreground group-hover:text-primary transition-colors mb-1">{member.name}</h4>
      <p className="text-[11px] text-primary font-semibold uppercase tracking-wider mb-1.5">{member.role}</p>
      <p className="text-xs text-muted-foreground mb-2 line-clamp-2 min-h-[2.25rem]">{member.specialty}</p>
      {cardId && (
        <p className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-primary/80 bg-primary/10 rounded-full px-2 py-0.5 mb-2">
          <IdCard className="w-3 h-3" /> {cardId}
        </p>
      )}
      {member.country && (
        <p className="text-[10px] text-muted-foreground/80 mb-1.5">{member.country}</p>
      )}
      {(member.phone || member.email) && (
        <p className="flex items-center justify-center flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground/80 mb-3">
          {member.phone && <span className="font-mono">{member.phone}</span>}
          {member.email && <span className="truncate max-w-[200px]">{member.email}</span>}
        </p>
      )}
      <div className="flex items-center justify-center gap-2">
        <Social href={member.linkedinUrl} label="LinkedIn"><Linkedin className="w-3.5 h-3.5" /></Social>
        <Social href={member.twitterUrl} label="Twitter"><Twitter className="w-3.5 h-3.5" /></Social>
        <Social href={member.githubUrl} label="GitHub"><Github className="w-3.5 h-3.5" /></Social>
      </div>
    </div>
  </div>
);

const TeamCarousel = () => {
  const { data: sections } = useHomeSections();
  const { data: cardMap } = useTeamCardIds();
  const [query, setQuery] = useState("");
  const t = sections!.team;

  // Public team only shows active, non-paused members. Resigned / fired /
  // suspended / on-leave / paused members are hidden from the About page
  // carousel — they're no longer part of the public team.
  // We keep their ORIGINAL index so subject_key lookups still resolve to the
  // correct ID-card row stored under `team_section:cms-<idx>-<name>`.
  const publicItems = useMemo(
    () => t.items
      .map((m, idx) => ({ m, idx }))
      .filter(({ m }) => !m.paused && (!m.status || m.status === "active")),
    [t.items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return publicItems.filter(({ m, idx }) => {
      const cid = lookupTeamCardId(cardMap, m, idx) || "";
      return [m.name, m.role, m.email, m.phone, m.specialty, m.country, cid]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [publicItems, query, cardMap]);

  const half = Math.ceil(publicItems.length / 2);
  const row1 = publicItems.slice(0, half);
  const row2 = publicItems.slice(half).length ? publicItems.slice(half) : publicItems.slice(0, half);
  const renderCard = (m: TeamMember, idx: number, key: string) => (
    <TeamCard key={key} member={m} cardId={lookupTeamCardId(cardMap, m, idx)} />
  );

  return (
    <section className="section-padding bg-card/30 relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 opacity-50" style={{
        background: "radial-gradient(50% 40% at 50% 50%, hsl(var(--primary) / 0.08), transparent 70%)",
      }} />
      <div className="relative">
        <ScrollReveal>
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 backdrop-blur px-3 py-1 text-xs font-medium text-muted-foreground mb-4">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {t.eyebrow}
            </span>
            <h2 className="font-heading text-3xl md:text-5xl font-bold mb-3">
              {t.heading_prefix} <span className="gradient-text">{t.heading_highlight}</span>
            </h2>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">{t.description}</p>
          </div>
        </ScrollReveal>

        <div className="flex justify-center mb-8">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find by ID, name, email…"
              aria-label="Search team members"
              className="w-full h-9 rounded-full border border-border bg-background/70 backdrop-blur pl-9 pr-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {filtered ? (
          filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No team member matches “{query}”.
            </p>
          ) : (
            <div className="flex flex-wrap justify-center gap-5 px-4">
              {filtered.map(({ m, idx }, i) => renderCard(m, idx, `f-${i}`))}
            </div>
          )
        ) : (
          <>
            <div className="relative mb-6">
              <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-card/80 to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-card/80 to-transparent z-10 pointer-events-none" />
              <motion.div
                className="flex items-stretch gap-5"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                style={{ width: "max-content" }}
              >
                {[...row1, ...row1].map(({ m, idx }, i) => renderCard(m, idx, `r1-${i}`))}
              </motion.div>
            </div>

            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-card/80 to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-card/80 to-transparent z-10 pointer-events-none" />
              <motion.div
                className="flex items-stretch gap-5"
                animate={{ x: ["-50%", "0%"] }}
                transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                style={{ width: "max-content" }}
              >
                {[...row2, ...row2].map(({ m, idx }, i) => renderCard(m, idx, `r2-${i}`))}
              </motion.div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default TeamCarousel;
