import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search, Share2, Sliders, FileText, Globe, ExternalLink, Gauge, Smartphone,
  Code2, BookOpen, ShieldCheck, Compass, LineChart, Map, Bot, Copy, Activity,
} from "lucide-react";
import SeoHealthPanel from "@/components/superadmin/SeoHealthPanel";
import SeoAuditPanel from "@/components/superadmin/SeoAuditPanel";

type ToolCard = {
  title: string;
  description: string;
  icon: any;
  to?: string;
  href?: string;
  badge?: string;
};

const internalTools: ToolCard[] = [
  { title: "Google Search Console", description: "Indexing coverage, queries, CTR, sitemaps.", icon: Search, to: "/superadmin/search-console", badge: "Connected" },
  { title: "OG Validator", description: "Validate Open Graph & Twitter previews.", icon: Share2, to: "/superadmin/og-validator" },
  { title: "Page SEO", description: "Per-page titles, descriptions & canonical URLs.", icon: FileText, to: "/superadmin/page-seo" },
  { title: "SEO Rules", description: "Sitewide robots, redirects & schema rules.", icon: Sliders, to: "/superadmin/seo-rules" },
  { title: "SEO Tools", description: "Sitemap, schema & technical SEO toolkit.", icon: Globe, to: "/superadmin/seo" },
];

const performance: ToolCard[] = [
  { title: "PageSpeed Insights", description: "Core Web Vitals & Lighthouse audit.", icon: Gauge, href: "https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fdynime.com" },
  { title: "Mobile-Friendly Test", description: "Check mobile rendering for Google.", icon: Smartphone, href: "https://search.google.com/test/mobile-friendly?url=https%3A%2F%2Fdynime.com" },
  { title: "Rich Results Test", description: "Validate structured data eligibility.", icon: Code2, href: "https://search.google.com/test/rich-results?url=https%3A%2F%2Fdynime.com" },
  { title: "Schema Markup Validator", description: "Validate JSON-LD / microdata.", icon: ShieldCheck, href: "https://validator.schema.org/?url=https%3A%2F%2Fdynime.com" },
];

const ranking: ToolCard[] = [
  { title: "Bing Webmaster Tools", description: "Submit sitemap & track Bing rankings.", icon: Compass, href: "https://www.bing.com/webmasters/about" },
  { title: "Yandex Webmaster", description: "Index & analytics for Yandex search.", icon: Compass, href: "https://webmaster.yandex.com/" },
  { title: "Ahrefs Site Explorer", description: "Backlinks, organic keywords, traffic.", icon: LineChart, href: "https://ahrefs.com/site-explorer/overview/v2/exact/recent?target=dynime.com" },
  { title: "SEMrush Domain Overview", description: "Competitive analysis & keyword gaps.", icon: LineChart, href: "https://www.semrush.com/analytics/overview/?q=dynime.com" },
  { title: "Ubersuggest", description: "Free keyword & SEO insights.", icon: LineChart, href: "https://app.neilpatel.com/en/ubersuggest/overview?domain=dynime.com" },
  { title: "Moz Link Explorer", description: "Domain authority & link analysis.", icon: LineChart, href: "https://moz.com/link-explorer?site=dynime.com" },
];

const technical: ToolCard[] = [
  { title: "Sitemap", description: "View your live sitemap.xml.", icon: Map, href: "https://dynime.com/sitemap.xml" },
  { title: "robots.txt", description: "View your live robots.txt.", icon: Bot, href: "https://dynime.com/robots.txt" },
  { title: "Google Cache", description: "What Google has cached for your homepage.", icon: BookOpen, href: "https://www.google.com/search?q=cache:dynime.com" },
  { title: "Indexed Pages", description: "site: query of indexed URLs.", icon: Search, href: "https://www.google.com/search?q=site%3Adynime.com" },
];

function ToolGrid({ items }: { items: ToolCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((t) => {
        const Icon = t.icon;
        const inner = (
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div>
                  <CardTitle className="text-base">{t.title}</CardTitle>
                </div>
                {t.badge ? <Badge variant="secondary">{t.badge}</Badge> : null}
                {t.href ? <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /> : null}
              </div>
              <CardDescription>{t.description}</CardDescription>
            </CardHeader>
          </Card>
        );
        return t.to ? (
          <Link key={t.title} to={t.to}>{inner}</Link>
        ) : (
          <a key={t.title} href={t.href} target="_blank" rel="noreferrer">{inner}</a>
        );
      })}
    </div>
  );
}

