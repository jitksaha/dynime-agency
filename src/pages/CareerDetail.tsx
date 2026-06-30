import { useParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import DOMPurify from "isomorphic-dompurify";
import Layout from "@/components/layout/Layout";
import { useSEO } from "@/hooks/use-seo";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ArrowUpRight, Briefcase, Clock, MapPin,
  Sparkles, CheckCircle2, Share2, Globe2, UserPlus, Calendar, BadgeDollarSign,
  Eye, Users
} from "lucide-react";
import { findChannel, type PostingChannel } from "@/lib/job-channels";
import { toast } from "sonner";
import { useCareer, useCareerStats as useSharedCareerStats, useIncrementCareerViewBySlug } from "@/hooks/use-cms-data";

interface JobPost {
  id: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  experience_level: string | null;
  salary_range: string | null;
  description: string | null;
  content_html: string | null;
  hero_image_url: string | null;
  responsibilities: string[];
  requirements: string[];
  apply_url: string;
  posting_channels: PostingChannel[];
  is_featured: boolean;
  vacancies: number;
  office_location_id: string | null;
  office_location?: { name: string; city: string | null; country: string | null; address: string | null } | null;
  posted_at: string;
}

const useJob = (slug: string | undefined) => {
  const query = useCareer(slug ?? "");
  const data = query.data;
  if (!data) return query;

  return {
    ...query,
    data: {
      ...data,
      office_location: data.office_location || data.office_locations,
      responsibilities: Array.isArray(data.responsibilities) ? data.responsibilities : [],
      requirements: Array.isArray(data.requirements) ? data.requirements : [],
      posting_channels: Array.isArray(data.posting_channels) ? data.posting_channels : [],
    } as JobPost,
  };
};

