import Layout from "@/components/layout/Layout";
import { usePageSEO } from "@/hooks/use-page-seo";
import { SEO_DEFAULTS } from "@/lib/seo-defaults";
import ScrollReveal from "@/components/shared/ScrollReveal";
import PageHero from "@/components/shared/PageHero";
import TeamCarousel from "@/components/home/TeamCarousel";
import CountryEligibilityChecker from "@/components/contact/CountryEligibilityChecker";
import RegisteredEntities from "@/components/shared/RegisteredEntities";
import { motion } from "framer-motion";
import { Target, Eye, Heart, Globe, Award, Users, Zap, Trophy, Users2, Globe2, ShieldCheck } from "lucide-react";
import aboutTeam from "@/assets/about-team.webp";
import { useAboutTimeline } from "@/hooks/use-about-timeline";
import { useEligibleCountriesCount } from "@/hooks/use-eligible-countries-count";
import { getTimelineIcon } from "@/lib/about-timeline-defaults";

const values = [
  { icon: Target, title: "Mission", desc: "To empower businesses globally with cutting-edge digital solutions that drive measurable growth and lasting impact." },
  { icon: Eye, title: "Vision", desc: "To become the world's most trusted digital transformation partner for ambitious businesses of all sizes." },
  { icon: Heart, title: "Values", desc: "Excellence, transparency, innovation, and an unwavering commitment to our clients' success." },
];


