import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, XCircle, Globe2, Search, ShieldCheck, Loader2, Clock, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { db } from "@/integrations/db/client";

type Status = "blocked" | "review" | "eligible";

interface CountryRow {
  id: string;
  name: string;
  aliases: string[];
  status: Status;
  category: string;
  reason: string;
}

const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

const STATUS_STYLES: Record<Status, { wrap: string; icon: JSX.Element; label: string }> = {
  blocked: {
    wrap: "border-destructive/40 bg-destructive/10 text-destructive",
    icon: <XCircle className="w-4 h-4" />,
    label: "Not Eligible",
  },
  review: {
    wrap: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    icon: <AlertTriangle className="w-4 h-4" />,
    label: "Enhanced Review",
  },
  eligible: {
    wrap: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: "Eligible",
  },
};

// Primary IANA timezone for common countries — used to show local time for the
// selected country alongside the visitor's detected timezone.
const COUNTRY_TZ: Record<string, string> = {
  afghanistan: "Asia/Kabul",
  albania: "Europe/Tirane",
  algeria: "Africa/Algiers",
  andorra: "Europe/Andorra",
  angola: "Africa/Luanda",
  "antigua and barbuda": "America/Antigua",
  argentina: "America/Argentina/Buenos_Aires",
  armenia: "Asia/Yerevan",
  australia: "Australia/Sydney",
  austria: "Europe/Vienna",
  azerbaijan: "Asia/Baku",
  bahamas: "America/Nassau",
  bahrain: "Asia/Bahrain",
  bangladesh: "Asia/Dhaka",
  barbados: "America/Barbados",
  belarus: "Europe/Minsk",
  belgium: "Europe/Brussels",
  belize: "America/Belize",
  benin: "Africa/Porto-Novo",
  bhutan: "Asia/Thimphu",
  bolivia: "America/La_Paz",
  "bosnia and herzegovina": "Europe/Sarajevo",
  botswana: "Africa/Gaborone",
  brazil: "America/Sao_Paulo",
  brunei: "Asia/Brunei",
  bulgaria: "Europe/Sofia",
  "burkina faso": "Africa/Ouagadougou",
  burundi: "Africa/Bujumbura",
  cambodia: "Asia/Phnom_Penh",
  cameroon: "Africa/Douala",
  canada: "America/Toronto",
  "cape verde": "Atlantic/Cape_Verde",
  "central african republic": "Africa/Bangui",
  chad: "Africa/Ndjamena",
  chile: "America/Santiago",
  china: "Asia/Shanghai",
  colombia: "America/Bogota",
  comoros: "Indian/Comoro",
  congo: "Africa/Brazzaville",
  "democratic republic of the congo": "Africa/Kinshasa",
  "costa rica": "America/Costa_Rica",
  "cote d'ivoire": "Africa/Abidjan",
  "ivory coast": "Africa/Abidjan",
  croatia: "Europe/Zagreb",
  cuba: "America/Havana",
  cyprus: "Asia/Nicosia",
  "czech republic": "Europe/Prague",
  czechia: "Europe/Prague",
  denmark: "Europe/Copenhagen",
  djibouti: "Africa/Djibouti",
  dominica: "America/Dominica",
  "dominican republic": "America/Santo_Domingo",
  ecuador: "America/Guayaquil",
  egypt: "Africa/Cairo",
  "el salvador": "America/El_Salvador",
  "equatorial guinea": "Africa/Malabo",
  eritrea: "Africa/Asmara",
  estonia: "Europe/Tallinn",
  eswatini: "Africa/Mbabane",
  ethiopia: "Africa/Addis_Ababa",
  fiji: "Pacific/Fiji",
  finland: "Europe/Helsinki",
  france: "Europe/Paris",
  gabon: "Africa/Libreville",
  gambia: "Africa/Banjul",
  georgia: "Asia/Tbilisi",
  germany: "Europe/Berlin",
  ghana: "Africa/Accra",
  greece: "Europe/Athens",
  grenada: "America/Grenada",
  guatemala: "America/Guatemala",
  guinea: "Africa/Conakry",
  "guinea-bissau": "Africa/Bissau",
  guyana: "America/Guyana",
  haiti: "America/Port-au-Prince",
  honduras: "America/Tegucigalpa",
  "hong kong": "Asia/Hong_Kong",
  hungary: "Europe/Budapest",
  iceland: "Atlantic/Reykjavik",
  india: "Asia/Kolkata",
  indonesia: "Asia/Jakarta",
  iran: "Asia/Tehran",
  iraq: "Asia/Baghdad",
  ireland: "Europe/Dublin",
  israel: "Asia/Jerusalem",
  italy: "Europe/Rome",
  jamaica: "America/Jamaica",
  japan: "Asia/Tokyo",
  jordan: "Asia/Amman",
  kazakhstan: "Asia/Almaty",
  kenya: "Africa/Nairobi",
  kiribati: "Pacific/Tarawa",
  kosovo: "Europe/Belgrade",
  kuwait: "Asia/Kuwait",
  kyrgyzstan: "Asia/Bishkek",
  laos: "Asia/Vientiane",
  latvia: "Europe/Riga",
  lebanon: "Asia/Beirut",
  lesotho: "Africa/Maseru",
  liberia: "Africa/Monrovia",
  libya: "Africa/Tripoli",
  liechtenstein: "Europe/Vaduz",
  lithuania: "Europe/Vilnius",
  luxembourg: "Europe/Luxembourg",
  macau: "Asia/Macau",
  madagascar: "Indian/Antananarivo",
  malawi: "Africa/Blantyre",
  malaysia: "Asia/Kuala_Lumpur",
  maldives: "Indian/Maldives",
  mali: "Africa/Bamako",
  malta: "Europe/Malta",
  "marshall islands": "Pacific/Majuro",
  mauritania: "Africa/Nouakchott",
  mauritius: "Indian/Mauritius",
  mexico: "America/Mexico_City",
  micronesia: "Pacific/Pohnpei",
  moldova: "Europe/Chisinau",
  monaco: "Europe/Monaco",
  mongolia: "Asia/Ulaanbaatar",
  montenegro: "Europe/Podgorica",
  morocco: "Africa/Casablanca",
  mozambique: "Africa/Maputo",
  myanmar: "Asia/Yangon",
  burma: "Asia/Yangon",
  namibia: "Africa/Windhoek",
  nauru: "Pacific/Nauru",
  nepal: "Asia/Kathmandu",
  netherlands: "Europe/Amsterdam",
  "new zealand": "Pacific/Auckland",
  nicaragua: "America/Managua",
  niger: "Africa/Niamey",
  nigeria: "Africa/Lagos",
  "north korea": "Asia/Pyongyang",
  "north macedonia": "Europe/Skopje",
  macedonia: "Europe/Skopje",
  norway: "Europe/Oslo",
  oman: "Asia/Muscat",
  pakistan: "Asia/Karachi",
  palau: "Pacific/Palau",
  palestine: "Asia/Gaza",
  panama: "America/Panama",
  "papua new guinea": "Pacific/Port_Moresby",
  paraguay: "America/Asuncion",
  peru: "America/Lima",
  philippines: "Asia/Manila",
  poland: "Europe/Warsaw",
  portugal: "Europe/Lisbon",
  "puerto rico": "America/Puerto_Rico",
  qatar: "Asia/Qatar",
  romania: "Europe/Bucharest",
  russia: "Europe/Moscow",
  "russian federation": "Europe/Moscow",
  rwanda: "Africa/Kigali",
  "saint kitts and nevis": "America/St_Kitts",
  "saint lucia": "America/St_Lucia",
  "saint vincent and the grenadines": "America/St_Vincent",
  samoa: "Pacific/Apia",
  "san marino": "Europe/San_Marino",
  "sao tome and principe": "Africa/Sao_Tome",
  "saudi arabia": "Asia/Riyadh",
  senegal: "Africa/Dakar",
  serbia: "Europe/Belgrade",
  seychelles: "Indian/Mahe",
  "sierra leone": "Africa/Freetown",
  singapore: "Asia/Singapore",
  slovakia: "Europe/Bratislava",
  slovenia: "Europe/Ljubljana",
  "solomon islands": "Pacific/Guadalcanal",
  somalia: "Africa/Mogadishu",
  "south africa": "Africa/Johannesburg",
  "south korea": "Asia/Seoul",
  korea: "Asia/Seoul",
  "south sudan": "Africa/Juba",
  spain: "Europe/Madrid",
  "sri lanka": "Asia/Colombo",
  sudan: "Africa/Khartoum",
  suriname: "America/Paramaribo",
  sweden: "Europe/Stockholm",
  switzerland: "Europe/Zurich",
  syria: "Asia/Damascus",
  taiwan: "Asia/Taipei",
  tajikistan: "Asia/Dushanbe",
  tanzania: "Africa/Dar_es_Salaam",
  thailand: "Asia/Bangkok",
  "timor-leste": "Asia/Dili",
  "east timor": "Asia/Dili",
  togo: "Africa/Lome",
  tonga: "Pacific/Tongatapu",
  "trinidad and tobago": "America/Port_of_Spain",
  tunisia: "Africa/Tunis",
  turkey: "Europe/Istanbul",
  turkmenistan: "Asia/Ashgabat",
  tuvalu: "Pacific/Funafuti",
  uganda: "Africa/Kampala",
  ukraine: "Europe/Kiev",
  "united arab emirates": "Asia/Dubai",
  uae: "Asia/Dubai",
  "united kingdom": "Europe/London",
  uk: "Europe/London",
  "great britain": "Europe/London",
  britain: "Europe/London",
  england: "Europe/London",
  "united states": "America/New_York",
  "united states of america": "America/New_York",
  usa: "America/New_York",
  us: "America/New_York",
  america: "America/New_York",
  uruguay: "America/Montevideo",
  uzbekistan: "Asia/Tashkent",
  vanuatu: "Pacific/Efate",
  "vatican city": "Europe/Vatican",
  venezuela: "America/Caracas",
  vietnam: "Asia/Ho_Chi_Minh",
  yemen: "Asia/Aden",
  zambia: "Africa/Lusaka",
  zimbabwe: "Africa/Harare",
};

