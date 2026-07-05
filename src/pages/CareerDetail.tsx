import { useParams, Link } from "react-router-dom";
import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import Layout from "@/components/layout/Layout";
import { useSEO } from "@/hooks/use-seo";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Briefcase, Clock, MapPin,
  Sparkles, CheckCircle2, Share2, Calendar, BadgeDollarSign,
  Heart, Shield
} from "lucide-react";
import { toast } from "sonner";
import { useSyncedJob } from "@/hooks/use-cms-data";

const Pill = ({ icon: Icon, children }: { icon: any; children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-3 py-1 text-xs text-foreground/80 font-medium">
    <Icon className="w-3.5 h-3.5" /> {children}
  </span>
);

const CareerDetail = () => {
  const { slug } = useParams<{ slug: string }>();

  // Clean slug
  const cleanSlug = slug
    ? decodeURIComponent(slug).replace(/[^a-zA-Z0-9-_]/g, "").trim()
    : "";

  const { data: job, isLoading, isError } = useSyncedJob(cleanSlug);

  const buildDescription = (j: typeof job): string => {
    if (!j) return "Open position at Dynime. Apply now and join our remote-first global team.";
    const raw = j.description || `${j.title} — ${j.employment_type} role in ${j.department}, ${j.location}. Apply now at Dynime.`;
    const clean = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return clean.length > 160 ? clean.slice(0, 157).trimEnd() + "…" : clean;
  };

  const seoDescription = buildDescription(job);
  const canonicalUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host}/careers/${job?.slug ?? slug ?? ""}`
    : "";

  useSEO({
    title: job ? `${job.title} — ${job.department} (${job.location})` : "Job Detail",
    description: seoDescription,
    keywords: job
      ? [job.title, job.department, job.location, job.employment_type, "careers", "jobs", "hiring", "remote"]
      : ["careers"],
    ogType: "article",
    ogImage: undefined,
    articlePublished: job?.published_at || undefined,
    articleModified: job?.updated_at || undefined,
    jsonLd: job
      ? {
          "@context": "https://schema.org",
          "@type": "JobPosting",
          title: job.title,
          description: job.description || seoDescription,
          datePosted: job.published_at || job.created_at,
          employmentType: job.employment_type?.toUpperCase().replace(/[\s-]+/g, "_") || "FULL_TIME",
          hiringOrganization: {
            "@type": "Organization",
            name: "Dynime LLC.",
            sameAs: typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "https://dynime.com",
          },
          jobLocation: {
            "@type": "Place",
            address: { "@type": "PostalAddress", addressLocality: job.location },
          },
          ...(job.remote && {
            jobLocationType: "TELECOMMUTE",
            applicantLocationRequirements: { "@type": "Country", name: "Worldwide" },
          }),
          ...(job.experience && { experienceRequirements: job.experience }),
          ...(job.salary_range && {
            baseSalary: {
              "@type": "MonetaryAmount",
              currency: job.salary_currency || "USD",
              value: {
                "@type": "QuantitativeValue",
                minValue: job.salary_min || undefined,
                maxValue: job.salary_max || undefined,
                unitText: "YEAR",
              },
            },
          }),
          directApply: true,
          url: canonicalUrl,
        }
      : undefined,
  });

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: job?.title || "Career opportunity", url });
        return;
      } catch {
        /* fall through */
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const handleApplyRedirect = () => {
    if (job?.apply_url) {
      window.open(job.apply_url, "_blank", "noopener,noreferrer");
    } else {
      toast.error("Application URL not found.");
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container-custom py-16 max-w-5xl mx-auto">
          <div className="h-6 w-32 bg-muted/40 animate-pulse rounded mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10">
            <div>
              <div className="h-12 w-3/4 bg-muted/40 animate-pulse rounded mb-4" />
              <div className="h-6 w-1/2 bg-muted/40 animate-pulse rounded mb-8" />
              <div className="space-y-4">
                <div className="h-4 w-full bg-muted/30 animate-pulse rounded" />
                <div className="h-4 w-full bg-muted/30 animate-pulse rounded" />
                <div className="h-4 w-2/3 bg-muted/30 animate-pulse rounded" />
              </div>
            </div>
            <div className="h-64 bg-muted/40 animate-pulse rounded-2xl border border-border/20" />
          </div>
        </div>
      </Layout>
    );
  }

  if (isError || !job) {
    return (
      <Layout>
        <div className="container-custom py-24 text-center max-w-md mx-auto">
          <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-60 animate-bounce" />
          <h1 className="font-heading text-3xl font-bold mb-3">Position not found</h1>
          <p className="text-muted-foreground mb-8">This role may have been filled, closed, or moved to a different url.</p>
          <Button asChild size="lg">
            <Link to="/careers">Back to Careers</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  let cleanHtml = "";
  if (job.description) {
    const isMarkdown = job.description.includes('#') || job.description.includes('*') || job.description.includes('\n\n');
    const rawHtml = isMarkdown ? marked.parse(job.description) as string : job.description;
    cleanHtml = DOMPurify.sanitize(rawHtml, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ["img", "picture", "source", "figure", "svg", "video", "iframe"],
      FORBID_ATTR: ["style", "background"],
    });
  }

  const postedDate = job.published_at
    ? new Date(job.published_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Layout>
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
                <span className="text-xs uppercase tracking-[0.18em] text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{job.department}</span>
                {job.featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" /> Featured
                  </span>
                )}
              </div>

              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight mb-6">
                {job.title}
              </h1>

              <div className="flex flex-wrap gap-2 mt-6">
                <Pill icon={MapPin}>{job.location}</Pill>
                <Pill icon={Clock}>{job.employment_type}</Pill>
                {job.experience && <Pill icon={Briefcase}>{job.experience}</Pill>}
                {job.remote && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary px-3 py-1 text-xs font-semibold">
                    Remote Friendly
                  </span>
                )}
              </div>
            </ScrollReveal>

            {/* Right: sticky apply card */}
            <ScrollReveal delay={0.1}>
              <div className="lg:sticky lg:top-24">
                <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.4)]">
                  <dl className="space-y-3.5 text-sm">
                    {(job.salary_range || job.salary_currency) && (
                      <div className="flex items-start gap-3">
                        <BadgeDollarSign className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Compensation</dt>
                          <dd className="font-semibold text-foreground">{job.salary_range || job.salary_currency}</dd>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Location</dt>
                        <dd className="font-medium text-foreground">{job.location}</dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Type</dt>
                        <dd className="font-medium text-foreground">{job.employment_type}</dd>
                      </div>
                    </div>
                    {job.experience && (
                      <div className="flex items-start gap-3">
                        <Briefcase className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Experience</dt>
                          <dd className="font-medium text-foreground">{job.experience}</dd>
                        </div>
                      </div>
                    )}
                    {postedDate && (
                      <div className="flex items-start gap-3">
                        <Calendar className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Posted</dt>
                          <dd className="font-medium text-foreground">{postedDate}</dd>
                        </div>
                      </div>
                    )}
                  </dl>

                  <div className="mt-6 flex flex-col gap-2.5">
                    <Button
                      onClick={handleApplyRedirect}
                      size="lg"
                      className="w-full font-bold bg-primary hover:bg-primary/95 text-primary-foreground transition-all duration-300 gap-1.5 group shadow-md shadow-primary/10"
                    >
                      Apply Now
                    </Button>
                    <Button variant="outline" size="lg" onClick={handleShare} className="w-full mt-1">
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

          {/* Side by side Requirements & Responsibilities cards if they are lists */}
          {(job.responsibilities?.length > 0 || job.requirements?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {job.responsibilities?.length > 0 && (
                <div className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-7 shadow-sm">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <h2 className="font-heading text-xl font-bold">Key Responsibilities</h2>
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

              {job.requirements?.length > 0 && (
                <div className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-7 shadow-sm">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h2 className="font-heading text-xl font-bold">Requirements</h2>
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

          {job.benefits?.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-7 shadow-sm max-w-xl">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <Heart className="w-4 h-4" />
                </div>
                <h2 className="font-heading text-xl font-bold">Benefits & Perks</h2>
              </div>
              <ul className="space-y-3">
                {job.benefits.map((b, i) => (
                  <li key={i} className="flex gap-3 text-sm text-foreground/85 leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!cleanHtml && !job.responsibilities?.length && !job.requirements?.length && (
            <p className="text-muted-foreground italic text-center py-8">No additional details are provided for this role.</p>
          )}
        </div>
      </section>

      {/* External Form Notice Section */}
      <section className="pb-16 md:pb-24 bg-card/30 border-t border-border/60 pt-12 md:pt-16">
        <div className="container-custom max-w-2xl">
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/50 to-indigo-500/5 p-8 md:p-10 text-center shadow-lg backdrop-blur-md relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="relative z-10 space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <Shield className="w-3.5 h-3.5" /> Secure Redirection
              </span>
              
              <h2 className="font-heading text-3xl font-bold mt-2">
                Apply for <span className="gradient-text">{job.title}</span>
              </h2>
              
              <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
                Clicking the button below will open the secure candidate application form on our partner ATS portal Flowmingo.
              </p>

              <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3.5 pt-4">
                <Button
                  onClick={handleApplyRedirect}
                  size="lg"
                  className="font-semibold bg-primary hover:bg-primary/95 text-primary-foreground px-8 py-5 h-auto rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 gap-2 group hover:-translate-y-0.5"
                >
                  Apply on Flowmingo
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground mt-4">
                All data is transmitted securely and handled according to our privacy policy.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default CareerDetail;
