import { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useBlogPost, useBlogPosts, useIncrementBlogPostView } from "@/hooks/use-cms-data";
import Layout from "@/components/layout/Layout";
import ScrollReveal from "@/components/shared/ScrollReveal";
import SocialShare from "@/components/shared/SocialShare";
import { usePageSEO } from "@/hooks/use-page-seo";
// Basic blog HTML cleaner — strips scripts/styles/iframes & inline event handlers.
// Content is authored by trusted super-admins, so we keep formatting tags intact.
const cleanBlogHtml = (html: string): string =>
  html
    .replace(/<\s*(script|style|iframe|object|embed|form|link|meta)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|form|link|meta)\b[^>]*\/?\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*(javascript|vbscript|data):[^"']*\2/gi, '$1="#"');
import { ArrowLeft, ArrowRight, Calendar, Clock, Eye, Tag, User, Share2 } from "lucide-react";
import { toast } from "sonner";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
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
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

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

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, error } = useBlogPost(slug!);
  
  const { data: allRelated = [] } = useBlogPosts(post?.category);
  const related = useMemo(() => {
    if (!post) return [];
    return allRelated.filter((r: any) => r.id !== post.id).slice(0, 3);
  }, [allRelated, post]);

  // Increment view count once per slug per browser session
  const [liveViews, setLiveViews] = useState<number | null>(null);
  const incrementView = useIncrementBlogPostView();
  
  useEffect(() => {
    if (!post?.id || !post?.slug) return;
    const key = `blog_viewed:${post.slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    incrementView.mutate(post.id);
  }, [post?.id, post?.slug, incrementView]);

  usePageSEO(`blog/${slug ?? ""}`, {
    title: post ? `${post.title} | Dynime Insights` : "Blog post | Dynime",
    description: post?.excerpt ?? "Read the latest insights from Dynime.",
    keywords: post?.tags,
    ogImage: post?.cover_image_url ?? undefined,
    ogType: "article",
    articleAuthor: post?.author,
    articlePublished: post?.published_at,
    jsonLd: post
      ? {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          image: post.cover_image_url,
          datePublished: post.published_at,
          author: { "@type": "Person", name: post.author },
          publisher: { "@type": "Organization", name: "Dynime LLC." },
          mainEntityOfPage: typeof window !== "undefined" ? window.location.href : undefined,
        }
      : undefined,
  });

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title: post?.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch {}
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container-custom py-16 animate-pulse space-y-6">
          <div className="h-6 w-32 bg-secondary/60 rounded" />
          <div className="h-12 w-3/4 bg-secondary/60 rounded" />
          <div className="aspect-[16/8] bg-secondary/60 rounded-2xl" />
          <div className="h-4 w-full bg-secondary/40 rounded" />
          <div className="h-4 w-5/6 bg-secondary/40 rounded" />
          <div className="h-4 w-4/6 bg-secondary/40 rounded" />
        </div>
      </Layout>
    );
  }

  if (error || !post) {
    return (
      <Layout>
        <div className="container-custom py-16 text-center">
          <h1 className="font-heading text-3xl font-bold mb-3">Post not found</h1>
          <p className="text-muted-foreground mb-6">This article may have been unpublished or moved.</p>
          <Link to="/blog" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to blog
          </Link>
        </div>
      </Layout>
    );
  }

  const safeHtml = post.content ? cleanBlogHtml(post.content) : "";

  return (
    <Layout>
      {/* Hero */}
      <section className={`relative overflow-hidden border-b border-border/50 bg-gradient-to-br ${gradientFor(post.category)}`}>
        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={post.title}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        <div className="container-custom relative py-12 md:py-16">
          <ScrollReveal>
            <Link to="/blog" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary mb-6">
              <ArrowLeft className="w-3.5 h-3.5" /> All articles
            </Link>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Link to={`/blog/category/${encodeURIComponent(post.category)}`} className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition">
                {post.category}
              </Link>
              {post.is_featured && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  Featured
                </span>
              )}
            </div>
            <h1 className="font-heading text-3xl md:text-5xl font-bold max-w-4xl leading-tight">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="text-base md:text-lg text-muted-foreground mt-4 max-w-3xl">{post.excerpt}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground mt-6">
              <span className="inline-flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {post.author}</span>
              <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {formatDate(post.published_at)}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {post.read_minutes} min read</span>
              <span className="inline-flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> {(liveViews ?? post.view_count ?? 0).toLocaleString()} views</span>
              <button onClick={share} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Cover image card */}
      {post.cover_image_url && (
        <div className="container-custom -mt-8 md:-mt-12 relative z-10">
          <img
            src={post.cover_image_url}
            alt={post.title}
            loading="lazy"
            decoding="async"
            className="w-full aspect-[16/8] object-cover rounded-2xl border border-border/60 shadow-[0_30px_80px_-40px_hsl(var(--primary)/0.4)]"
          />
        </div>
      )}

      {/* Content */}
      <section className="section-padding">
        <div className="container-custom max-w-3xl">
          {safeHtml ? (
            <article
              className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-heading prose-headings:font-bold prose-a:text-primary prose-img:rounded-xl prose-img:border prose-img:border-border/60"
              dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
          ) : (
            <p className="text-muted-foreground italic">No content yet — the author is still drafting this article.</p>
          )}

          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-border/50">
              {post.tags.map((t) => (
                <Link key={t} to={`/blog/tag/${encodeURIComponent(t)}`} className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-secondary/60 text-muted-foreground hover:bg-primary hover:text-primary-foreground transition">
                  <Tag className="w-3 h-3" />{t}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-border/50">
            <SocialShare title={post.title} text={post.excerpt || post.title} />
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="section-padding pt-0">
          <div className="container-custom">
            <h2 className="font-heading text-2xl font-bold mb-6">More in {post.category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((r) => (
                <Link
                  key={r.id}
                  to={`/blog/${r.slug}`}
                  className="group flex flex-col rounded-2xl overflow-hidden border border-border/60 bg-card/60 hover:border-primary/40 transition-all"
                >
                  <div className={`relative aspect-[16/10] bg-gradient-to-br ${gradientFor(r.category)}`}>
                    {r.cover_image_url && (
                      <img src={r.cover_image_url} alt={r.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    )}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-heading font-semibold text-base group-hover:text-primary transition-colors">{r.title}</h3>
                    {r.excerpt && <p className="text-xs text-muted-foreground mt-2 line-clamp-3 flex-1">{r.excerpt}</p>}
                    <span className="text-xs text-primary font-medium inline-flex items-center gap-1 mt-3 group-hover:gap-2 transition-all">
                      Read article <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
};

export default BlogPostPage;