const SeoHub = () => {
  const [bing, setBing] = useState("");
  const [yandex, setYandex] = useState("");
  const [pinterest, setPinterest] = useState("");
  const [baidu, setBaidu] = useState("");
  const [facebook, setFacebook] = useState("");

  const snippet = useMemo(() => {
    const tags: string[] = [];
    if (bing) tags.push(`<meta name="msvalidate.01" content="${bing}" />`);
    if (yandex) tags.push(`<meta name="yandex-verification" content="${yandex}" />`);
    if (pinterest) tags.push(`<meta name="p:domain_verify" content="${pinterest}" />`);
    if (baidu) tags.push(`<meta name="baidu-site-verification" content="${baidu}" />`);
    if (facebook) tags.push(`<meta name="facebook-domain-verification" content="${facebook}" />`);
    return tags.join("\n");
  }, [bing, yandex, pinterest, baidu, facebook]);

  const copy = () => {
    if (!snippet) {
      toast.error("Enter at least one verification token first");
      return;
    }
    navigator.clipboard.writeText(snippet);
    toast.success("Meta tags copied — paste them into index.html <head>");
  };

  useEffect(() => { document.title = "SEO & Ranking Hub — Admin"; }, []);

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold tracking-tight">SEO & Ranking Hub</h1>
        <p className="text-muted-foreground">Everything you need to monitor indexing, rankings, and technical SEO in one place.</p>
      </div>

      <Tabs defaultValue="tools">
        <TabsList>
          <TabsTrigger value="tools">Built-in Tools</TabsTrigger>
          <TabsTrigger value="health"><Activity className="mr-1.5 h-3.5 w-3.5" />Health Checks</TabsTrigger>
          <TabsTrigger value="audit">Technical Audit</TabsTrigger>
          <TabsTrigger value="ranking">Ranking & Keywords</TabsTrigger>
          <TabsTrigger value="performance">Performance & Validation</TabsTrigger>
          <TabsTrigger value="technical">Technical SEO</TabsTrigger>
          <TabsTrigger value="verify">Search Engine Verification</TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="mt-4"><ToolGrid items={internalTools} /></TabsContent>
        <TabsContent value="health" className="mt-4"><SeoHealthPanel /></TabsContent>
        <TabsContent value="audit" className="mt-4"><SeoAuditPanel /></TabsContent>
        <TabsContent value="ranking" className="mt-4"><ToolGrid items={ranking} /></TabsContent>
        <TabsContent value="performance" className="mt-4"><ToolGrid items={performance} /></TabsContent>
        <TabsContent value="technical" className="mt-4"><ToolGrid items={technical} /></TabsContent>

        <TabsContent value="verify" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Search engine verification tags</CardTitle>
              <CardDescription>
                Google is already verified. Add other search engines below — paste tokens, copy the generated
                snippet, and add it to <code className="rounded bg-muted px-1">index.html</code>'s <code className="rounded bg-muted px-1">&lt;head&gt;</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Bing (msvalidate.01)</Label>
                  <Input value={bing} onChange={(e) => setBing(e.target.value)} placeholder="ABCDEF1234567890" />
                  <a className="text-xs text-primary hover:underline" href="https://www.bing.com/webmasters/home" target="_blank" rel="noreferrer">Get token from Bing Webmaster Tools →</a>
                </div>
                <div className="space-y-1.5">
                  <Label>Yandex (yandex-verification)</Label>
                  <Input value={yandex} onChange={(e) => setYandex(e.target.value)} placeholder="abc123def456" />
                  <a className="text-xs text-primary hover:underline" href="https://webmaster.yandex.com/" target="_blank" rel="noreferrer">Get token from Yandex Webmaster →</a>
                </div>
                <div className="space-y-1.5">
                  <Label>Pinterest (p:domain_verify)</Label>
                  <Input value={pinterest} onChange={(e) => setPinterest(e.target.value)} placeholder="abc123def456" />
                  <a className="text-xs text-primary hover:underline" href="https://www.pinterest.com/settings/claim" target="_blank" rel="noreferrer">Claim your domain on Pinterest →</a>
                </div>
                <div className="space-y-1.5">
                  <Label>Baidu (baidu-site-verification)</Label>
                  <Input value={baidu} onChange={(e) => setBaidu(e.target.value)} placeholder="codeva-xxxxxxxx" />
                  <a className="text-xs text-primary hover:underline" href="https://ziyuan.baidu.com/site/index" target="_blank" rel="noreferrer">Get token from Baidu Search Resource →</a>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Facebook (facebook-domain-verification)</Label>
                  <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="abc123def456" />
                  <a className="text-xs text-primary hover:underline" href="https://business.facebook.com/business/help/286768115176155" target="_blank" rel="noreferrer">Verify your domain in Meta Business →</a>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Generated meta tags</Label>
                  <Button size="sm" variant="outline" onClick={copy}><Copy className="mr-2 h-3.5 w-3.5" />Copy</Button>
                </div>
                <pre className="overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
{snippet || "// Enter a token above to generate meta tags"}
                </pre>
                <p className="text-xs text-muted-foreground">
                  After pasting into <code className="rounded bg-muted px-1">index.html</code>, publish the site and click "Verify" inside each
                  search engine's dashboard.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SeoHub;
