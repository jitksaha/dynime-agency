import { useState } from "react";
import { Link } from "react-router-dom";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard, ShoppingBag, MessageSquare, Mail, Shield, Briefcase,
  Users, CreditCard, Settings, Search, ChevronRight, ChevronDown,
  BookOpen, Lightbulb, AlertTriangle, Info, CheckCircle2, Zap,
  FileText, DollarSign, Globe, TrendingUp, BarChart3, Bell, Lock,
  Phone, Building2, IdCard, Wallet, GitMerge, Layers, PieChart,
  Tag, Receipt, Wand2, ScrollText, UserCog, Package, ExternalLink,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DocSection {
  id: string;
  title: string;
  icon: any;
  color: string;
  badge?: string;
  description: string;
  articles: DocArticle[];
}

interface DocArticle {
  title: string;
  content: string;
  tips?: string[];
  warnings?: string[];
  steps?: string[];
  link?: string;
}

// ─── Documentation Content ────────────────────────────────────────────────────
const DOC_SECTIONS: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: LayoutDashboard,
    color: "from-blue-500 to-indigo-600",
    description: "Overview of the Dynime Management Console and how to navigate it.",
    articles: [
      {
        title: "Admin Console Overview",
        content:
          "The Dynime Management Console is a full-featured SaaS admin panel that controls every aspect of your business — from orders and HR to SEO and WhatsApp notifications. Access it at /superadmin/login using your admin credentials.",
        steps: [
          "Navigate to dynime.com/superadmin/login",
          "Enter your Super Admin email and password",
          "You will be redirected to the Dashboard automatically",
          "Use the sidebar on the left to navigate between sections",
        ],
      },
      {
        title: "Role-Based Access",
        content:
          "The console supports multiple roles: super_admin (full access), manager (commerce + HR), and hr (HR sections only). Your active role is shown in the bottom-left user card. Locked menu items display a padlock and show an error toast when clicked.",
        tips: ["Super Admin is the only role that can access Site Settings and WhatsApp Config.", "To change a user's role, go to User Management under the Content section."],
      },
      {
        title: "Sidebar Navigation",
        content:
          "The sidebar has collapsible groups: Overview, Verification, Commerce, Engagement, Investments, Content, and System. Parent items expand/collapse with a click. The sidebar can be fully collapsed to icon-only mode using the arrow button in the top bar.",
        tips: ["Use the search box at the top of the sidebar to instantly jump to any section.", "Your open/collapsed sidebar state is saved across page refreshes."],
      },
    ],
  },
  {
    id: "orders",
    title: "Orders Management",
    icon: ShoppingBag,
    color: "from-orange-500 to-amber-500",
    description: "Create, manage, and track orders including invoicing, payments, and refunds.",
    articles: [
      {
        title: "Viewing & Filtering Orders",
        content:
          "The Orders list (/superadmin/orders) shows all orders with real-time updates every 4 seconds. Filter by status (pending, paid, confirmed, processing, completed, cancelled, refunded) and search by invoice number, customer name, or email.",
        tips: ["Click the eye icon on any row to get a quick-view panel without leaving the page.", "Use the WhatsApp (green) button on each row to instantly notify the customer about their order status."],
      },
      {
        title: "Order Detail & Status Updates",
        content:
          "Click any order to open its full detail page. From here you can change the order status via the dropdown — changing to 'processing' or 'completed' automatically dispatches a transactional email to the customer. The verification sidebar shows payment signature validity, server-query status, and invoice mismatch checks.",
        steps: [
          "Open an order from the orders list",
          "Use the status dropdown (top-right) to update the order phase",
          "An email is automatically sent for 'processing' and 'completed' status changes",
          "Click the WhatsApp button to send a WhatsApp notification with order details pre-filled",
          "Use 'Refund' to issue a full or partial refund (with optional reason)",
        ],
      },
      {
        title: "Invoices & PDF Export",
        content:
          "Every order has an auto-generated invoice accessible at /invoice/{invoice_number}. Use the 'Invoice' button on the order detail page to open it in a new tab. Use 'PDF' to trigger the browser print dialog for a clean, branded PDF. The 'Copy link' button copies the public invoice URL for sharing with clients.",
        tips: ["The public invoice URL (dynime.com/invoice/INV-…) can be shared directly with customers.", "Use the 'Copy link' button on each order row to share instantly without opening the detail page."],
      },
      {
        title: "Creating New Orders",
        content:
          "Go to /superadmin/orders/new to manually create an order for a customer. Select services, set quantities, apply coupons, choose currency, and add customer details. Orders created here follow the same lifecycle as checkout orders.",
      },
      {
        title: "Bulk Delete & Import/Export",
        content:
          "Select orders using the checkbox column, then use the bulk delete button. Export all orders as JSON using the Download button in the toolbar. Import orders from a previously exported JSON file using the Upload button — existing orders (matched by ID or invoice number) will be overwritten.",
        warnings: ["Bulk delete is permanent and cannot be undone.", "Import will overwrite existing orders if their IDs match."],
      },
      {
        title: "Recurring Services Health",
        content:
          "Below the orders table, the Recurring Health Widget shows all active recurring service subscriptions, their renewal dates, and health status. Use the 'Send WhatsApp' button next to any recurring service to send a renewal reminder directly from the portal.",
      },
    ],
  },
  {
    id: "whatsapp",
    title: "WhatsApp Notifications",
    icon: MessageSquare,
    color: "from-emerald-500 to-green-600",
    badge: "New",
    description: "Send templated or custom WhatsApp messages to customers via Meta Cloud API.",
    articles: [
      {
        title: "WhatsApp API Setup",
        content:
          "Go to Site Settings → WhatsApp Config (/superadmin/whatsapp-portal?tab=config). Enter your Meta Business Cloud Phone Number ID and Permanent System User Access Token. Toggle the 'Enable WhatsApp Notifications' switch to activate the service.",
        steps: [
          "Go to Meta for Developers (developers.facebook.com)",
          "Create a Meta App and add WhatsApp Business",
          "Copy the Phone Number ID from your WhatsApp setup",
          "Generate a Permanent System User Token from Business Settings → Users → System Users",
          "Paste both values into Site Settings → WhatsApp Config",
          "Click 'Save Configuration'",
        ],
        warnings: ["Never share your access token. It grants full send access to your WhatsApp number.", "Use a Permanent System User token, not a temporary user token — it expires."],
      },
      {
        title: "Message Templates",
        content:
          "The Templates tab lets you customize the message body for each notification type. Variables are referenced as {{1}}, {{2}}, etc. and are mapped to human-readable field labels. Changes are saved to the database and immediately reflected in all Send dialogs across the admin panel.",
        tips: [
          "Template keys: order_update, payment_link, recurring_service, job_confirmation, id_verification, credit_application",
          "Custom Message mode lets you type a free-text message without using a template.",
          "Variable autofill automatically populates fields based on the selected record when opening a Send dialog from a page.",
        ],
      },
      {
        title: "Sending Notifications",
        content:
          "Every major section has a WhatsApp send button (green MessageSquare icon). Clicking it opens the Send Dialog pre-filled with the relevant data (customer name, status, etc.). You can review and edit the message before sending.",
        tips: [
          "Orders list rows — send order_update pre-filled with customer name, invoice, and status",
          "Job Applications — send job_confirmation with applicant name and role",
          "ID Verification rows — send id_verification with customer name and KYC/KYB status",
          "Credit Applications — send credit_application with applicant info and approval status",
          "FlexPay applications — send credit_application updates",
          "Verification Details page — send verification link notification",
        ],
      },
      {
        title: "Delivery Logs",
        content:
          "The Delivery Logs tab in the WhatsApp Portal shows all sent messages with timestamp, template used, recipient phone, delivery status (Dispatched / Failed), and the message ID returned by Meta. Use the search bar to filter by phone number or template name.",
      },
    ],
  },
  {
    id: "email",
    title: "Email Portal",
    icon: Mail,
    color: "from-violet-500 to-purple-600",
    badge: "Hub",
    description: "Manage transactional emails, SMTP settings, routing rules, and delivery logs.",
    articles: [
      {
        title: "Email Portal Overview",
        content:
          "The Email Portal (/superadmin/email-portal) has six tabs: Email Logs, SMTP Settings, Email Routing, Sender Identities, Notification Prefs, and Suppressed. All transactional emails (order confirmations, status updates, job application receipts) are dispatched through this engine.",
      },
      {
        title: "SMTP Configuration",
        content:
          "Go to Email Portal → SMTP Settings to configure your outbound email server. Enter your SMTP host, port, username, password, and encryption type (TLS/SSL). Test the connection before saving.",
        warnings: ["Always test your SMTP settings before going live to avoid email delivery failures."],
      },
      {
        title: "Email Routing & Sender Identities",
        content:
          "Set which email address is used for which notification category (orders, HR, marketing, etc.) under Email Routing. Define verified Sender Identities (from-address + display name) to control what customers see in their inbox.",
      },
      {
        title: "Suppressed Addresses",
        content:
          "The Suppressed tab lists email addresses that have opted out or hard-bounced. The system automatically skips these addresses when dispatching transactional emails. You can manually add or remove addresses from this list.",
      },
    ],
  },
  {
    id: "verifications",
    title: "Identity Verification (Didit)",
    icon: Shield,
    color: "from-blue-600 to-cyan-500",
    badge: "KYC/KYB",
    description: "Manage customer KYC and business KYB verification sessions powered by Didit.",
    articles: [
      {
        title: "Verification Dashboard",
        content:
          "The Verifications page (/superadmin/verifications) shows a stats overview (total, KYC, KYB, approved, pending, declined, expired) and a table of all verification requests. Filter by type (KYC / KYB) and status (verified, pending, declined).",
      },
      {
        title: "Verification Request Actions",
        content:
          "Each row has three action buttons: Copy Link (copies the Didit verification URL to clipboard), Open Link (opens the verification URL in a new tab for review), WhatsApp (sends a notification to the customer), and View Details (opens the full dossier page).",
        tips: ["Use 'Sync All Pending' at the top to bulk-sync all pending sessions with the Didit API."],
      },
      {
        title: "Verification Details Dossier",
        content:
          "The detail page (/superadmin/verifications/:id) shows the full compliance dossier: customer info, verification status badge, QR code for the verification link, action buttons (Sync, Resend Email, Send WhatsApp), and an Audit Trail timeline of all lifecycle events.",
        steps: [
          "Click the arrow button on any verification row to open the dossier",
          "Use 'Sync Status with Didit' to pull the latest status from the provider API",
          "Use 'Resend Email Notification' to re-send the verification link email",
          "Use 'Send via WhatsApp' to open the WhatsApp dialog pre-filled with customer info",
          "Download the QR code as PNG for sharing in documents",
        ],
      },
      {
        title: "ID Cards Management",
        content:
          "The ID Cards section (/superadmin/id-cards) manages ID card assignments for customers. Each card record has a status, and you can send WhatsApp notifications about status updates directly from the action panel.",
      },
    ],
  },
  {
    id: "hr",
    title: "HR & Employees",
    icon: Briefcase,
    color: "from-pink-500 to-rose-600",
    badge: "Hub",
    description: "Full HR suite: employees, payroll, attendance, leave management, and job postings.",
    articles: [
      {
        title: "Employee Management",
        content:
          "The HR Hub (/superadmin/hr) has three tabs: Employees (full roster with contract types, departments, and status), Document Builder (generate employment contracts, offer letters, etc. with variable substitution), and Documents History (all previously generated documents).",
      },
      {
        title: "Job Posts & Applications",
        content:
          "Manage job postings under HR → Job Posts (/superadmin/careers). Publish, archive, or edit open roles. Applications flow into Job Applications (/superadmin/careers/applications) where you can review, change status, run ATS scans, and send WhatsApp notifications.",
        tips: [
          "Change application status (new → reviewing → shortlisted → interview → offer → hired → rejected) using the status dropdown.",
          "Click 'ATS Scan' on any application to run the AI-powered resume scanner against the job description.",
          "The ATS score, match level, detected skills, and red flags are shown in the application detail panel.",
        ],
      },
      {
        title: "Payroll",
        content:
          "The Payroll module (/superadmin/payroll) calculates gross and net pay for all active employees based on salary data, allowances, deductions, and tax rates. Generate payslips and export payroll reports as CSV or PDF.",
      },
      {
        title: "Attendance & Leave",
        content:
          "Track daily attendance and manage leave requests under HR Extras (/superadmin/hr-extras). Approve or reject leave requests, view monthly attendance summaries, and export records.",
      },
      {
        title: "Employee Requests",
        content:
          "Employee self-service requests (document requests, time-off, etc.) flow into HR Requests (/superadmin/hr-requests) where HR staff can review and action each request.",
      },
    ],
  },
  {
    id: "flexpay-credit",
    title: "FlexPay & Credit",
    icon: Wallet,
    color: "from-teal-500 to-cyan-600",
    badge: "New",
    description: "Buy Now Pay Later (BNPL) applications and credit limit review for customers.",
    articles: [
      {
        title: "FlexPay Applications",
        content:
          "The FlexPay portal (/superadmin/flexpay) lists all BNPL applications submitted by customers. Each application shows the requested plan, monthly amount, applicant details, and current approval status. Use the status dropdown to approve, reject, or request more info.",
        tips: ["Click the WhatsApp button on any FlexPay row to send a credit_application template notification to the customer."],
      },
      {
        title: "Credit Limit Applications",
        content:
          "The Credit Review page (/superadmin/credit-review) handles business credit limit applications. Review the requested limit, business revenue, and industry, then take action: Approve, Reject, or Request Info. Add admin notes for internal tracking.",
        steps: [
          "Review the requested credit limit and business revenue",
          "Add internal admin notes if needed",
          "Click Approve, Reject, or Request info",
          "Click the WhatsApp button to notify the applicant instantly",
        ],
      },
    ],
  },
  {
    id: "commerce",
    title: "Commerce & Payments",
    icon: CreditCard,
    color: "from-green-600 to-emerald-500",
    description: "Payment gateways, pricing, coupons, tax settings, and FX orders.",
    articles: [
      {
        title: "Payment Gateways",
        content:
          "Configure all payment providers under Payment Gateways (/superadmin/payment-gateways). Supported gateways include Stripe, PayPal, Flutterwave, Paystack, Razorpay, Cryptomus (crypto), bank transfer, and manual payment. Enable/disable providers and enter API keys.",
        warnings: ["Always use test keys in development. Switch to live keys only in production.", "Webhook secrets must match exactly what you configure on the payment provider's dashboard."],
      },
      {
        title: "Pricing & Coupons",
        content:
          "Set service prices under Pricing (/superadmin/pricing) and USA state-specific fees under USA State Fees. Create discount coupons under Coupons — each coupon has a code, discount type (percentage / fixed), value, max uses, and expiry date.",
      },
      {
        title: "Tax & VAT",
        content:
          "Configure tax rates per country and service type under Tax & VAT (/superadmin/tax-settings). Taxes are automatically applied at checkout based on the customer's billing country. Refund calculations include proportional VAT refunds.",
      },
      {
        title: "FX Orders",
        content:
          "FX Orders (/superadmin/fx-orders) handles foreign exchange transactions placed through the Dynime platform. Review exchange rates, amounts, and statuses. Update the order status to trigger customer notifications.",
      },
      {
        title: "Agreement Builder",
        content:
          "Generate client agreements and contracts in the Agreement Builder (/superadmin/agreement-builder). Choose a template, fill in variable fields, preview the document, and download as PDF. Agreements are linked to orders and customers.",
      },
    ],
  },
  {
    id: "crm",
    title: "CRM",
    icon: Users,
    color: "from-indigo-500 to-violet-600",
    badge: "New",
    description: "Full CRM suite: leads, pipeline, activities, automations, and email templates.",
    articles: [
      {
        title: "CRM Dashboard",
        content:
          "The CRM Dashboard (/superadmin/crm) shows an overview of your sales pipeline: total leads, deals by stage, conversion rates, and recent activity. Widgets update in real-time.",
      },
      {
        title: "Leads Management",
        content:
          "The Leads page (/superadmin/crm/leads) lists all incoming leads with contact info, source, status, and assigned rep. Add notes, change stage, and link leads to orders.",
      },
      {
        title: "Pipeline & Deals",
        content:
          "The Pipeline view (/superadmin/crm/pipeline) shows a Kanban board of all active deals across stages (Prospect → Qualified → Proposal → Negotiation → Closed). Drag and drop cards to update stages.",
      },
      {
        title: "Automations",
        content:
          "Set up trigger-based automations (/superadmin/crm/automations) that fire emails or tasks when a lead reaches a certain stage or condition. The Automation Editor allows building multi-step workflows with conditions and delays.",
        tips: ["Automations support email, internal task, and webhook action types."],
      },
    ],
  },
  {
    id: "seo",
    title: "SEO & Ranking",
    icon: TrendingUp,
    color: "from-amber-500 to-orange-500",
    badge: "Hub",
    description: "Full SEO suite: page meta, rules, Search Console, keyword tracker, and OG validator.",
    articles: [
      {
        title: "SEO Dashboard",
        content:
          "The SEO Dashboard (/superadmin/seo-dashboard) gives a real-time health overview of all indexed pages: title tag coverage, meta description coverage, OG image presence, and canonical status.",
      },
      {
        title: "Page SEO Editor",
        content:
          "Edit title tags, meta descriptions, canonical URLs, OG images, and structured data for every page under Page SEO (/superadmin/page-seo). Changes are saved directly to the sitemap and page prerender outputs.",
      },
      {
        title: "Search Console Integration",
        content:
          "Connect Google Search Console under SEO Integrations. Once linked, the Search Console tab shows impressions, clicks, average position, and CTR for all pages and queries.",
      },
      {
        title: "Keyword Tracker",
        content:
          "Track your target keyword rankings over time in the Keyword Tracker (/superadmin/keyword-tracker). Add keywords, set target countries, and view daily position changes.",
      },
      {
        title: "OG Validator",
        content:
          "The OG Validator (/superadmin/og-validator) checks every page's Open Graph tags and social preview cards. It identifies missing og:image, incorrect og:title, or malformed og:url tags and auto-repairs them where possible.",
      },
    ],
  },
  {
    id: "investments",
    title: "Investments",
    icon: PieChart,
    color: "from-purple-500 to-violet-600",
    description: "Manage investor accounts, investment plans, and incoming investor interest.",
    articles: [
      {
        title: "Investor Management",
        content:
          "View and manage all investor accounts under Investments → Investor Management (/superadmin/investors). Each investor profile shows their invested amount, plan, return rate, and account status.",
      },
      {
        title: "Investment Plans",
        content:
          "Create and edit investment plans (/superadmin/investment-plans) with name, minimum investment, ROI percentage, duration, and features. Plans are displayed to visitors on the Invest page.",
      },
      {
        title: "Investor Interest Leads",
        content:
          "Investor interest submissions (from the public Invest page) flow into Investor Interest (/superadmin/invest-leads). Review, contact, and convert them into full investor accounts.",
      },
    ],
  },
  {
    id: "content",
    title: "Content & Brand",
    icon: FileText,
    color: "from-sky-500 to-blue-500",
    description: "Blog, portfolio, team, social links, brand voice, and site structure.",
    articles: [
      {
        title: "Blog Management",
        content:
          "Create, edit, and publish blog posts in the Blog section (/superadmin/blog). Each post supports rich-text content, featured images, tags, categories, slug, and SEO meta fields. Posts are published to the public /blog route.",
      },
      {
        title: "Team & User Management",
        content:
          "Manage internal team members under User Management (/superadmin/team). Assign roles (super_admin, manager, hr, staff), set permissions, and deactivate accounts. This is different from the Employee HR module.",
        tips: ["Only Super Admins can change another user's role.", "Deactivating a user blocks their login but preserves all their data."],
      },
      {
        title: "Brand Voice",
        content:
          "Configure your brand's tone of voice (/superadmin/brand-tone) — formal, conversational, technical, friendly. This setting is used by AI-assisted content generation features.",
      },
      {
        title: "Social Links",
        content:
          "Update your social media links (LinkedIn, Twitter/X, Instagram, YouTube, Facebook, GitHub) in Social Links (/superadmin/social-links). These appear in the site footer and contact sections.",
      },
    ],
  },
  {
    id: "referrals",
    title: "Referral & Partners",
    icon: GitMerge,
    color: "from-rose-500 to-pink-600",
    badge: "New",
    description: "Partner accounts, referral commissions, and payout request management.",
    articles: [
      {
        title: "Referral Dashboard",
        content:
          "The Referral Dashboard (/superadmin/referrals) shows total referrals, commissions earned, conversion rates, and pending payout amounts across all partner accounts.",
      },
      {
        title: "Partner Accounts",
        content:
          "View and manage partner accounts (/superadmin/referrals/partners). Each partner has a unique referral code, commission rate, and linked conversion history. Approve new partner applications from this page.",
      },
      {
        title: "Payout Requests",
        content:
          "Partners can request commission payouts from their portal. Review all payout requests in Payout Requests (/superadmin/referrals/payouts). Approve or reject requests and mark them as paid.",
        tips: ["Always verify the partner's bank/wallet details before processing a payout."],
      },
    ],
  },
  {
    id: "system",
    title: "System Settings",
    icon: Settings,
    color: "from-slate-500 to-gray-600",
    description: "General settings, product URLs, notifications, and system configuration.",
    articles: [
      {
        title: "General Settings",
        content:
          "Configure site-wide settings in General Settings (/superadmin/settings): site name, support email, default currency, timezone, logo, favicon, and Google Analytics ID.",
      },
      {
        title: "Product URLs",
        content:
          "Manage slug-to-product mappings in Product URLs (/superadmin/product-urls). These slugs power the /services/:slug routes and map to specific service packages.",
      },
      {
        title: "Country Eligibility",
        content:
          "Control which countries are eligible for your services under Country Eligibility (/superadmin/country-eligibility). Blocked countries see a 'Not Available' message at checkout.",
      },
      {
        title: "Notifications",
        content:
          "Admin-facing notification preferences can be configured at /superadmin/notifications. Control which in-app events trigger bell notifications and email alerts for admin staff.",
      },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminDocs() {
  const [search, setSearch] = useState("");
  const [openSection, setOpenSection] = useState<string | null>("getting-started");
  const [openArticle, setOpenArticle] = useState<string | null>(null);

  const filtered = DOC_SECTIONS.filter((s) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.articles.some(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          (a.tips || []).some((t) => t.toLowerCase().includes(q)) ||
          (a.steps || []).some((t) => t.toLowerCase().includes(q))
      )
    );
  });

  const articleKey = (sectionId: string, articleTitle: string) =>
    `${sectionId}::${articleTitle}`;

  const toggleArticle = (key: string) =>
    setOpenArticle((prev) => (prev === key ? null : key));

  return (
    <SuperAdminLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-16">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-8">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-6 h-6 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">Admin Documentation</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Dynime Console Docs
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                Complete reference for every feature in the Dynime SaaS Management Console — from orders and WhatsApp notifications to SEO, HR, and investments.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Badge className="bg-primary/15 text-primary border-primary/30 gap-1 px-3 py-1">
                <Zap className="w-3 h-3" /> v2.0
              </Badge>
              <Badge variant="outline" className="gap-1 px-3 py-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Up to date
              </Badge>
            </div>
          </div>

          {/* Quick stats */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Sections", value: DOC_SECTIONS.length, icon: Layers },
              { label: "Articles", value: DOC_SECTIONS.reduce((acc, s) => acc + s.articles.length, 0), icon: FileText },
              { label: "Admin Routes", value: "50+", icon: Globe },
              { label: "Integrations", value: "12+", icon: Zap },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm p-3 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <stat.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground">{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Search ───────────────────────────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documentation…"
            className="pl-10 h-11 bg-background/80 backdrop-blur-sm border-border/60 focus:border-primary/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {search && (
          <p className="text-xs text-muted-foreground">
            {filtered.length === 0
              ? "No results found."
              : `Showing ${filtered.length} section(s) matching "${search}"`}
          </p>
        )}

        {/* ── Sections ─────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          {filtered.map((section) => {
            const isOpen = search ? true : openSection === section.id;
            return (
              <div
                key={section.id}
                className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden transition-all duration-200"
              >
                {/* Section Header */}
                <button
                  onClick={() =>
                    setOpenSection((prev) => (prev === section.id ? null : section.id))
                  }
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/20 transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center shrink-0 shadow-lg`}
                  >
                    <section.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{section.title}</span>
                      {section.badge && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary bg-primary/5">
                          {section.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{section.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {section.articles.length} article{section.articles.length !== 1 ? "s" : ""}
                    </span>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Articles */}
                {isOpen && (
                  <div className="border-t border-border/40 divide-y divide-border/30">
                    {section.articles.map((article) => {
                      const key = articleKey(section.id, article.title);
                      const artOpen = openArticle === key;
                      return (
                        <div key={article.title}>
                          <button
                            onClick={() => toggleArticle(key)}
                            className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/10 transition-colors"
                          >
                            <ChevronRight
                              className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${artOpen ? "rotate-90" : ""}`}
                            />
                            <span className="text-sm font-medium text-foreground">{article.title}</span>
                          </button>

                          {artOpen && (
                            <div className="px-5 pb-5 space-y-4 bg-muted/5">
                              {/* Main content */}
                              <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-4">
                                {article.content}
                              </p>

                              {/* Steps */}
                              {article.steps && article.steps.length > 0 && (
                                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
                                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wide">
                                    <Info className="w-3.5 h-3.5" /> Step-by-Step
                                  </div>
                                  <ol className="space-y-2">
                                    {article.steps.map((step, i) => (
                                      <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                                        <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                                          {i + 1}
                                        </span>
                                        <span>{step}</span>
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              )}

                              {/* Tips */}
                              {article.tips && article.tips.length > 0 && (
                                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
                                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wide">
                                    <Lightbulb className="w-3.5 h-3.5" /> Pro Tips
                                  </div>
                                  <ul className="space-y-1.5">
                                    {article.tips.map((tip, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                        <span>{tip}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Warnings */}
                              {article.warnings && article.warnings.length > 0 && (
                                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wide">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Important
                                  </div>
                                  <ul className="space-y-1.5">
                                    {article.warnings.map((w, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                        <span>{w}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Quick Link */}
                              {article.link && (
                                <Link
                                  to={article.link}
                                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3" /> Go to this page
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Quick Reference Card ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 to-accent/5 p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Quick Reference — Key Routes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              { label: "Dashboard", path: "/superadmin" },
              { label: "Orders", path: "/superadmin/orders" },
              { label: "WhatsApp Portal", path: "/superadmin/whatsapp-portal" },
              { label: "Email Portal", path: "/superadmin/email-portal" },
              { label: "Verifications", path: "/superadmin/verifications" },
              { label: "Job Applications", path: "/superadmin/careers/applications" },
              { label: "FlexPay", path: "/superadmin/flexpay" },
              { label: "Credit Review", path: "/superadmin/credit-review" },
              { label: "HR Hub", path: "/superadmin/hr" },
              { label: "Payroll", path: "/superadmin/payroll" },
              { label: "CRM", path: "/superadmin/crm" },
              { label: "SEO Dashboard", path: "/superadmin/seo-dashboard" },
              { label: "Payment Gateways", path: "/superadmin/payment-gateways" },
              { label: "Investors", path: "/superadmin/investors" },
              { label: "General Settings", path: "/superadmin/settings" },
              { label: "WhatsApp Config", path: "/superadmin/whatsapp-portal?tab=config" },
              { label: "Partner Accounts", path: "/superadmin/referrals/partners" },
              { label: "User Management", path: "/superadmin/team" },
            ].map((r) => (
              <Link
                key={r.path}
                to={r.path}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-xs hover:bg-muted/30 hover:border-primary/30 transition-all group"
              >
                <span className="font-medium text-foreground">{r.label}</span>
                <span className="text-muted-foreground font-mono group-hover:text-primary truncate max-w-[160px]">
                  {r.path}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="text-center text-xs text-muted-foreground py-4 border-t border-border/40">
          Dynime Management Console Docs · Built with ❤️ · Last updated June 2026
        </div>
      </div>
    </SuperAdminLayout>
  );
}
