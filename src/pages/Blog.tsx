import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/layout/Layout";
import { usePageSEO } from "@/hooks/use-page-seo";
import { SEO_DEFAULTS } from "@/lib/seo-defaults";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { Calendar, ArrowRight, Clock, Eye, Search, Sparkles, Tag, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string;
  tags: string[];
  author: string;
  read_minutes: number;
  is_featured: boolean;
  published_at: string;
  view_count?: number;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

// Deterministic gradient per category — keeps cards visually rich without images
const GRADIENTS: Record<string, string> = {
  "Business Formation": "from-emerald-500/30 via-teal-500/20 to-cyan-500/30",
  "Compliance":         "from-amber-500/30 via-orange-500/20 to-rose-500/30",
  "Marketing":          "from-violet-500/30 via-purple-500/20 to-fuchsia-500/30",
  "E-Commerce":         "from-pink-500/30 via-rose-500/20 to-red-500/30",
  "Development":        "from-blue-500/30 via-indigo-500/20 to-sky-500/30",
  "Software":           "from-cyan-500/30 via-sky-500/20 to-blue-500/30",
  "Product":            "from-amber-500/30 via-yellow-500/20 to-orange-500/30",
  "General":            "from-primary/30 via-primary/15 to-primary/30",
};
const gradientFor = (cat: string) => GRADIENTS[cat] ?? GRADIENTS.General;

const Blog = () => {
  usePageSEO("blog", {
    title: SEO_DEFAULTS.blog.title,
    description: SEO_DEFAULTS.blog.description,
    keywords: SEO_DEFAULTS.blog.keywords,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Blog",
      "@id": "https://dynime.com/blog#blog",
      url: "https://dynime.com/blog",
      name: "Dynime Insights",
      description: SEO_DEFAULTS.blog.description,
      inLanguage: "en",
      publisher: {
        "@type": "Organization",
        name: "Dynime Inc.",
        url: "https://dynime.com",
        logo: { "@type": "ImageObject", url: "https://dynime.com/favicon.png" },
      },
    },
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async (): Promise<BlogPost[]> => {
      const { data, error } = await supabase
        .from("blog_posts" as any)
        .select("id,slug,title,excerpt,cover_image_url,category,tags,author,read_minutes,is_featured,published_at,view_count")
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as BlogPost[]) ?? [];
    },
  });

  // Realtime: auto-sync any admin change (insert/update/delete) to the public blog
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("public:blog_posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_posts" }, () => {
        qc.invalidateQueries({ queryKey: ["blog-posts"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [query, setQuery] = useState("");

  const categories = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => set.add(p.category));
    return ["All", ...Array.from(set).sort()];
  }, [posts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      const catOk = activeCategory === "All" || p.category === activeCategory;
      if (!catOk) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        (p.excerpt ?? "").toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [posts, activeCategory, query]);

  const featured = filtered.find((p) => p.is_featured) ?? filtered[0];
  const rest = useMemo(() => filtered.filter((p) => p.id !== featured?.id), [filtered, featured]);

  // Pagination — load more
  const PAGE_SIZE = 9;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeCategory, query]);
  const visible = rest.slice(0, visibleCount);
  const hasMore = visibleCount < rest.length;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((c) => Math.min(c + PAGE_SIZE, rest.length));
      }
    }, { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, rest.length]);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
        <div className="container-custom relative py-12 md:py-16">
          <ScrollReveal>
            <div className="text-center max-w-3xl mx-auto">
              <span className="inline-flex items-center gap-1.5 text-primary text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-primary/30 bg-primary/5">
                <Sparkles className="w-3.5 h-3.5" /> Dynime Insights
              </span>
              <h1 className="font-heading text-4xl md:text-6xl font-bold mt-4 mb-4">
                Real guides for <span className="gradient-text">global founders</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground">
                Practical playbooks on company formation, marketing, e-commerce and AI software — written by the team that ships them every day.
              </p>

              {/* Search */}
              <div className="mt-7 max-w-md mx-auto relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search articles, tags, topics…"
                  className="pl-10 h-11 rounded-full bg-card/70 backdrop-blur"
                />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Category chips */}
      <section className="border-b border-border/50 sticky top-16 z-20 bg-background/80 backdrop-blur">
        <div className="container-custom py-3 -mx-4 sm:mx-0 overflow-x-auto scrollbar-hide">
          <div className="inline-flex items-center gap-2 w-max px-4 sm:px-0 sm:flex sm:flex-wrap sm:justify-center">
            {categories.map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all ${
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)]"
                      : "bg-card/70 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Posts */}
      <section className="section-padding">
        <div className="container-custom">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="glass-card h-80 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <p className="text-lg">No articles match your search.</p>
              <button
                className="mt-3 text-primary text-sm font-medium hover:underline"
                onClick={() => { setQuery(""); setActiveCategory("All"); }}
              >
                Reset filters
              </button>
            </div>
          ) : (
            <>
              {/* Featured */}
              {featured && (
                <ScrollReveal>
                  <Link
                    to={`/blog/${featured.slug}`}
                    className="group grid md:grid-cols-2 gap-0 rounded-3xl overflow-hidden border border-border/60 bg-card/60 backdrop-blur-sm shadow-[0_30px_80px_-40px_hsl(var(--primary)/0.4)] mb-10 hover:border-primary/40 transition-all"
                  >
                    <div className={`relative aspect-[16/10] md:aspect-auto bg-gradient-to-br ${gradientFor(featured.category)} flex items-end p-6`}>
                      {featured.cover_image_url && (
                        <img
                          src={featured.cover_image_url}
                          alt={featured.title}
                          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-90"
                          loading="lazy"
                        />
                      )}
                      <div className="absolute top-4 left-4 flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary text-primary-foreground">
                          Featured
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-background/80 text-foreground backdrop-blur">
                          {featured.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-6 md:p-10 flex flex-col justify-center">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                        <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(featured.published_at)}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {featured.read_minutes} min read</span>
                        <span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> {featured.author}</span>
                      </div>
                      <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {featured.title}
                      </h2>
                      {featured.excerpt && (
                        <p className="text-sm md:text-base text-muted-foreground mt-3 leading-relaxed">{featured.excerpt}</p>
                      )}
                      <span className="text-sm text-primary font-semibold inline-flex items-center gap-1 mt-5 group-hover:gap-2 transition-all">
                        Read article <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Link>
                </ScrollReveal>
              )}

              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visible.map((post, i) => (
                  <ScrollReveal key={post.id} delay={i * 0.06} className="h-full">
                    <Link
                      to={`/blog/${post.slug}`}
                      className="group flex flex-col h-full rounded-2xl overflow-hidden border border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/40 hover:shadow-[0_20px_50px_-25px_hsl(var(--primary)/0.4)] transition-all"
                    >
                      <div className={`relative aspect-[16/10] bg-gradient-to-br ${gradientFor(post.category)} overflow-hidden`}>
                        {post.cover_image_url ? (
                          <img
                            src={post.cover_image_url}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-heading text-4xl font-black text-foreground/15 select-none">
                              {post.category.split(" ").map((w) => w[0]).join("").slice(0, 3)}
                            </span>
                          </div>
                        )}
                        <Link
                          to={`/blog/category/${encodeURIComponent(post.category)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-background/85 text-foreground backdrop-blur hover:bg-primary hover:text-primary-foreground transition"
                        >
                          {post.category}
                        </Link>
                      </div>

                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
                          <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(post.published_at)}</span>
                          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {post.read_minutes} min</span>
                          <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" /> {(post.view_count ?? 0).toLocaleString()}</span>
                        </div>
                        <h3 className="font-heading font-semibold text-base text-foreground group-hover:text-primary transition-colors mb-2">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="text-xs text-muted-foreground leading-relaxed flex-1">{post.excerpt}</p>
                        )}
                        {post.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/40">
                            {post.tags.slice(0, 3).map((t) => (
                              <Link
                                key={t}
                                to={`/blog/tag/${encodeURIComponent(t)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-secondary/60 text-muted-foreground hover:bg-primary hover:text-primary-foreground transition"
                              >
                                <Tag className="w-2.5 h-2.5" />{t}
                              </Link>
                            ))}
                          </div>
                        )}
                        <span className="text-xs text-primary font-medium inline-flex items-center gap-1 mt-4 group-hover:gap-2 transition-all">
                          Read more <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </Link>
                  </ScrollReveal>
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <div ref={sentinelRef} className="flex flex-col items-center gap-3 mt-12">
                  <button
                    onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, rest.length))}
                    className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.5)]"
                  >
                    Load more articles
                  </button>
                  <span className="text-[11px] text-muted-foreground">
                    Showing {visible.length} of {rest.length}
                  </span>
                </div>
              )}
              {!hasMore && rest.length > PAGE_SIZE && (
                <p className="text-center text-xs text-muted-foreground mt-12">You've reached the end · {rest.length} articles</p>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Blog;
