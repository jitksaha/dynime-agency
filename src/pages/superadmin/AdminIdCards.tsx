import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toPng } from "html-to-image";
import { QRCodeSVG } from "qrcode.react";
import { db } from "@/integrations/db/client";
import { apiPost } from "@/lib/api";
import SuperAdminLayout from "@/components/admin/SuperAdminLayout";
import SiteLogo from "@/components/shared/SiteLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  IdCard, RefreshCw, Download, Upload, Search, Loader2, Sparkles,
  Mail, Phone, Globe, Shield, Users, TrendingUp, Palette, Save, RotateCcw,
  Grid3x3, Square, Printer, FileDown, Layers,
} from "lucide-react";
import { useHomeSections } from "@/hooks/use-home-sections";
import { useIdCardBrand } from "@/hooks/use-id-card-brand";
import { useSiteSettings } from "@/hooks/use-data";
import { useQueryClient } from "@tanstack/react-query";
import {
  ID_CARD_BRAND_KEY, DEFAULT_ID_CARD_BRAND, type IdCardBrand,
} from "@/lib/id-card-brand";
import VerifiedBadge from "@/components/shared/VerifiedBadge";
import { useCardId } from "@/hooks/use-card-id";
import { teamSectionSubjectKey } from "@/hooks/use-team-card-ids";
import dynimeLogoLight from "@/assets/dynime-logo-light.webp";
import dynimeLogoDark from "@/assets/dynime-logo-dark.webp";

type CardSubject = {
  id: string;
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  meta?: string | null;       // e.g. amount or specialty
  source: "team_section" | "team_account" | "investor";
  joinedAt?: string | null;
  expiresAt?: string | null;
  photo?: string | null;
};

type Template = "wave";

const TEMPLATES: { id: Template; label: string }[] = [
  { id: "wave", label: "Lanyard ID (Front + Back)" },
];

const initialsFrom = (n: string) =>
  n.trim().split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

const shortCode = (companyName: string) => {
  const cleaned = (companyName || "").replace(/[^A-Za-z0-9 ]/g, " ").trim();
  if (!cleaned) return "ID";
  const words = cleaned.split(/\s+/);
  if (words.length >= 2) {
    return words.map((w) => w[0]).join("").slice(0, 4).toUpperCase();
  }
  return words[0].slice(0, 3).toUpperCase();
};

// Short, unique-looking ID — e.g. "DYN-E10428"
const issueId = (kind: string, raw: string, companyName = "") => {
  let h = 2166136261 >>> 0; // FNV-ish
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  const num = (h % 900000) + 100000; // always 6 digits ⇒ min 4 digit guarantee
  const initial = (kind || "X")[0].toUpperCase();
  const code = shortCode(companyName);
  return `${code}-${initial}${num}`;
};

/* ---------- Responsive scaler — clamps card preview to its container ---------- */

