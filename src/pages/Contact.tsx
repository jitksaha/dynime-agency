import Layout from "@/components/layout/Layout";
import CountryEligibilityChecker from "@/components/contact/CountryEligibilityChecker";
import { usePageSEO } from "@/hooks/use-page-seo";
import { SEO_DEFAULTS } from "@/lib/seo-defaults";
import ScrollReveal from "@/components/shared/ScrollReveal";
import PageHero from "@/components/shared/PageHero";
import ContactForm from "@/components/shared/ContactForm";
import { useContactInfo } from "@/hooks/use-data";
import { Mail, Phone, MapPin, MessageCircle, Sparkles, Clock, Globe2 } from "lucide-react";
import SocialIcons from "@/components/shared/SocialIcons";
import { BUSINESS_CONFIG, getActiveOffices } from "@/lib/business-config";
import { Button } from "@/components/ui/button";

import { useState } from "react";

const Contact = () => {
  const { data: contacts } = useContactInfo();
  const [officeSearchTerm, setOfficeSearchTerm] = useState("");
  const [selectedOfficeName, setSelectedOfficeName] = useState("");

  const rawPhones = contacts?.filter((c) => c.type === "phone") || [];
  // Filter out UK numbers (+44 or UK in label)
  const phones = rawPhones
    .filter((p) => !/uk/i.test(p.label || "") && !p.value.startsWith("+44"))
    .map((p) => {
      if (/secondary/i.test(p.label || "")) {
        return { ...p, label: "Bangladesh Office Number" };
      }
      return p;
    });

  const emails = contacts?.filter((c) => c.type === "email") || [];
  const addresses = contacts?.filter((c) => c.type === "address") || [];
  const offices = getActiveOffices(contacts);
  const whatsapps =
    contacts?.filter(
      (c) => c.type === "whatsapp" || (c.type === "phone" && /whatsapp/i.test(c.label || "")),
    ) || [];
  const others = contacts?.filter((c) => !["phone", "email", "address", "social", "whatsapp"].includes(c.type)) || [];

  usePageSEO("contact", {
    title: SEO_DEFAULTS.contact.title,
    description: SEO_DEFAULTS.contact.description,
    keywords: SEO_DEFAULTS.contact.keywords,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        url: "https://dynime.com/contact",
        name: "Contact Dynime LLC.",
        description: SEO_DEFAULTS.contact.description,
        mainEntity: {
          "@type": "Organization",
          name: "Dynime LLC.",
          url: "https://dynime.com",
          email: emails[0]?.value || "support@dynimetechnologies.com",
          telephone: phones[0]?.value || undefined,
          address: addresses[0]?.value
            ? { "@type": "PostalAddress", streetAddress: addresses[0].value }
            : undefined,
          contactPoint: [
            {
              "@type": "ContactPoint",
              contactType: "customer support",
              email: emails[0]?.value || "support@dynimetechnologies.com",
              telephone: phones[0]?.value || undefined,
              areaServed: "Worldwide",
              availableLanguage: ["English", "Bengali"],
            },
            {
              "@type": "ContactPoint",
              contactType: "sales",
              email: emails[0]?.value || "support@dynimetechnologies.com",
              areaServed: "Worldwide",
              availableLanguage: ["English", "Bengali"],
            },
          ],
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "@id": "https://dynime.com/#localbusiness",
        name: "Dynime LLC.",
        url: "https://dynime.com",
        image: "https://dynime.com/og-image.jpg",
        email: emails[0]?.value || "support@dynimetechnologies.com",
        telephone: phones[0]?.value || undefined,
        priceRange: "$$",
        areaServed: "Worldwide",
        address: addresses.map((a) => ({
          "@type": "PostalAddress",
          streetAddress: a.value,
          name: a.label || undefined,
        })),
        location: addresses.map((a) => ({
          "@type": "Place",
          name: a.label || "Office",
          address: { "@type": "PostalAddress", streetAddress: a.value },
        })),
      },
    ],
  });

  const primaryEmail = emails[0]?.value || "support@dynimetechnologies.com";
  const whatsappEntry =
    contacts?.find((c) => c.type === "whatsapp") ||
    phones.find((p) => /whatsapp/i.test(p.label));
  const whatsappNumber = whatsappEntry?.value || "+16468840271";
  const whatsappHref = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}`;

  const mapEmbedSrc = (value: string) =>
    `https://www.google.com/maps?q=${encodeURIComponent(value)}&output=embed`;
  const mapLinkHref = (value: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;

  return (
    <Layout>
      <PageHero
        eyebrow="A reply within 24 hours — always"
        eyebrowIcon={Sparkles}
        title={
          <>
            Begin a <span className="gradient-text">Conversation</span> That Matters
          </>
        }
        description="Share your vision, your ambition, or simply a question. Our team will return with a thoughtful response — and the first steps toward something remarkable."
        primaryCta={{ label: "Send us a message", href: "#contact-form" }}
        secondaryCta={{ label: "View our services", href: "/services" }}
      />

      {/* Quick contact tiles — fully dynamic from contact_info.
          Multiple values of the same kind (emails, phones, whatsapps) are
          stacked inside a single card. Addresses get their own dedicated
          cards further down the page. */}
      <section className="pb-10">
        <div className="container-custom">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {emails.length > 0 && (
              <ScrollReveal delay={0.05}>
                <div className="group block h-full rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-5 hover:border-primary/40 hover:bg-card transition-all hover:-translate-y-0.5">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Mail className="w-5 h-5" />
                  </div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Email</p>
                  <ul className="space-y-2">
                    {emails.map((e) => (
                      <li key={e.id} className="flex items-center gap-2.5">
                        <span className="relative inline-flex h-2 w-2 flex-shrink-0">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500/70 opacity-75 animate-ping" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgb(16_185_129_/_0.9)]" />
                        </span>
                        <a
                          href={`mailto:${e.value}`}
                          className="font-heading font-semibold text-sm text-foreground break-all hover:text-primary transition-colors"
                        >
                          {e.value}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            )}

            {phones.length > 0 && (
              <ScrollReveal delay={0.1}>
                <div className="group block h-full rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-5 hover:border-primary/40 hover:bg-card transition-all hover:-translate-y-0.5">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Phone className="w-5 h-5" />
                  </div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Phone</p>
                  <ul className="space-y-2">
                    {phones.map((p) => (
                      <li key={p.id} className="flex items-center gap-2.5">
                        <span className="relative inline-flex h-2 w-2 flex-shrink-0">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500/70 opacity-75 animate-ping" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgb(16_185_129_/_0.9)]" />
                        </span>
                        <a
                          href={`tel:${p.value.replace(/\s+/g, "")}`}
                          className="font-heading font-semibold text-sm text-foreground hover:text-primary transition-colors"
                        >
                          {p.value}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            )}

            {(whatsapps.length > 0 ? whatsapps : [{ id: "wa-default", value: "+16468840271", label: "" }]).length > 0 && (
              <ScrollReveal delay={0.15}>
                <div className="group block h-full rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-5 hover:border-primary/40 hover:bg-card transition-all hover:-translate-y-0.5">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">WhatsApp</p>
                  <ul className="space-y-2">
                    {(whatsapps.length > 0
                      ? whatsapps
                      : [{ id: "wa-default", value: "+16468840271", label: "" } as typeof whatsapps[number]]
                    ).map((w) => {
                      const digits = w.value.replace(/[^0-9]/g, "");
                      return (
                        <li key={w.id} className="flex items-center gap-2.5">
                          <span className="relative inline-flex h-2 w-2 flex-shrink-0">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500/70 opacity-75 animate-ping" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgb(16_185_129_/_0.9)]" />
                          </span>
                          <a
                            href={`https://wa.me/${digits}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-heading font-semibold text-sm text-foreground hover:text-primary transition-colors"
                          >
                            {w.value}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </ScrollReveal>
            )}

            <ScrollReveal delay={0.2}>
              <div className="h-full rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-5">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5" />
                </div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Hours</p>
                <p className="font-heading font-semibold text-sm text-foreground">Mon–Sat · 9am–7pm</p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Form + Sidebar */}
      <section id="contact-form" className="pb-14 md:pb-16 scroll-mt-24">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <ScrollReveal className="lg:col-span-3 lg:h-full">
              <div className="relative h-full rounded-3xl border border-border/60 bg-card/70 backdrop-blur-md p-6 md:p-10 shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.4)] flex flex-col">
                <div className="mb-6">
                  <span className="text-primary text-xs font-semibold uppercase tracking-wider">Get a Quote</span>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold mt-2">Send us a message</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Fill out the form and we'll respond within one business day.
                  </p>
                </div>
                <ContactForm slug="contact" />
              </div>
            </ScrollReveal>

            <div className="lg:col-span-2 space-y-5">
              {/* Dynamic Office Locator Widget */}
              <ScrollReveal delay={0.1}>
                <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary animate-bounce" />
                      <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-foreground">
                        Office Locator
                      </h3>
                    </div>
                  </div>

                   {/* Search Input */}
                   <div className="relative">
                     <input
                       type="text"
                       placeholder="Search by city, country, postal code..."
                       value={officeSearchTerm}
                       onChange={(e) => setOfficeSearchTerm(e.target.value)}
                       className="w-full text-xs bg-muted/40 border border-border/50 rounded-xl px-3.5 py-2.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-sans"
                     />
                     {officeSearchTerm && (
                       <button
                         onClick={() => setOfficeSearchTerm("")}
                         className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground"
                       >
                         ✕
                       </button>
                     )}
                   </div>

                   {/* Filtered Single Office Card */}
                   <div>
                     {(() => {
                       const query = officeSearchTerm.toLowerCase().trim();
                       const filtered = offices.filter((o) => {
                         if (query) {
                           return (
                             o.name.toLowerCase().includes(query) ||
                             o.type.toLowerCase().includes(query) ||
                             o.address.toLowerCase().includes(query)
                           );
                         }
                         return true; // Show first active office when search is empty
                       });

                      const activeOffice = filtered[0];

                      if (!activeOffice) {
                        return (
                          <div className="text-center py-4 text-xs text-muted-foreground">
                            No matching offices found
                          </div>
                        );
                      }

                      return (
                        <div className="rounded-xl border border-border/45 bg-muted/15 p-3 hover:border-primary/30 transition-all">
                          <div className="flex items-start gap-2.5">
                            <Globe2 className="w-4 h-4 text-primary mt-1 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-xs text-foreground flex items-center justify-between gap-1">
                                <span className="truncate">{activeOffice.name.replace(/,.*$/, "")}</span>
                                <span className="text-[8px] uppercase font-bold text-muted-foreground bg-muted/65 px-1.5 py-0.5 rounded-md shrink-0">
                                  {activeOffice.visit}
                                </span>
                              </p>
                              <p className="text-[11px] text-muted-foreground leading-normal mt-1 whitespace-pre-line">
                                {activeOffice.address}
                              </p>
                              <a
                                href={mapLinkHref(activeOffice.address)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary text-[10px] font-bold hover:underline inline-flex items-center gap-1 mt-2"
                              >
                                View on map →
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Reset/Showcase All Button */}
                  {officeSearchTerm && (
                    <button
                      onClick={() => setOfficeSearchTerm("")}
                      className="w-full text-center text-xs font-semibold text-primary/95 hover:text-primary hover:underline pt-2 border-t border-border/30"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              </ScrollReveal>

              {(emails.length > 1 || phones.length > 1 || others.length > 0) && (
                <ScrollReveal delay={0.12}>
                  <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6">
                    <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
                      All channels
                    </h3>
                    <ul className="space-y-3 text-sm">
                      {emails.map((e) => (
                        <li key={e.id} className="flex gap-3">
                          <Mail className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">{e.label}</p>
                            <a href={`mailto:${e.value}`} className="text-muted-foreground text-xs hover:text-primary break-all">{e.value}</a>
                          </div>
                        </li>
                      ))}
                      {phones.map((p) => (
                        <li key={p.id} className="flex gap-3">
                          <Phone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">{p.label}</p>
                            <a href={`tel:${p.value.replace(/\s+/g, "")}`} className="text-muted-foreground text-xs hover:text-primary">{p.value}</a>
                          </div>
                        </li>
                      ))}
                      {others.map((o) => (
                        <li key={o.id} className="flex gap-3">
                          <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">{o.label}</p>
                            <p className="text-muted-foreground text-xs break-all">{o.value}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </ScrollReveal>
              )}

              <ScrollReveal delay={0.15}>
                <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-card/60 to-card/30 p-6">
                  <h3 className="font-heading font-semibold text-base mb-2">Prefer a quick chat?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Book a free 15-min discovery call with our solutions team.
                  </p>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:brightness-110 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat on WhatsApp
                  </a>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6">
                  <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
                    Follow us
                  </h3>
                  <SocialIcons size="md" variant="vibrant" />
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* Country eligibility checker */}
      <CountryEligibilityChecker />

      {/* Our Global Offices Section */}
      <section className="pb-16 pt-8 border-t border-border/40 bg-secondary/10 dark:bg-black/5">
        <div className="container-custom">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-primary text-xs font-semibold uppercase tracking-wider">Our Network</span>
            <h2 className="font-heading text-3xl font-bold mt-2">Our Global Offices</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Explore our operations, support, and corporate offices across the globe.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {offices.map((office) => {
              const digits = office.whatsapp.replace(/[^0-9]/g, "");
              const isHq = office.type.toLowerCase().includes("headquarters") || !!office.is_primary;
              
              return (
                <ScrollReveal key={office.name}>
                  <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 md:p-5 shadow-sm flex flex-col justify-between h-full hover:border-primary/40 hover:-translate-y-0.5 transition-all">
                    <div className="space-y-3">
                      {/* Flag + Name + Type */}
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 text-primary">
                          <Globe2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-1.5">
                            {office.name.replace(/,.*$/, "")}
                            {isHq && (
                              <span className="text-[9px] uppercase font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                HQ
                              </span>
                            )}
                          </h3>
                          <p className="text-[11px] font-medium text-muted-foreground">{office.type}</p>
                        </div>
                      </div>

                      {/* Address Box */}
                      <div className="rounded-lg bg-muted/30 border border-border/40 p-3 min-h-[75px] flex items-center">
                        <div className="text-xs leading-relaxed whitespace-pre-line text-foreground/80 font-sans">
                          {office.address}
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {/* Appointment Badge */}
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/10">
                          <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
                          {office.visit}
                        </span>

                        {/* Mail Receiving Badge */}
                        {office.mailReceiving.available ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/10">
                            ✓ Receives Documents & Parcels
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-red-500/10 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full border border-red-500/10">
                            ✕ Mail Receiving Not Available
                          </span>
                        )}
                      </div>

                      {/* Notice */}
                      {office.notice && (
                        <p className="text-[10px] text-muted-foreground italic leading-normal bg-muted/40 p-2 rounded-lg border border-border/30">
                          {office.notice}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-border/40 mt-4">
                      <a
                        href={`https://wa.me/${digits}?text=${encodeURIComponent(office.whatsappPreFill)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-600/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 text-xs font-semibold h-10 px-3 py-2 transition-all"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Book via WhatsApp
                      </a>
                      <a
                        href="#contact-form"
                        className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:brightness-105 text-xs font-semibold h-10 px-3 py-2 transition-all"
                      >
                        Contact Us
                      </a>
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

export default Contact;