const Pill = ({ icon: Icon, children }: { icon: any; children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-3 py-1 text-xs text-foreground/80">
    <Icon className="w-3 h-3" /> {children}
  </span>
);

const useCareerStats = (slug: string | undefined, careerId: string | undefined) => {
  const qc = useQueryClient();
  const query = useSharedCareerStats(slug);

  // Realtime: refresh applicant count when new applications come in for this career
  useEffect(() => {
    if (!careerId || !slug) return;
    const channel = db
      .channel(`career-apps-${careerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "job_applications", filter: `career_id=eq.${careerId}` },
        () => qc.invalidateQueries({ queryKey: ["career-stats", slug] })
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "careers", filter: `id=eq.${careerId}` },
        () => qc.invalidateQueries({ queryKey: ["career-stats", slug] })
      )
      .subscribe();
    return () => { db.removeChannel(channel); };
  }, [careerId, slug, qc]);

  return query;
};

const BUTTON_COLORS = [
  "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/10",
  "bg-[#4f46e5] hover:bg-[#4338ca] text-white shadow-md shadow-[#4f46e5]/10",
  "bg-[#059669] hover:bg-[#047857] text-white shadow-md shadow-[#059669]/10",
  "bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-[#7c3aed]/10",
  "bg-[#e11d48] hover:bg-[#be123c] text-white shadow-md shadow-[#e11d48]/10",
  "bg-[#d97706] hover:bg-[#b45309] text-white shadow-md shadow-[#d97706]/10"
];

const CareerDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: job, isLoading, isError } = useJob(slug);
  const { data: stats } = useCareerStats(slug, job?.id);
  const incrementView = useIncrementCareerViewBySlug();

  // Increment view count once per slug per session
  useEffect(() => {
    if (!slug) return;
    const key = `career-viewed:${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    incrementView.mutateAsync(slug).then(() => {
      // refresh stats after increment
      setTimeout(() => {
        // soft refetch via query key
        const evt = new Event("focus");
        window.dispatchEvent(evt);
      }, 300);
    });
  }, [slug]);


  // Build a clean text description from description or stripped HTML (max ~160 chars)
  const buildDescription = (j?: JobPost | null): string => {
    if (!j) return "Open position at Dynime LLC. Apply now and join our remote-first global team.";
    const raw = (j.description && j.description.trim())
      || (j.content_html ? j.content_html.replace(/<[^>]+>/g, " ") : "")
      || `${j.title} — ${j.employment_type} role in ${j.department}, ${j.location}. Apply now at Dynime LLC.`;
    const clean = raw.replace(/\s+/g, " ").trim();
    return clean.length > 160 ? clean.slice(0, 157).trimEnd() + "…" : clean;
  };

  const seoDescription = buildDescription(job);
  const canonicalUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host}/careers/${job?.slug ?? slug ?? ""}`
    : "";

  useSEO({
    title: job ? `${job.title} — ${job.department} (${job.location})` : "Career",
    description: seoDescription,
    keywords: job
      ? [job.title, job.department, job.location, job.employment_type, "careers", "jobs", "hiring", "remote"]
      : ["careers"],
    ogType: "article",
    ogImage: job?.hero_image_url || undefined,
    articlePublished: job?.posted_at,
    articleModified: job?.posted_at,
    jsonLd: job
      ? {
          "@context": "https://schema.org",
          "@type": "JobPosting",
          title: job.title,
          description: job.content_html || job.description || seoDescription,
          datePosted: job.posted_at,
          employmentType: job.employment_type?.toUpperCase().replace(/[\s-]+/g, "_"),
          hiringOrganization: {
            "@type": "Organization",
            name: "Dynime LLC.",
            sameAs: typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : undefined,
          },
          jobLocation: {
            "@type": "Place",
            address: { "@type": "PostalAddress", addressLocality: job.location },
          },
          ...(job.location?.toLowerCase().includes("remote") && {
            jobLocationType: "TELECOMMUTE",
            applicantLocationRequirements: { "@type": "Country", name: "Worldwide" },
          }),
          ...(job.experience_level && { experienceRequirements: job.experience_level }),
          ...(job.salary_range && { baseSalary: { "@type": "MonetaryAmount", value: { "@type": "QuantitativeValue", value: job.salary_range } } }),
          directApply: false,
          url: canonicalUrl,
          applicationContact: { "@type": "ContactPoint", url: job.apply_url },
        }
      : undefined,
  });

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: job?.title || "Career opportunity", url }); return; } catch { /* fall through */ }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container-custom py-16">
          <div className="h-8 w-48 bg-muted/40 animate-pulse rounded mb-6" />
          <div className="h-12 w-3/4 bg-muted/40 animate-pulse rounded mb-4" />
          <div className="h-64 bg-muted/40 animate-pulse rounded-2xl" />
        </div>
      </Layout>
    );
  }

  if (isError || !job) {
    return (
      <Layout>
        <div className="container-custom py-16 text-center">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-60" />
          <h1 className="font-heading text-2xl font-bold mb-2">Position not found</h1>
          <p className="text-muted-foreground mb-6">This job may have been closed or moved.</p>
          <Button asChild><Link to="/careers">Back to Careers</Link></Button>
        </div>
      </Layout>
    );
  }

  // Smart formatter: if admin pasted plain text (no HTML tags), convert
  // line breaks, bullets, and "Heading:" lines into nicely structured HTML
  // so it doesn't render as one ugly collapsed paragraph.
  const formatPlainTextToHtml = (raw: string): string => {
    const text = raw.replace(/\r\n/g, "\n").trim();
    if (!text) return "";
    const escape = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const linkify = (s: string) =>
      s
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
        .replace(/([\w.+-]+@[\w-]+\.[\w.-]+)/g, '<a href="mailto:$1">$1</a>');
    const isBullet = (l: string) => /^\s*([•\-\*\u2713\u2714\u2192\u25E6\u25AA\u25AB]|\d+[.)])\s+/.test(l);
    const stripBullet = (l: string) =>
      l.replace(/^\s*([•\-\*\u2713\u2714\u2192\u25E6\u25AA\u25AB]|\d+[.)])\s+/, "");

    const blocks = text.split(/\n\s*\n/);
    const html = blocks
      .map((block) => {
        const lines = block.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
        if (lines.length === 0) return "";
        // Bullet list block
        if (lines.every(isBullet)) {
          const items = lines
            .map((l) => `<li>${linkify(escape(stripBullet(l)))}</li>`)
            .join("");
          return `<ul>${items}</ul>`;
        }
        // Heading + bullet list (e.g. "Key Responsibilities:" followed by bullets)
        if (lines.length > 1 && /:\s*$/.test(lines[0]) && lines.slice(1).every(isBullet)) {
          const heading = linkify(escape(lines[0].replace(/:\s*$/, "")));
          const items = lines
            .slice(1)
            .map((l) => `<li>${linkify(escape(stripBullet(l)))}</li>`)
            .join("");
          return `<h3>${heading}</h3><ul>${items}</ul>`;
        }
        // Single short line ending with ":" → heading
        if (lines.length === 1 && /:\s*$/.test(lines[0]) && lines[0].length < 80) {
          return `<h3>${linkify(escape(lines[0].replace(/:\s*$/, "")))}</h3>`;
        }
        // Paragraph (preserve inner line breaks)
        return `<p>${lines.map((l) => linkify(escape(l))).join("<br/>")}</p>`;
      })
      .filter(Boolean)
      .join("\n");
    return html;
  };

  const rawHtml = job.content_html || "";
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(rawHtml);
  const preparedHtml = looksLikeHtml ? rawHtml : formatPlainTextToHtml(rawHtml);
  const cleanHtml = preparedHtml
    ? DOMPurify.sanitize(preparedHtml, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ["img", "picture", "source", "figure", "svg", "video", "iframe"],
        FORBID_ATTR: ["style", "background"],
      })
    : "";

  const postedDate = new Date(job.posted_at).toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });
  const locationLabel = job.location === "On-site" && job.office_location?.name
    ? `${job.location} · ${job.office_location.name}${job.office_location.city ? `, ${job.office_location.city}` : ""}`
    : job.location;

  return (
    <Layout>
      {/* Hero image intentionally removed on single job page for cleaner look */}

      {/* Split-screen hero */}
      <section className="relative overflow-hidden border-b border-border/60 pt-8 md:pt-12 pb-12 md:pb-16">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-70"
          style={{ background: "radial-gradient(60% 50% at 20% 0%, hsl(var(--primary) / 0.16), transparent 70%)" }}
        />
        <div className="container-custom">
          <Link
            to="/careers"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> All openings
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-14 items-start">
            {/* Left: title + meta */}
            <ScrollReveal>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">{job.department}</span>
                {job.is_featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" /> Featured
                  </span>
                )}
              </div>

              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight mb-6">
                {job.title}
              </h1>

              {job.description && (
                <p className="text-base md:text-lg text-foreground/75 leading-relaxed max-w-2xl mb-7 whitespace-pre-line">
                  {job.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Pill icon={MapPin}>{locationLabel}</Pill>
                <Pill icon={Clock}>{job.employment_type}</Pill>
                {job.experience_level && <Pill icon={Briefcase}>{job.experience_level}</Pill>}
                {job.vacancies > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-500 px-3 py-1 text-xs font-semibold">
                    <UserPlus className="w-3 h-3" /> {job.vacancies} {job.vacancies === 1 ? "vacancy" : "vacancies"}
                  </span>
                )}
              </div>

              {/* Live activity counters */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-foreground/80">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500/60 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Live
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold">
                  <Eye className="w-3.5 h-3.5" />
                  {(stats?.view_count ?? 0).toLocaleString()} {stats?.view_count === 1 ? "view" : "views"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 text-purple-500 px-3 py-1.5 text-xs font-semibold">
                  <Users className="w-3.5 h-3.5" />
                  {(stats?.applicant_count ?? 0).toLocaleString()} {stats?.applicant_count === 1 ? "applicant" : "applicants"}
                </span>
              </div>
            </ScrollReveal>


            {/* Right: sticky apply card */}
            <ScrollReveal delay={0.1}>
              <div className="lg:sticky lg:top-24">
                <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.4)]">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">At a glance</p>

                  <dl className="space-y-3.5 text-sm">
                    {job.salary_range && (
                      <div className="flex items-start gap-3">
                        <BadgeDollarSign className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Compensation</dt>
                          <dd className="font-semibold text-foreground">{job.salary_range}</dd>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Location</dt>
                        <dd className="font-medium text-foreground">{locationLabel}</dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Type</dt>
                        <dd className="font-medium text-foreground">{job.employment_type}</dd>
                      </div>
                    </div>
                    {job.experience_level && (
                      <div className="flex items-start gap-3">
                        <Briefcase className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Experience</dt>
                          <dd className="font-medium text-foreground">{job.experience_level}</dd>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <Calendar className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Posted</dt>
                        <dd className="font-medium text-foreground">{postedDate}</dd>
                      </div>
                    </div>
                  </dl>

                  <div className="mt-6 flex flex-col gap-2.5">
                    {/* Render buttons from posting_channels list */}
                    {Array.isArray(job.posting_channels) && job.posting_channels.length > 0 ? (
                      job.posting_channels.map((ch, idx) => {
                        if (!ch.url) return null;
                        const label = ch.label || `Platform ${idx + 1}`;
                        const displayName = label.toLowerCase().startsWith("apply") ? label : `Apply with ${label}`;
                        // Use sequential colors from BUTTON_COLORS starting with index 0
                        const colorClass = BUTTON_COLORS[idx % BUTTON_COLORS.length];
                        return (
                          <a
                            key={idx}
                            href={ch.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center justify-center w-full h-11 px-5 rounded-xl font-bold transition-all duration-300 gap-1.5 group ${colorClass}`}
                          >
                            {displayName}
                            <svg className="w-4 h-4 ml-0.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                            </svg>
                          </a>
                        );
                      })
                    ) : (
                      /* Fallback default apply button if list is empty */
                      <a
                        href={job.apply_url && job.apply_url.startsWith("http") ? job.apply_url : `https://flowmingo.ai/apply/dynime?role=${encodeURIComponent(job.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-full h-11 px-5 rounded-xl font-bold bg-primary hover:bg-primary/95 text-primary-foreground transition-all duration-300 gap-1.5 group shadow-md shadow-primary/10"
                      >
                        Apply with Flowmingo AI
                        <svg className="w-4 h-4 ml-0.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                        </svg>
                      </a>
                    )}

                    <Button variant="outline" size="lg" onClick={handleShare} className="w-full mt-2 h-11 rounded-xl">
                      <Share2 className="w-4 h-4 mr-2" /> Share this role
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Body content */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-5xl space-y-12">
          {cleanHtml && (
            <article
              className="prose prose-neutral dark:prose-invert max-w-none
                prose-headings:font-heading prose-headings:font-bold
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                prose-p:text-foreground/80 prose-li:text-foreground/80
                prose-a:text-primary hover:prose-a:text-primary/80
                prose-strong:text-foreground
                prose-ul:my-4 prose-ol:my-4"
              dangerouslySetInnerHTML={{ __html: cleanHtml }}
            />
          )}

          {(job.responsibilities.length > 0 || job.requirements.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {job.responsibilities.length > 0 && (
                <div className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-7">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <h2 className="font-heading text-xl font-bold">What you'll do</h2>
                  </div>
                  <ul className="space-y-3">
                    {job.responsibilities.map((r, i) => (
                      <li key={i} className="flex gap-3 text-sm text-foreground/85 leading-relaxed">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {job.requirements.length > 0 && (
                <div className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-7">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h2 className="font-heading text-xl font-bold">What we're looking for</h2>
                  </div>
                  <ul className="space-y-3">
                    {job.requirements.map((r, i) => (
                      <li key={i} className="flex gap-3 text-sm text-foreground/85 leading-relaxed">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!cleanHtml && job.responsibilities.length === 0 && job.requirements.length === 0 && !job.description && (
            <p className="text-muted-foreground italic text-center">No additional details provided.</p>
          )}
        </div>
      </section>

      {/* Application form */}
      <section className="pb-16 md:pb-24 bg-card/30 border-t border-border/60 pt-12 md:pt-16">
        <div className="container-custom max-w-2xl">
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/50 to-indigo-500/5 p-8 md:p-10 text-center shadow-xl backdrop-blur-md relative overflow-hidden">
            {/* Visual gradient orb */}
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="relative z-10 space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="w-3.5 h-3.5" /> Direct External Application
              </span>
              
              <h2 className="font-heading text-3xl font-bold mt-2">
                Apply for <span className="gradient-text">{job.title}</span>
              </h2>
              
              <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
                We collect and process talent applications via our secure partner portals. Click any of the options below to submit your application form.
              </p>

              <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3.5 pt-4">
                {/* Render buttons from posting_channels list */}
                {Array.isArray(job.posting_channels) && job.posting_channels.length > 0 ? (
                  job.posting_channels.map((ch, idx) => {
                    if (!ch.url) return null;
                    const label = ch.label || `Platform ${idx + 1}`;
                    const displayName = label.toLowerCase().startsWith("apply") ? label : `Apply with ${label}`;
                    const colorClass = BUTTON_COLORS[idx % BUTTON_COLORS.length];
                    return (
                      <a
                        key={idx}
                        href={ch.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center justify-center h-12 px-8 rounded-full font-semibold transition-all duration-300 gap-2 group hover:-translate-y-0.5 ${colorClass}`}
                      >
                        {displayName}
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                        </svg>
                      </a>
                    );
                  })
                ) : (
                  /* Fallback default apply button if list is empty */
                  <a
                    href={job.apply_url && job.apply_url.startsWith("http") ? job.apply_url : `https://flowmingo.ai/apply/dynime?role=${encodeURIComponent(job.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all duration-300 gap-2 group hover:-translate-y-0.5"
                  >
                    Apply with Flowmingo AI
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                    </svg>
                  </a>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground mt-4">
                You will be redirected to the secure external application form page.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default CareerDetail;
