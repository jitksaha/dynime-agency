import { lazy, Suspense } from "react";
import Layout from "@/components/layout/Layout";
import { usePageSEO } from "@/hooks/use-page-seo";
import { SEO_DEFAULTS } from "@/lib/seo-defaults";
import HeroSlider from "@/components/home/HeroSlider";

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

const Index = () => {
  usePageSEO("home", {
    title: SEO_DEFAULTS.home.title,
    description: SEO_DEFAULTS.home.description,
    ogType: "website",
    ogImage: HOME_OG_IMAGE,
    keywords: SEO_DEFAULTS.home.keywords,
    jsonLd: [
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
    </Layout>
  );
};

export default Index;