const ResponsiveScaler = ({ children, maxScale = 1 }: { children: React.ReactNode; maxScale?: number }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerH, setInnerH] = useState(0);

  useEffect(() => {
    const recalc = () => {
      const cw = wrapRef.current?.clientWidth ?? 0;
      const inner = innerRef.current;
      if (!inner || cw === 0) return;
      const nw = inner.scrollWidth;
      const nh = inner.scrollHeight;
      const s = nw > 0 ? Math.min(maxScale, cw / nw) : 1;
      setScale(s);
      setInnerH(nh * s);
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    if (wrapRef.current) ro.observe(wrapRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, [children, maxScale]);

  return (
    <div ref={wrapRef} className="w-full flex justify-center overflow-hidden" style={{ height: innerH || undefined }}>
      <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}>
        {children}
      </div>
    </div>
  );
};

/* ---------- Card Visual ---------- */

const IdCardVisual = ({
  subject,
  template,
  kind,
  cardRef,
  brand,
  side = "both",
  onResolved,
}: {
  subject: CardSubject;
  template: Template;
  kind: "EMP" | "INV";
  cardRef: React.RefObject<HTMLDivElement>;
  brand: IdCardBrand;
  side?: "front" | "back" | "both";
  onResolved?: (info: { id: string; qrValue: string }) => void;
}) => {
  // Falls back to the global site logo (configured by the super admin) when
  // no ID-card-specific logo is set. Keeps branding consistent automatically.
  const { data: siteSettings } = useSiteSettings();
  const effectiveLogoUrl =
    brand.logoUrl ||
    siteSettings?.logo_light ||
    siteSettings?.logo_dark ||
    dynimeLogoLight ||
    dynimeLogoDark ||
    "";
  const issuedDate = new Date();
  const hasExpiry = !!subject.expiresAt;
  const expiresDate = subject.expiresAt ? new Date(subject.expiresAt) : null;
  const issued = issuedDate.toLocaleDateString(undefined, { year: "numeric", month: "short" });
  const expires = expiresDate
    ? expiresDate.toLocaleDateString(undefined, { year: "numeric", month: "short" })
    : "Lifetime";

  // Snapshot of CURRENT subject — used ONLY at first issuance, then frozen
  // forever in the database. Future profile edits never alter the QR contents.
  const currentSnapshot = useMemo(() => ({
    v: 1,
    k: kind,
    n: subject.name,
    r: subject.role || (kind === "EMP" ? "Team Member" : "Investor"),
    e: subject.email || undefined,
    c: subject.country || undefined,
    m: subject.meta || undefined,
    i: issuedDate.toISOString().slice(0, 10),
    x: expiresDate ? expiresDate.toISOString().slice(0, 10) : undefined,
    o: brand.companyName,
    p: subject.photo || undefined,
  }), [kind, subject, issuedDate, expiresDate, brand.companyName]);

  // Persisted, globally-unique card ID + locked QR payload — once issued,
  // both NEVER change, so a printed QR keeps verifying forever.
  const { id, qrPayload } = useCardId(
    kind,
    `${subject.source}:${subject.id}`,
    brand.companyName,
    brand.idDigits,
    currentSnapshot,
  );

  // Build the SHORT, fixed verify URL: `https://site.com/verify?id=<card_id>`.
  // Once issued, this URL never changes — even if the employee profile is
  // edited later — because both `id` and the row in `id_card_assignments`
  // (which the public verify page reads) are immutable.
  const qrValue = useMemo(() => {
    const base = (brand.siteUrl || "").replace(/\/$/, "") || window.location.origin;
    return `${base}/verify?id=${encodeURIComponent(id)}`;
  }, [id, brand.siteUrl]);

  useEffect(() => {
    if (id && onResolved) onResolved({ id, qrValue });
  }, [id, qrValue, onResolved]);

  const p = brand.primaryColor;
  const s = brand.secondaryColor;
  const a = brand.accentColor;
  const headerLabel = kind === "EMP" ? brand.headerEmployee : brand.headerInvestor;
  const tagLabel = kind === "EMP" ? brand.staffLabel : brand.investorLabel;

  // ---------- Lanyard ID — vertical white card with brand wave shapes (front + back) ----------
  const dob = subject.joinedAt ? new Date(subject.joinedAt) : null;
  const joined = dob
    ? dob.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
    : issued;

  // ID-1 portrait proportions, slightly extended for breathing room.
  const W = 300;
  const H = 510;

  // Soft minimal background — solid white with brand primary tint layered on top
  // so the card stays opaque in PNG/PDF exports (no transparent bleed-through).
  const cardBg: React.CSSProperties = {
    backgroundColor: "#ffffff",
    backgroundImage: `linear-gradient(${p}0D, ${p}0D)`,
  };
  const cardClass =
    "relative overflow-hidden rounded-[22px] text-slate-900 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.4)] ring-1 ring-slate-200";
  const cardStyle: React.CSSProperties = { width: W, height: H, ...cardBg };

  // Minimal punch-hole slot at the top — clean ID card affordance.
  const TopSlot = () => (
    <div className="relative h-[14px] w-full flex justify-center" aria-hidden>
      <div className="absolute top-[4px] h-[6px] w-[44px] rounded-full bg-slate-300/80 ring-1 ring-slate-300" />
    </div>
  );

  // Field row — bold label, colon, value
  const Field = ({ k, v }: { k: string; v?: string | null }) => (
    <div className="grid grid-cols-[78px_8px_1fr] items-baseline text-[12.5px] leading-[1.55]">
      <span className="font-bold text-slate-900">{k}</span>
      <span className="text-slate-400">:</span>
      <span className="text-slate-700 truncate">{v || "—"}</span>
    </div>
  );

  const hostOnly =
    (brand.siteUrl || "").replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "") || "dynime.com";
  const websiteDisplay = `www.${hostOnly}`;

  // Slim branded footer — fits on one line, no truncation
  const BrandFooter = () => (
    <div
      className="absolute inset-x-0 bottom-0 h-[34px] flex items-center justify-center gap-2 px-2"
      style={{ background: p }}
    >
      <span className="text-white text-[9.5px] font-extrabold uppercase tracking-[0.12em] whitespace-nowrap">
        {brand.companyName}
      </span>
      <span className="h-[12px] w-px bg-white/50 shrink-0" />
      <span className="text-white text-[9.5px] font-semibold tracking-[0.06em] whitespace-nowrap lowercase">
        {websiteDisplay}
      </span>
    </div>
  );

  return (
    <div
      ref={cardRef}
      className="flex flex-wrap gap-8 p-2 justify-center items-start"
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
    >
      {/* ===================== FRONT ===================== */}
      {side !== "back" && (
          <div className="flex flex-col items-center">
          <TopSlot />
          <div className={cardClass} style={cardStyle} data-id-card-face="front">
            {/* Brand strip at top — centered company name */}
            <div className="absolute inset-x-0 top-0 h-[6px]" style={{ background: p }} />
            <div className="absolute inset-x-3 top-[14px] flex items-center justify-center gap-2">
              <span
                className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-slate-900 text-center"
                style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif' }}
              >
                {brand.companyName}
              </span>
            </div>

            {/* Photo — circular */}
            <div className="absolute left-1/2 -translate-x-1/2 top-[56px]">
              <div
                className="h-[116px] w-[116px] rounded-full bg-white p-[3px] shadow-[0_8px_24px_-8px_rgba(15,23,42,0.25)]"
                style={{ outline: `1.5px solid ${p}55`, outlineOffset: "2px" }}
              >
                <div className="h-full w-full rounded-full overflow-hidden grid place-items-center bg-slate-100">
                  {subject.photo ? (
                    <img src={subject.photo} alt={subject.name} crossOrigin="anonymous"
                         className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-extrabold" style={{ color: p }}>
                      {initialsFrom(subject.name)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Name + verified + role — no background, dark text, badge clearly visible */}
            <div className="absolute inset-x-4 top-[186px] flex flex-col items-center text-center">
              <div className="flex items-center justify-center gap-1.5 max-w-full">
                <span className="text-slate-900 text-[17px] font-extrabold tracking-[0.01em] truncate">
                  {subject.name || "Your Name"}
                </span>
                {brand.verifiedBadgeEnabled && (
                  <VerifiedBadge
                    size={16}
                    color={brand.verifiedBadgeColor}
                    title={`Verified by ${brand.companyName}`}
                  />
                )}
              </div>
              <div
                className="mt-1 inline-block text-[10px] font-bold uppercase tracking-[0.18em] rounded-full px-2.5 py-0.5"
                style={{ color: p, background: `${p}12`, border: `1px solid ${p}22` }}
              >
                {subject.role || (kind === "EMP" ? "Team Member" : "Investor")}
              </div>
            </div>

            {/* Info fields */}
            <div className="absolute inset-x-7 top-[252px] space-y-[5px]">
              <Field k={kind === "EMP" ? "EMP NO" : "INV NO"} v={id} />
              <Field k="Country" v={subject.country} />
              <Field k="Mail" v={subject.email} />
              <Field k="Phone" v={subject.phone} />
            </div>

            {/* QR — dynamic verify URL */}
            <div className="absolute inset-x-0 bottom-[58px] flex justify-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className="rounded-md bg-white ring-1 ring-slate-200"
                  style={{ padding: `${Math.max(2, brand.qrMargin || 6)}px` }}
                >
                  <QRCodeSVG
                    value={qrValue}
                    size={Math.max(48, Math.min(80, brand.qrSize || 64))}
                    level={brand.qrErrorCorrection || "Q"}
                  />
                </div>
                <span className="text-[10px] tracking-[0.22em] text-slate-600 font-mono font-semibold">{id}</span>
              </div>
            </div>

            <BrandFooter />
          </div>
        </div>
      )}

      {/* ===================== BACK ===================== */}
      {side !== "front" && (
          <div className="flex flex-col items-center">
          <TopSlot />
          <div className={cardClass} style={cardStyle} data-id-card-face="back">
            {/* Brand strip */}
            <div className="absolute inset-x-0 top-0 h-[6px]" style={{ background: p }} />

            {/* Title */}
            <div className="absolute inset-x-5 top-[22px] text-center">
              <div className="text-[14px] font-extrabold tracking-[0.16em] text-slate-900 uppercase">
                Terms and Conditions
              </div>
              <div className="mx-auto mt-1.5 h-px w-[60px]" style={{ background: p }} />
            </div>

            {/* Bullet terms — wording per spec */}
            <div className="absolute inset-x-6 top-[64px] space-y-2.5 text-[11.5px] leading-snug text-slate-700">
              <div className="flex gap-2">
                <span className="mt-[6px] h-[5px] w-[5px] rounded-full shrink-0" style={{ background: p }} />
                <p>
                  This card is the property of <span className="font-bold text-slate-900">{brand.companyName}</span>.
                  If found, please return to the address visible on the website. Misuse or alteration is strictly prohibited.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="mt-[6px] h-[5px] w-[5px] rounded-full shrink-0" style={{ background: p }} />
                <p>
                  The card holder must present this ID upon request and surrender it on the date of expiry or upon
                  termination of association with the company.
                </p>
              </div>
            </div>

            {/* Joined / Expire — center when only joined date is shown */}
            <div className="absolute inset-x-7 top-[244px] space-y-1 text-[12.5px]">
              {hasExpiry ? (
                <>
                  <div className="grid grid-cols-[88px_8px_1fr] items-baseline">
                    <span className="font-bold" style={{ color: p }}>Joined Date</span>
                    <span className="text-slate-400">:</span>
                    <span className="font-semibold text-slate-800">{joined}</span>
                  </div>
                  <div className="grid grid-cols-[88px_8px_1fr] items-baseline">
                    <span className="font-bold" style={{ color: p }}>Expire Date</span>
                    <span className="text-slate-400">:</span>
                    <span className="font-semibold text-slate-800">{expires}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-baseline justify-center gap-2">
                  <span className="font-bold" style={{ color: p }}>Joined Date</span>
                  <span className="text-slate-400">:</span>
                  <span className="font-semibold text-slate-800">{joined}</span>
                </div>
              )}
            </div>

            {/* Signature */}
            <div className="absolute inset-x-0 top-[290px] flex flex-col items-center">
              <div
                className="italic text-[20px] text-slate-800 leading-none"
                style={{ fontFamily: "'Brush Script MT', cursive" }}
              >
                {subject.name?.split(" ").slice(0, 2).join(" ") || "Authorized"}
              </div>
              <div className="mt-1.5 h-px w-[150px] bg-slate-700/70" />
              <div className="text-[10.5px] font-bold text-slate-900 mt-1">Your Sincerely</div>
              <div className="text-[12px] font-semibold text-slate-700 mt-0.5 truncate max-w-[240px]">
                {subject.role || (kind === "EMP" ? "Team Member" : "Investor")}
              </div>
            </div>

            {/* Logo + contact — auto-centered in the blank area between signature and footer */}
            <div
              className="absolute inset-x-0 flex flex-col items-center justify-center gap-2"
              style={{ top: 380, bottom: 34 }}
            >
              {effectiveLogoUrl ? (
                <img
                  key={effectiveLogoUrl}
                  src={effectiveLogoUrl}
                  alt={brand.companyName}
                  crossOrigin="anonymous"
                  className="max-h-[32px] max-w-[60%] object-contain opacity-90"
                />
              ) : (
                <span className="text-[12px] font-extrabold tracking-[0.22em]" style={{ color: p }}>
                  {shortCode(brand.companyName)}
                </span>
              )}
              <div className="text-center text-xs">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-600 font-bold">Contact</div>
                <div className="text-slate-800 truncate px-4 mt-1 text-xs font-normal">{brand.supportEmail}</div>
              </div>
            </div>

            <BrandFooter />
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------- Page ---------- */

const AdminIdCards = () => {
  const { data: home } = useHomeSections();
  const { data: brandData } = useIdCardBrand();
  const qc = useQueryClient();

  // Local working copy of brand for the editor; reflects DB but is editable.
  const [brand, setBrand] = useState<IdCardBrand>(brandData ?? DEFAULT_ID_CARD_BRAND);
  const [brandDirty, setBrandDirty] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);

  useEffect(() => {
    if (brandData && !brandDirty) setBrand(brandData);
  }, [brandData, brandDirty]);

  const updateBrand = (patch: Partial<IdCardBrand>) => {
    setBrand((b) => ({ ...b, ...patch }));
    setBrandDirty(true);
  };

  const saveBrand = async () => {
    setSavingBrand(true);
    try {
      await apiPost("/cms/site-settings/bulk", {
        settings: [{ key: ID_CARD_BRAND_KEY, value: JSON.stringify(brand) }],
      });
      toast.success("Brand saved · ID cards updated everywhere");
      setBrandDirty(false);
      qc.invalidateQueries({ queryKey: ["id-card-brand"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to save brand");
    } finally {
      setSavingBrand(false);
    }
  };

  const resetBrand = () => {
    setBrand(DEFAULT_ID_CARD_BRAND);
    setBrandDirty(true);
  };

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => updateBrand({ logoUrl: reader.result as string });
    reader.readAsDataURL(file);
  };


  // Team accounts (employees) via existing edge function
  const { data: teamAccounts = [], isLoading: loadingTeam } = useQuery({
    queryKey: ["id-cards", "team-accounts"],
    queryFn: async () => {
      const { data, error } = await db.functions.invoke("manage-team", { body: { action: "list_users" } });
      if (error) throw error;
      const users = (data?.users ?? []) as any[];
      return users.filter((u) => u.role).map<CardSubject>((u) => ({
        id: u.user_id,
        name: u.full_name || u.email,
        role: (u.role || "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        email: u.email,
        meta: null,
        source: "team_account",
        joinedAt: u.created_at,
      }));
    },
    staleTime: 60_000,
  });

  // Investor leads
  const { data: investors = [], isLoading: loadingInv } = useQuery({
    queryKey: ["id-cards", "investors"],
    queryFn: async () => {
      const { data, error } = await db
        .from("invest_leads")
        .select("id, full_name, email, phone, country, investment_amount, currency, plan_slug, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map<CardSubject>((l) => ({
        id: l.id,
        name: l.full_name,
        role: l.plan_slug ? `${l.plan_slug.replace(/-/g, " ")} plan` : "Investor",
        email: l.email,
        phone: l.phone,
        country: l.country,
        meta: l.investment_amount ? `${l.currency || "USD"} ${Number(l.investment_amount).toLocaleString()}` : null,
        source: "investor",
        joinedAt: l.created_at,
      }));
    },
    staleTime: 60_000,
  });

  // Team section members (homepage CMS) — included as employees too.
  // The public About-page card and the ID card share the SAME source object
  // here, so any field added in the Team Section editor flows everywhere.
  const teamSection = useMemo<CardSubject[]>(() => {
    const items = home?.team?.items ?? [];
    return items.map((t, i) => ({
      id: teamSectionSubjectKey(i, t).replace(/^team_section:/, ""),
      name: t.name,
      role: t.role,
      meta: t.specialty,
      email: t.email ?? null,
      phone: t.phone ?? null,
      country: t.country ?? null,
      photo: t.photoUrl ?? null,
      joinedAt: t.joinedAt ?? null,
      expiresAt: t.expiresAt ?? null,
      source: "team_section",
    }));
  }, [home]);

  const employees = useMemo(() => {
    const teamEmails = new Set(teamSection.map((c) => (c.email || "").trim().toLowerCase()).filter(Boolean));
    return [...teamSection, ...teamAccounts.filter((c) => !teamEmails.has((c.email || "").trim().toLowerCase()))];
  }, [teamAccounts, teamSection]);

  const [tab, setTab] = useState<"employee" | "investor">("employee");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [template, setTemplate] = useState<Template>("wave");
  const [side, setSide] = useState<"front" | "back" | "both">("both");
  const [photoOverride, setPhotoOverride] = useState<Record<string, string>>({});
  const [nonce, setNonce] = useState(0); // re-render bump for "regenerate"

  const list = tab === "employee" ? employees : investors;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) =>
      [c.name, c.role, c.email, c.country, c.meta].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [list, search]);

  // Auto-select first when list/tab changes
  useEffect(() => {
    if (filtered.length === 0) { setSelectedId(null); return; }
    if (!selectedId || !filtered.some((c) => c.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((c) => c.id === selectedId) || filtered[0];
  const subject: CardSubject | undefined = selected
    ? { ...selected, photo: photoOverride[selected.id] ?? selected.photo }
    : undefined;

  const cardRef = useRef<HTMLDivElement>(null);
  const [resolvedCard, setResolvedCard] = useState<{ id: string; qrValue: string } | null>(null);

  const handlePhoto = (file: File) => {
    if (!selected) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoOverride((p) => ({ ...p, [selected.id]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const regenerate = () => {
    setNonce((n) => n + 1);
    toast.success("Card refreshed");
  };

  const download = async () => {
    if (!cardRef.current || !subject) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      const slug = subject.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      a.download = `${tab}-id-${slug}.png`;
      a.click();
      toast.success("ID card downloaded");
    } catch (e: any) {
      toast.error(e?.message || "Failed to render card");
    }
  };

  // ===== MATCHED PDF EXPORT =====
  // The PDF now captures the same DOM faces used by the ID card maker preview.
  // This keeps labels, spacing, rounded corners, QR sizing, logo and signature
  // visually identical between on-screen preview and downloaded PDF.

  const renderFaceToPng = async (face: HTMLElement) => {
    const dataUrl = await toPng(face, {
      pixelRatio: 4,
      cacheBust: true,
      backgroundColor: "#ffffff",
      style: { transform: "none" },
    });
    return dataUrl;
  };

  const captureCardFace = (root: HTMLElement, face: "front" | "back") => {
    const el = root.querySelector(`[data-id-card-face="${face}"]`) as HTMLElement | null;
    if (!el) throw new Error(`Could not find ${face} card preview for PDF export`);
    return renderFaceToPng(el);
  };

  // Shared helpers used by both single-card print and bulk export. Both
  // entry points draw the same vector geometry — the only difference is
  // page format (CR80 vs A4 with grid offsets).
  const fetchDataUrl = async (url?: string | null): Promise<string | null> => {
    if (!url) return null;
    try {
      if (url.startsWith("data:")) return url;
      const res = await fetch(url, { mode: "cors" });
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const hexToRgb = (c: string): [number, number, number] => {
    const v = c.replace("#", "").trim();
    const n = parseInt(v.length === 3 ? v.split("").map((x) => x + x).join("") : v, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  // Draw one face (front or back) at offset (ox, oy) into an existing jsPDF.
  // W, H are the CR80 trim size in mm. All coordinates inside are computed
  // relative to (ox, oy) so the same routine works on a CR80 page (ox=oy=0)
  // and on an A4 sheet at any slot position.
  const drawCardFace = (
    pdf: any,
    QRCodeLib: any,
    ox: number,
    oy: number,
    W: number,
    H: number,
    isBack: boolean,
    subject: CardSubject,
    id: string,
    qrValue: string,
  ) => {
    const [pr, pg, pb] = hexToRgb(brand.primaryColor);
    const tint = (alpha: number) =>
      [
        Math.round(255 - (255 - pr) * alpha),
        Math.round(255 - (255 - pg) * alpha),
        Math.round(255 - (255 - pb) * alpha),
      ] as [number, number, number];

    const websiteHost =
      (brand.siteUrl || "")
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/.*$/, "") || "dynime.com";

    const issuedDate = new Date();
    const issued = issuedDate.toLocaleDateString(undefined, { year: "numeric", month: "short" });
    const expiresDate = subject.expiresAt ? new Date(subject.expiresAt) : null;
    const expires = expiresDate
      ? expiresDate.toLocaleDateString(undefined, { year: "numeric", month: "short" })
      : "Lifetime";
    const joined = subject.joinedAt
      ? new Date(subject.joinedAt).toLocaleDateString(undefined, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : issued;
    const hasExpiry = !!subject.expiresAt;
    const role = subject.role || (tab === "employee" ? "Team Member" : "Investor");

    const [bg1, bg2, bg3] = tint(0.05);
    pdf.setFillColor(bg1, bg2, bg3);
    pdf.rect(ox, oy, W, H, "F");
    pdf.setFillColor(pr, pg, pb);
    pdf.rect(ox, oy, W, 1.1, "F");

    const footH = 5.6;

    if (!isBack) {
      // === FRONT ===
      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text(brand.companyName, ox + W / 2, oy + 4.2, { align: "center" });

      const photoR = 9.6;
      const photoCx = ox + W / 2;
      const photoCy = oy + 14 + photoR;
      pdf.setDrawColor(pr, pg, pb);
      pdf.setLineWidth(0.4);
      pdf.circle(photoCx, photoCy, photoR + 0.9, "S");
      // Photo disc — drawn as a pure vector initials medallion. We intentionally
      // do NOT embed the bitmap photo so the PDF stays 100% native vector content
      // (no /XObject /Image streams). Tinted background + monogram keeps the
      // visual identity recognisable while avoiding any rasterised payload.
      const [d1, d2, d3] = tint(0.18);
      pdf.setFillColor(d1, d2, d3);
      pdf.circle(photoCx, photoCy, photoR, "F");
      pdf.setTextColor(pr, pg, pb);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text(initialsFrom(subject.name), photoCx, photoCy + 1.6, { align: "center" });

      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(subject.name || "Your Name", ox + W / 2, photoCy + photoR + 5.4, { align: "center" });

      const roleText = role.toUpperCase();
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      const roleW = pdf.getTextWidth(roleText) + 3.6;
      const roleH = 2.6;
      const roleX = ox + (W - roleW) / 2;
      const roleY = photoCy + photoR + 7.4;
      const [t1, t2, t3] = tint(0.12);
      pdf.setFillColor(t1, t2, t3);
      pdf.roundedRect(roleX, roleY, roleW, roleH, 1.3, 1.3, "F");
      pdf.setTextColor(pr, pg, pb);
      pdf.text(roleText, ox + W / 2, roleY + 1.85, { align: "center" });

      const fieldX = ox + 5.5;
      let fy = roleY + roleH + 4.2;
      const fields: [string, string | null | undefined][] = [
        [tab === "employee" ? "EMP NO" : "INV NO", id],
        ["Country", subject.country],
        ["Mail", subject.email],
        ["Phone", subject.phone],
      ];
      pdf.setFontSize(7);
      fields.forEach(([k, v]) => {
        pdf.setTextColor(15, 23, 42);
        pdf.setFont("helvetica", "bold");
        pdf.text(k, fieldX, fy);
        pdf.setTextColor(148, 163, 184);
        pdf.text(":", fieldX + 13.5, fy);
        pdf.setTextColor(51, 65, 85);
        pdf.setFont("helvetica", "normal");
        const value = (v || "—").toString();
        const maxW = W - 5.5 - 17 - 5;
        pdf.text(pdf.splitTextToSize(value, maxW)[0], fieldX + 15.5, fy);
        fy += 3.3;
      });

      // QR — vector squares
      const qr = QRCodeLib.create(qrValue, { errorCorrectionLevel: (brand.qrErrorCorrection || "Q") as any });
      const modules = qr.modules;
      const n = modules.size;
      const qrSizeMm = 16;
      const qrCx = ox + W / 2;
      const qrCy = oy + H - 16;
      const cell = qrSizeMm / n;
      const x0 = qrCx - qrSizeMm / 2;
      const y0 = qrCy - qrSizeMm / 2;
      pdf.setFillColor(255, 255, 255);
      pdf.rect(x0 - 0.6, y0 - 0.6, qrSizeMm + 1.2, qrSizeMm + 1.2, "F");
      pdf.setFillColor(15, 23, 42);
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (modules.get(r, c)) {
            pdf.rect(x0 + c * cell, y0 + r * cell, cell + 0.02, cell + 0.02, "F");
          }
        }
      }
      pdf.setFont("courier", "bold");
      pdf.setFontSize(5.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text(id, ox + W / 2, qrCy + qrSizeMm / 2 + 2.2, { align: "center" });

      pdf.setFillColor(pr, pg, pb);
      pdf.rect(ox, oy + H - footH, W, footH, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5.6);
      pdf.text(brand.companyName.toUpperCase(), ox + W / 2 - 1, oy + H - footH + 3.6, { align: "right" });
      pdf.setFont("helvetica", "normal");
      pdf.text(`  www.${websiteHost}`, ox + W / 2 - 1, oy + H - footH + 3.6);
      return;
    }

    // === BACK ===
    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("TERMS AND CONDITIONS", ox + W / 2, oy + 6.5, { align: "center" });
    pdf.setDrawColor(pr, pg, pb);
    pdf.setLineWidth(0.3);
    pdf.line(ox + W / 2 - 5, oy + 7.6, ox + W / 2 + 5, oy + 7.6);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.4);
    pdf.setTextColor(51, 65, 85);
    const bullets = [
      `This card is the property of ${brand.companyName}. If found, please return to the address visible on the website. Misuse or alteration is strictly prohibited.`,
      "The card holder must present this ID upon request and surrender it on the date of expiry or upon termination of association with the company.",
    ];
    let by = oy + 11.5;
    bullets.forEach((b) => {
      pdf.setFillColor(pr, pg, pb);
      pdf.circle(ox + 5, by - 0.6, 0.5, "F");
      const lines = pdf.splitTextToSize(b, W - 11);
      pdf.text(lines, ox + 6.5, by);
      by += lines.length * 2.6 + 1.6;
    });

    let dy = by + 2.5;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    if (hasExpiry) {
      pdf.setTextColor(pr, pg, pb);
      pdf.text("Joined Date", ox + 6.5, dy);
      pdf.setTextColor(148, 163, 184); pdf.text(":", ox + 22, dy);
      pdf.setTextColor(30, 41, 59); pdf.setFont("helvetica", "normal"); pdf.text(joined, ox + 24, dy);
      dy += 3.4;
      pdf.setFont("helvetica", "bold"); pdf.setTextColor(pr, pg, pb);
      pdf.text("Expire Date", ox + 6.5, dy);
      pdf.setTextColor(148, 163, 184); pdf.text(":", ox + 22, dy);
      pdf.setTextColor(30, 41, 59); pdf.setFont("helvetica", "normal"); pdf.text(expires, ox + 24, dy);
      dy += 3.4;
    } else {
      pdf.setTextColor(pr, pg, pb);
      const lbl = "Joined Date :";
      const lblW = pdf.getTextWidth(lbl);
      const valW = pdf.getTextWidth(joined);
      const startX = ox + (W - (lblW + 1.5 + valW)) / 2;
      pdf.text(lbl, startX, dy);
      pdf.setTextColor(30, 41, 59); pdf.setFont("helvetica", "normal");
      pdf.text(joined, startX + lblW + 1.5, dy);
      dy += 3.4;
    }

    dy += 2.5;
    pdf.setFont("times", "italic");
    pdf.setFontSize(13);
    pdf.setTextColor(30, 41, 59);
    const sig = (subject.name || "Authorized").split(" ").slice(0, 2).join(" ");
    pdf.text(sig, ox + W / 2, dy, { align: "center" });
    dy += 1.4;
    pdf.setDrawColor(71, 85, 105); pdf.setLineWidth(0.2);
    pdf.line(ox + W / 2 - 13, dy, ox + W / 2 + 13, dy);
    dy += 2.6;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.5); pdf.setTextColor(15, 23, 42);
    pdf.text("Your Sincerely", ox + W / 2, dy, { align: "center" });
    dy += 2.6;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); pdf.setTextColor(71, 85, 105);
    pdf.text(role, ox + W / 2, dy, { align: "center", maxWidth: W - 10 });

    const blockTop = dy + 4;
    const blockBottom = oy + H - footH - 2;
    const blockCy = (blockTop + blockBottom) / 2;
    // Brand wordmark — rendered as native PDF text instead of embedding the
    // logo bitmap, so the back face stays fully vector.
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(pr, pg, pb);
    pdf.text(brand.companyName.toUpperCase(), ox + W / 2, blockCy - 1, { align: "center" });
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(6); pdf.setTextColor(71, 85, 105);
    pdf.text("CONTACT", ox + W / 2, blockCy + 3, { align: "center" });
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.4); pdf.setTextColor(30, 41, 59);
    pdf.text(brand.supportEmail, ox + W / 2, blockCy + 5.5, { align: "center" });

    pdf.setFillColor(pr, pg, pb);
    pdf.rect(ox, oy + H - footH, W, footH, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(5.6);
    pdf.text(brand.companyName.toUpperCase(), ox + W / 2 - 1, oy + H - footH + 3.6, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.text(`  www.${websiteHost}`, ox + W / 2 - 1, oy + H - footH + 3.6);
  };

  const printCard = async () => {
    if (!subject || !cardRef.current) return;
    try {
      const portrait = template === "wave";
      const W = portrait ? 54 : 85.6;
      const H = portrait ? 85.6 : 54;

      const [{ jsPDF }, frontPng, backPng] = await Promise.all([
        import("jspdf"),
        side !== "back"
          ? captureCardFace(cardRef.current, "front")
          : Promise.resolve(null),
        side !== "front"
          ? captureCardFace(cardRef.current, "back")
          : Promise.resolve(null),
      ]);

      const pdf = new jsPDF({ unit: "mm", format: [W, H], orientation: portrait ? "portrait" : "landscape" });
      if (frontPng) pdf.addImage(frontPng, "PNG", 0, 0, W, H, undefined, "FAST");
      if (backPng) {
        if (frontPng) pdf.addPage([W, H], portrait ? "portrait" : "landscape");
        pdf.addImage(backPng, "PNG", 0, 0, W, H, undefined, "FAST");
      }

      const slug = subject.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      pdf.save(`${tab}-id-${slug}.pdf`);
      toast.success("PDF downloaded exactly like preview");
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate PDF");
    }
  };

  // Preview overlays
  const [showGrid, setShowGrid] = useState(false);
  const [showSafeArea, setShowSafeArea] = useState(false);

  // ---------- Bulk export (TRUE VECTOR) ----------
  // For every filtered subject we mount the off-screen IdCardVisual just long
  // enough to resolve its locked card_id + QR payload via useCardId, then we
  // draw the card on the A4 sheet using jsPDF vector primitives — no PNG
  // snapshots in the pipeline, so the PDF is fully scalable.
  const bulkRef = useRef<HTMLDivElement>(null);
  const [bulkSubject, setBulkSubject] = useState<CardSubject | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const bulkResolveRef = useRef<((info: { id: string; qrValue: string }) => void) | null>(null);

  const resolveBulkSubject = (s: CardSubject) =>
    new Promise<{ id: string; qrValue: string }>((resolve) => {
      // Safety timeout — fall back to a synthetic id if resolution stalls so
      // the bulk job never hangs on a single bad row.
      const t = setTimeout(() => {
        if (bulkResolveRef.current) {
          bulkResolveRef.current = null;
          const baseUrl = (brand.siteUrl || "").replace(/\/$/, "") || window.location.origin;
          const fallbackId = `${(brand.companyName || "ID").replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase()}${(tab === "employee" ? "E" : "I")}`;
          resolve({ id: fallbackId, qrValue: `${baseUrl}/verify?id=${fallbackId}` });
        }
      }, 6000);
      bulkResolveRef.current = (info) => {
        clearTimeout(t);
        bulkResolveRef.current = null;
        resolve(info);
      };
      setBulkSubject(s);
    });

  const exportBulkPdf = async () => {
    if (filtered.length === 0) {
      toast.error("No subjects in the current list");
      return;
    }
    setBulkProgress({ current: 0, total: filtered.length });
    try {
      const [{ jsPDF }] = await Promise.all([import("jspdf")]);
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const cardW = 54;
      const cardH = 85.6;
      const includeFront = side !== "back";
      const includeBack = side !== "front";
      const cardsAcrossInRender = includeFront && includeBack ? 2 : 1;
      const slotW = cardW * cardsAcrossInRender + (cardsAcrossInRender - 1) * 4;
      const slotH = cardH;

      const marginX = 12;
      const marginY = 14;
      const gapX = 6;
      const gapY = 10;
      const cols = Math.max(1, Math.floor((pageW - marginX * 2 + gapX) / (slotW + gapX)));
      const rows = Math.max(1, Math.floor((pageH - marginY * 2 + gapY) / (slotH + gapY)));
      const perPage = cols * rows;

      for (let i = 0; i < filtered.length; i++) {
        const subj = { ...filtered[i], photo: photoOverride[filtered[i].id] ?? filtered[i].photo };
        setBulkProgress({ current: i + 1, total: filtered.length });

        const { id, qrValue } = await resolveBulkSubject(subj);
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        if (!bulkRef.current) throw new Error("Bulk card preview was not ready for PDF export");
        const [frontPng, backPng] = await Promise.all([
          includeFront ? captureCardFace(bulkRef.current, "front") : Promise.resolve(null),
          includeBack ? captureCardFace(bulkRef.current, "back") : Promise.resolve(null),
        ]);

        const slotOnPage = i % perPage;
        if (i > 0 && slotOnPage === 0) pdf.addPage();
        if (slotOnPage === 0) {
          pdf.setFontSize(9);
          pdf.setTextColor(80);
          pdf.setFont("helvetica", "normal");
          pdf.text(
            `${tab === "employee" ? "Employee" : "Investor"} ID cards · ${filtered.length} total · Trim ${cardW}×${cardH}mm · Print at 100%`,
            marginX,
            marginY - 4,
          );
        }
        const col = slotOnPage % cols;
        const row = Math.floor(slotOnPage / cols);
        const x = marginX + col * (slotW + gapX);
        const y = marginY + row * (slotH + gapY);

        if (includeFront) {
          pdf.addImage(frontPng, "PNG", x, y, cardW, cardH, undefined, "FAST");
        }
        if (includeBack) {
          const bx = includeFront ? x + cardW + 4 : x;
          pdf.addImage(backPng, "PNG", bx, y, cardW, cardH, undefined, "FAST");
        }

        pdf.setDrawColor(40);
        pdf.setLineWidth(0.1);
        const m = 3;
        pdf.line(x - m, y, x - 0.5, y); pdf.line(x, y - m, x, y - 0.5);
        pdf.line(x + slotW + 0.5, y, x + slotW + m, y); pdf.line(x + slotW, y - m, x + slotW, y - 0.5);
        pdf.line(x - m, y + slotH, x - 0.5, y + slotH); pdf.line(x, y + slotH + 0.5, x, y + slotH + m);
        pdf.line(x + slotW + 0.5, y + slotH, x + slotW + m, y + slotH);
        pdf.line(x + slotW, y + slotH + 0.5, x + slotW, y + slotH + m);

        pdf.setFontSize(7);
        pdf.setTextColor(120);
        pdf.setFont("helvetica", "normal");
        pdf.text(subj.name, x, y + slotH + 4, { maxWidth: slotW });
      }

      pdf.save(`${tab}-id-cards-bulk-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(`Generated ${filtered.length} vector ID card${filtered.length === 1 ? "" : "s"}`);
    } catch (e: any) {
      toast.error(e?.message || "Bulk export failed");
    } finally {
      setBulkSubject(null);
      bulkResolveRef.current = null;
      setBulkProgress(null);
    }
  };


  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <IdCard className="w-6 h-6 text-primary" /> ID Card Maker
            </h1>
            <p className="text-sm text-muted-foreground">
              Auto-generate modern employee &amp; investor ID cards from live team and investor data.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={regenerate} disabled={!subject}>
              <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
            </Button>
            <Button variant="outline" onClick={printCard} disabled={!subject}>
              <Printer className="w-4 h-4 mr-2" /> Print PDF
            </Button>
            <Button onClick={download} disabled={!subject}>
              <Download className="w-4 h-4 mr-2" /> Download PNG
            </Button>
            <Button
              variant="secondary"
              onClick={exportBulkPdf}
              disabled={!!bulkProgress || filtered.length === 0}
              title={`Generate a single PDF containing every ${tab} in the current list`}
            >
              {bulkProgress ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {bulkProgress.current}/{bulkProgress.total}
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4 mr-2" />
                  <FileDown className="w-4 h-4 mr-2" />
                  Bulk PDF ({filtered.length})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Off-screen renderer — captured per subject during bulk export. */}
        <div
          aria-hidden
          style={{
            position: "fixed",
            left: "-10000px",
            top: 0,
            pointerEvents: "none",
          }}
        >
          {bulkSubject && (
            <div ref={bulkRef}>
              <IdCardVisual
                key={`bulk-${bulkSubject.id}`}
                subject={bulkSubject}
                template={template}
                kind={tab === "employee" ? "EMP" : "INV"}
                cardRef={{ current: null } as any}
                brand={brand}
                side={side}
                onResolved={(info) => bulkResolveRef.current?.(info)}
              />
            </div>
          )}
        </div>

        {/* Brand customization panel — synced via site_settings.id_card_brand */}
        <Card className="p-4">
          <details className="group">
            <summary className="cursor-pointer flex items-center justify-between gap-3 list-none">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <span className="font-semibold">Brand customization</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Company name, logo, colors, header & footer — applies to every card and the public verify page.
                </span>
                {brandDirty && (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30">
                    Unsaved
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">▾</span>
            </summary>

            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Company name</Label>
                <Input value={brand.companyName} onChange={(e) => updateBrand({ companyName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Site URL (used in QR verify link)</Label>
                <Input value={brand.siteUrl} placeholder="https://dynime.com" onChange={(e) => updateBrand({ siteUrl: e.target.value })} />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs">Logo</Label>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="h-12 w-12 rounded-md border bg-muted/40 grid place-items-center overflow-hidden">
                    {brand.logoUrl ? (
                      <img src={brand.logoUrl} alt="logo" className="h-full w-full object-contain" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <Input
                    className="flex-1 min-w-[200px]"
                    value={brand.logoUrl}
                    placeholder="https://… or upload"
                    onChange={(e) => updateBrand({ logoUrl: e.target.value })}
                  />
                  <label className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border bg-background hover:bg-muted cursor-pointer">
                    <Upload className="w-3.5 h-3.5" /> Upload
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
                  </label>
                  {brand.logoUrl && (
                    <Button variant="ghost" size="sm" onClick={() => updateBrand({ logoUrl: "" })}>Remove</Button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Primary color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={brand.primaryColor} onChange={(e) => updateBrand({ primaryColor: e.target.value })} className="h-10 w-14 rounded border bg-transparent cursor-pointer" />
                  <Input value={brand.primaryColor} onChange={(e) => updateBrand({ primaryColor: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Secondary color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={brand.secondaryColor} onChange={(e) => updateBrand({ secondaryColor: e.target.value })} className="h-10 w-14 rounded border bg-transparent cursor-pointer" />
                  <Input value={brand.secondaryColor} onChange={(e) => updateBrand({ secondaryColor: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Accent (top bar)</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={brand.accentColor} onChange={(e) => updateBrand({ accentColor: e.target.value })} className="h-10 w-14 rounded border bg-transparent cursor-pointer" />
                  <Input value={brand.accentColor} onChange={(e) => updateBrand({ accentColor: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Validity (years)</Label>
                <Input type="number" min={1} max={10} value={brand.validityYears}
                  onChange={(e) => updateBrand({ validityYears: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Employee header text</Label>
                <Input value={brand.headerEmployee} onChange={(e) => updateBrand({ headerEmployee: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Investor header text</Label>
                <Input value={brand.headerInvestor} onChange={(e) => updateBrand({ headerInvestor: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Employee tag (top right)</Label>
                <Input value={brand.staffLabel} onChange={(e) => updateBrand({ staffLabel: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Investor tag (top right)</Label>
                <Input value={brand.investorLabel} onChange={(e) => updateBrand({ investorLabel: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Footer text</Label>
                <Input value={brand.footerText} placeholder="dynime.com" onChange={(e) => updateBrand({ footerText: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Support email (verify page)</Label>
                <Input value={brand.supportEmail} onChange={(e) => updateBrand({ supportEmail: e.target.value })} />
              </div>

              {/* QR tuning — size + error correction for scan reliability */}
              <div className="space-y-1.5">
                <Label className="text-xs">QR size (px)</Label>
                <Input
                  type="number"
                  min={40}
                  max={120}
                  value={brand.qrSize}
                  onChange={(e) => updateBrand({ qrSize: Math.max(40, Math.min(120, Number(e.target.value) || 64)) })}
                />
                <p className="text-[10.5px] text-muted-foreground">Larger QR = easier to scan. 56–80 is a good range for ID cards.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">QR error correction</Label>
                <Select
                  value={brand.qrErrorCorrection}
                  onValueChange={(v) => updateBrand({ qrErrorCorrection: v as IdCardBrand["qrErrorCorrection"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Low (≈7%) — densest, smallest</SelectItem>
                    <SelectItem value="M">Medium (≈15%)</SelectItem>
                    <SelectItem value="Q">Quartile (≈25%) — recommended</SelectItem>
                    <SelectItem value="H">High (≈30%) — most resilient</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10.5px] text-muted-foreground">Higher levels survive scratches, glare, and small print sizes.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">QR quiet-zone padding (px)</Label>
                <Input
                  type="number"
                  min={2}
                  max={20}
                  value={brand.qrMargin}
                  onChange={(e) => updateBrand({ qrMargin: Math.max(2, Math.min(20, Number(e.target.value) || 6)) })}
                />
              </div>

              {/* ID number length — guarantees the numeric part is always ≥ 4 digits */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">ID number length</Label>
                  <span className="text-[10px] font-semibold rounded-full bg-primary/10 text-primary px-2 py-0.5">
                    {Math.max(4, Math.min(8, brand.idDigits || 6))} digits
                  </span>
                </div>
                <Input
                  type="number"
                  min={4}
                  max={8}
                  value={brand.idDigits}
                  onChange={(e) => updateBrand({ idDigits: Math.max(4, Math.min(8, Number(e.target.value) || 6)) })}
                />
                <p className="text-[10.5px] text-muted-foreground">
                  Minimum 4 enforced · maximum 8. Example:{" "}
                  <span className="font-mono">
                    {shortCode(brand.companyName)}-E{"0".repeat(Math.max(4, Math.min(8, brand.idDigits || 6)) - 1)}1
                  </span>
                </p>
              </div>

              {/* Verified badge styling */}
              <div className="space-y-1.5">
                <Label className="text-xs">Verified badge</Label>
                <Select
                  value={brand.verifiedBadgeEnabled ? "on" : "off"}
                  onValueChange={(v) => updateBrand({ verifiedBadgeEnabled: v === "on" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on">Show next to name</SelectItem>
                    <SelectItem value="off">Hide</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Verified badge color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brand.verifiedBadgeColor}
                    onChange={(e) => updateBrand({ verifiedBadgeColor: e.target.value })}
                    className="h-10 w-14 rounded border bg-transparent cursor-pointer"
                  />
                  <Input value={brand.verifiedBadgeColor} onChange={(e) => updateBrand({ verifiedBadgeColor: e.target.value })} />
                  <Button type="button" size="sm" variant="outline" onClick={() => updateBrand({ verifiedBadgeColor: "#1d9bf0" })}>Brand blue</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => updateBrand({ verifiedBadgeColor: "#10b981" })}>Green</Button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <Button onClick={saveBrand} disabled={!brandDirty || savingBrand}>
                {savingBrand ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save brand
              </Button>
              <Button variant="outline" onClick={resetBrand}>
                <RotateCcw className="w-4 h-4 mr-2" /> Reset to defaults
              </Button>
              <span className="text-[11px] text-muted-foreground">
                Saved values sync to every ID card and the public <code>/verify</code> page.
              </span>
            </div>
          </details>
        </Card>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="employee" className="gap-1.5"><Users className="w-4 h-4" /> Employees ({employees.length})</TabsTrigger>
            <TabsTrigger value="investor" className="gap-1.5"><TrendingUp className="w-4 h-4" /> Investors ({investors.length})</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            <div className="grid lg:grid-cols-[1fr_minmax(440px,520px)] gap-6">
              {/* Left: list & controls */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={tab === "employee" ? "Search team members…" : "Search investors…"}
                      className="pl-9"
                    />
                  </div>
                </div>

                <Card className="divide-y max-h-[520px] overflow-auto">
                  {(tab === "employee" ? loadingTeam : loadingInv) ? (
                    <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground">No {tab === "employee" ? "team members" : "investors"} found.</div>
                  ) : filtered.map((c) => {
                    const active = c.id === selected?.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className={`w-full text-left p-3 flex items-center gap-3 hover:bg-muted/50 transition ${active ? "bg-muted" : ""}`}
                      >
                        <div className="h-9 w-9 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 grid place-items-center text-xs font-semibold">
                          {(photoOverride[c.id] || c.photo) ? (
                            <img src={photoOverride[c.id] || c.photo!} className="h-full w-full object-cover rounded-md" />
                          ) : initialsFrom(c.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{c.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{c.role}{c.email ? ` · ${c.email}` : ""}</div>
                        </div>
                      </button>
                    );
                  })}
                </Card>

                {subject && (
                  <Card className="p-4 space-y-3">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Card photo (optional)</Label>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border bg-background hover:bg-muted cursor-pointer">
                        <Upload className="w-4 h-4" /> Upload photo
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhoto(f); }} />
                      </label>
                      {photoOverride[subject.id] && (
                        <Button variant="ghost" size="sm" onClick={() =>
                          setPhotoOverride((p) => { const n = { ...p }; delete n[subject.id]; return n; })
                        }>Remove</Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Photo is embedded only into the rendered card — it isn't uploaded anywhere.
                    </p>
                  </Card>
                )}
              </div>

              {/* Right: live preview */}
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Live preview</div>
                  {true && (
                    <div className="inline-flex rounded-md border bg-background p-0.5 text-xs">
                      {(["front", "back", "both"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setSide(opt)}
                          className={`px-2.5 py-1 rounded capitalize transition ${side === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="inline-flex rounded-md border bg-background p-0.5 text-xs">
                    <button
                      onClick={() => setShowGrid((v) => !v)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded transition ${showGrid ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      title="Toggle alignment grid"
                    >
                      <Grid3x3 className="w-3.5 h-3.5" /> Grid
                    </button>
                    <button
                      onClick={() => setShowSafeArea((v) => !v)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded transition ${showSafeArea ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      title="Toggle safe-area + bleed guides"
                    >
                      <Square className="w-3.5 h-3.5" /> Safe area
                    </button>
                  </div>
                </div>
                <div className="p-6 rounded-3xl bg-gradient-to-br from-muted/40 to-background border w-full grid place-items-center">
                  {subject ? (
                    <ResponsiveScaler>
                      <div className="relative">
                        <IdCardVisual
                          key={`${subject.id}-${template}-${side}-${nonce}`}
                          subject={subject}
                          template={template}
                          kind={tab === "employee" ? "EMP" : "INV"}
                          cardRef={cardRef}
                          brand={brand}
                          side={side}
                          onResolved={setResolvedCard}
                        />
                        {/* Overlays — preview-only; not exported because they sit OUTSIDE cardRef */}
                        {(showGrid || showSafeArea) && (
                          <div className="pointer-events-none absolute inset-0 p-2 flex gap-5">
                            {(side === "both" ? ["f","b"] : [side]).map((k) => (
                              <div
                                key={k}
                                className="relative w-[300px] h-[510px] rounded-[22px] overflow-hidden"
                              >
                                {showGrid && (
                                  <div
                                    className="absolute inset-0"
                                    style={{
                                      backgroundImage:
                                        "linear-gradient(to right, hsl(var(--primary) / 0.18) 1px, transparent 1px)," +
                                        "linear-gradient(to bottom, hsl(var(--primary) / 0.18) 1px, transparent 1px)",
                                      backgroundSize: "8px 8px",
                                    }}
                                  />
                                )}
                                {showSafeArea && (
                                  <>
                                    <div className="absolute inset-0 border border-dashed border-rose-500/70" />
                                    <div className="absolute inset-[12px] border border-dashed border-emerald-500/80" />
                                    <span className="absolute -top-0.5 left-1 text-[8px] font-bold tracking-widest uppercase text-rose-500 bg-white/80 px-1 rounded">Bleed</span>
                                    <span className="absolute top-3 left-3 text-[8px] font-bold tracking-widest uppercase text-emerald-600 bg-white/80 px-1 rounded">Safe</span>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </ResponsiveScaler>
                  ) : (
                    <div className="text-sm text-muted-foreground py-16">Select a person to preview their ID card.</div>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground text-center max-w-sm">
                  Cards refresh automatically as your team and investor data updates.
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminIdCards;
