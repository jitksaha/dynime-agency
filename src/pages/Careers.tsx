import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCareers } from "@/hooks/use-cms-data";
import Layout from "@/components/layout/Layout";
import { usePageSEO } from "@/hooks/use-page-seo";
import { SEO_DEFAULTS } from "@/lib/seo-defaults";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { Briefcase, MapPin, Clock, ArrowUpRight, Sparkles, Heart, Globe, Rocket, Users, UserPlus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { findChannel, type PostingChannel } from "@/lib/job-channels";

interface Career {
  id: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  experience_level: string | null;
  salary_range: string | null;
  description: string | null;
  responsibilities: string[];
  requirements: string[];
  apply_url: string;
  posting_channels: PostingChannel[];
  is_featured: boolean;
  vacancies: number;
  office_location_id: string | null;
  office_location?: { name: string; city: string | null; country: string | null } | null;
}

const perks = [
  { icon: Globe, title: "Remote-first", desc: "Work from anywhere in the world" },
  { icon: Rocket, title: "Growth budget", desc: "Annual learning & conference stipend" },
  { icon: Heart, title: "Wellness", desc: "Mental health & wellness benefits" },
  { icon: Users, title: "Team retreats", desc: "Annual offsites with the team" },
];



const JobCard = ({ job }: { job: Career }) => (
  <Link
    to={`/careers/${job.slug}`}
    className="group relative block overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-b from-card/30 to-card/10 backdrop-blur-md p-6 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(var(--primary-rgb),0.08)] hover:-translate-y-1"
  >
    {/* Background hover light effect */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

    {job.is_featured && (
      <span className="absolute -top-px right-6 inline-flex items-center gap-1 rounded-b-xl bg-gradient-to-r from-primary to-accent text-primary-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm">
        <Sparkles className="w-3 h-3 animate-pulse" /> Featured
      </span>
    )}

    <div className="relative z-10 flex flex-col h-full justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/10">
          {job.department}
        </p>
        <h3 className="font-heading font-extrabold text-xl md:text-2xl text-foreground group-hover:text-primary transition-colors duration-300 mb-3">
          {job.title}
        </h3>

        {job.description && (
          <p className="text-sm text-muted-foreground/80 mb-5 line-clamp-2 leading-relaxed font-sans">{job.description}</p>
        )}
      </div>

      <div>
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-background/50 px-3 py-1 text-xs text-foreground/80 font-medium">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            {job.location}
            {job.location === "On-site" && job.office_location?.name
              ? ` · ${job.office_location.name}`
              : ""}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-background/50 px-3 py-1 text-xs text-foreground/80 font-medium">
            <Clock className="w-3.5 h-3.5 text-primary" /> {job.employment_type}
          </span>
          {job.experience_level && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-background/50 px-3 py-1 text-xs text-foreground/80 font-medium">
              <Briefcase className="w-3.5 h-3.5 text-primary" /> {job.experience_level}
            </span>
          )}
          {job.salary_range && (
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-3 py-1 text-xs font-semibold">
              {job.salary_range}
            </span>
          )}
          {job.vacancies > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary px-3 py-1 text-xs font-semibold">
              <UserPlus className="w-3.5 h-3.5" /> {job.vacancies} {job.vacancies === 1 ? "vacancy" : "vacancies"}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/20">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(Array.isArray(job.posting_channels) ? job.posting_channels : []).slice(0, 4).map((ch, i) => {
              const def = findChannel(ch.id);
              return (
                <span
                  key={i}
                  title={`Also on ${def.name}`}
                  className="px-2 py-0.5 rounded-md text-[9px] font-extrabold text-white shadow-sm"
                  style={{ backgroundColor: def.color }}
                >
                  {def.name.toUpperCase()}
                </span>
              );
            })}
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-primary group-hover:text-primary-foreground group-hover:bg-primary px-3 py-1.5 rounded-xl border border-primary/25 transition-all duration-300">
            View Role <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </div>
  </Link>
);

const Careers = () => {
  const { data: jobs, isLoading } = useCareers();
  usePageSEO("careers", {
    title: SEO_DEFAULTS.careers.title,
    description: SEO_DEFAULTS.careers.description,
    keywords: SEO_DEFAULTS.careers.keywords,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        url: "https://dynime.com/careers",
        name: "Careers at Dynime LLC.",
        description: SEO_DEFAULTS.careers.description,
        about: { "@id": "https://dynime.com/#organization" },
      },
      ...(jobs ?? []).map((j: any) => ({
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: j.title,
        description: j.description || j.short_description || SEO_DEFAULTS.careers.description,
        datePosted: j.created_at || new Date().toISOString(),
        employmentType: j.employment_type || "FULL_TIME",
        hiringOrganization: {
          "@type": "Organization",
          name: "Dynime LLC.",
          sameAs: "https://dynime.com",
        },
        jobLocationType: "TELECOMMUTE",
        applicantLocationRequirements: { "@type": "Country", name: "Worldwide" },
      })),
    ],
  });


  const [search, setSearch] = useState("");
  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => {
      const haystack = [
        j.title,
        j.department,
        j.location,
        j.employment_type,
        j.experience_level || "",
        j.description || "",
        j.office_location?.name || "",
        j.office_location?.city || "",
        j.office_location?.country || "",
        ...(j.requirements || []),
        ...(j.responsibilities || []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [jobs, search]);



  return (
    <Layout>
      {/* Hero */}
      <section className="section-padding relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, hsl(var(--primary) / 0.12), transparent 70%)",
          }}
        />
        <div className="container-custom text-center max-w-3xl mx-auto">
          <ScrollReveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 backdrop-blur px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              We're hiring globally
            </span>
            <h1 className="font-heading text-4xl md:text-6xl font-bold mt-5 mb-5">
              Build the future <span className="gradient-text">with us</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Join a global team of designers, engineers, and strategists shaping world-class digital products. Remote-first, ambitious, and human.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Perks */}
      <section className="pb-9 md:pb-12">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {perks.map((p, i) => (
              <ScrollReveal key={p.title} delay={i * 0.08}>
                <div className="rounded-xl border border-border/60 bg-card/50 p-5 text-center h-full">
                  <p.icon className="w-6 h-6 text-primary mx-auto mb-3" />
                  <h3 className="font-heading font-semibold text-sm mb-1">{p.title}</h3>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Jobs */}
      <section className="section-padding bg-card/30">
        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center mb-10">
              <span className="text-primary text-sm font-semibold uppercase tracking-wider">Open Positions</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3">Find your next role</h2>
              <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
                All applications are handled through our marketplace platform. Click apply to get started.
              </p>
            </div>
          </ScrollReveal>

          <div className="max-w-xl mx-auto mb-8">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, department, location, skill…"
                className="pl-9 pr-10 h-11"
                aria-label="Search jobs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {jobs && jobs.length > 0 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Showing {filteredJobs.length} of {jobs.length} {jobs.length === 1 ? "role" : "roles"}
              </p>
            )}
          </div>


          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-48 rounded-2xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : filteredJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredJobs.map((job) => (
                <ScrollReveal key={job.id} delay={0.05}>
                  <JobCard job={job} />
                </ScrollReveal>
              ))}
            </div>
          ) : jobs && jobs.length > 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No roles match "{search}". Try a different keyword.</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No open positions right now. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-card/60 to-card/30 p-10 md:p-14 text-center">
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3">
              Don't see your role?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              We're always looking for exceptional talent. Send us your portfolio and tell us how you'd contribute.
            </p>
            <Button asChild size="lg">
              <Link to="/contact">Get in touch</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Careers;
