import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Home,
  Search,
  LifeBuoy,
  ShoppingBag,
  FileText,
  Mail,
  Code,
  Megaphone,
  Cpu,
  Briefcase,
  Rocket,
  Users,
  FolderKanban,
  Info,
} from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

const HOME_LINKS = [
  { to: "/", label: "Home", icon: Home, desc: "Back to the homepage" },
  { to: "/about", label: "About Dynime", icon: Info, desc: "Our story & mission" },
  { to: "/portfolio", label: "Portfolio", icon: FolderKanban, desc: "See our case studies" },
  { to: "/blog", label: "Blog", icon: FileText, desc: "Tips, guides & insights" },
  { to: "/contact", label: "Contact", icon: Mail, desc: "Get in touch with us" },
  { to: "/account/orders", label: "My Orders", icon: LifeBuoy, desc: "View your orders" },
];

const SERVICE_LINKS = [
  { to: "/react-mern-apps", label: "Web Development", icon: Code, desc: "React, WordPress, Shopify & more" },
  { to: "/seo", label: "SEO & Marketing", icon: Megaphone, desc: "Rank higher & grow traffic" },
  { to: "/services/dss", label: "Software & AI", icon: Cpu, desc: "Custom software & AI apps" },
  { to: "/us-company", label: "Company Formation", icon: Briefcase, desc: "US & UK business setup" },
  { to: "/products/os", label: "Dynime OS", icon: Rocket, desc: "AI-powered business OS" },
  { to: "/ui-ux-design", label: "UI/UX Design", icon: Users, desc: "Design systems & prototypes" },
];

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useSEO({
    title: "404 — Page not found | Dynime",
    description: "The page you're looking for doesn't exist or has been moved.",
  });

  useEffect(() => {
    console.error("404: route not found ->", location.pathname);
  }, [location.pathname]);

  const [category, setCategory] = useState("all");

  const onSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q")?.toString().trim() || "";

    // Route by category
    if (category === "blog") {
      navigate(q ? `/blog?q=${encodeURIComponent(q)}` : "/blog");
    } else if (category === "services") {
      navigate(q ? `/services?q=${encodeURIComponent(q)}` : "/services");
    } else if (category === "portfolio") {
      navigate(q ? `/portfolio?q=${encodeURIComponent(q)}` : "/portfolio");
    } else if (category === "contact") {
      navigate("/contact");
    } else {
      // "all" — default to blog search since it has full-text
      navigate(q ? `/blog?q=${encodeURIComponent(q)}` : "/services");
    }
  };

  return (
    <Layout>
      <section className="relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="absolute -top-40 -right-40 -z-10 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 -z-10 h-[28rem] w-[28rem] rounded-full bg-accent/10 blur-3xl" />

        <div className="container-custom py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            {/* Big 404 */}
            <div className="relative inline-block">
              <h1 className="font-heading text-[8rem] md:text-[12rem] leading-none font-black tracking-tighter bg-gradient-to-br from-primary via-primary to-accent bg-clip-text text-transparent select-none">
                404
              </h1>
              <div className="absolute inset-x-0 -bottom-2 h-3 mx-auto w-3/4 rounded-full bg-primary/20 blur-xl" />
            </div>

            <h2 className="font-heading text-2xl md:text-4xl font-bold mt-2 mb-3">
              Lost in space?
            </h2>
            <p className="text-muted-foreground md:text-lg max-w-xl mx-auto mb-2">
              The page you're looking for doesn't exist, was moved, or is taking a
              quick coffee break.
            </p>
            <p className="text-xs text-muted-foreground font-mono mb-8 break-all">
              {location.pathname}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
              <Button variant="hero" size="lg" asChild>
                <Link to="/"><Home className="w-4 h-4 mr-2" /> Back to home</Link>
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Go back
              </Button>
            </div>

            {/* Search with category filter */}
            <form
              onSubmit={onSearch}
              className="mx-auto max-w-2xl mb-12"
            >
              <div className="flex flex-col sm:flex-row items-stretch gap-2 p-1.5 sm:p-1 rounded-2xl border border-border bg-card shadow-sm">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="sm:w-44 h-11 border-0 bg-transparent focus:ring-0 sm:border-r sm:border-border sm:rounded-none rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="blog">Blog & articles</SelectItem>
                    <SelectItem value="portfolio">Portfolio</SelectItem>
                    <SelectItem value="contact">Contact / Support</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    name="q"
                    placeholder={
                      category === "blog" ? "Search articles…" :
                      category === "services" ? "Search services…" :
                      category === "portfolio" ? "Search projects…" :
                      "Search articles, services…"
                    }
                    className="pl-9 h-11 border-0 bg-transparent focus-visible:ring-0"
                  />
                </div>
                <Button type="submit" size="lg" className="rounded-xl">Search</Button>
              </div>
            </form>


            {/* Popular services */}
            <div className="mb-10">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4">
                Explore our services
              </p>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 text-left">
                {SERVICE_LINKS.map(({ to, label, icon: Icon, desc }) => (
                  <Link
                    key={to}
                    to={to}
                    className="group rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all p-4 flex items-start gap-3"
                  >
                    <div className="rounded-lg bg-primary/10 text-primary p-2 shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground truncate">{desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Link to="/services" className="text-sm font-semibold text-primary hover:underline">
                  View all services →
                </Link>
              </div>
            </div>

            {/* Main pages */}
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4">
                Main pages
              </p>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 text-left">
                {HOME_LINKS.map(({ to, label, icon: Icon, desc }) => (
                  <Link
                    key={to}
                    to={to}
                    className="group rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all p-4 flex items-start gap-3"
                  >
                    <div className="rounded-lg bg-primary/10 text-primary p-2 shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground truncate">{desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default NotFound;
