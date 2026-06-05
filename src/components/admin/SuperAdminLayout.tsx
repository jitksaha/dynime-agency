import { useEffect, useMemo, useState, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

NProgress.configure({ showSpinner: false, trickleSpeed: 120, minimum: 0.15 });
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/shared/ThemeProvider";
import {
  LayoutDashboard, Settings, FileText, MessageSquare, Inbox, Phone,
  LogOut, Menu, X, FormInput, Briefcase, Shield, Users, ShoppingBag, ClipboardList,
  Globe, PanelTop, CreditCard, Tag, DollarSign, Mail, Search, Bell, Sun, Moon,
  ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, Sparkles, Home, Share2, Wand2, Sliders, Lock, LineChart, Link2, TrendingUp,
  IdCard, Layers, Banknote, PieChart, UserCog, ScrollText, Receipt, Rocket, Wallet, Building2, GitMerge,
} from "lucide-react";

import SiteLogo from "@/components/shared/SiteLogo";
import dynimeIconLight from "@/assets/dynime-icon-light.svg";
import dynimeIconDark from "@/assets/dynime-icon-dark.svg";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationsBell from "@/components/admin/NotificationsBell";
import MailRealtimeToasts from "@/components/admin/MailRealtimeToasts";
import { canAccessRoute } from "@/lib/role-permissions";
import type { Database } from "@/integrations/supabase/types";
type AppRole = Database["public"]["Enums"]["app_role"];

type NavLeaf = { to: string; label: string; icon: any; badge?: string };
type NavParent = { label: string; icon: any; key: string; children: NavLeaf[]; badge?: string };
type NavItem = NavLeaf | NavParent;
type NavGroup = { label: string; items: NavItem[] };

const isParent = (i: NavItem): i is NavParent => "children" in i;

const navGroupsOverview: NavGroup = {
  label: "Overview",
  items: [
    { to: "/superadmin", label: "Dashboard", icon: LayoutDashboard },
  ],
};

const navGroupsInvestments: NavGroup = {
  label: "Investments",
  items: [
    {
      key: "investments",
      label: "Investments",
      icon: PieChart,
      badge: "Hub",
      children: [
        { to: "/superadmin/investors", label: "Investor Management", icon: Banknote },
        { to: "/superadmin/investment-plans", label: "Plans", icon: Layers },
        { to: "/superadmin/invest-leads", label: "Investor Interest", icon: TrendingUp },
      ],
    },
  ],
};

const navGroupsEngagement: NavGroup = {
  label: "Engagement",
  items: [
    { to: "/superadmin/submissions", label: "Submissions", icon: Inbox },
    { to: "/superadmin/inbox", label: "Inbox (Replies)", icon: Mail },
    { to: "/superadmin/chat", label: "Live Chat", icon: MessageSquare },
    { to: "/superadmin/subscribers", label: "Subscribers", icon: Mail },
    { to: "/superadmin/forms", label: "Form Builder", icon: FormInput },
    { to: "/superadmin/contact-info", label: "Contact Info", icon: Phone },
    { to: "/superadmin/notifications", label: "Email Alerts", icon: Bell },
    { to: "/superadmin/country-eligibility", label: "Country Eligibility", icon: Globe },
  ],
};

const navGroupsContent: NavGroup = {
  label: "Content",
  items: [
    { to: "/superadmin/pages", label: "Pages", icon: FileText },
    { to: "/superadmin/blog", label: "Blog", icon: FileText },
    { to: "/superadmin/portfolio", label: "Portfolio", icon: Briefcase },
    { to: "/superadmin/team", label: "User Management", icon: Users },
    { to: "/superadmin/about-timeline", label: "About Timeline", icon: FileText },
    {
      key: "seo",
      label: "SEO & Ranking",
      icon: Sparkles,
      badge: "Hub",
      children: [
        { to: "/superadmin/seo-dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/superadmin/seo-hub", label: "Ranking Hub", icon: Sparkles },
        { to: "/superadmin/seo", label: "SEO Tools", icon: Globe },
        { to: "/superadmin/page-seo", label: "Page SEO", icon: Search },
        { to: "/superadmin/seo-rules", label: "SEO Rules", icon: Sliders },
        { to: "/superadmin/search-console", label: "Search Console", icon: Search },
        { to: "/superadmin/keyword-tracker", label: "Keyword Tracker", icon: LineChart },
        { to: "/superadmin/seo-integrations", label: "Integrations", icon: Sparkles },
        { to: "/superadmin/og-validator", label: "OG Validator", icon: Share2 },
      ],
    },
    {
      key: "branding",
      label: "Brand & Layout",
      icon: PanelTop,
      children: [
        { to: "/superadmin/header-footer", label: "Header & Footer", icon: PanelTop },
        { to: "/superadmin/social-links", label: "Social Links", icon: Share2 },
        { to: "/superadmin/brand-tone", label: "Brand Voice", icon: Wand2 },
      ],
    },
  ],
};

const navGroupsVerification: NavGroup = {
  label: "Verification",
  items: [
    {
      key: "verification",
      label: "Verification (Didit)",
      icon: Shield,
      badge: "New",
      children: [
        { to: "/superadmin/verifications", label: "Identity & Business", icon: Shield },
      ],
    },
  ],
};

const navGroupsCommerce: NavGroup = {
  label: "Commerce",
  items: [
    { to: "/superadmin/orders", label: "Orders", icon: ClipboardList },
    { to: "/superadmin/fx-orders", label: "FX Order", icon: DollarSign, badge: "New" },
    { to: "/superadmin/agreement-builder", label: "Agreement Builder", icon: ScrollText },
    {
      key: "hr",
      label: "HR & Employees",
      icon: Briefcase,
      badge: "Hub",
      children: [
        { to: "/superadmin/hr?tab=employees", label: "Employees", icon: Users },
        { to: "/superadmin/hr?tab=team-section", label: "Public Team Section", icon: Users },
        { to: "/superadmin/hr?tab=id-cards", label: "ID Card Maker", icon: IdCard },
        { to: "/superadmin/hr?tab=builder", label: "Document Builder", icon: FileText },
        { to: "/superadmin/hr?tab=history", label: "Documents History", icon: FileText },
        { to: "/superadmin/hr-requests", label: "Employee Requests", icon: FileText },
        { to: "/superadmin/careers", label: "Job Posts", icon: Briefcase },
        { to: "/superadmin/careers/applications", label: "Job Applications", icon: Inbox },
        { to: "/superadmin/hr-extras", label: "Attendance & Leave", icon: FileText },
        { to: "/superadmin/payroll", label: "Payroll", icon: Banknote, badge: "New" },
      ],
    },
    {
      key: "crm",
      label: "CRM",
      icon: Users,
      badge: "New",
      children: [
        { to: "/superadmin/crm", label: "Dashboard", icon: LayoutDashboard },
        { to: "/superadmin/crm/leads", label: "Leads", icon: Users },
        { to: "/superadmin/crm/pipeline", label: "Pipeline", icon: TrendingUp },
        { to: "/superadmin/crm/activities", label: "Activities", icon: Bell },
        { to: "/superadmin/crm/automations", label: "Automations", icon: Bell, badge: "New" },
        { to: "/superadmin/crm/email-templates", label: "Email Templates", icon: Bell },
        
      ],
    },
    { to: "/superadmin/customer-services", label: "Customer Services", icon: ShoppingBag },
    {
      key: "pricing",
      label: "Pricing & Coupons",
      icon: DollarSign,
      children: [
        { to: "/superadmin/pricing", label: "Service Pricing", icon: DollarSign },
        { to: "/superadmin/usa-state-pricing", label: "USA State Fees", icon: DollarSign },
        { to: "/superadmin/coupons", label: "Coupons", icon: Tag },
      ],
    },
    { to: "/superadmin/tax-settings", label: "Tax & VAT", icon: Receipt, badge: "New" },
    { to: "/superadmin/payment-gateways", label: "Payment Gateways", icon: CreditCard },
    { to: "/superadmin/flexpay", label: "FlexPay (BNPL)", icon: Wallet, badge: "New" },
    {
      key: "referrals",
      label: "Referral & Partners",
      icon: GitMerge,
      badge: "New",
      children: [
        { to: "/superadmin/referrals", label: "Referral Dashboard", icon: TrendingUp },
        { to: "/superadmin/referrals/partners", label: "Partner Accounts", icon: Users },
        { to: "/superadmin/referrals/payouts", label: "Payout Requests", icon: Banknote },
      ],
    },
  ],
};


const navGroupsSystem: NavGroup = {
  label: "System",
  items: [
    { to: "/superadmin/settings", label: "Site Settings", icon: Settings },
    { to: "/superadmin/product-urls", label: "Product URLs", icon: Link2 },
    { to: "/superadmin/email-portal", label: "Email Portal", icon: Mail },
    { to: "/superadmin/notifications#smtp", label: "SMTP Settings", icon: Mail },
  ],
};

const navGroups: NavGroup[] = [
  navGroupsOverview,
  navGroupsVerification,
  navGroupsCommerce,
  navGroupsEngagement,
  navGroupsInvestments,
  navGroupsContent,
  navGroupsSystem,
];

const flattenLeaves = (items: NavItem[]): NavLeaf[] =>
  items.flatMap((i) => (isParent(i) ? i.children : [i]));

const allItems = navGroups.flatMap((g) => flattenLeaves(g.items));

const SuperAdminLayout = ({ children }: { children: ReactNode }) => {
  const { user, userRole, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("admin:sidebar:collapsed") === "1";
  });
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState("");
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem("admin:sidebar:collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  // Set a clear, admin-prefixed browser tab title so it's obvious you're in
  // the SaaS console (not the public site).
  useEffect(() => {
    const activeLeaf = allItems.find((i) => leafActive(i.to));
    const segment = location.pathname
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter((s) => s && s !== "superadmin" && s !== "admin")
      .slice(-1)[0];
    const fromSegment = segment
      ? segment.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Dashboard";
    const pageLabel = activeLeaf?.label || fromSegment;
    const prev = document.title;
    document.title = `Admin · ${pageLabel} — Dynime SaaS Console`;
    return () => { document.title = prev; };
  }, [location.pathname, location.search]);

  // NProgress on route changes within the admin panel
  useEffect(() => {
    NProgress.start();
    const t = setTimeout(() => NProgress.done(), 350);
    return () => {
      clearTimeout(t);
      NProgress.done();
    };
  }, [location.pathname]);


  // Strip query string from a nav `to` so we can compare it against pathname.
  const pathOf = (to: string) => to.split("?")[0];
  const tabOf = (to: string) => new URLSearchParams(to.split("?")[1] || "").get("tab");
  const currentTab = new URLSearchParams(location.search).get("tab");
  const leafActive = (to: string) => {
    const path = pathOf(to);
    if (location.pathname !== path) return false;
    const t = tabOf(to);
    if (!t) return true;
    return currentTab === t;
  };

  const currentItem = useMemo(
    () =>
      allItems.find((n) => location.pathname === pathOf(n.to)) ||
      allItems.find((n) => location.pathname.startsWith(pathOf(n.to)) && pathOf(n.to) !== "/superadmin"),
    [location.pathname]
  );

  const role = (userRole as AppRole | null) ?? null;

  // Persisted expand/collapse state for parent items
  const [openParents, setOpenParents] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("admin:nav:open") || "{}");
    } catch {
      return {};
    }
  });
  const toggleParent = (key: string) =>
    setOpenParents((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem("admin:nav:open", JSON.stringify(next)); } catch {}
      return next;
    });

  // Auto-open parent containing the active route
  useEffect(() => {
    navGroups.forEach((g) =>
      g.items.forEach((item) => {
        if (isParent(item)) {
          const active = item.children.some((c) => location.pathname.startsWith(pathOf(c.to)));
          if (active && !openParents[item.key]) {
            setOpenParents((p) => ({ ...p, [item.key]: true }));
          }
        }
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Filter by search and decorate locked state on leaves
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matchLeaf = (l: NavLeaf) => !q || l.label.toLowerCase().includes(q);
    const decorateLeaf = (l: NavLeaf) => ({
      ...l,
      locked: !canAccessRoute(role, l.to),
    });
    return navGroups
      .map((g) => ({
        ...g,
        items: g.items
          .map((i) => {
            if (isParent(i)) {
              const kids = i.children.filter(matchLeaf).map(decorateLeaf);
              if (kids.length === 0) return null;
              return { ...i, children: kids };
            }
            return matchLeaf(i) ? decorateLeaf(i) : null;
          })
          .filter(Boolean) as Array<
            (NavLeaf & { locked: boolean }) |
            (NavParent & { children: Array<NavLeaf & { locked: boolean }> })
          >,
      }))
      .filter((g) => g.items.length > 0);
  }, [search, role]);

  const userInitials = (user?.email || "A").slice(0, 2).toUpperCase();

  const renderLeaf = (item: NavLeaf & { locked?: boolean }, opts?: { nested?: boolean }) => {
    const active = leafActive(item.to);
    const locked = !!item.locked;
    const baseClass = `relative flex items-center gap-3 ${
      collapsed ? "justify-center px-2" : opts?.nested ? "pl-9 pr-3" : "px-3"
    } py-2 rounded-lg text-sm transition-all duration-200 group ${
      active
        ? "bg-primary text-primary-foreground font-medium shadow-md shadow-primary/25"
        : locked
        ? "text-muted-foreground/50 cursor-not-allowed"
        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 hover:translate-x-0.5"
    }`;
    const inner = (
      <>
        <item.icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
        {!collapsed && <span className="truncate flex-1">{item.label}</span>}
        {!collapsed && locked && <Lock className="w-3 h-3 shrink-0 opacity-70" />}
        {!collapsed && !locked && item.badge && (
          <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded ${active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/15 text-primary"}`}>
            {item.badge}
          </span>
        )}
      </>
    );
    if (locked) {
      return (
        <button
          key={item.to}
          type="button"
          title={collapsed ? `${item.label} — Locked` : "You don't have permission for this section"}
          onClick={() => {
            toast.error("Access locked", {
              description: `Your role (${role || "staff"}) doesn't have access to "${item.label}". Ask a Super Admin to grant permission.`,
            });
          }}
          className={baseClass + " w-full text-left"}
        >
          {inner}
        </button>
      );
    }
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={() => setSidebarOpen(false)}
        title={collapsed ? item.label : undefined}
        className={baseClass}
      >
        {inner}
      </Link>
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-background via-background to-secondary/20 flex w-full">
      <MailRealtimeToasts />
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 h-screen inset-y-0 left-0 z-50 ${
          collapsed ? "w-[72px]" : "w-[260px]"
        } bg-sidebar/95 backdrop-blur-xl border-r border-sidebar-border/60 flex flex-col transition-[width,transform] duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } shadow-xl shadow-black/5`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-sidebar-border/60 shrink-0">
          <Link to="/superadmin" className="flex items-center gap-2 min-w-0">
            <img
              src={theme === "dark" ? dynimeIconDark : dynimeIconLight}
              alt="Dynime"
              className="w-9 h-9 rounded-xl shrink-0"
              draggable={false}
            />
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-sm font-semibold text-sidebar-foreground leading-tight truncate">
                  Dynime Launchpad
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Management Console
                </div>
              </div>
            )}
          </Link>
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="px-3 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu…"
                className="h-9 pl-8 bg-sidebar-accent/40 border-sidebar-border text-xs"
              />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto scrollbar-thin">
          {filteredGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  if (!isParent(item as any)) {
                    return renderLeaf(item as NavLeaf & { locked: boolean });
                  }
                  const parent = item as NavParent & { children: Array<NavLeaf & { locked: boolean }> };
                  const forceOpen = !!search.trim();
                  const open = forceOpen || !!openParents[parent.key];
                  const childActive = parent.children.some((c) => leafActive(c.to));

                  // When sidebar is collapsed, render parent as a flyout-style icon-only button
                  if (collapsed) {
                    return (
                      <Link
                        key={parent.key}
                        to={parent.children[0]?.to ?? "#"}
                        title={parent.label}
                        className={`relative flex items-center justify-center px-2 py-2 rounded-lg text-sm transition-all duration-200 group ${
                          childActive
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                        }`}
                      >
                        <parent.icon className="w-4 h-4 shrink-0" />
                      </Link>
                    );
                  }

                  return (
                    <div key={parent.key}>
                      <button
                        type="button"
                        onClick={() => toggleParent(parent.key)}
                        className={`w-full relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                          childActive
                            ? "text-foreground font-medium bg-sidebar-accent/40"
                            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                        }`}
                      >
                        <parent.icon className="w-4 h-4 shrink-0" />
                        <span className="truncate flex-1 text-left">{parent.label}</span>
                        {parent.badge && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                            {parent.badge}
                          </span>
                        )}
                        <ChevronRight
                          className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
                        />
                      </button>
                      {open && (
                        <div className="mt-0.5 space-y-0.5 border-l border-sidebar-border/60 ml-4">
                          {parent.children.map((c) => renderLeaf(c, { nested: true }))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User card */}
        <div className="p-2 border-t border-sidebar-border shrink-0">
          {!collapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-sidebar-accent/60 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-xs font-medium text-foreground truncate">{user?.email}</div>
                  <div className="text-[10px] text-primary uppercase font-semibold tracking-wide">
                    {userRole || "admin"}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/"><Home className="w-4 h-4 mr-2" /> View Site</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/superadmin/settings"><Settings className="w-4 h-4 mr-2" /> Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={signOut}
              title="Sign out"
              className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-border/60 bg-background/70 backdrop-blur-xl flex items-center px-4 gap-3">
          <button
            className="lg:hidden text-foreground h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-secondary"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            className="hidden lg:flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm min-w-0">
            <div className="hidden sm:flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <Shield className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-muted-foreground hidden sm:inline">Admin</span>
            <span className="text-muted-foreground/50 hidden sm:inline">/</span>
            <span className="font-semibold text-foreground truncate">
              {currentItem?.label || (location.pathname === "/superadmin" ? "Dashboard" : "Admin")}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={(e) => toggleTheme(e)}
              className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <NotificationsBell />

            <Link
              to="/"
              className="hidden sm:inline-flex h-9 items-center gap-1.5 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity shadow-sm"
            >
              <Globe className="w-3.5 h-3.5" /> View Site
            </Link>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden overflow-y-auto min-w-0">{children}</main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
