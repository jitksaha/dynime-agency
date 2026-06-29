import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Globe, AlertTriangle, CheckCircle2, Bot, ExternalLink, Search,
  Eye, FileText, Code, Copy, BarChart3, Sparkles, Activity, RefreshCw,
} from "lucide-react";
import { useSiteSettings } from "@/hooks/use-data";
import { servicePages } from "@/data/services";
import { analyzeSeo } from "@/lib/seo-analyzer";
import { useSeoRules } from "@/hooks/use-seo-rules";
import { Link } from "react-router-dom";

interface SEOAuditItem {
  page: string;
  slug: string;
  score: number;
  grade: string;
  passes: number;
  warns: number;
  fails: number;
  topIssues: string[];
}

const AdminSEO = () => {
  const qc = useQueryClient();
  const { data: settings } = useSiteSettings();
  const [keywordInput, setKeywordInput] = useState("");
  const [jsonLdPreview, setJsonLdPreview] = useState(false);
  const [ogPreviewUrl, setOgPreviewUrl] = useState("");

  const [lastSync, setLastSync] = useState<Date>(new Date());

  const { data: pages, dataUpdatedAt: pagesUpdatedAt } = useQuery({
    queryKey: ["admin-pages"],
    queryFn: async () => {
      return apiGet<any[]>("/seo/pages");
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const rules = useSeoRules();

  const saveSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await apiPost("/cms/site-settings", { key, value });
    },
    onSuccess: () => {
      toast.success("Setting saved");
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    },
  });

  // Live realtime sync placeholder
  useEffect(() => {
    const bump = () => setLastSync(new Date());

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        qc.invalidateQueries({ queryKey: ["admin-pages"] });
        qc.invalidateQueries({ queryKey: ["admin-seo-blog"] });
        qc.invalidateQueries({ queryKey: ["site-settings-row", "seo_rules"] });
        qc.invalidateQueries({ queryKey: ["site-settings-row", "page_seo"] });
        bump();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [qc]);

  const { data: blogPosts } = useQuery({
    queryKey: ["admin-seo-blog"],
    queryFn: async () => {
      return apiGet<any[]>("/cms/blog-posts/admin");
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const { data: pageSeoOverrides } = useQuery({
    queryKey: ["site-settings-row", "page_seo"],
    queryFn: async () => {
      const res = await apiGet<any>("/cms/site-settings/page_seo");
      let val: any = res?.value;
      while (typeof val === "string") {
        try { val = JSON.parse(val); } catch { break; }
      }
      return (val && typeof val === "object" ? val : {}) as Record<string, any>;
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  // Live SEO Audit using shared analyzer + admin rules
  const buildAuditItem = (
    name: string,
    slug: string,
    title: string,
    description: string,
    content: string,
    keywords: string[] = [],
  ): SEOAuditItem => {
    const report = analyzeSeo(
      {
        title,
        metaDescription: description,
        slug: slug.replace(/^\//, ""),
        content,
        primaryKeyword: keywords[0],
        secondaryKeywords: keywords.slice(1),
      },
      rules,
    );
    const topIssues = report.checks
      .filter((c) => c.severity === "fail" || c.severity === "warn")
      .sort((a, b) => (a.severity === "fail" ? -1 : 1) - (b.severity === "fail" ? -1 : 1))
      .slice(0, 4)
      .map((c) => `${c.label}: ${c.message}`);
    return {
      page: name,
      slug,
      score: report.score,
      grade: report.grade,
      passes: report.summary.passes,
      warns: report.summary.warns,
      fails: report.summary.fails,
      topIssues,
    };
  };

  const runAudit = (): SEOAuditItem[] => {
    const results: SEOAuditItem[] = [];
    const overrides = pageSeoOverrides || {};

    servicePages.forEach((sp) => {
      const ov = overrides[`service:${sp.slug}`] || {};
      results.push(
        buildAuditItem(
          sp.title,
          `/${sp.slug}`,
          ov.title || sp.metaTitle || sp.title,
          ov.description || sp.metaDescription || sp.description || "",
          sp.description || "",
          Array.isArray(ov.keywords) ? ov.keywords : [],
        ),
      );
    });

    const STATIC_SLUGS = new Set(["home", "about", "services", "portfolio", "blog", "contact"]);
    (pages || []).forEach((p) => {
      const isStatic = STATIC_SLUGS.has(p.slug);
      const slug = isStatic ? (p.slug === "home" ? "/" : `/${p.slug}`) : `/page/${p.slug}`;
      const contentText = Array.isArray(p.content)
        ? p.content.map((b: any) => (typeof b === "string" ? b : b?.text || b?.content || "")).join(" ")
        : "";
      results.push(
        buildAuditItem(p.title, slug, p.meta_title || p.title, p.meta_description || "", contentText),
      );
    });

    (blogPosts || []).filter((b: any) => b.is_published).forEach((b: any) => {
      results.push(
        buildAuditItem(
          b.title,
          `/blog/${b.slug}`,
          b.title,
          b.excerpt || "",
          b.content || "",
          Array.isArray(b.tags) ? b.tags : [],
        ),
      );
    });

    return results.sort((a, b) => a.score - b.score);
  };

  const auditResults = runAudit();
  const avgScore = auditResults.length > 0
    ? Math.round(auditResults.reduce((sum, r) => sum + r.score, 0) / auditResults.length)
    : 0;

  // Generate JSON-LD
  const generateJsonLd = () => {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: settings?.org_name || "Dynime LLC.",
      url: window.location.origin,
      logo: settings?.org_logo || "",
      description: settings?.ai_description || settings?.seo_default_description || "",
      sameAs: (settings?.social_profiles || "").split(",").map((s: string) => s.trim()).filter(Boolean),
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+13322827782",
        contactType: "customer service",
      },
      address: {
        "@type": "PostalAddress",
        addressLocality: "London",
        addressRegion: "England",
        addressCountry: "GB",
      },
    }, null, 2);
  };

  // Generate llms.txt
  const generateLlmsTxt = () => {
    const orgName = settings?.org_name || "Dynime LLC.";
    const desc = settings?.ai_description || "A digital agency specializing in web development, digital marketing, and business consulting.";
    const topics = settings?.ai_topics || "web development, digital marketing, SEO, e-commerce";
    const audience = settings?.ai_audience || "small businesses, startups, enterprises";
    const geo = settings?.ai_geo || "Global";

    let content = `# ${orgName}\n\n`;
    content += `## About\n${desc}\n\n`;
    content += `## Core Expertise\n${topics.split(",").map((t: string) => `- ${t.trim()}`).join("\n")}\n\n`;
    content += `## Target Audience\n${audience}\n\n`;
    content += `## Geographic Focus\n${geo}\n\n`;
    content += `## Services\n`;
    servicePages.forEach((sp) => {
      content += `- **${sp.title}**: ${sp.metaDescription || sp.description || ""}\n`;
    });
    const contactEmail = settings?.contact_email || settings?.org_email || "contact@dynime.com";
    content += `\n## Contact\n- Website: ${window.location.origin}\n`;
    content += `- Email: ${contactEmail}\n`;
    return content;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Advanced SEO Tools</h1>
          <p className="text-sm text-muted-foreground mt-1">Optimize for search engines and AI chatbots</p>
        </div>
      </div>

      <Tabs defaultValue="audit">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="audit"><Search className="w-3.5 h-3.5 mr-1" /> SEO Audit</TabsTrigger>
          <TabsTrigger value="global"><Globe className="w-3.5 h-3.5 mr-1" /> Global SEO</TabsTrigger>
          <TabsTrigger value="structured"><Code className="w-3.5 h-3.5 mr-1" /> Structured Data</TabsTrigger>
          <TabsTrigger value="sitemap"><FileText className="w-3.5 h-3.5 mr-1" /> Sitemap</TabsTrigger>
          <TabsTrigger value="robots"><FileText className="w-3.5 h-3.5 mr-1" /> Robots.txt</TabsTrigger>
          <TabsTrigger value="og-preview"><Eye className="w-3.5 h-3.5 mr-1" /> OG Preview</TabsTrigger>
          <TabsTrigger value="ai-seo"><Bot className="w-3.5 h-3.5 mr-1" /> AI Search</TabsTrigger>
          <TabsTrigger value="keywords"><BarChart3 className="w-3.5 h-3.5 mr-1" /> Keywords</TabsTrigger>
        </TabsList>

        {/* SEO Audit — LIVE */}
        <TabsContent value="audit">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live — auto-syncs from Pages, Blog &amp; SEO Rules
              <span className="text-muted-foreground/70">· updated {lastSync.toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/superadmin/seo-rules">
                  <Activity className="w-3.5 h-3.5 mr-1" /> Edit Rules
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/superadmin/page-seo">
                  <FileText className="w-3.5 h-3.5 mr-1" /> Edit Page SEO
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  qc.invalidateQueries({ queryKey: ["admin-pages"] });
                  qc.invalidateQueries({ queryKey: ["admin-seo-blog"] });
                  qc.invalidateQueries({ queryKey: ["site-settings-row", "page_seo"] });
                  qc.invalidateQueries({ queryKey: ["site-settings-row", "seo_rules"] });
                  toast.success("Audit refreshed");
                }}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="p-5 bg-card border border-border rounded-xl text-center md:col-span-1">
              <div
                className={`text-4xl font-bold mb-1 ${
                  avgScore >= 80
                    ? "text-emerald-500"
                    : avgScore >= 50
                      ? "text-yellow-500"
                      : "text-destructive"
                }`}
              >
                {avgScore}
              </div>
              <Progress value={avgScore} className="h-1.5 mb-2" />
              <p className="text-xs text-muted-foreground">Average score</p>
            </div>
            <div className="p-5 bg-card border border-border rounded-xl text-center">
              <div className="text-4xl font-bold text-foreground mb-1">{auditResults.length}</div>
              <p className="text-xs text-muted-foreground">Pages audited</p>
            </div>
            <div className="p-5 bg-card border border-border rounded-xl text-center">
              <div className="text-4xl font-bold text-emerald-500 mb-1">
                {auditResults.reduce((s, r) => s + r.passes, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Checks passed</p>
            </div>
            <div className="p-5 bg-card border border-border rounded-xl text-center">
              <div className="text-4xl font-bold text-yellow-500 mb-1">
                {auditResults.reduce((s, r) => s + r.warns, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Warnings</p>
            </div>
            <div className="p-5 bg-card border border-border rounded-xl text-center">
              <div className="text-4xl font-bold text-destructive mb-1">
                {auditResults.reduce((s, r) => s + r.fails, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Failures</p>
            </div>
          </div>

          <div className="space-y-2">
            {auditResults.map((result) => (
              <div
                key={result.slug}
                className="flex items-start gap-4 p-4 bg-card border border-border rounded-lg"
              >
                <div
                  className={`relative w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                    result.score >= 80
                      ? "bg-emerald-500/10 text-emerald-500"
                      : result.score >= 50
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-destructive/10 text-destructive"
                  }`}
                >
                  <span>{result.score}</span>
                  <span className="absolute -bottom-1 -right-1 text-[9px] font-bold bg-background border border-border rounded px-1">
                    {result.grade}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-foreground text-sm">{result.page}</h3>
                    <span className="text-xs text-muted-foreground">{result.slug}</span>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                      {result.passes} pass
                    </Badge>
                    {result.warns > 0 && (
                      <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-500/30">
                        {result.warns} warn
                      </Badge>
                    )}
                    {result.fails > 0 && (
                      <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                        {result.fails} fail
                      </Badge>
                    )}
                  </div>
                  {result.topIssues.length > 0 ? (
                    <ul className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                      {result.topIssues.map((t, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <AlertTriangle className="w-3 h-3 mt-0.5 text-yellow-500 shrink-0" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center gap-1 mt-1 text-emerald-500 text-xs">
                      <CheckCircle2 className="w-3 h-3" /> All checks passed
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Global SEO */}
        <TabsContent value="global">
          <div className="max-w-2xl space-y-6">
            <div className="p-6 bg-card border border-border rounded-xl space-y-4">
              <h3 className="font-semibold text-foreground">Site-Wide Meta Defaults</h3>
              <div>
                <Label className="text-xs">Default Meta Title Suffix</Label>
                <Input
                  defaultValue={settings?.seo_title_suffix || ""}
                  onBlur={(e) => saveSetting.mutate({ key: "seo_title_suffix", value: e.target.value })}
                  placeholder="| Dynime LLC."
                />
                <p className="text-xs text-muted-foreground mt-1">Appended to all page titles</p>
              </div>
              <div>
                <Label className="text-xs">Default Meta Description</Label>
                <Textarea
                  defaultValue={settings?.seo_default_description || ""}
                  onBlur={(e) => saveSetting.mutate({ key: "seo_default_description", value: e.target.value })}
                  placeholder="Your company's default description..."
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-xs">Default OG Image URL</Label>
                <Input
                  defaultValue={settings?.seo_og_image || ""}
                  onBlur={(e) => saveSetting.mutate({ key: "seo_og_image", value: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label className="text-xs">Google Site Verification</Label>
                <Input
                  defaultValue={settings?.google_verification || ""}
                  onBlur={(e) => saveSetting.mutate({ key: "google_verification", value: e.target.value })}
                  placeholder="verification code"
                />
              </div>
              <div>
                <Label className="text-xs">Bing Site Verification</Label>
                <Input
                  defaultValue={settings?.bing_verification || ""}
                  onBlur={(e) => saveSetting.mutate({ key: "bing_verification", value: e.target.value })}
                  placeholder="verification code"
                />
              </div>
              <div>
                <Label className="text-xs">Google Analytics ID</Label>
                <Input
                  defaultValue={settings?.ga_id || ""}
                  onBlur={(e) => saveSetting.mutate({ key: "ga_id", value: e.target.value })}
                  placeholder="G-XXXXXXXXXX"
                />
              </div>
              <div>
                <Label className="text-xs">Google Tag Manager ID</Label>
                <Input
                  defaultValue={settings?.gtm_id || ""}
                  onBlur={(e) => saveSetting.mutate({ key: "gtm_id", value: e.target.value })}
                  placeholder="GTM-XXXXXXX"
                />
              </div>
            </div>

            <div className="p-6 bg-card border border-border rounded-xl space-y-4">
              <h3 className="font-semibold text-foreground">Canonical & Indexing</h3>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Enable noindex for admin pages</Label>
                  <p className="text-xs text-muted-foreground">Prevent search engines from indexing /superadmin/*</p>
                </div>
                <Switch
                  defaultChecked={settings?.noindex_admin !== "false"}
                  onCheckedChange={(v) => saveSetting.mutate({ key: "noindex_admin", value: String(v) })}
                />
              </div>
              <div>
                <Label className="text-xs">Canonical Domain</Label>
                <Input
                  defaultValue={settings?.canonical_domain || ""}
                  onBlur={(e) => saveSetting.mutate({ key: "canonical_domain", value: e.target.value })}
                  placeholder="https://yourdomain.com"
                />
                <p className="text-xs text-muted-foreground mt-1">Used for canonical URLs and sitemap</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Structured Data */}
        <TabsContent value="structured">
          <div className="max-w-2xl space-y-6">
            <div className="p-6 bg-card border border-border rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">JSON-LD Organization Schema</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(generateJsonLd())}>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setJsonLdPreview(!jsonLdPreview)}>
                    <Eye className="w-3.5 h-3.5 mr-1" /> {jsonLdPreview ? "Hide" : "Preview"}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Organization Name</Label>
                  <Input
                    defaultValue={settings?.org_name || ""}
                    onBlur={(e) => saveSetting.mutate({ key: "org_name", value: e.target.value })}
                    placeholder="Dynime LLC."
                  />
                </div>
                <div>
                  <Label className="text-xs">Organization Logo URL</Label>
                  <Input
                    defaultValue={settings?.org_logo || ""}
                    onBlur={(e) => saveSetting.mutate({ key: "org_logo", value: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label className="text-xs">Social Profiles (comma-separated URLs)</Label>
                  <Textarea
                    defaultValue={settings?.social_profiles || ""}
                    onBlur={(e) => saveSetting.mutate({ key: "social_profiles", value: e.target.value })}
                    placeholder="https://facebook.com/..., https://twitter.com/..."
                    rows={2}
                  />
                </div>
              </div>

              {jsonLdPreview && (
                <pre className="p-4 bg-secondary/50 rounded-lg text-xs font-mono overflow-auto max-h-80 text-foreground">
                  {generateJsonLd()}
                </pre>
              )}
            </div>

            <div className="p-6 bg-card border border-border rounded-xl space-y-4">
              <h3 className="font-semibold text-foreground">Additional Schema Types</h3>
              <p className="text-sm text-muted-foreground">Enable additional structured data types that are automatically injected into your pages.</p>
              <div className="space-y-3">
                {[
                  { key: "schema_breadcrumb", label: "Breadcrumb Schema", desc: "Adds navigation path to search results" },
                  { key: "schema_faq", label: "FAQ Schema", desc: "Enables FAQ rich snippets on service pages" },
                  { key: "schema_local", label: "Local Business Schema", desc: "Shows business info in local search results" },
                  { key: "schema_website", label: "WebSite Schema", desc: "Enables sitelinks search box in Google" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      defaultChecked={settings?.[key] !== "false"}
                      onCheckedChange={(v) => saveSetting.mutate({ key, value: String(v) })}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Sitemap */}
        <TabsContent value="sitemap">
          <div className="max-w-2xl">
            <div className="p-6 bg-card border border-border rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Sitemap Management</h3>
                <Button variant="outline" size="sm" onClick={() => window.open("/sitemap.xml", "_blank")}>
                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> View Sitemap
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Auto-generated at build time covering all static, service, and CMS pages.
              </p>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Indexed Pages ({7 + servicePages.length + (pages || []).filter(p => p.is_published).length})</h4>
                <div className="max-h-80 overflow-y-auto space-y-1">
                  {["/", "/about", "/services", "/portfolio", "/blog", "/contact"].map((url) => (
                    <div key={url} className="flex items-center gap-2 px-3 py-2 bg-secondary/30 rounded text-xs">
                      <Globe className="w-3 h-3 text-green-500" />
                      <span className="text-foreground">{url}</span>
                      <Badge variant="secondary" className="text-[9px] ml-auto">Static</Badge>
                    </div>
                  ))}
                  {servicePages.map((sp) => (
                    <div key={sp.slug} className="flex items-center gap-2 px-3 py-2 bg-secondary/30 rounded text-xs">
                      <Globe className="w-3 h-3 text-green-500" />
                      <span className="text-foreground">/{sp.slug}</span>
                      <Badge variant="secondary" className="text-[9px] ml-auto">Service</Badge>
                    </div>
                  ))}
                  {(pages || []).filter((p) => p.is_published).map((p) => (
                    <div key={p.slug} className="flex items-center gap-2 px-3 py-2 bg-secondary/30 rounded text-xs">
                      <Globe className="w-3 h-3 text-primary" />
                      <span className="text-foreground">/page/{p.slug}</span>
                      <Badge variant="secondary" className="text-[9px] ml-auto">CMS</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Robots.txt */}
        <TabsContent value="robots">
          <div className="max-w-2xl">
            <div className="p-6 bg-card border border-border rounded-xl space-y-4">
              <h3 className="font-semibold text-foreground">Robots.txt Configuration</h3>
              <p className="text-sm text-muted-foreground">
                Controls how search engine crawlers access your site.
              </p>
              <Textarea
                defaultValue={settings?.robots_txt || `User-agent: *\nAllow: /\nDisallow: /superadmin/\nDisallow: /admin/\n\nSitemap: ${window.location.origin}/sitemap.xml`}
                onBlur={(e) => saveSetting.mutate({ key: "robots_txt", value: e.target.value })}
                rows={12}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Note: The physical robots.txt at /robots.txt is used by crawlers. Update via project files for production.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* OG Preview */}
        <TabsContent value="og-preview">
          <div className="max-w-2xl space-y-6">
            <div className="p-6 bg-card border border-border rounded-xl space-y-4">
              <h3 className="font-semibold text-foreground">Open Graph & Social Preview</h3>
              <p className="text-sm text-muted-foreground">Preview how your pages appear when shared on social media.</p>

              <div>
                <Label className="text-xs">Select Page to Preview</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-secondary/30 border border-border rounded-lg text-sm text-foreground"
                  value={ogPreviewUrl}
                  onChange={(e) => setOgPreviewUrl(e.target.value)}
                >
                  <option value="">-- Select a page --</option>
                  <option value="/">Home</option>
                  <option value="/about">About</option>
                  <option value="/services">Services</option>
                  {servicePages.map((sp) => (
                    <option key={sp.slug} value={`/${sp.slug}`}>{sp.title}</option>
                  ))}
                  {(pages || []).map((p) => (
                    <option key={p.id} value={`/page/${p.slug}`}>{p.title} (CMS)</option>
                  ))}
                </select>
              </div>

              {ogPreviewUrl && (
                <div className="space-y-4">
                  {/* Facebook preview */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Facebook / LinkedIn Preview</p>
                    <div className="border border-border rounded-lg overflow-hidden max-w-lg">
                      <div className="h-48 bg-secondary/50 flex items-center justify-center">
                        {settings?.seo_og_image ? (
                          <img src={settings.seo_og_image} alt="OG" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-muted-foreground">No OG Image Set</span>
                        )}
                      </div>
                      <div className="p-3 bg-secondary/30">
                        <p className="text-[10px] text-muted-foreground uppercase">{window.location.hostname}</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">
                          {(() => {
                            if (ogPreviewUrl === "/") return "Home";
                            const sp = servicePages.find(s => `/${s.slug}` === ogPreviewUrl);
                            if (sp) return sp.metaTitle || sp.title;
                            const pg = (pages || []).find(p => `/page/${p.slug}` === ogPreviewUrl);
                            if (pg) return pg.meta_title || pg.title;
                            return ogPreviewUrl;
                          })()}
                          {settings?.seo_title_suffix ? ` ${settings.seo_title_suffix}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {settings?.seo_default_description || "No description set."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Twitter preview */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Twitter / X Preview</p>
                    <div className="border border-border rounded-2xl overflow-hidden max-w-lg">
                      <div className="h-40 bg-secondary/50 flex items-center justify-center">
                        {settings?.seo_og_image ? (
                          <img src={settings.seo_og_image} alt="OG" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-muted-foreground">No OG Image</span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-foreground">
                          {(() => {
                            const sp = servicePages.find(s => `/${s.slug}` === ogPreviewUrl);
                            return sp?.metaTitle || sp?.title || ogPreviewUrl;
                          })()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{window.location.hostname}</p>
                      </div>
                    </div>
                  </div>

                  {/* Google preview */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Google Search Preview</p>
                    <div className="p-4 bg-white dark:bg-secondary/30 rounded-lg max-w-lg">
                      <p className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                        {(() => {
                          const sp = servicePages.find(s => `/${s.slug}` === ogPreviewUrl);
                          return (sp?.metaTitle || sp?.title || ogPreviewUrl) + (settings?.seo_title_suffix || "");
                        })()}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                        {window.location.origin}{ogPreviewUrl}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {settings?.seo_default_description || "No description."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* AI Search Optimization */}
        <TabsContent value="ai-seo">
          <div className="max-w-2xl space-y-6">
            <div className="p-6 bg-card border border-border rounded-xl space-y-4">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">AI Search Engine Optimization</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Optimize your content to be discovered and cited by ChatGPT, Google AI, Perplexity, and other AI engines.
              </p>

              <div className="space-y-4">
                <div className="p-4 bg-secondary/30 rounded-lg space-y-2">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> AI SEO Best Practices</h4>
                  <ul className="text-xs text-muted-foreground space-y-1.5">
                    {[
                      { label: "Structured Data (JSON-LD)", desc: "Organization schema helps AI understand your brand." },
                      { label: "Clear Page Hierarchy", desc: "H1 → H2 → H3 headings on every page." },
                      { label: "FAQ Sections", desc: "Service pages with Q&A get cited more often." },
                      { label: "Concise Answers", desc: "Answer common questions in 2-3 sentences." },
                      { label: "Author & Expertise", desc: "E-E-A-T signals improve AI trust." },
                      { label: "LLMs.txt File", desc: "Machine-readable summary for AI crawlers." },
                    ].map(({ label, desc }) => (
                      <li key={label} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        <span><strong>{label}:</strong> {desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <Label className="text-xs">AI-Friendly Site Description</Label>
                  <Textarea
                    defaultValue={settings?.ai_description || ""}
                    onBlur={(e) => saveSetting.mutate({ key: "ai_description", value: e.target.value })}
                    placeholder="Comprehensive description for AI engines..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label className="text-xs">Key Topics / Expertise (comma-separated)</Label>
                  <Input
                    defaultValue={settings?.ai_topics || ""}
                    onBlur={(e) => saveSetting.mutate({ key: "ai_topics", value: e.target.value })}
                    placeholder="web development, digital marketing, SEO..."
                  />
                </div>
                <div>
                  <Label className="text-xs">Target Audience</Label>
                  <Input
                    defaultValue={settings?.ai_audience || ""}
                    onBlur={(e) => saveSetting.mutate({ key: "ai_audience", value: e.target.value })}
                    placeholder="small businesses, startups, enterprises..."
                  />
                </div>
                <div>
                  <Label className="text-xs">Geographic Focus</Label>
                  <Input
                    defaultValue={settings?.ai_geo || ""}
                    onBlur={(e) => saveSetting.mutate({ key: "ai_geo", value: e.target.value })}
                    placeholder="Bangladesh, Global..."
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-card border border-border rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">LLMs.txt / AI Crawl File</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const generated = generateLlmsTxt();
                    saveSetting.mutate({ key: "llms_txt", value: generated });
                  }}>
                    <Sparkles className="w-3.5 h-3.5 mr-1" /> Auto-Generate
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(settings?.llms_txt || "")}>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                  </Button>
                </div>
              </div>
              <Textarea
                defaultValue={settings?.llms_txt || ""}
                onBlur={(e) => saveSetting.mutate({ key: "llms_txt", value: e.target.value })}
                placeholder="Click Auto-Generate to create from your site data..."
                rows={10}
                className="font-mono text-xs"
              />
            </div>
          </div>
        </TabsContent>

        {/* Keywords */}
        <TabsContent value="keywords">
          <div className="max-w-2xl space-y-6">
            <div className="p-6 bg-card border border-border rounded-xl space-y-4">
              <h3 className="font-semibold text-foreground">Keyword Tracker</h3>
              <p className="text-sm text-muted-foreground">
                Track your target keywords and ensure they appear in your content.
              </p>
              <div>
                <Label className="text-xs">Target Keywords (comma-separated)</Label>
                <Textarea
                  defaultValue={settings?.target_keywords || ""}
                  onBlur={(e) => saveSetting.mutate({ key: "target_keywords", value: e.target.value })}
                  placeholder="web design company, digital marketing agency, SEO services..."
                  rows={3}
                />
              </div>

              {settings?.target_keywords && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Keyword Coverage</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {settings.target_keywords.split(",").map((kw: string) => {
                      const keyword = kw.trim().toLowerCase();
                      if (!keyword) return null;
                      const foundIn: string[] = [];
                      servicePages.forEach((sp) => {
                        const text = `${sp.title} ${sp.metaTitle || ""} ${sp.metaDescription || ""} ${sp.description || ""}`.toLowerCase();
                        if (text.includes(keyword)) foundIn.push(sp.title);
                      });
                      (pages || []).forEach((pg) => {
                        const text = `${pg.title} ${pg.meta_title || ""} ${pg.meta_description || ""}`.toLowerCase();
                        if (text.includes(keyword)) foundIn.push(pg.title);
                      });
                      return (
                        <div key={keyword} className="p-3 bg-secondary/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            {foundIn.length > 0 ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                            )}
                            <span className="text-sm font-medium text-foreground">{keyword}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {foundIn.length > 0 ? `Found in: ${foundIn.slice(0, 3).join(", ")}${foundIn.length > 3 ? `... +${foundIn.length - 3}` : ""}` : "Not found in any page"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-card border border-border rounded-xl space-y-4">
              <h3 className="font-semibold text-foreground">Keyword Density Checker</h3>
              <div>
                <Label className="text-xs">Enter text to analyze</Label>
                <Textarea
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Paste your page content here to check keyword density..."
                  rows={5}
                />
              </div>
              {keywordInput && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Top Words</h4>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const words = keywordInput.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 3);
                      const freq: Record<string, number> = {};
                      words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
                      return Object.entries(freq)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 15)
                        .map(([word, count]) => (
                          <Badge key={word} variant="secondary" className="text-xs">
                            {word} <span className="ml-1 text-primary font-bold">{count}x</span>
                            <span className="ml-1 text-muted-foreground">({((count / words.length) * 100).toFixed(1)}%)</span>
                          </Badge>
                        ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </SuperAdminLayout>
  );
};

export default AdminSEO;
