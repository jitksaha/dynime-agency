import { lazy, Suspense, useState } from "react";
import Layout from "@/components/layout/Layout";
import { usePageSEO } from "@/hooks/use-page-seo";
import { SEO_DEFAULTS } from "@/lib/seo-defaults";
import HeroSlider from "@/components/home/HeroSlider";
import { ChevronDown, HelpCircle } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";

// Below-the-fold sections — code-split & rendered after Hero so they don't block LCP/TBT
const ScrollTextReveal = lazy(() => import("@/components/home/ScrollTextReveal"));
const PartnersStrip = lazy(() => import("@/components/home/PartnersStrip"));
const OnDemandServices = lazy(() => import("@/components/home/OnDemandServices"));
const TechStack = lazy(() => import("@/components/home/TechStack"));
const StatsSection = lazy(() => import("@/components/home/StatsSection"));
const ProcessTimeline = lazy(() => import("@/components/home/ProcessTimeline"));
const Testimonials = lazy(() => import("@/components/home/Testimonials"));
const MarqueeStrip = lazy(() => import("@/components/home/MarqueeStrip"));
const CountriesServed = lazy(() => import("@/components/home/CountriesServed"));

const SectionSkeleton = () => <div className="min-h-[200px]" aria-hidden />;

const SITE_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host}`
    : "https://dynimeweb.lovable.app";

const HOME_OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/y1iCjEqaXzd99xeocmuMVGmLulF2/social-images/social-1774285466350-Dynime_Logo.webp";

const homeFaqs = [
  {
    question: "What is Dynime?",
    answer: "Dynime is a premium global software development, business automation, and digital transformation company. We build custom AI software, enterprise-grade SaaS platforms, high-converting websites, and provide strategic business consultancy to help startups and enterprises grow through technology, strategy, and digital transformation."
  },
  {
    question: "What services does Dynime provide?",
    answer: "Dynime provides a complete suite of services including Custom Software & AI Development, Web Design & Development (Shopify, WordPress, custom React apps), Performance Marketing (SEO & Paid Ads), and Business Consulting (incorporating US/UK companies, payments, and compliance setup)."
  },
  {
    question: "Why choose Dynime?",
    answer: "Businesses choose Dynime for our senior engineering team, transparent fixed-price models, weekly ship-cycles, and our proprietary all-in-one business operating system (Dynime OS) that eliminates disconnected SaaS chaos and accelerates business operations."
  },
  {
    question: "Who should work with Dynime?",
    answer: "Ambitious startups seeking to build robust MVPs, mid-market companies aiming to automate workflows, and enterprises looking for a reliable, global digital transformation partner should work with Dynime."
  },
  {
    question: "How does Dynime help businesses grow?",
    answer: "Dynime helps businesses grow by automating manual processes to lower overheads, optimizing online presence to increase customer acquisition, and engineering scalable custom platforms that handle high user volumes seamlessly."
  }
];

const Index = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  usePageSEO("home", {
    title: SEO_DEFAULTS.home.title,
    description: SEO_DEFAULTS.home.description,
    ogType: "website",
    ogImage: HOME_OG_IMAGE,
    keywords: SEO_DEFAULTS.home.keywords,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        "url": SITE_URL,
        "name": "Dynime",
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${SITE_URL}/blog?q={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${SITE_URL}/#webpage`,
        url: SITE_URL,
        name: "Dynime LLC. — Web Development, Digital Marketing & Business Solutions",
        description:
          "Dynime LLC. helps companies grow online with web development, digital marketing, e-commerce & business registration services.",
        inLanguage: "en",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: HOME_OG_IMAGE,
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Dynime LLC.",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/favicon.png`,
        },
        description:
          "Founded in 2020, Dynime LLC. delivers web development, digital marketing, e-commerce solutions and business registration services to clients across 25+ countries.",
        foundingDate: "2020",
        numberOfEmployees: "25+",
        areaServed: "Worldwide",
        sameAs: [
          "https://www.facebook.com/thedynime",
          "https://www.instagram.com/thedynime",
          "https://www.linkedin.com/company/thedynime",
        ],
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            availableLanguage: ["English", "Bengali"],
            areaServed: "Worldwide",
            url: `${SITE_URL}/contact`,
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        name: "Dynime LLC.",
        description:
          "Web development, digital marketing, e-commerce solutions and business registration services for companies worldwide.",
        areaServed: "Worldwide",
        serviceType: [
          "Web Development",
          "Digital Marketing",
          "E-commerce",
          "SEO",
          "Business Registration",
        ],
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.9",
          reviewCount: "120",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: homeFaqs.map(faq => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            "text": faq.answer
          }
        }))
      }
    ],
  });
  return (
    <Layout>
      <HeroSlider />
      <Suspense fallback={<SectionSkeleton />}>
        <ScrollTextReveal />
        <PartnersStrip />
        <OnDemandServices />
        <TechStack />
        <StatsSection />
        <ProcessTimeline />
        <MarqueeStrip />
        <Testimonials />
        <CountriesServed />
      </Suspense>

      {/* Accordion FAQ Section */}
      <section className="section-padding bg-gradient-to-b from-background via-card/10 to-background border-t border-border/20">
        <div className="container-custom max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary mb-3">
                <HelpCircle className="w-3.5 h-3.5 animate-pulse" /> FAQ
              </span>
              <h2 className="font-heading text-3xl md:text-5xl font-bold tracking-tight text-foreground">
                Frequently Asked <span className="gradient-text">Questions</span>
              </h2>
              <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-sm md:text-base">
                Got questions about Dynime's services, process, or platform? Find clear answers below.
              </p>
            </div>
          </ScrollReveal>

          <div className="space-y-4">
            {homeFaqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <ScrollReveal key={index} delay={index * 0.05}>
                  <div className="rounded-xl border border-border/60 bg-card/45 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-primary/30">
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : index)}
                      className="w-full flex items-center justify-between p-5 text-left font-heading font-semibold text-base md:text-lg text-foreground hover:text-primary transition-colors focus:outline-none"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-muted-foreground transition-transform duration-300 shrink-0 ml-4 ${
                          isOpen ? "rotate-180 text-primary" : ""
                        }`}
                      />
                    </button>
                    <div
                      className={`transition-all duration-300 ease-in-out ${
                        isOpen ? "max-h-[300px] border-t border-border/40 opacity-100" : "max-h-0 opacity-0"
                      } overflow-hidden`}
                    >
                      <p className="p-5 text-sm md:text-base text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
