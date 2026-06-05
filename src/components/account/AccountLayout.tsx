import { ReactNode } from "react";
import RouteProgress from "@/components/shared/RouteProgress";
import { Link, NavLink, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard, ShoppingBag, FileText, User as UserIcon, LogOut,
  Truck, RotateCw, Building2, Briefcase, Bell, Search, Home, ChevronRight,
  CalendarDays, LifeBuoy, Layers, CreditCard, ShieldCheck, GitMerge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import SiteLogo from "@/components/shared/SiteLogo";
import CustomerNotificationsBell from "@/components/account/CustomerNotificationsBell";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const overviewItems = [
  { to: "/account", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/account/orders", label: "Orders", icon: ShoppingBag },
  { to: "/account/tracking", label: "Tracking", icon: Truck },
  { to: "/account/compliance", label: "Compliance", icon: CalendarDays },
  { to: "/account/invoices", label: "Invoices", icon: FileText },
  { to: "/account/milestones", label: "Milestones", icon: Layers },
];

const servicesItems = [
  { to: "/account/services/formation", label: "Company Formation", icon: Building2 },
  { to: "/account/services/recurring", label: "Recurring", icon: RotateCw },
  { to: "/account/flexpay", label: "FlexPay", icon: CreditCard },
  { to: "/account/services", label: "Other Services", icon: Briefcase, end: true },
];

const accountItems = [
  { to: "/account/notifications", label: "Notifications", icon: Bell },
  { to: "/account/verification", label: "Verification", icon: ShieldCheck },
  { to: "/partner", label: "Referral Program", icon: GitMerge },
  { to: "/account/tickets", label: "Support Tickets", icon: LifeBuoy },
  { to: "/account/profile", label: "Profile & Settings", icon: UserIcon },
];

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
  /** Optional right-side actions for the page header (buttons, filters, etc.) */
  actions?: ReactNode;
}

const initialsOf = (email?: string | null, name?: string | null) => {
  const src = (name || email || "U").trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
};

const AccountSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const renderItems = (items: typeof overviewItems) => (
    <SidebarMenu>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton asChild tooltip={item.label}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-medium hover:bg-primary/15"
                      : "text-foreground/75 hover:bg-muted hover:text-foreground"
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border h-16 flex items-center justify-center px-3">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          {collapsed ? (
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-heading font-bold">
              D
            </div>
          ) : (
            <SiteLogo className="h-7 w-auto" />
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Overview</SidebarGroupLabel>}
          <SidebarGroupContent>{renderItems(overviewItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>My Services</SidebarGroupLabel>}
          <SidebarGroupContent>{renderItems(servicesItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Account</SidebarGroupLabel>}
          <SidebarGroupContent>{renderItems(accountItems)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-2">
        <SidebarMenuButton asChild tooltip="Browse services">
          <Link to="/services" className="flex items-center gap-2.5 text-foreground/75 hover:text-foreground">
            <Home className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Browse services</span>}
          </Link>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
};

const Breadcrumbs = ({ title }: { title: string }) => {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);
  return (
    <nav className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
      <Link to="/account" className="hover:text-foreground">Account</Link>
      {segments.length > 1 && (
        <>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">{title}</span>
        </>
      )}
    </nav>
  );
};

const AccountLayout = ({ title, description, children, actions }: Props) => {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteProgress />;
  }

  if (!user) {
    return <Navigate to={`/account/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const fullName = (user.user_metadata as any)?.full_name as string | undefined;
  const avatarUrl = (user.user_metadata as any)?.avatar_url as string | undefined;

  return (
    <SidebarProvider defaultOpen>
      <div className="h-screen flex w-full bg-muted/30 overflow-hidden">
        <AccountSidebar />

        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
          {/* Topbar */}
          <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 md:px-6 border-b border-border bg-card/80 backdrop-blur-md">
            <SidebarTrigger />
            <div className="hidden md:block flex-1 min-w-0 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders, services, invoices…"
                  className="pl-9 h-9 rounded-full bg-background border-border"
                />
              </div>
            </div>
            <div className="flex-1 md:hidden" />
            <div className="flex items-center gap-3 ml-auto shrink-0">
              <CustomerNotificationsBell />

              <div className="w-px h-5 bg-border/60 hidden sm:block" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2.5 rounded-full hover:bg-muted/80 active:scale-[0.98] px-2 py-1.5 transition-all duration-200 border border-transparent hover:border-border/30">
                    <Avatar className="w-8 h-8 ring-2 ring-transparent hover:ring-primary/20 transition-all duration-200">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName || user.email || "User"} />}
                      <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                        {initialsOf(user.email, fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-semibold text-foreground leading-none">{fullName || "Account"}</p>
                      <p className="text-[10px] text-muted-foreground leading-none mt-1 truncate max-w-[140px]">{user.email}</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-1">
                  <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/account/notifications"><Bell className="w-4 h-4 mr-2" /> Notifications</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account/profile"><UserIcon className="w-4 h-4 mr-2" /> Profile & Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/partner"><GitMerge className="w-4 h-4 mr-2" /> Referral Program</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/services"><Home className="w-4 h-4 mr-2" /> Browse services</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut().then(() => (window.location.href = "/"))}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
            <div className="max-w-7xl mx-auto w-full">
              {/* Page header */}
              <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <Breadcrumbs title={title} />
                  <h1 className="font-heading text-2xl md:text-3xl font-bold mt-1.5 truncate">{title}</h1>
                  {description && (
                    <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">{description}</p>
                  )}
                </div>
                {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
              </div>

              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AccountLayout;