const About = () => {
  const { data: timeline = [] } = useAboutTimeline();
  const { data: eligibleCount = 0 } = useEligibleCountriesCount();
  usePageSEO("about", {
    title: SEO_DEFAULTS.about.title,
    description: SEO_DEFAULTS.about.description,
    keywords: SEO_DEFAULTS.about.keywords,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        url: "https://dynime.com/about",
        name: "About Dynime Inc.",
        description: SEO_DEFAULTS.about.description,
        mainEntity: { "@id": "https://dynime.com/#organization" },
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": "https://dynime.com/#organization",
        name: "Dynime Inc.",
        url: "https://dynime.com",
        logo: "https://dynime.com/favicon.png",
        foundingDate: "2020",
        numberOfEmployees: "25+",
        areaServed: "Worldwide",
        slogan: "Designing the quiet architecture of modern brands.",
        knowsAbout: [
          "Web Development",
          "E-commerce",
          "Digital Marketing",
          "SEO",
          "AI Software",
          "Company Formation",
          "Brand Design",
        ],
      },
    ],
  });
  return (
    <Layout>
      <PageHero
        eyebrow="About Dynime"
        eyebrowIcon={Award}
        title={
          <>
            Designing the Quiet <span className="gradient-text">Architecture</span> of Modern Brands
          </>
        }
        description="A studio of designers, engineers, and strategists devoted to the craft of building digital experiences that feel inevitable — and last for decades."
        align="left"
        primaryCta={{ label: "Start a project", href: "/contact" }}
        secondaryCta={{ label: "View our work", href: "/portfolio" }}
        visual={
          <img
            src={aboutTeam}
            alt="Creative team collaborating on digital projects"
            width={520}
            height={400}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            sizes="(min-width: 1024px) 520px, 100vw"
            className="w-full h-auto max-w-[520px] drop-shadow-2xl"
          />
        }
      />

      <TeamCarousel />

      {/* Timeline — Our Story */}
      <section className="relative section-padding bg-gradient-to-b from-card/20 via-background to-card/30 overflow-hidden">
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="container-custom">
          <ScrollReveal>
            <div className="text-center mb-14">
              <span className="inline-flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-[0.2em]">
                <span className="h-px w-6 bg-primary/60" />
                Our Journey
                <span className="h-px w-6 bg-primary/60" />
              </span>
              <h2 className="font-heading text-3xl md:text-5xl font-bold mt-3">
                The Story of <span className="gradient-text">Dynime</span>
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-2xl mx-auto">
                From a one-person WordPress shop to a globally registered technology and consultancy group — here's how we got here.
              </p>
            </div>
          </ScrollReveal>

          {/* Timeline rail */}
          <div className="relative max-w-6xl mx-auto">
            {/* Center vertical rail (md+) */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px overflow-hidden">
              <div className="absolute inset-0 bg-border" />
              <motion.div
                className="absolute inset-x-0 top-0 bg-gradient-to-b from-primary via-primary to-primary/30"
                initial={{ scaleY: 0, transformOrigin: "top" }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1.6, ease: "easeOut" }}
                style={{ height: "100%" }}
              />
            </div>
            {/* Left rail (mobile) */}
            <div className="md:hidden absolute left-6 top-0 bottom-0 w-px overflow-hidden">
              <div className="absolute inset-0 bg-border" />
              <motion.div
                className="absolute inset-x-0 top-0 bg-gradient-to-b from-primary via-primary to-primary/30"
                initial={{ scaleY: 0, transformOrigin: "top" }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.6, ease: "easeOut" }}
                style={{ height: "100%" }}
              />
            </div>

            <ol className="space-y-10 md:space-y-14">
              {timeline.map((item, i) => {
                const Icon = getTimelineIcon(item.icon);
                const isLeft = i % 2 === 0;
                return (
                  <motion.li
                    key={`${item.year}-${i}`}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.55, delay: 0.05, ease: [0.25, 0.4, 0.25, 1] }}
                    className="relative md:grid md:grid-cols-2 md:gap-10 pl-16 md:pl-0"
                  >
                    {/* Node dot */}
                    <div className="absolute md:left-1/2 left-6 top-2 md:-translate-x-1/2 -translate-x-1/2 z-10">
                      <motion.div
                        className="relative w-12 h-12 rounded-2xl bg-background border border-border flex items-center justify-center shadow-lg"
                        whileHover={{ scale: 1.08, borderColor: "hsl(var(--primary) / 0.6)" }}
                        transition={{ type: "spring", stiffness: 320, damping: 18 }}
                      >
                        <motion.span
                          className="absolute inset-0 rounded-2xl border border-primary/40"
                          animate={{ scale: [1, 1.3, 1], opacity: [0.55, 0, 0.55] }}
                          transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.3 }}
                        />
                        <Icon className="w-5 h-5 text-primary" />
                      </motion.div>
                    </div>

                    {/* Card — alternating sides on desktop */}
                    <div className={isLeft ? "md:col-start-1 md:pr-12 md:text-right" : "md:col-start-2 md:pl-12"}>
                      <motion.div
                        whileHover={{ y: -4, borderColor: "hsl(var(--primary) / 0.4)" }}
                        transition={{ type: "spring", stiffness: 300, damping: 22 }}
                        className="group relative rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-5 md:p-6 overflow-hidden"
                      >
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative">
                          <div className={`flex items-center gap-2 mb-2 ${isLeft ? "md:justify-end" : ""}`}>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider">
                              <Zap className="w-3 h-3" />
                              {item.tag}
                            </span>
                            <span className="font-heading text-sm font-bold text-foreground">{item.year}</span>
                          </div>
                          <h3 className="font-heading font-semibold text-base md:text-lg text-foreground">
                            {item.title}
                          </h3>
                          <p className="text-xs md:text-sm leading-relaxed text-muted-foreground mt-1.5">
                            {item.desc}
                          </p>
                        </div>
                      </motion.div>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* Registered entities — global corporate footprint */}
      <RegisteredEntities />

      {/* Country Eligibility Checker */}
      <CountryEligibilityChecker />


      {/* Mission / Vision / Values */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map((v, i) => (
              <ScrollReveal key={v.title} delay={i * 0.1} className="h-full">
                <div className="glass-card-hover p-8 text-center h-full">
                  <v.icon className="w-10 h-10 text-primary mx-auto mb-5" />
                  <h3 className="font-heading font-semibold text-xl text-foreground mb-3">{v.title}</h3>
                  <p className="text-sm text-muted-foreground">{v.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>


      {/* Stats */}
      <section className="py-10 md:py-9 border-y border-border/30">
        <div className="container-custom grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { icon: Trophy, val: "800+", label: "Projects shipped" },
            { icon: Users2, val: "250+", label: "Happy clients" },
            { icon: Globe2, val: eligibleCount > 0 ? `${eligibleCount}+` : "25+", label: "Countries served" },
            { icon: ShieldCheck, val: "Since 2020", label: "In business" },
          ].map((s, i) => (
            <ScrollReveal key={s.label} delay={i * 0.1}>
              <div className="text-center">
                <s.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="font-heading text-2xl font-bold gradient-text">{s.val}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

    </Layout>
  );
};

export default About;