const tzForCountry = (name?: string | null) =>
  name ? COUNTRY_TZ[name.toLowerCase().trim()] : undefined;

const fmtTime = (d: Date, tz?: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: tz,
    }).format(d);
  } catch {
    return d.toLocaleTimeString();
  }
};

const fmtTzOffset = (d: Date, tz?: string) => {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(d);
    return parts.find((p) => p.type === "timeZoneName")?.value || "";
  } catch {
    return "";
  }
};

// Reference list of common eligible countries (with optional aliases for lookups).
const COMMON_COUNTRIES: { name: string; aliases?: string[] }[] = [
  { name: "United States", aliases: ["usa", "us", "u.s.", "u.s.a", "america", "united states of america"] },
  { name: "United Kingdom", aliases: ["uk", "u.k.", "great britain", "britain", "england"] },
  { name: "United Arab Emirates", aliases: ["uae", "u.a.e."] },
  { name: "Canada" }, { name: "Australia" }, { name: "Germany" }, { name: "France" }, { name: "Spain" },
  { name: "Italy" }, { name: "Netherlands", aliases: ["holland"] }, { name: "Sweden" }, { name: "Norway" },
  { name: "Denmark" }, { name: "Finland" }, { name: "Ireland" }, { name: "Portugal" }, { name: "Belgium" },
  { name: "Switzerland" }, { name: "Austria" }, { name: "Poland" }, { name: "Czech Republic", aliases: ["czechia"] },
  { name: "Greece" }, { name: "Turkey", aliases: ["türkiye", "turkiye"] }, { name: "Saudi Arabia" },
  { name: "Qatar" }, { name: "Kuwait" }, { name: "Bahrain" }, { name: "Oman" }, { name: "Israel" },
  { name: "Egypt" }, { name: "Morocco" }, { name: "South Africa" }, { name: "Kenya" }, { name: "Ghana" },
  { name: "India" }, { name: "Pakistan" }, { name: "Bangladesh" }, { name: "Sri Lanka" }, { name: "Nepal" },
  { name: "Bhutan" }, { name: "Maldives" }, { name: "China" }, { name: "Japan" },
  { name: "South Korea", aliases: ["korea"] }, { name: "Singapore" }, { name: "Malaysia" }, { name: "Indonesia" },
  { name: "Thailand" }, { name: "Vietnam" }, { name: "Philippines" }, { name: "Hong Kong" }, { name: "Taiwan" },
  { name: "New Zealand" }, { name: "Mexico" }, { name: "Brazil" }, { name: "Argentina" }, { name: "Chile" },
  { name: "Colombia" }, { name: "Peru" }, { name: "Uruguay" },
];

