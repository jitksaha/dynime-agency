import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/db/client";
import Layout from "@/components/layout/Layout";
import BlockRenderer from "@/components/page-builder/BlockRenderer";
import { Block } from "@/components/page-builder/types";
import { useEffect } from "react";
import NotFound from "./NotFound";

const DynamicPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading, error } = useQuery({
    queryKey: ["public-page", slug],
    queryFn: async () => {
      const { data, error } = await db
        .from("pages")
        .select("*")
        .eq("slug", slug!)
        .eq("is_published", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (page) {
      document.title = page.meta_title || page.title;
      const setMeta = (name: string, content: string) => {
        let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`) as HTMLMetaElement;
        if (!el) {
          el = document.createElement("meta");
          el.setAttribute(name.startsWith("og:") ? "property" : "name", name);
          document.head.appendChild(el);
        }
        el.content = content;
      };
      if (page.meta_description) setMeta("description", page.meta_description);
      setMeta("og:title", page.meta_title || page.title);
      if (page.meta_description) setMeta("og:description", page.meta_description);
      if (page.og_image) setMeta("og:image", page.og_image);
    }
  }, [page]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background overflow-hidden">
        {/* Ambient gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vmin] h-[60vmin] rounded-full bg-primary/20 blur-3xl animate-pulse" />
          <div className="absolute top-1/3 left-1/3 w-[30vmin] h-[30vmin] rounded-full bg-accent/20 blur-3xl animate-pulse [animation-delay:600ms]" />
          <div className="absolute bottom-1/3 right-1/3 w-[28vmin] h-[28vmin] rounded-full bg-primary/15 blur-3xl animate-pulse [animation-delay:1200ms]" />
        </div>

        <div className="relative flex flex-col items-center gap-6 px-6">
          {/* Triple orbit loader */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-accent border-l-accent animate-spin [animation-duration:1.6s] [animation-direction:reverse]" />
            <div className="absolute inset-5 rounded-full border-2 border-transparent border-t-primary/60 animate-spin [animation-duration:2.4s]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_20px_hsl(var(--primary))]" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <p className="font-heading text-lg sm:text-xl font-semibold tracking-tight bg-gradient-to-r from-primary via-foreground to-primary bg-[length:200%_100%] bg-clip-text text-transparent animate-[shimmer_2.4s_linear_infinite]">
              Preparing your page
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Crafting the experience
              <span className="inline-flex ml-1">
                <span className="animate-bounce [animation-delay:0ms]">.</span>
                <span className="animate-bounce [animation-delay:150ms]">.</span>
                <span className="animate-bounce [animation-delay:300ms]">.</span>
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!page || error) {
    return <NotFound />;
  }

  const blocks: Block[] = Array.isArray(page.content) ? (page.content as unknown as Block[]) : [];

  return (
    <Layout>
      <section className="py-10 md:py-10">
        <div className="container-custom max-w-4xl space-y-6">
          {blocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
          {blocks.length === 0 && (
            <p className="text-center text-muted-foreground py-14">This page has no content yet.</p>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default DynamicPage;
