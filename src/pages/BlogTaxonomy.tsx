import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { usePageSEO } from "@/hooks/use-page-seo";
import { ArrowLeft, ArrowRight, Calendar, Clock, Tag as TagIcon, FolderOpen } from "lucide-react";

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
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

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

const titleCase = (s: string) =>
  s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

interface Props { mode: "category" | "tag" }

const BlogTaxonomy = ({ mode }: Props) => {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug ?? "");
  const label = titleCase(slug);
  const qc = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-taxonomy", mode, slug],
    enabled: !!slug,
    queryFn: async (): Promise<BlogPost[]> => {
      let q = supabase
        .from("blog_posts" as any)
        .select("id,slug,title,excerpt,cover_image_url,category,tags,author,read_minutes,is_featured,published_at")
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("published_at", { ascending: false });
      if (mode === "category") {
        // Match by exact category OR slug-equivalent (case-insensitive)
        q = q.ilike("category", label);
      } else {
        q = q.contains("tags", [label]);
      }
      const { data, error } = await q;
      if (error) throw error;
      let result = (data as unknown as BlogPost[]) ?? [];
      // Tag fallback: case-insensitive client filter if exact contains misses
      if (mode === "tag" && result.length === 0) {
        const { data: all } = await supabase
          .from("blog_posts" as any)
          .select("id,slug,title,excerpt,cover_image_url,category,tags,author,read_minutes,is_featured,published_at")
          .eq("is_published", true);
        const lower = slug.toLowerCase();
        result = ((all as unknown as BlogPost[]) ?? []).filter((p) =>
          p.tags.some((t) => t.toLowerCase() === lower),
        );
      }
      return result;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`blog_taxonomy:${mode}:${slug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_posts" }, () => {
        qc.invalidateQueries({ queryKey: ["blog-taxonomy", mode, slug] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [mode, slug, qc]);

  usePageSEO(`blog/${mode}/${slug}`, {
    title: `${label} — ${mode === "category" ? "Category" : "Tag"} | Dynime Insights`,
    description: `Browse all Dynime articles ${mode === "category" ? "in" : "tagged"} ${label}.`,
  });

  // Pagination
  const PAGE_SIZE = 9;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [slug, mode]);
  const visible = useMemo(() => posts.slice(0, visibleCount), [posts, visibleCount]);
  const hasMore = visibleCount < posts.length;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current; if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCount((c) => Math.min(c + PAGE_SIZE, posts.length));
    }, { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, posts.length]);

  const Icon = mode === "category" ? FolderOpen : TagIcon;

  return (
    <Layout>
      <section className={`relative overflow-hidden border-b border-border/50 bg-gradient-to-br ${gradientFor(label)}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/70 to-background" />
        <div className="container-custom relative py-10 md:py-14">
          <ScrollReveal>
            <Link to="/blog" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary mb-5">
              <ArrowLeft className="w-3.5 h-3.5" /> All articles
            </Link>
            <span className="inline-flex items-center gap-1.5 text-primary text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-primary/30 bg-primary/5">
              <Icon className="w-3.5 h-3.5" /> {mode === "category" ? "Category" : "Tag"}
            </span>
            <h1 className="font-heading text-3xl md:text-5xl font-bold mt-4">
              {label}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-3">
              {isLoading ? "Loading articles…" : `${posts.length} article${posts.length === 1 ? "" : "s"} ${mode === "category" ? "in this category" : "with this tag"}`}
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0,1,2,3,4,5].map((i) => <div key={i} className="glass-card h-80 animate-pulse" />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <p className="text-lg">No articles yet for "{label}".</p>
              <Link to="/blog" className="mt-3 inline-block text-primary text-sm font-medium hover:underline">Browse all articles</Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visible.map((post, i) => (
                  <ScrollReveal key={post.id} delay={i * 0.05} className="h-full">
                    <Link
                      to={`/blog/${post.slug}`}
                      className="group flex flex-col h-full rounded-2xl overflow-hidden border border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/40 hover:shadow-[0_20px_50px_-25px_hsl(var(--primary)/0.4)] transition-all"
                    >
                      <div className={`relative aspect-[16/10] bg-gradient-to-br ${gradientFor(post.category)} overflow-hidden`}>
                        {post.cover_image_url ? (
                          <img src={post.cover_image_url} alt={post.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
                                <TagIcon className="w-2.5 h-2.5" />{t}
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

              {hasMore && (
                <div ref={sentinelRef} className="flex flex-col items-center gap-3 mt-12">
                  <button
                    onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, posts.length))}
                    className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.5)]"
                  >
                    Load more articles
                  </button>
                  <span className="text-[11px] text-muted-foreground">Showing {visible.length} of {posts.length}</span>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default BlogTaxonomy;
