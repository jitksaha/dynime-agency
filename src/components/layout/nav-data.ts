import {
  Globe, Code, TrendingUp, Building2, ShoppingBag,
  FileText, Briefcase, Users, BarChart3, Headphones, FolderKanban,
  Receipt, MessageSquare, Wallet, Palette,
  Search, Mail, Megaphone, Shield, Zap, Layers, Tag,
  Brain, Sparkles, Rocket, BrainCircuit, Workflow, MessagesSquare,
  Home, Info, Phone, LayoutGrid, Package, Handshake, Store,
  Cpu, Wand2, Bug, Bot, Code2, FlaskConical,
  type LucideIcon,
} from "lucide-react";

export type ServiceTabKey = "dws" | "des" | "dms" | "dss" | "dcs" | "dbm" | "resources";

export interface ServiceItem {
  label: string;
  desc: string;
  to: string;
  icon: LucideIcon;
}

export interface ServiceTab {
  label: string;
  sublabel: string;
  color: string;
  icon: LucideIcon;
  items: ServiceItem[];
}

export const serviceTabs: Record<ServiceTabKey, ServiceTab> = {
  dws: {
    label: "DWS - Web Services", sublabel: "Dynime method for web development",
    color: "from-blue-500/15 to-indigo-500/15", icon: Code,
    items: [
      { label: "Web Design & Development", desc: "WordPress, React, Laravel & more", to: "/web-design-development", icon: Globe },
      { label: "WordPress & WooCommerce", desc: "Custom WP sites & online stores", to: "/wordpress-woocommerce", icon: Code },
      { label: "React / MERN Apps", desc: "Modern JS apps & dashboards", to: "/react-mern-apps", icon: Cpu },
      { label: "UI/UX Design", desc: "Design systems & prototypes", to: "/ui-ux-design", icon: Palette },
      { label: "Maintenance & Security", desc: "Updates, backups & hardening", to: "/maintenance-security", icon: Shield },
      { label: "Website Redesign", desc: "Modernize any platform", to: "/website-redesign", icon: Layers },
      { label: "Shopify Development", desc: "Stores, themes & custom apps", to: "/shopify", icon: ShoppingBag },
      { label: "SaaS Development", desc: "Multi-tenant SaaS platforms", to: "/saas-development", icon: Rocket },
      { label: "Webflow Development", desc: "No-code & low-code sites", to: "/webflow-development", icon: Wand2 },
      { label: "Page Speed Optimization", desc: "Sub-3s load on any stack", to: "/speed-optimization", icon: Zap },
    ],
  },
  des: {
    label: "DES - Ecommerce Solution", sublabel: "Dynime solution for scalable online stores",
    color: "from-amber-500/15 to-orange-500/15", icon: ShoppingBag,
    items: [
      { label: "Shopify Ecommerce", desc: "Store build, design, redesign & custom apps", to: "/shopify-ecommerce", icon: ShoppingBag },
      { label: "WordPress Ecommerce", desc: "WooCommerce, Easy Digital Downloads, Surecart", to: "/wordpress-ecommerce", icon: Code },
      { label: "Nodejs / MERN Ecommerce", desc: "High-performance JS, NestJS & React stores", to: "/nodejs-mern-ecommerce", icon: Cpu },
      { label: "Laravel Ecommerce", desc: "Secure, enterprise-grade PHP & Laravel stores", to: "/laravel-ecommerce", icon: Shield },
    ],
  },
  dms: {
    label: "DMS - Marketing Services", sublabel: "Dynime approach to digital growth & SEO",
    color: "from-violet-500/15 to-purple-500/15", icon: Megaphone,
    items: [
      { label: "Social Media Management", desc: "Grow online presence", to: "/social-media", icon: Users },
      { label: "Facebook & Instagram Ads", desc: "Meta Ads that scale", to: "/facebook-ads", icon: Megaphone },
      { label: "Google Ads (PPC)", desc: "Search & display PPC", to: "/google-ads", icon: BarChart3 },
      { label: "SEO Optimization", desc: "Rank #1 on Google", to: "/seo", icon: Search },
      { label: "Brand Strategy", desc: "Identity & positioning", to: "/brand-strategy", icon: Briefcase },
      { label: "Content Marketing", desc: "Blogs & lead magnets", to: "/content-marketing", icon: FileText },
      { label: "Email Marketing", desc: "Drip campaigns", to: "/email-marketing", icon: Mail },
      { label: "Analytics & CRO", desc: "Data-driven growth", to: "/analytics", icon: TrendingUp },
    ],
  },
  dss: {
    label: "DSS - Software & AI", sublabel: "Dynime custom software & AI",
    color: "from-cyan-500/15 to-sky-500/15", icon: Cpu,
    items: [
      { label: "AI Software Development", desc: "AI-first scalable apps", to: "/ai-software-development", icon: Brain },
      { label: "Custom Software Development", desc: "Web, SaaS & internal tools", to: "/custom-software-development", icon: Code2 },
      { label: "Software Built With AI (AI-Augmented Development)", desc: "AI-augmented engineering", to: "/software-built-with-ai", icon: Sparkles },
      { label: "Software Testing & QA", desc: "Automated & manual QA", to: "/software-testing-qa", icon: FlaskConical },
      { label: "Dynime Pay (Self-Hosted)", desc: "Open-source payment gateway · 46 rails", to: "/pay-open-source", icon: Wallet },
      { label: "DSS Hub", desc: "All software & AI services", to: "/services/dss", icon: LayoutGrid },
    ],
  },
  dcs: {
    label: "DCS - Consultancy Services", sublabel: "Dynime company formation",
    color: "from-emerald-500/15 to-teal-500/15", icon: Briefcase,
    items: [
      { label: "US Company Formation", desc: "LLC, C-Corp, EIN & compliance", to: "/us-company", icon: Building2 },
      { label: "UK Company Formation", desc: "Ltd setup, VAT & filings", to: "/uk-company", icon: Building2 },
      { label: "US & UK Business Address", desc: "US & UK registered office", to: "/virtual-address", icon: Globe },
      { label: "ITIN Application Services", desc: "IRS ITIN for non-residents", to: "/itin-services", icon: FileText },
      { label: "Dropshipping Solution", desc: "Stores, suppliers & ads", to: "/dropshipping-solution", icon: Package },
      { label: "Marketplace Selling Solution", desc: "Amazon, Walmart, eBay & more", to: "/marketplace-solution", icon: Store },
      { label: "Payment Gateway Setup", desc: "Stripe, PayPal & merchant accounts", to: "/payment-gateway", icon: Wallet },
      { label: "Business Consulting", desc: "Strategy, scaling & growth", to: "/consulting", icon: Briefcase },
    ],
  },
  dbm: {
    label: "Dynime OS", sublabel: "AI-Powered Business OS",
    color: "from-amber-500/15 to-orange-500/15", icon: Rocket,
    items: [
      { label: "Explore Dynime OS", desc: "AI-powered business operating system", to: "/products/os", icon: Rocket },
      { label: "Dynime Pay (Self-Hosted)", desc: "Open-source payment gateway", to: "/pay-open-source", icon: Wallet },
      { label: "Dynime CRM", desc: "Leads, deals & pipelines", to: "/products/os#crm", icon: Briefcase },
      { label: "Dynime HRM", desc: "Employees, attendance & payroll", to: "/products/os#hrm", icon: Users },
      { label: "Dynime Sales", desc: "Quotes, orders & POS", to: "/products/os#sales", icon: ShoppingBag },
      { label: "Dynime Finance", desc: "Invoicing, expenses & reports", to: "/products/os#finance", icon: Receipt },
      { label: "Dynime Projects", desc: "Kanban, Gantt & time tracking", to: "/products/os#projects", icon: FolderKanban },
      { label: "Dynime Inventory", desc: "Stock, warehouse & SKUs", to: "/products/os#inventory", icon: Layers },
      { label: "Dynime AI", desc: "AI copilots across modules", to: "/products/os#ai", icon: Rocket },
      { label: "Dynime Support", desc: "Tickets, SLA & customer portal", to: "/products/os#support", icon: Headphones },
    ],
  },
  resources: {
    label: "Resources", sublabel: "Learn & Connect",
    color: "from-rose-500/15 to-pink-500/15", icon: FileText,
    items: [
      { label: "Blog", desc: "Tips & guides", to: "/blog", icon: FileText },
      { label: "Portfolio", desc: "Our case studies", to: "/portfolio", icon: FolderKanban },
      { label: "Contact Us", desc: "Get in touch", to: "/contact", icon: MessageSquare },
      { label: "About Dynime", desc: "Story & mission", to: "/about", icon: Users },
    ],
  },
};

