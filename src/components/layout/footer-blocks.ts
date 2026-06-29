// Block-based footer model. Stored in site_settings.footer_blocks as JSON.
// The Footer renders blocks in order; the admin builder edits them generically.

export type LinkItem = { label: string; to: string };

export type FooterLocation = {
  id: string;
  flag: string;
  city: string;
  address: string;
  note?: string;
};

export type FooterContact = {
  id: string;
  type: "phone" | "email";
  value: string;
};

export type FooterBlockBase = {
  id: string;
  type: FooterBlockType;
  visible?: boolean;
  width?: "narrow" | "default" | "wide" | "full"; // grid hint
};

export type FooterBlockType =
  | "brand"
  | "tagline"
  | "links"
  | "locations"
  | "contacts"
  | "social"
  | "payments"
  | "copyright"
  | "divider";

export type BrandBlock = FooterBlockBase & {
  type: "brand";
  showLogo?: boolean;
  description?: string;
};

export type TaglineBlock = FooterBlockBase & {
  type: "tagline";
  text: string;
  ctaLabel?: string;
  ctaTo?: string;
};

export type LinksBlock = FooterBlockBase & {
  type: "links";
  title: string;
  links: LinkItem[];
};

export type LocationsBlock = FooterBlockBase & {
  type: "locations";
  title?: string;
  items: FooterLocation[];
};

export type ContactsBlock = FooterBlockBase & {
  type: "contacts";
  title?: string;
  items: FooterContact[];
};

export type SocialBlock = FooterBlockBase & {
  type: "social";
  title?: string;
};

export type PaymentsBlock = FooterBlockBase & {
  type: "payments";
  badges: string[]; // labels
};

export type CopyrightBlock = FooterBlockBase & {
  type: "copyright";
  text: string; // {year} placeholder supported
};

export type DividerBlock = FooterBlockBase & {
  type: "divider";
};

export type FooterBlock =
  | BrandBlock
  | TaglineBlock
  | LinksBlock
  | LocationsBlock
  | ContactsBlock
  | SocialBlock
  | PaymentsBlock
  | CopyrightBlock
  | DividerBlock;

export const generateBlockId = () =>
  `b_${Math.random().toString(36).substring(2, 9)}`;

// Compact default — info-rich footer WITHOUT the bulky "services" link columns
// (those live in the header mega menu already). Two visual rows:
//   row 1: brand + tagline | policy links | contacts + social
//   row 2: copyright + payment badges
export const defaultFooterBlocks: FooterBlock[] = [
  {
    id: "blk-brand",
    type: "brand",
    visible: true,
    width: "default",
    showLogo: true,
    description: "Your Digital Business Solution Partner — websites, e-commerce & growth.",
  },
  {
    id: "blk-policy",
    type: "links",
    visible: true,
    width: "narrow",
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Portfolio", to: "/portfolio" },
      { label: "Contact", to: "/contact" },
      { label: "Investment Plans", to: "/invest" },
      { label: "Investor Relations", to: "/investor-relations" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
      { label: "Refund Policy", to: "/refund" },
    ],
  },
  {
    id: "blk-contacts",
    type: "contacts",
    visible: true,
    width: "default",
    title: "Get in touch",
    items: [
      { id: "c1", type: "phone", value: "+13322827782" },
      { id: "c2", type: "email", value: "contact@dynime.com" },
    ],
  },
  {
    id: "blk-social",
    type: "social",
    visible: true,
    width: "narrow",
    title: "Follow us",
  },
  { id: "blk-divider", type: "divider", visible: true, width: "full" },
  {
    id: "blk-copyright",
    type: "copyright",
    visible: true,
    width: "default",
    text: "© 2019-{year} Dynime LLC. All rights reserved.",
  },
  {
    id: "blk-payments",
    type: "payments",
    visible: true,
    width: "default",
    badges: ["Visa", "Mastercard", "PayPal", "Stripe", "bKash", "Nagad"],
  },
];

// Migrate legacy site_settings keys (footer_columns, footer_locations, etc.)
// into the new block model. Returns null if nothing to migrate.
export const migrateLegacyFooter = (
  settings: Record<string, string> | undefined,
): FooterBlock[] | null => {
  if (!settings) return null;
  const blocks: FooterBlock[] = [];

  // Brand + tagline at the top
  blocks.push({
    id: generateBlockId(),
    type: "brand",
    visible: true,
    width: "default",
    showLogo: true,
    description: settings.footer_tagline || "",
  });

  // Skip footer_columns on purpose (services already in header mega menu).
  // If the user explicitly wants them back they can add a "links" block.

  let parsed: unknown;
  try {
    parsed = settings.footer_policy_links ? JSON.parse(settings.footer_policy_links) : null;
  } catch {
    parsed = null;
  }
  if (Array.isArray(parsed) && parsed.length) {
    blocks.push({
      id: generateBlockId(),
      type: "links",
      visible: true,
      width: "narrow",
      title: "Company",
      links: parsed as LinkItem[],
    });
  }

  try {
    parsed = settings.footer_locations ? JSON.parse(settings.footer_locations) : null;
  } catch {
    parsed = null;
  }
  if (Array.isArray(parsed) && parsed.length) {
    blocks.push({
      id: generateBlockId(),
      type: "locations",
      visible: true,
      width: "wide",
      title: "Offices",
      items: parsed as FooterLocation[],
    });
  }

  try {
    parsed = settings.footer_contacts ? JSON.parse(settings.footer_contacts) : null;
  } catch {
    parsed = null;
  }
  if (Array.isArray(parsed) && parsed.length) {
    blocks.push({
      id: generateBlockId(),
      type: "contacts",
      visible: true,
      width: "default",
      title: "Get in touch",
      items: parsed as FooterContact[],
    });
  }

  blocks.push({
    id: generateBlockId(),
    type: "social",
    visible: true,
    width: "narrow",
    title: "Follow us",
  });

  blocks.push({ id: generateBlockId(), type: "divider", visible: true, width: "full" });

  blocks.push({
    id: generateBlockId(),
    type: "copyright",
    visible: true,
    width: "default",
    text: `© 2019-{year} ${settings.footer_copyright || "Dynime LLC."}. All rights reserved.`,
  });

  const badges = (settings.footer_payment_badges || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  blocks.push({
    id: generateBlockId(),
    type: "payments",
    visible: true,
    width: "default",
    badges: badges.length ? badges : ["Visa", "Mastercard", "PayPal", "Stripe", "bKash", "Nagad"],
  });

  return blocks;
};

export const parseFooterBlocks = (
  raw: string | undefined | null,
  settings?: Record<string, string>,
): FooterBlock[] => {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed as FooterBlock[];
    } catch { /* fall through */ }
  }
  // Try legacy migration so existing customised footers still render.
  const migrated = migrateLegacyFooter(settings);
  if (migrated && migrated.length) return migrated;
  return defaultFooterBlocks;
};

export const widthToColSpan = (w: FooterBlock["width"] = "default") => {
  switch (w) {
    case "narrow":
      return "md:col-span-3";
    case "wide":
      return "md:col-span-6";
    case "full":
      return "md:col-span-12";
    default:
      return "md:col-span-4";
  }
};