const CountryEligibilityChecker = () => {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Visitor's detected timezone (browser) + live-ticking current time
  const visitorTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: countries = [], isLoading } = useQuery({
    queryKey: ["country-eligibility-public"],
    queryFn: async () => {
      const { data, error } = await (db as any)
        .from("country_eligibility")
        .select("id,name,aliases,status,category,reason")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as CountryRow[]) ?? [];
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    const channel = db
      .channel("country-eligibility-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "country_eligibility" },
        () => qc.invalidateQueries({ queryKey: ["country-eligibility-public"] }),
      )
      .subscribe();
    return () => {
      db.removeChannel(channel);
    };
  }, [qc]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().slice(0, 60)), 200);
    return () => clearTimeout(t);
  }, [query]);

  // Click outside closes dropdown
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const counts = useMemo(() => {
    const c = { blocked: 0, review: 0, eligible: 0 };
    for (const r of countries) c[r.status]++;
    return c;
  }, [countries]);

  // Combined searchable list
  const allCountries = useMemo(() => {
    const dbNames = new Set(countries.map((c) => norm(c.name)));
    const merged: { name: string; aliases: string[] }[] = countries.map((c) => ({
      name: c.name,
      aliases: c.aliases ?? [],
    }));
    for (const c of COMMON_COUNTRIES) {
      if (!dbNames.has(norm(c.name))) merged.push({ name: c.name, aliases: c.aliases ?? [] });
    }
    return merged;
  }, [countries]);

  const findExact = (q: string) => {
    const n = norm(q);
    if (!n) return null;
    // First check DB rows (status-bearing)
    const dbHit = countries.find(
      (c) => norm(c.name) === n || (c.aliases ?? []).some((a) => norm(a) === n),
    );
    if (dbHit) {
      return { status: dbHit.status, country: dbHit.name, reason: dbHit.reason, category: dbHit.category };
    }
    // Then known eligible countries
    const refHit = COMMON_COUNTRIES.find(
      (c) => norm(c.name) === n || (c.aliases ?? []).some((a) => norm(a) === n),
    );
    if (refHit) {
      return {
        status: "eligible" as Status,
        country: refHit.name,
        reason: "No restriction detected — we can onboard you.",
        category: "Eligible",
      };
    }
    return null;
  };

  const suggestions = useMemo(() => {
    const q = norm(query);
    if (!q || q.length < 1) return [];
    return allCountries
      .filter(
        (c) => norm(c.name).includes(q) || (c.aliases ?? []).some((a) => norm(a).includes(q)),
      )
      .slice(0, 7);
  }, [query, allCountries]);

  const result = useMemo(() => {
    // Prefer explicit selection from dropdown
    if (selected) return findExact(selected);
    // Auto-resolve only when input matches a known country exactly
    return findExact(debounced);
  }, [selected, debounced, countries]);

  const showNoMatch = !result && debounced.length >= 2 && suggestions.length === 0 && !isLoading;

  return (
    <section id="eligibility-checker" className="pb-9 md:pb-12 scroll-mt-24">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/80 to-card/60 backdrop-blur-md p-6 md:p-8 shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.4)]">
          {/* Header */}
          <div className="flex items-start gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
              <Globe2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-primary text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  Eligibility
                </span>
              </div>
              <h2 className="font-heading text-xl md:text-2xl font-bold leading-tight mt-1.5">
                Country Eligibility Checker
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Verify onboarding eligibility against FATF, OFAC and conflict-zone criteria. Pick your country from the suggestions for an accurate result.
              </p>
            </div>
          </div>

          {/* Search FIRST */}
          <div ref={wrapRef} className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              maxLength={60}
              placeholder="Search your country (e.g. United States, UAE, Germany)…"
              aria-label="Your country"
              className="pl-10 h-12 text-base bg-card border-border/70 shadow-sm"
              autoComplete="off"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
            )}
            {open && suggestions.length > 0 && (
              <ul className="absolute z-20 mt-1.5 w-full bg-popover border border-border rounded-xl shadow-xl overflow-hidden max-h-72 overflow-y-auto">
                {suggestions.map((s) => {
                  const dbRow = countries.find((c) => norm(c.name) === norm(s.name));
                  const status: Status = dbRow ? dbRow.status : "eligible";
                  const dot =
                    status === "blocked"
                      ? "bg-destructive"
                      : status === "review"
                      ? "bg-amber-500"
                      : "bg-emerald-500";
                  return (
                    <li key={s.name}>
                      <button
                        type="button"
                        onClick={() => {
                          setQuery(s.name);
                          setSelected(s.name);
                          setOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2.5 text-sm text-foreground hover:bg-primary/10 hover:text-foreground transition-colors flex items-center gap-2.5"
                      >
                        <span className={`w-2 h-2 rounded-full ${dot}`} />
                        <span className="flex-1 truncate">{s.name}</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {status}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Auto-detected time zones (visitor + selected country) */}
          {(() => {
            const selectedTz = tzForCountry(result?.country || selected);
            return (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-border/60 bg-card/60 p-3 flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Your time zone
                    </p>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {visitorTz.replace(/_/g, " ")}{" "}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {fmtTzOffset(now, visitorTz)}
                      </span>
                    </p>
                    <p className="text-xs font-mono tabular-nums text-foreground/80 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {fmtTime(now, visitorTz)}
                    </p>
                  </div>
                </div>

                <div
                  className={`rounded-xl border p-3 flex items-start gap-2.5 ${
                    selectedTz
                      ? "border-primary/30 bg-primary/5"
                      : "border-dashed border-border/60 bg-muted/20"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Globe2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {result?.country || selected ? `Local time — ${result?.country || selected}` : "Local time — pick a country"}
                    </p>
                    {selectedTz ? (
                      <>
                        <p className="text-sm font-semibold text-foreground truncate">
                          {selectedTz.replace(/_/g, " ")}{" "}
                          <span className="text-[10px] font-normal text-muted-foreground">
                            {fmtTzOffset(now, selectedTz)}
                          </span>
                        </p>
                        <p className="text-xs font-mono tabular-nums text-foreground/80 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {fmtTime(now, selectedTz)}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Select your country to see local time and offset.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Result */}
          <div className="mt-4 min-h-[72px]">
            {result ? (
              <div className={`rounded-xl border p-4 ${STATUS_STYLES[result.status].wrap}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{STATUS_STYLES[result.status].icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-sm">{STATUS_STYLES[result.status].label}</p>
                      <Badge variant="outline" className="text-[10px] border-current py-0">
                        {result.country}
                      </Badge>
                      {result.status !== "eligible" && (
                        <Badge variant="outline" className="text-[10px] border-current py-0">
                          {result.category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs mt-1 opacity-90">{result.reason}</p>
                  </div>
                </div>
              </div>
            ) : showNoMatch ? (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                No country matched “{debounced}”. Try the full country name.
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground">
                Type at least 2 characters and choose your country from the suggestions to see eligibility.
              </div>
            )}
          </div>

          {/* Compact counts overview LAST */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1 text-xs">
              <XCircle className="w-3.5 h-3.5 text-destructive" />
              <span className="text-destructive font-semibold">{counts.blocked}</span>
              <span className="text-muted-foreground">Blocked</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/5 px-3 py-1 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-amber-600 dark:text-amber-400 font-semibold">{counts.review}</span>
              <span className="text-muted-foreground">Review</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">190+</span>
              <span className="text-muted-foreground">Eligible</span>
            </span>
            <span className="text-[11px] text-muted-foreground ml-1">
              · Indicative check showing where Dynime can offer services, software & partnerships.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CountryEligibilityChecker;
