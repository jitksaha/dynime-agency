import { SERVICE_PRICING_PACKS } from "../src/data/service-pricing-packs";

const CATEGORIES = {
  dws: [
    ["web-design-development", "Web Design & Development", "wordpress-design"],
    ["wordpress-woocommerce", "WordPress & WooCommerce", "woocommerce"],
    ["react-mern-apps", "React / MERN Apps", "custom-web-apps"],
    ["ui-ux-design", "UI/UX Design", "ui-ux-design"],
    ["maintenance-security", "Maintenance & Security", "wordpress-maintenance"],
    ["website-redesign", "Website Redesign", "website-redesign"],
    ["shopify", "Shopify Development", "shopify"],
    ["saas-development", "SaaS Development", "custom-web-apps"],
    ["webflow-development", "Webflow Development", "ui-ux-design"],
    ["speed-optimization", "Page Speed Optimization", "speed-optimization"],
  ],
  dms: [
    ["social-media", "Social Media", "social-media"],
    ["facebook-ads", "Meta Ads", "facebook-ads"],
    ["google-ads", "Google Ads", "google-ads"],
    ["seo", "SEO", "seo"],
    ["brand-strategy", "Brand Strategy", "brand-strategy"],
    ["content-marketing", "Content Marketing", "content-marketing"],
    ["email-marketing", "Email Marketing", "email-marketing"],
    ["analytics", "Analytics & CRO", "analytics"],
  ],
  dss: [
    ["ai-software-development", "AI Software Development", "ai-software-development"],
    ["custom-software-development", "Custom Software Development", "custom-software-development"],
    ["software-built-with-ai", "Software Built With AI", "software-built-with-ai"],
    ["software-testing-qa", "Software Testing & QA", "software-testing-qa"],
    ["pay-open-source", "Dynime Pay (Self-Hosted)", "payment-gateway"],
  ],
  dcs: [
    ["us-company", "US Company Formation", "us-company"],
    ["uk-company", "UK Company Formation", "uk-company"],
    ["virtual-address", "US & UK Business Address", "virtual-address"],
    ["itin-services", "ITIN Application Services", "itin-services"],
    ["dropshipping-solution", "Dropshipping Solution", "dropshipping-solution"],
    ["marketplace-solution", "Marketplace Selling Solution", "marketplace-solution"],
    ["payment-gateway", "Payment Gateway Setup", "payment-gateway"],
    ["consulting", "Business Consulting", "consulting"],
  ],
} as const;

const quoteSettings = {
  enable_contact: true,
  enable_modal: true,
  enable_whatsapp: false,
  whatsapp_number: "",
  quote_message: "Tell us about your project and we'll send a tailored quote within 24 hours.",
};

const lines: string[] = [];
let counter = 0;
for (const [, services] of Object.entries(CATEGORIES)) {
  for (const [slug, title, pack] of services) {
    const builder = SERVICE_PRICING_PACKS[pack];
    if (!builder) { console.error("MISSING PACK:", pack); continue; }
    const tiers = builder().map((t) => ({ ...t, id: `${slug}-tier-${Math.random().toString(36).slice(2, 10)}` }));
    const tiersSql = JSON.stringify(tiers).replace(/'/g, "''");
    const qsSql = JSON.stringify(quoteSettings).replace(/'/g, "''");
    const titleSql = title.replace(/'/g, "''");
    lines.push(`('${slug}','${titleSql}',true,'${tiersSql}'::jsonb,'${qsSql}'::jsonb)`);
    counter++;
  }
}

const sql = `INSERT INTO public.service_pricing (service_slug, service_title, is_enabled, tiers, quote_settings) VALUES\n${lines.join(",\n")}\nON CONFLICT (service_slug) DO UPDATE SET service_title=EXCLUDED.service_title, is_enabled=EXCLUDED.is_enabled, tiers=EXCLUDED.tiers, quote_settings=EXCLUDED.quote_settings, updated_at=now();`;

await Bun.write("/tmp/seed-pricing.sql", sql);
console.log(`Generated SQL for ${counter} services -> /tmp/seed-pricing.sql (${sql.length} bytes)`);
