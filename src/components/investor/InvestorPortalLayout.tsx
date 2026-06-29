import { ReactNode } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileSignature, FileText, Banknote, User as UserIcon,
  LogOut, Home,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/integrations/db/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import InvestorNotificationsBell from "@/components/investor/InvestorNotificationsBell";

const items = [
  { to: "/investor", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/investor/agreements", label: "Agreements", icon: FileSignature },
  { to: "/investor/statements", label: "Statements", icon: FileText },
  { to: "/investor/withdrawals", label: "Withdrawals", icon: Banknote },
  { to: "/investor/profile", label: "Profile", icon: UserIcon },
];

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}

const InvestorPortalLayout = ({ title, description, children, actions }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await db.auth.signOut();
    toast.success("Signed out");
    navigate("/investor/login", { replace: true });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-1">
              Dynime LLC. · Investor Portal
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold">{title}</h1>
            {description && <p className="text-muted-foreground mt-2 max-w-2xl">{description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <InvestorNotificationsBell />
            <Button variant="outline" size="sm" asChild>
              <Link to="/"><Home className="h-4 w-4 mr-1.5" /> Home</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1.5" /> Sign out
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[220px,1fr] gap-6">
          <aside className="lg:sticky lg:top-24 h-max">
            <nav className="rounded-xl border bg-card p-2 flex lg:flex-col gap-1 overflow-x-auto">
              {items.map((it) => {
                const Icon = it.icon;
                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground/75 hover:bg-muted"
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {it.label}
                  </NavLink>
                );
              })}
            </nav>
            {user && (
              <div className="mt-3 px-3 text-xs text-muted-foreground truncate">
                Signed in as <span className="text-foreground font-medium">{user.email}</span>
              </div>
            )}
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </Layout>
  );
};

export default InvestorPortalLayout;
