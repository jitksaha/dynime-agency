import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Save,
  Navigation,
  PanelBottom,
  Eye,
  EyeOff,
  Tag,
  Link as LinkIcon,
  MapPin,
  Phone,
  Share2,
  CreditCard,
  Copyright,
  Minus,
  Image as ImageIcon,
  Megaphone,
  Mail,
} from "lucide-react";
import { useSiteSettings } from "@/hooks/use-data";
import { FOOTER_PLACEHOLDERS, renderPlaceholders } from "@/lib/footer-placeholders";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { apiPost } from "@/lib/api";
import {
  defaultFooterBlocks,
  parseFooterBlocks,
  generateBlockId,
  type FooterBlock,
  type FooterBlockType,
  type LinkItem,
  type FooterLocation,
  type FooterContact,
} from "@/components/layout/footer-blocks";

interface NavItem {
  id: string;
  label: string;
  to: string;
  visible: boolean;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const defaultHeaderItems: NavItem[] = [
  { id: "1", label: "Home", to: "/", visible: true },
  { id: "2", label: "About Us", to: "/about", visible: true },
  { id: "3", label: "Service", to: "__mega_menu__", visible: true },
  { id: "4", label: "Portfolio", to: "/portfolio", visible: true },
  { id: "6", label: "Partners", to: "/blog", visible: true },
];

const defaultMobileItems: NavItem[] = [
  { id: "m1", label: "Home", to: "/", visible: true },
  { id: "m2", label: "About Us", to: "/about", visible: true },
  { id: "m3", label: "Service", to: "/services", visible: true },
  { id: "m4", label: "Portfolio", to: "/portfolio", visible: true },
  { id: "m6", label: "Partners", to: "/blog", visible: true },
  { id: "m7", label: "Contact Us", to: "/contact", visible: true },
];

const blockMeta: Record<FooterBlockType, { label: string; icon: typeof Tag; desc: string }> = {
  brand: { label: "Brand", icon: ImageIcon, desc: "Logo + short description" },
  tagline: { label: "Tagline", icon: Tag, desc: "Headline + optional CTA" },
  links: { label: "Link list", icon: LinkIcon, desc: "Titled column of links" },
  locations: { label: "Locations", icon: MapPin, desc: "Office addresses" },
  contacts: { label: "Contacts", icon: Phone, desc: "Phones / emails" },
  social: { label: "Social", icon: Share2, desc: "Social media icons" },
  payments: { label: "Payment badges", icon: CreditCard, desc: "Accepted payments" },
  copyright: { label: "Copyright", icon: Copyright, desc: "Legal © line" },
  divider: { label: "Row divider", icon: Minus, desc: "Start a new row" },
};

const newBlock = (type: FooterBlockType): FooterBlock => {
  const base = { id: generateBlockId(), visible: true, width: "default" as const };
  switch (type) {
    case "brand":
      return { ...base, type, showLogo: true, description: "" };
    case "tagline":
      return { ...base, type, text: "Your tagline here", ctaLabel: "", ctaTo: "" };
    case "links":
      return { ...base, type, width: "narrow", title: "New column", links: [{ label: "Link", to: "/" }] };
    case "locations":
      return { ...base, type, width: "wide", title: "Offices", items: [] };
    case "contacts":
      return { ...base, type, title: "Get in touch", items: [] };
    case "social":
      return { ...base, type, width: "narrow", title: "Follow us" };
    case "payments":
      return { ...base, type, badges: ["Visa", "Mastercard"] };
    case "copyright":
      return { ...base, type, text: "© {year} Your Company. All rights reserved." };
    case "divider":
      return { ...base, type, width: "full" };
  }
};

const AdminHeaderFooter = () => {
  const qc = useQueryClient();
  const { data: settings } = useSiteSettings();

  // Header state
  const [headerItems, setHeaderItems] = useState<NavItem[]>(defaultHeaderItems);
  const [mobileItems, setMobileItems] = useState<NavItem[]>(defaultMobileItems);
  const [ctaText, setCtaText] = useState("Contact Us");
  const [ctaUrl, setCtaUrl] = useState("/contact");
  const [showThemeToggle, setShowThemeToggle] = useState(true);

  // Footer block state
  const [blocks, setBlocks] = useState<FooterBlock[]>(defaultFooterBlocks);

  // Footer hero CTA + newsletter config
  const [footerCta, setFooterCta] = useState({
    eyebrow: "",
    text: "",
    subtext: "",
    button: "",
    url: "",
    secondary: "",
    secondaryUrl: "",
  });
  const [newsletter, setNewsletter] = useState({
    title: "",
    subtext: "",
    provider: "builtin" as "builtin" | "mailchimp" | "sendgrid" | "resend" | "sender" | "kit",
    mailchimpApiKey: "",
    mailchimpListId: "",
    sendgridApiKey: "",
    sendgridListId: "",
    resendApiKey: "",
    resendAudienceId: "",
    senderApiKey: "",
    senderGroupId: "",
    kitApiKey: "",
    kitFormId: "",
    autoSync: true,
  });
  const [bottomBar, setBottomBar] = useState({
    copyright: "",
    trademark: "",
  });

  const [hasChanges, setHasChanges] = useState(false);
  const markChanged = () => setHasChanges(true);

  useEffect(() => {
    if (!settings) return;
    try {
      if (settings.header_nav) setHeaderItems(JSON.parse(settings.header_nav));
      if (settings.mobile_nav) setMobileItems(JSON.parse(settings.mobile_nav));
      if (settings.header_cta_text) setCtaText(settings.header_cta_text);
      if (settings.header_cta_url) setCtaUrl(settings.header_cta_url);
      if (settings.header_theme_toggle) setShowThemeToggle(settings.header_theme_toggle !== "false");
      setBlocks(parseFooterBlocks(settings.footer_blocks, settings));
      setFooterCta({
        eyebrow: settings.footer_cta_eyebrow || "",
        text: settings.footer_cta_text || "",
        subtext: settings.footer_cta_subtext || "",
        button: settings.footer_cta_button || "",
        url: settings.footer_cta_url || "",
        secondary: settings.footer_cta_secondary || "",
        secondaryUrl: settings.footer_cta_secondary_url || "",
      });
      setNewsletter({
        title: settings.newsletter_title || "",
        subtext: settings.newsletter_subtext || "",
        provider: ((settings.newsletter_provider as typeof newsletter.provider) || "builtin"),
        mailchimpApiKey: settings.mailchimp_api_key || "",
        mailchimpListId: settings.mailchimp_list_id || "",
        sendgridApiKey: settings.sendgrid_api_key || "",
        sendgridListId: settings.sendgrid_list_id || "",
        resendApiKey: settings.resend_api_key || "",
        resendAudienceId: settings.resend_audience_id || "",
        senderApiKey: settings.sender_api_key || "",
        senderGroupId: settings.sender_group_id || "",
        kitApiKey: settings.kit_api_key || "",
        kitFormId: settings.kit_form_id || "",
        autoSync: settings.newsletter_auto_sync !== "false",
      });
      setBottomBar({
        copyright: settings.footer_copyright || "",
        trademark: settings.footer_trademark || "",
      });
    } catch {
      /* ignore */
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries: { key: string; value: string }[] = [
        { key: "header_nav", value: JSON.stringify(headerItems) },
        { key: "mobile_nav", value: JSON.stringify(mobileItems) },
        { key: "header_cta_text", value: ctaText },
        { key: "header_cta_url", value: ctaUrl },
        { key: "header_theme_toggle", value: String(showThemeToggle) },
        { key: "footer_blocks", value: JSON.stringify(blocks) },
        { key: "footer_cta_eyebrow", value: footerCta.eyebrow },
        { key: "footer_cta_text", value: footerCta.text },
        { key: "footer_cta_subtext", value: footerCta.subtext },
        { key: "footer_cta_button", value: footerCta.button },
        { key: "footer_cta_url", value: footerCta.url },
        { key: "footer_cta_secondary", value: footerCta.secondary },
        { key: "footer_cta_secondary_url", value: footerCta.secondaryUrl },
        { key: "newsletter_title", value: newsletter.title },
        { key: "newsletter_subtext", value: newsletter.subtext },
        { key: "newsletter_provider", value: newsletter.provider },
        { key: "newsletter_auto_sync", value: String(newsletter.autoSync) },
        { key: "mailchimp_api_key", value: newsletter.mailchimpApiKey },
        { key: "mailchimp_list_id", value: newsletter.mailchimpListId },
        { key: "sendgrid_api_key", value: newsletter.sendgridApiKey },
        { key: "sendgrid_list_id", value: newsletter.sendgridListId },
        { key: "resend_api_key", value: newsletter.resendApiKey },
        { key: "resend_audience_id", value: newsletter.resendAudienceId },
        { key: "sender_api_key", value: newsletter.senderApiKey },
        { key: "sender_group_id", value: newsletter.senderGroupId },
        { key: "kit_api_key", value: newsletter.kitApiKey },
        { key: "kit_form_id", value: newsletter.kitFormId },
        { key: "footer_copyright", value: bottomBar.copyright },
        { key: "footer_trademark", value: bottomBar.trademark },
      ];

      const rows = entries.map(entry => ({
        key: entry.key,
        value: JSON.stringify(entry.value),
      }));
      await apiPost("/cms/site-settings/bulk", { settings: rows });
    },
    onSuccess: async () => {
      toast.success("Saved! Footer will update automatically.");
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      setHasChanges(false);
      // Auto-sync existing subscribers when a real provider is configured
      if (newsletter.autoSync && newsletter.provider !== "builtin") {
        try {
          const { data, error } = await supabase.functions.invoke(
            "sync-newsletter-subscribers",
            { body: { provider: newsletter.provider } },
          );
          if (error) throw error;
          const r = data as { synced?: number; total?: number; provider?: string } | null;
          if (r?.total) {
            toast.success(`Auto-synced ${r.synced ?? 0} of ${r.total} subscribers to ${r.provider}.`);
          }
        } catch (e) {
          toast.error(`Auto-sync failed: ${(e as Error).message}`);
        }
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveItem = <T,>(arr: T[], index: number, direction: "up" | "down"): T[] => {
    const newArr = [...arr];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= arr.length) return arr;
    [newArr[index], newArr[target]] = [newArr[target], newArr[index]];
    return newArr;
  };

  const updateBlock = (id: string, patch: Partial<FooterBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...patch } as FooterBlock) : b)));
    markChanged();
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    markChanged();
  };

  const moveBlock = (id: string, dir: "up" | "down") => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      return moveItem(prev, idx, dir);
    });
    markChanged();
  };

  const addBlock = (type: FooterBlockType) => {
    setBlocks((prev) => [...prev, newBlock(type)]);
    markChanged();
  };

  return (
    <SuperAdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Header & Footer Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Block-based footer — saved changes appear instantly on the live site.
          </p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={!hasChanges || saveMutation.isPending}>
          <Save className="w-4 h-4 mr-1" />
          {saveMutation.isPending ? "Saving..." : "Save All Changes"}
        </Button>
      </div>

      <Tabs defaultValue="header">
        <TabsList className="mb-6">
          <TabsTrigger value="header">
            <Navigation className="w-3.5 h-3.5 mr-1" /> Header
          </TabsTrigger>
          <TabsTrigger value="mobile">
            <Navigation className="w-3.5 h-3.5 mr-1" /> Mobile Menu
          </TabsTrigger>
          <TabsTrigger value="footer">
            <PanelBottom className="w-3.5 h-3.5 mr-1" /> Footer Blocks
          </TabsTrigger>
          <TabsTrigger value="hero">
            <Megaphone className="w-3.5 h-3.5 mr-1" /> Footer Hero & Newsletter
          </TabsTrigger>
        </TabsList>

        {/* Header */}
        <TabsContent value="header">
          <NavListEditor
            title="Desktop Navigation Items"
            items={headerItems}
            setItems={(it) => {
              setHeaderItems(it);
              markChanged();
            }}
            hint={
              <>
                Use <code className="bg-secondary px-1 rounded">__mega_menu__</code> as URL to trigger the
                Mega Menu dropdown.
              </>
            }
          />

          <div className="max-w-2xl mt-6 p-6 bg-card border border-border rounded-xl space-y-4">
            <h3 className="font-semibold text-foreground">Header Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">CTA Button Text</Label>
                <Input
                  value={ctaText}
                  onChange={(e) => {
                    setCtaText(e.target.value);
                    markChanged();
                  }}
                />
              </div>
              <div>
                <Label className="text-xs">CTA Button URL</Label>
                <Input
                  value={ctaUrl}
                  onChange={(e) => {
                    setCtaUrl(e.target.value);
                    markChanged();
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Show Theme Toggle</Label>
                <p className="text-xs text-muted-foreground">Dark/light mode switch in header</p>
              </div>
              <Switch
                checked={showThemeToggle}
                onCheckedChange={(v) => {
                  setShowThemeToggle(v);
                  markChanged();
                }}
              />
            </div>
          </div>
        </TabsContent>

        {/* Mobile */}
        <TabsContent value="mobile">
          <NavListEditor
            title="Mobile Navigation Items"
            items={mobileItems}
            setItems={(it) => {
              setMobileItems(it);
              markChanged();
            }}
          />
        </TabsContent>

        {/* Footer Blocks */}
        <TabsContent value="footer">
          <div className="max-w-4xl space-y-4">
            <div className="p-4 bg-secondary/30 border border-border rounded-xl">
              <p className="text-xs text-muted-foreground mb-2">
                Add blocks to compose the footer. Each block becomes a column. Use a <strong>Row divider</strong>{" "}
                to start a new row (e.g. for the bottom copyright bar).
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(blockMeta) as FooterBlockType[]).map((t) => {
                  const M = blockMeta[t];
                  return (
                    <Button
                      key={t}
                      size="sm"
                      variant="outline"
                      onClick={() => addBlock(t)}
                      className="h-8 text-xs"
                    >
                      <M.icon className="w-3.5 h-3.5 mr-1" /> {M.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              {blocks.map((block, idx) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  isFirst={idx === 0}
                  isLast={idx === blocks.length - 1}
                  onUpdate={(patch) => updateBlock(block.id, patch)}
                  onRemove={() => removeBlock(block.id)}
                  onMove={(dir) => moveBlock(block.id, dir)}
                />
              ))}
              {blocks.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                  Footer is empty. Add a block above to start.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Footer Hero CTA + Newsletter provider */}
        <TabsContent value="hero">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6">
            <div className="space-y-6 min-w-0">
            {/* Hero CTA */}
            <div className="p-6 bg-card border border-border rounded-xl space-y-4">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">Footer Hero CTA</h3>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                The big "let's build something" headline at the top of the footer.
              </p>
              <div>
                <Label className="text-xs">Eyebrow / pill text</Label>
                <Input
                  value={footerCta.eyebrow}
                  onChange={(e) => { setFooterCta({ ...footerCta, eyebrow: e.target.value }); markChanged(); }}
                  placeholder="Ready when you are"
                />
              </div>
              <div>
                <Label className="text-xs">Headline</Label>
                <Textarea
                  rows={2}
                  value={footerCta.text}
                  onChange={(e) => { setFooterCta({ ...footerCta, text: e.target.value }); markChanged(); }}
                  placeholder="Turn your bold idea into a digital product people love."
                />
              </div>
              <div>
                <Label className="text-xs">Sub-headline</Label>
                <Textarea
                  rows={2}
                  value={footerCta.subtext}
                  onChange={(e) => { setFooterCta({ ...footerCta, subtext: e.target.value }); markChanged(); }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Primary button label</Label>
                  <Input
                    value={footerCta.button}
                    onChange={(e) => { setFooterCta({ ...footerCta, button: e.target.value }); markChanged(); }}
                    placeholder="Start your project"
                  />
                </div>
                <div>
                  <Label className="text-xs">Primary button URL</Label>
                  <Input
                    value={footerCta.url}
                    onChange={(e) => { setFooterCta({ ...footerCta, url: e.target.value }); markChanged(); }}
                    placeholder="/contact"
                  />
                </div>
                <div>
                  <Label className="text-xs">Secondary button label</Label>
                  <Input
                    value={footerCta.secondary}
                    onChange={(e) => { setFooterCta({ ...footerCta, secondary: e.target.value }); markChanged(); }}
                    placeholder="View our work"
                  />
                </div>
                <div>
                  <Label className="text-xs">Secondary button URL</Label>
                  <Input
                    value={footerCta.secondaryUrl}
                    onChange={(e) => { setFooterCta({ ...footerCta, secondaryUrl: e.target.value }); markChanged(); }}
                    placeholder="/portfolio"
                  />
                </div>
              </div>
            </div>

            {/* Newsletter */}
            <div className="p-6 bg-card border border-border rounded-xl space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">Newsletter Signup</h3>
              </div>
              <div>
                <Label className="text-xs">Heading</Label>
                <Input
                  value={newsletter.title}
                  onChange={(e) => { setNewsletter({ ...newsletter, title: e.target.value }); markChanged(); }}
                  placeholder="Get our best ideas, monthly"
                />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea
                  rows={2}
                  value={newsletter.subtext}
                  onChange={(e) => { setNewsletter({ ...newsletter, subtext: e.target.value }); markChanged(); }}
                />
              </div>
              <div>
                <Label className="text-xs">Provider</Label>
                <Select
                  value={newsletter.provider}
                  onValueChange={(v) => { setNewsletter({ ...newsletter, provider: v as typeof newsletter.provider }); markChanged(); }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="builtin">Built-in (store in our database)</SelectItem>
                    <SelectItem value="mailchimp">Mailchimp</SelectItem>
                    <SelectItem value="sendgrid">SendGrid</SelectItem>
                    <SelectItem value="resend">Resend</SelectItem>
                    <SelectItem value="sender">Sender.net</SelectItem>
                    <SelectItem value="kit">Kit (ConvertKit)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Built-in stores subscribers in your database. Choose a provider to also forward each signup to a marketing list.
                </p>
              </div>

              {/* Auto-sync toggle */}
              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={newsletter.autoSync}
                  onChange={(e) => { setNewsletter({ ...newsletter, autoSync: e.target.checked }); markChanged(); }}
                />
                <span>
                  <span className="font-medium text-foreground">Auto-sync subscribers on save</span> — when you change provider or credentials, all existing subscribers are pushed to the new provider automatically.
                </span>
              </label>

              {newsletter.provider === "mailchimp" && (
                <div className="space-y-3 p-3 bg-secondary/30 rounded-lg border border-border/50">
                  <div>
                    <Label className="text-xs">Mailchimp API Key</Label>
                    <Input
                      type="password"
                      value={newsletter.mailchimpApiKey}
                      onChange={(e) => { setNewsletter({ ...newsletter, mailchimpApiKey: e.target.value }); markChanged(); }}
                      placeholder="xxxxxxxxxxxx-us21"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Mailchimp Audience / List ID</Label>
                    <Input
                      value={newsletter.mailchimpListId}
                      onChange={(e) => { setNewsletter({ ...newsletter, mailchimpListId: e.target.value }); markChanged(); }}
                      placeholder="abc123def4"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Find your API key in <strong>Mailchimp → Account → Extras → API keys</strong>. The datacenter suffix (e.g. <code className="bg-secondary px-1 rounded">-us21</code>) is required.
                  </p>
                </div>
              )}

              {newsletter.provider === "sendgrid" && (
                <div className="space-y-3 p-3 bg-secondary/30 rounded-lg border border-border/50">
                  <div>
                    <Label className="text-xs">SendGrid API Key</Label>
                    <Input
                      type="password"
                      value={newsletter.sendgridApiKey}
                      onChange={(e) => { setNewsletter({ ...newsletter, sendgridApiKey: e.target.value }); markChanged(); }}
                      placeholder="SG.xxxxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">SendGrid List ID (optional)</Label>
                    <Input
                      value={newsletter.sendgridListId}
                      onChange={(e) => { setNewsletter({ ...newsletter, sendgridListId: e.target.value }); markChanged(); }}
                      placeholder="UUID of marketing list"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Generate an API key at <strong>SendGrid → Settings → API Keys</strong> with <em>Marketing Contacts</em> permissions.
                  </p>
                </div>
              )}

              {newsletter.provider === "resend" && (
                <div className="space-y-3 p-3 bg-secondary/30 rounded-lg border border-border/50">
                  <div>
                    <Label className="text-xs">Resend API Key</Label>
                    <Input
                      type="password"
                      value={newsletter.resendApiKey}
                      onChange={(e) => { setNewsletter({ ...newsletter, resendApiKey: e.target.value }); markChanged(); }}
                      placeholder="re_xxxxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Resend Audience ID</Label>
                    <Input
                      value={newsletter.resendAudienceId}
                      onChange={(e) => { setNewsletter({ ...newsletter, resendAudienceId: e.target.value }); markChanged(); }}
                      placeholder="aud_xxx"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Find your audience at <strong>Resend → Audiences</strong>. Create the API key under <strong>API Keys</strong>.
                  </p>
                </div>
              )}

              {newsletter.provider === "sender" && (
                <div className="space-y-3 p-3 bg-secondary/30 rounded-lg border border-border/50">
                  <div>
                    <Label className="text-xs">Sender.net API Token</Label>
                    <Input
                      type="password"
                      value={newsletter.senderApiKey}
                      onChange={(e) => { setNewsletter({ ...newsletter, senderApiKey: e.target.value }); markChanged(); }}
                      placeholder="Bearer token from Sender.net"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Sender.net Group ID (optional)</Label>
                    <Input
                      value={newsletter.senderGroupId}
                      onChange={(e) => { setNewsletter({ ...newsletter, senderGroupId: e.target.value }); markChanged(); }}
                      placeholder="e.g. dG93WW"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Generate the token at <strong>Sender.net → Settings → API access tokens</strong>. Group ID is shown in the URL of any group.
                  </p>
                </div>
              )}

              {newsletter.provider === "kit" && (
                <div className="space-y-3 p-3 bg-secondary/30 rounded-lg border border-border/50">
                  <div>
                    <Label className="text-xs">Kit API Key (v4)</Label>
                    <Input
                      type="password"
                      value={newsletter.kitApiKey}
                      onChange={(e) => { setNewsletter({ ...newsletter, kitApiKey: e.target.value }); markChanged(); }}
                      placeholder="kit_xxxxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Kit Form ID (optional)</Label>
                    <Input
                      value={newsletter.kitFormId}
                      onChange={(e) => { setNewsletter({ ...newsletter, kitFormId: e.target.value }); markChanged(); }}
                      placeholder="e.g. 1234567"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Get your v4 API key at <strong>Kit → Settings → Advanced → API</strong>. If a Form ID is set, new subscribers are added to that form's automation.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom bar — copyright + trademark */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="font-semibold text-foreground">Footer Bottom Bar</h3>
              <div>
                <Label className="text-xs">Copyright text</Label>
                <Input
                  value={bottomBar.copyright}
                  onChange={(e) => { setBottomBar({ ...bottomBar, copyright: e.target.value }); markChanged(); }}
                  placeholder="© 2019-{year} Dynime Inc.. All rights reserved."
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Supports <code className="bg-secondary px-1 rounded">{"{year}"}</code>, HTML tags like
                  {" "}<code className="bg-secondary px-1 rounded">&lt;strong&gt;</code>,
                  {" "}<code className="bg-secondary px-1 rounded">&lt;br&gt;</code>,
                  {" "}<code className="bg-secondary px-1 rounded">&lt;a href=""&gt;</code>.
                </p>
              </div>
              <div>
                <Label className="text-xs">Trademark notice</Label>
                <Textarea
                  rows={2}
                  value={bottomBar.trademark}
                  onChange={(e) => { setBottomBar({ ...bottomBar, trademark: e.target.value }); markChanged(); }}
                  placeholder="All third-party ® / ™ marks belong to their respective owners."
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  HTML supported (<code className="bg-secondary px-1 rounded">&lt;strong&gt;</code>,
                  {" "}<code className="bg-secondary px-1 rounded">&lt;br&gt;</code>,
                  {" "}<code className="bg-secondary px-1 rounded">&lt;a&gt;</code>). Wraps to multiple lines.
                </p>
              </div>
            </div>
            </div>

            {/* Live preview */}
            <div className="min-w-0">
              <div className="xl:sticky xl:top-4">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Live preview</h3>
                  <span className="text-[11px] text-muted-foreground ml-auto">Updates as you type</span>
                </div>
                <FooterPreview footerCta={footerCta} newsletter={newsletter} bottomBar={bottomBar} />

                {/* Placeholder reference */}
                <div className="mt-4 rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-3.5 h-3.5 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">Placeholders</h4>
                    <span className="text-[11px] text-muted-foreground ml-auto">
                      Use anywhere in this tab
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-3">
                    Type these tokens into any field — they're replaced live in the preview and on the site.
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {FOOTER_PLACEHOLDERS.map((p) => (
                      <li key={p.token} className="flex items-baseline gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(`{${p.token}}`);
                            toast.success(`Copied {${p.token}}`);
                          }}
                          className="font-mono text-primary bg-primary/10 hover:bg-primary/20 rounded px-1.5 py-0.5 transition-colors shrink-0"
                          title="Click to copy"
                        >
                          {`{${p.token}}`}
                        </button>
                        <span className="text-muted-foreground truncate">
                          {p.label} — <span className="text-foreground/80">{p.example}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </SuperAdminLayout>
  );
};

/* ---------------- Sub-components ---------------- */

const NavListEditor = ({
  title,
  items,
  setItems,
  hint,
}: {
  title: string;
  items: NavItem[];
  setItems: (n: NavItem[]) => void;
  hint?: React.ReactNode;
}) => {
  const move = (idx: number, dir: "up" | "down") => {
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    setItems(next);
  };

  return (
    <div className="max-w-2xl p-6 bg-card border border-border rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setItems([...items, { id: generateId(), label: "New Link", to: "/", visible: true }])}
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
        </Button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg border border-border/50">
            <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />
            <Input
              value={item.label}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...next[idx], label: e.target.value };
                setItems(next);
              }}
              className="h-8 text-sm flex-1"
              placeholder="Label"
            />
            <Input
              value={item.to}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...next[idx], to: e.target.value };
                setItems(next);
              }}
              className="h-8 text-sm flex-1"
              placeholder="URL"
            />
            <Switch
              checked={item.visible}
              onCheckedChange={(v) => {
                const next = [...items];
                next[idx] = { ...next[idx], visible: v };
                setItems(next);
              }}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(idx, "up")}>
              <ArrowUp className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(idx, "down")}>
              <ArrowDown className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => setItems(items.filter((_, i) => i !== idx))}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

const BlockEditor = ({
  block,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMove,
}: {
  block: FooterBlock;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (p: Partial<FooterBlock>) => void;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
}) => {
  const M = blockMeta[block.type];
  const visible = block.visible !== false;

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden ${visible ? "" : "opacity-60"}`}>
      {/* Block header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 bg-secondary/20">
        <M.icon className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{M.label}</span>
        <span className="text-[11px] text-muted-foreground">{M.desc}</span>
        <div className="ml-auto flex items-center gap-1">
          {block.type !== "divider" && (
            <Select
              value={block.width || "default"}
              onValueChange={(v) => onUpdate({ width: v as FooterBlock["width"] })}
            >
              <SelectTrigger className="h-7 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="narrow">Narrow (3/12)</SelectItem>
                <SelectItem value="default">Default (4/12)</SelectItem>
                <SelectItem value="wide">Wide (6/12)</SelectItem>
                <SelectItem value="full">Full row (12/12)</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onUpdate({ visible: !visible })}
            title={visible ? "Hide" : "Show"}
          >
            {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isFirst} onClick={() => onMove("up")}>
            <ArrowUp className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isLast} onClick={() => onMove("down")}>
            <ArrowDown className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Block body */}
      <div className="p-4 space-y-3">
        {block.type === "brand" && (
          <>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show site logo</Label>
              <Switch
                checked={block.showLogo !== false}
                onCheckedChange={(v) => onUpdate({ showLogo: v })}
              />
            </div>
            <div>
              <Label className="text-xs">Short description</Label>
              <Textarea
                value={block.description || ""}
                onChange={(e) => onUpdate({ description: e.target.value })}
                rows={2}
              />
            </div>
          </>
        )}

        {block.type === "tagline" && (
          <>
            <div>
              <Label className="text-xs">Headline</Label>
              <Input value={block.text} onChange={(e) => onUpdate({ text: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">CTA label (optional)</Label>
                <Input value={block.ctaLabel || ""} onChange={(e) => onUpdate({ ctaLabel: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">CTA URL</Label>
                <Input value={block.ctaTo || ""} onChange={(e) => onUpdate({ ctaTo: e.target.value })} />
              </div>
            </div>
          </>
        )}

        {block.type === "links" && <LinksBlockEditor block={block} onUpdate={onUpdate} />}

        {block.type === "locations" && <LocationsBlockEditor block={block} onUpdate={onUpdate} />}

        {block.type === "contacts" && <ContactsBlockEditor block={block} onUpdate={onUpdate} />}

        {block.type === "social" && (
          <div>
            <Label className="text-xs">Title (optional)</Label>
            <Input value={block.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} />
            <p className="text-[11px] text-muted-foreground mt-1">
              Social icons & links are managed in Site Settings → Social.
            </p>
          </div>
        )}

        {block.type === "payments" && (
          <div>
            <Label className="text-xs">Badge labels (comma-separated)</Label>
            <Input
              value={block.badges.join(", ")}
              onChange={(e) =>
                onUpdate({ badges: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
              }
              placeholder="Visa, Mastercard, PayPal"
            />
          </div>
        )}

        {block.type === "copyright" && (
          <div>
            <Label className="text-xs">Copyright text</Label>
            <Input value={block.text} onChange={(e) => onUpdate({ text: e.target.value })} />
            <p className="text-[11px] text-muted-foreground mt-1">
              Use <code className="bg-secondary px-1 rounded">{"{year}"}</code> to insert the current year.
            </p>
          </div>
        )}

        {block.type === "divider" && (
          <p className="text-xs text-muted-foreground">
            Starts a new visual row (with a top border). Useful before the bottom copyright/payments bar.
          </p>
        )}
      </div>
    </div>
  );
};

const LinksBlockEditor = ({
  block,
  onUpdate,
}: {
  block: Extract<FooterBlock, { type: "links" }>;
  onUpdate: (p: Partial<FooterBlock>) => void;
}) => {
  const updateLinks = (links: LinkItem[]) => onUpdate({ links });
  return (
    <>
      <div>
        <Label className="text-xs">Column title</Label>
        <Input value={block.title} onChange={(e) => onUpdate({ title: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        {block.links.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={link.label}
              onChange={(e) => {
                const next = [...block.links];
                next[i] = { ...next[i], label: e.target.value };
                updateLinks(next);
              }}
              placeholder="Label"
              className="h-8 text-xs flex-1"
            />
            <Input
              value={link.to}
              onChange={(e) => {
                const next = [...block.links];
                next[i] = { ...next[i], to: e.target.value };
                updateLinks(next);
              }}
              placeholder="URL"
              className="h-8 text-xs flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => updateLinks(block.links.filter((_, x) => x !== i))}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => updateLinks([...block.links, { label: "New link", to: "/" }])}
      >
        <Plus className="w-3 h-3 mr-1" /> Add link
      </Button>
    </>
  );
};

const LocationsBlockEditor = ({
  block,
  onUpdate,
}: {
  block: Extract<FooterBlock, { type: "locations" }>;
  onUpdate: (p: Partial<FooterBlock>) => void;
}) => {
  const update = (items: FooterLocation[]) => onUpdate({ items });
  return (
    <>
      <div>
        <Label className="text-xs">Title (optional)</Label>
        <Input value={block.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} />
      </div>
      <div className="space-y-3">
        {block.items.map((loc, i) => (
          <div key={loc.id} className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={loc.flag}
                onChange={(e) => {
                  const next = [...block.items];
                  next[i] = { ...next[i], flag: e.target.value };
                  update(next);
                }}
                className="h-8 w-16 text-center"
                placeholder="🏳️"
              />
              <Input
                value={loc.city}
                onChange={(e) => {
                  const next = [...block.items];
                  next[i] = { ...next[i], city: e.target.value };
                  update(next);
                }}
                className="h-8 flex-1"
                placeholder="City"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => update(block.items.filter((_, x) => x !== i))}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            <Textarea
              value={loc.address}
              onChange={(e) => {
                const next = [...block.items];
                next[i] = { ...next[i], address: e.target.value };
                update(next);
              }}
              rows={2}
              className="text-xs"
              placeholder="Full address"
            />
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          update([...block.items, { id: generateId(), flag: "🏳️", city: "City", address: "", note: "" }])
        }
      >
        <Plus className="w-3 h-3 mr-1" /> Add location
      </Button>
    </>
  );
};

const ContactsBlockEditor = ({
  block,
  onUpdate,
}: {
  block: Extract<FooterBlock, { type: "contacts" }>;
  onUpdate: (p: Partial<FooterBlock>) => void;
}) => {
  const update = (items: FooterContact[]) => onUpdate({ items });
  return (
    <>
      <div>
        <Label className="text-xs">Title (optional)</Label>
        <Input value={block.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        {block.items.map((c, i) => (
          <div key={c.id} className="flex items-center gap-2">
            <Select
              value={c.type}
              onValueChange={(v) => {
                const next = [...block.items];
                next[i] = { ...next[i], type: v as "phone" | "email" };
                update(next);
              }}
            >
              <SelectTrigger className="h-8 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={c.value}
              onChange={(e) => {
                const next = [...block.items];
                next[i] = { ...next[i], value: e.target.value };
                update(next);
              }}
              placeholder={c.type === "phone" ? "+1234567890" : "you@example.com"}
              className="h-8 text-xs flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => update(block.items.filter((_, x) => x !== i))}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => update([...block.items, { id: generateId(), type: "phone", value: "" }])}
        >
          <Plus className="w-3 h-3 mr-1" /> Phone
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => update([...block.items, { id: generateId(), type: "email", value: "" }])}
        >
          <Plus className="w-3 h-3 mr-1" /> Email
        </Button>
      </div>
    </>
  );
};

/* ---------------- Footer Live Preview ---------------- */

const FooterPreview = ({
  footerCta,
  newsletter,
  bottomBar,
}: {
  footerCta: {
    eyebrow: string; text: string; subtext: string;
    button: string; url: string; secondary: string; secondaryUrl: string;
  };
  newsletter: { title: string; subtext: string };
  bottomBar: { copyright: string; trademark: string };
}) => {
  const eyebrow = renderPlaceholders(footerCta.eyebrow || "Ready when you are");
  const headline = renderPlaceholders(footerCta.text || "Turn your bold idea into a digital product people love.");
  const sub = renderPlaceholders(footerCta.subtext || "We design, build and ship modern websites, apps and growth systems — engineered to convert and crafted to last.");
  const primary = footerCta.button || "Start your project";
  const secondary = footerCta.secondary || "View our work";
  const nlTitle = renderPlaceholders(newsletter.title || "Get our best ideas, monthly");
  const nlSub = renderPlaceholders(newsletter.subtext || "Tactical playbooks on design, growth & engineering — straight to your inbox.");
  const copyright = renderPlaceholders(bottomBar.copyright || `© 2019-{year} {company}. All rights reserved.`);
  const trademark = renderPlaceholders(bottomBar.trademark || "All third-party ® / ™ marks belong to their respective owners.");

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-secondary/40 dark:bg-[#0a0d14] shadow-lg">
      {/* Hero */}
      <div className="relative px-6 pt-10 pb-8 text-center">
        <div
          aria-hidden
          className="absolute inset-0 opacity-90 pointer-events-none"
          style={{
            background:
              "radial-gradient(60% 60% at 15% 0%, hsl(var(--primary) / 0.12), transparent 60%), radial-gradient(50% 60% at 90% 10%, hsl(var(--primary) / 0.08), transparent 65%)",
          }}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 dark:border-white/15 dark:bg-white/5 px-3 py-1 text-[10px] font-medium text-muted-foreground dark:text-slate-300">
            <Megaphone className="w-3 h-3 text-primary" />
            <span dangerouslySetInnerHTML={{ __html: sanitizeRichText(eyebrow) }} />
          </span>
          <h2
            className="mt-3 font-bold tracking-tight text-foreground dark:text-white text-xl sm:text-2xl leading-[1.1] max-w-md mx-auto break-words"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(headline) }}
          />
          <p
            className="mt-2 text-xs text-muted-foreground dark:text-slate-300/90 max-w-sm mx-auto break-words"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(sub) }}
          />
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-[11px] font-semibold">
              {primary}
            </span>
            <span className="inline-flex items-center rounded-full border border-border bg-background/60 dark:border-white/15 dark:bg-white/5 text-foreground dark:text-white px-3 py-1.5 text-[11px] font-semibold">
              {secondary}
            </span>
          </div>
        </div>
      </div>

      {/* Newsletter strip */}
      <div className="border-t border-border/60 dark:border-white/[0.06] px-6 py-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/60 dark:text-white/70 mb-1.5">
          Newsletter
        </p>
        <h3 className="text-sm font-semibold text-foreground dark:text-white break-words" dangerouslySetInnerHTML={{ __html: sanitizeRichText(nlTitle) }} />
        <p className="mt-1 text-[11px] text-muted-foreground dark:text-slate-400 break-words" dangerouslySetInnerHTML={{ __html: sanitizeRichText(nlSub) }} />
        <div className="mt-3 flex items-center gap-1.5 rounded-full border border-border bg-background/60 dark:border-white/10 dark:bg-white/[0.04] pl-3 pr-1 py-1 max-w-xs">
          <Mail className="w-3 h-3 text-muted-foreground dark:text-slate-400 shrink-0" />
          <span className="flex-1 text-[11px] text-muted-foreground dark:text-slate-500 truncate">you@email.com</span>
          <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground h-6 w-6 text-[10px]">→</span>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border/60 dark:border-white/[0.06] bg-secondary/50 dark:bg-black/30 px-6 py-3">
        <p className="text-[11px] text-muted-foreground dark:text-slate-400 break-words [&_a]:underline" dangerouslySetInnerHTML={{ __html: sanitizeRichText(copyright) }} />
        {trademark && (
          <p className="text-[10px] text-muted-foreground/70 dark:text-slate-500 mt-0.5 break-words [&_a]:underline" dangerouslySetInnerHTML={{ __html: sanitizeRichText(trademark) }} />
        )}
      </div>
    </div>
  );
};

export default AdminHeaderFooter;