export const serviceTabOrder: ServiceTabKey[] = ["dws", "des", "dms", "dss", "dcs"];

// ───────────────────────── Dynime OS mega menu ─────────────────────────
export type OsTabKey =
  | "core"
  | "ai"
  | "commerce"
  | "finance"
  | "hr"
  | "comms";

export interface OsTab {
  label: string;
  sublabel: string;
  color: string;
  icon: LucideIcon;
  items: ServiceItem[];
}

export const osTabs: Record<OsTabKey, OsTab> = {
  core: {
    label: "Core Suite", sublabel: "Run the whole business",
    color: "from-indigo-500/15 to-violet-500/15", icon: Briefcase,
    items: [
      { label: "Dynime CRM", desc: "Leads, deals & pipelines", to: "/products/os#crm", icon: Briefcase },
      { label: "Dynime HRM", desc: "Employees, attendance & payroll", to: "/products/os#hrm", icon: Users },
      { label: "Dynime Projects", desc: "Tasks, milestones & teams", to: "/products/os#projects", icon: FolderKanban },
      { label: "Dynime Helpdesk", desc: "Tickets, SLA & knowledge base", to: "/products/os#support", icon: Headphones },
      { label: "Dynime Documents", desc: "Centralized file storage", to: "/products/os#documents", icon: FileText },
      { label: "Dynime Reports", desc: "BI dashboards & analytics", to: "/products/os#reports", icon: BarChart3 },
    ],
  },
  ai: {
    label: "AI & Automation", sublabel: "AI copilots & workflows",
    color: "from-fuchsia-500/15 to-purple-500/15", icon: Sparkles,
    items: [
      { label: "AI Social Agent", desc: "Auto-reply on IG, FB, WhatsApp 24/7", to: "/products/os#ai-social", icon: Bot },
      { label: "Dynime AI", desc: "AI copilots across modules", to: "/products/os#ai", icon: Brain },
      { label: "Dynime Workflows", desc: "Drag-and-drop automation builder", to: "/products/os#workflows", icon: Workflow },
    ],
  },
  commerce: {
    label: "Commerce & POS", sublabel: "Sell anywhere",
    color: "from-amber-500/15 to-orange-500/15", icon: ShoppingBag,
    items: [
      { label: "Dynime Sales", desc: "Quotes, orders & POS", to: "/products/os#sales", icon: ShoppingBag },
      { label: "Dynime Inventory", desc: "Stock, warehouse & SKUs", to: "/products/os#inventory", icon: Layers },
      { label: "Dynime Procurement", desc: "Vendors, POs & purchasing", to: "/products/os#procurement", icon: Package },
    ],
  },
  finance: {
    label: "Finance", sublabel: "Invoicing & accounting",
    color: "from-emerald-500/15 to-green-500/15", icon: Receipt,
    items: [
      { label: "Dynime Accounting", desc: "Invoicing, expenses & reporting", to: "/products/os#finance", icon: Receipt },
      { label: "Dynime Pay (Self-Hosted)", desc: "Open-source payment gateway · 46 rails", to: "/pay-open-source", icon: Wallet },
      { label: "Dynime Compliance", desc: "Tax, audit & policy controls", to: "/products/os#compliance", icon: Shield },
    ],
  },
  hr: {
    label: "HR & People", sublabel: "Hire, manage & pay",
    color: "from-rose-500/15 to-pink-500/15", icon: Users,
    items: [
      { label: "Dynime HRM", desc: "Employees, attendance & payroll", to: "/products/os#hrm", icon: Users },
      { label: "Recruitment", desc: "Jobs, ATS & onboarding", to: "/products/os#recruitment", icon: Briefcase },
      { label: "Payroll", desc: "Salaries, slips & taxes", to: "/products/os#payroll", icon: Wallet },
    ],
  },
  comms: {
    label: "Communication", sublabel: "Talk to everyone",
    color: "from-sky-500/15 to-cyan-500/15", icon: MessagesSquare,
    items: [
      { label: "Dynime Marketing", desc: "Campaigns, email & analytics", to: "/products/os#marketing", icon: Megaphone },
      { label: "Inbox & Chat", desc: "Unified team & customer inbox", to: "/products/os#inbox", icon: MessageSquare },
      { label: "Email Marketing", desc: "Drip campaigns & broadcasts", to: "/products/os#email", icon: Mail },
    ],
  },
};

export const osTabOrder: OsTabKey[] = ["core", "ai", "commerce", "finance", "hr", "comms"];

export interface PrimaryNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export const primaryNav: PrimaryNavItem[] = [
  { label: "Home", to: "/", icon: Home },
  { label: "About", to: "/about", icon: Info },
  { label: "Pricing", to: "/services-pricing", icon: Tag },
  { label: "Portfolio", to: "/portfolio", icon: FolderKanban },
  { label: "Blog", to: "/blog", icon: FileText },
  { label: "FlexPay", to: "/flexpay", icon: Wallet },
  { label: "Careers", to: "/careers", icon: Briefcase },
  { label: "Contact", to: "/contact", icon: Phone },
];

export const SERVICES_LABEL = "Services";
export const SERVICES_ICON = LayoutGrid;
