import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { 
  Code2, Sparkles, Terminal, FileText, Database, Shield, Globe, 
  TrendingUp, CreditCard, ShoppingCart, Percent, Laptop, Search, 
  Share2, Award, Zap, HelpCircle, Activity, Play, CheckCircle2,
  Lock, Check, ArrowRight, UserCheck, Smartphone, Layers, Server
} from "lucide-react";

interface InteractiveHeroVisualProps {
  category?: string;
  slug?: string;
}

export default function InteractiveHeroVisual({ category, slug }: InteractiveHeroVisualProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Mouse coordinates motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Spring configuration for ultra-smooth responsiveness
  const springConfig = { damping: 25, stiffness: 80, mass: 0.6 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);
  
  // 3D rotation transforms for the base card grid container
  const rotateX = useTransform(smoothMouseY, [-0.5, 0.5], [12, -12]);
  const rotateY = useTransform(smoothMouseX, [-0.5, 0.5], [-15, 15]);

  // Layered translation transforms for parallax depth
  const depthFarX = useTransform(smoothMouseX, [-0.5, 0.5], [-20, 20]);
  const depthFarY = useTransform(smoothMouseY, [-0.5, 0.5], [-20, 20]);
  
  const depthMidX = useTransform(smoothMouseX, [-0.5, 0.5], [-40, 40]);
  const depthMidY = useTransform(smoothMouseY, [-0.5, 0.5], [-40, 40]);
  
  const depthCloseX = useTransform(smoothMouseX, [-0.5, 0.5], [-65, 65]);
  const depthCloseY = useTransform(smoothMouseY, [-0.5, 0.5], [-65, 65]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      
      // Calculate normalized cursor offset from center (-0.5 to 0.5)
      const relativeX = (e.clientX - rect.left) / width - 0.5;
      const relativeY = (e.clientY - rect.top) / height - 0.5;
      
      mouseX.set(relativeX);
      mouseY.set(relativeY);
    };
    
    const handleMouseLeave = () => {
      mouseX.set(0);
      mouseY.set(0);
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseleave", handleMouseLeave);
    }
    
    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [mouseX, mouseY]);

  // Determine active visual layout key based on category or slug
  const activeKey = slug ? getCategoryFromSlug(slug) : (category || "dws").toLowerCase();

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[500px] md:h-[580px] lg:h-[660px] flex items-center justify-center select-none overflow-visible"
      style={{ perspective: 1400 }}
    >
      {/* Dynamic colorful ambient glow orbs in the background */}
      <div className="absolute inset-0 flex items-center justify-center -z-10 pointer-events-none overflow-visible">
        <div className="w-[450px] h-[450px] md:w-[600px] md:h-[600px] rounded-full bg-gradient-to-tr from-primary/30 to-indigo-500/20 blur-[120px] animate-pulse duration-[8000ms] absolute -top-20 -right-20" />
        <div className="w-[350px] h-[350px] rounded-full bg-gradient-to-br from-fuchsia-500/10 to-violet-500/20 blur-[100px] absolute -bottom-20 -left-20" />
      </div>

      {/* Main 3D Card Stage Container - no border/background constraints, elements float freely */}
      <motion.div 
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative w-full max-w-[600px] h-full flex items-center justify-center overflow-visible"
      >
        {renderVisualContent(activeKey, { depthFarX, depthFarY, depthMidX, depthMidY, depthCloseX, depthCloseY })}
      </motion.div>
    </div>
  );
}

// Map slugs to category identifiers
function getCategoryFromSlug(slug: string): string {
  if (["web-design-development", "wordpress-woocommerce", "react-mern-apps", "ui-ux-design", "maintenance-security", "website-redesign", "shopify", "saas-development", "webflow-development", "speed-optimization"].includes(slug)) {
    return "dws";
  }
  if (["shopify-ecommerce", "wordpress-ecommerce", "nodejs-mern-ecommerce", "laravel-ecommerce"].includes(slug)) {
    return "des";
  }
  if (["social-media", "facebook-ads", "google-ads", "seo", "brand-strategy", "content-marketing", "email-marketing", "analytics"].includes(slug)) {
    return "dms";
  }
  if (["ai-software-development", "custom-software-development", "software-built-with-ai", "software-testing-qa", "pay-open-source"].includes(slug)) {
    return "dss";
  }
  if (["us-company", "uk-company", "virtual-address", "itin-services", "dropshipping-solution", "marketplace-solution", "payment-gateway", "consulting"].includes(slug)) {
    return "dcs";
  }
  return "dws";
}

// Render dynamic elements based on selected category key
function renderVisualContent(key: string, transforms: any) {
  const { depthFarX, depthFarY, depthMidX, depthMidY, depthCloseX, depthCloseY } = transforms;

  switch (key) {
    case "des": // ══════════════ ECOMMERCE SOLUTION (DES) ══════════════
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layer 1: Background Monthly Sales Graph Card (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[350px] md:w-[380px] p-5 rounded-2xl border border-white/10 dark:border-white/5 bg-background/60 dark:bg-zinc-900/60 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] space-y-4"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Monthly Revenue Growth</span>
              <span className="text-xs sm:text-sm font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> +142.8%
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-foreground font-heading">$124,892.50</div>
            {/* Minimalist smooth graphic path representation */}
            <div className="h-24 flex items-end gap-1.5 pt-2">
              {[15, 25, 20, 38, 30, 48, 42, 65, 58, 80, 72, 95].map((h, idx) => (
                <div 
                  key={idx} 
                  className="flex-1 rounded-t-md bg-gradient-to-t from-primary/30 via-primary/80 to-primary transition-all duration-500 hover:opacity-80"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </motion.div>

          {/* Layer 2: Premium Phone Checkout Mockup Card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[240px] md:w-[260px] aspect-[1/2] rounded-[48px] border-[8px] border-zinc-800 bg-zinc-950 shadow-[0_30px_70px_rgba(0,0,0,0.3)] p-5 flex flex-col justify-between overflow-hidden"
          >
            {/* Phone notch / Dynamic Island */}
            <div className="w-24 h-5 bg-zinc-800 rounded-full mx-auto -mt-2 mb-3 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-zinc-950" />
            </div>

            {/* Mock Checkout content */}
            <div className="flex-1 flex flex-col justify-between pt-2">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] text-zinc-400 font-medium">
                  <span>Pay Dynime</span>
                  <span>Invoice #2804</span>
                </div>
                <div className="text-center py-3.5 bg-zinc-900/60 rounded-2xl border border-zinc-800/80 shadow-inner">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Total Due</div>
                  <div className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">$2,499.00</div>
                </div>
                {/* Visual product list */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-900/40 border border-zinc-800/40">
                    <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center"><ShoppingCart className="w-4 h-4 text-zinc-200" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-white truncate">Enterprise Store Setup</div>
                      <div className="text-[8px] text-zinc-500 font-mono">1x · Premium Lic.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secure Checkout Pay Button */}
              <div className="space-y-3 pb-2">
                <div className="w-full h-11 rounded-2xl bg-primary hover:bg-primary/90 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98] shadow-lg shadow-primary/30">
                  <Lock className="w-3.5 h-3.5" /> Pay with Stripe
                </div>
                <div className="text-center text-[9px] text-zinc-500 font-semibold tracking-wider uppercase">Secure 256-bit encryption</div>
              </div>
            </div>
          </motion.div>

          {/* Layer 3: Floating Success Bubble Card (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 120 }}
            className="absolute bottom-16 left-4 md:left-8 p-5 rounded-2xl border border-emerald-500/30 bg-background/90 dark:bg-zinc-900/90 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.25)] flex items-center gap-4 border-l-[6px] border-l-emerald-500"
          >
            <div className="w-11 h-11 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-foreground leading-none">Order Completed</div>
              <div className="text-xs text-muted-foreground mt-1.5 font-medium">Transaction settled via Stripe gateway</div>
            </div>
          </motion.div>
        </div>
      );

    case "dms": // ══════════════ MARKETING SERVICES (DMS) ══════════════
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layer 1: Huge Search Console Rank (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-10 right-4 w-[320px] md:w-[350px] p-5 rounded-2xl border border-white/10 dark:border-white/5 bg-background/60 dark:bg-zinc-900/60 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] space-y-3.5"
          >
            <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
              <span>Google Rank Metrics</span>
              <Search className="w-4 h-4 text-primary" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-foreground font-heading tracking-tight">Top #1 Rank</div>
            <div className="text-xs text-muted-foreground font-medium leading-relaxed">SEO optimization for 4,800+ high-traffic targeted keywords</div>
          </motion.div>

          {/* Layer 2: Main Traffic Dashboard Card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 45 }}
            className="absolute top-36 left-0 w-[340px] md:w-[380px] p-5 rounded-2xl border border-white/20 bg-background/80 dark:bg-zinc-900/80 shadow-[0_30px_70px_rgba(0,0,0,0.25)] space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Growth Funnel</span>
                <h3 className="text-xl font-extrabold text-foreground mt-1">+540% Sessions</h3>
              </div>
              <span className="px-3 py-1 rounded bg-emerald-500/10 text-xs font-bold text-emerald-500 border border-emerald-500/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> LIVE DATA
              </span>
            </div>
            
            {/* Visual Analytics graph grid layout */}
            <div className="space-y-4">
              <div className="h-24 flex items-end gap-1.5 bg-muted/20 rounded-xl p-3 border border-border/10">
                {[15, 30, 20, 48, 35, 68, 50, 85, 65, 95].map((h, idx) => (
                  <div 
                    key={idx} 
                    className="flex-1 rounded-md bg-gradient-to-t from-primary/50 to-primary transition-all duration-300 hover:opacity-80"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground font-mono font-semibold">
                <span>JAN</span>
                <span>APR</span>
                <span>JUN</span>
              </div>
            </div>
          </motion.div>

          {/* Layer 3: Ads Return on Investment Badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 110 }}
            className="absolute bottom-16 right-0 w-[220px] md:w-[240px] p-5 rounded-2xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.2)] space-y-2 border-l-[6px] border-l-primary"
          >
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Performance Ads</div>
            <div className="text-2xl font-heading font-extrabold text-foreground tracking-tight">8.4x ROAS</div>
            <div className="text-xs text-muted-foreground font-medium mt-1 leading-relaxed">Facebook & Google campaign architecture structured for scaling</div>
          </motion.div>
        </div>
      );

    case "dss": // ══════════════ SOFTWARE & AI (DSS) ══════════════
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layer 1: Code Terminal Log Card (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -40 }}
            className="absolute top-10 left-4 right-4 w-[420px] md:w-[460px] rounded-2xl border border-white/10 bg-zinc-950/90 shadow-[0_20px_50px_rgba(0,0,0,0.25)] overflow-hidden font-mono"
          >
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-white/[0.03]">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="text-xs text-white/40 ml-2">ai_automated_qa.sh</span>
            </div>
            <div className="p-5 text-xs text-emerald-400 space-y-2.5 leading-relaxed">
              <div><span className="text-indigo-400">$</span> npm run test:ai-agents</div>
              <div className="text-white/60">&gt; Starting automated QA execution loops...</div>
              <div><span className="text-white/30">L12:</span> Testing endpoints /api/v1/auth/register [OK]</div>
              <div><span className="text-white/30">L24:</span> Asserting token verification payloads [OK]</div>
              <div><span className="text-white/30">L36:</span> Multi-agent concurrency safety check [PASS]</div>
              <div className="text-amber-400">&gt; Process finished successfully (built in 1.48s)</div>
            </div>
          </motion.div>

          {/* Layer 2: Main AI Neural Nodes Connection Card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-48 left-2 right-2 w-[380px] md:w-[420px] p-5 rounded-2xl border border-white/20 bg-background/90 dark:bg-zinc-900/90 shadow-[0_30px_70px_rgba(0,0,0,0.25)] flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-primary/20 animate-pulse">
                <Sparkles className="w-6 h-6 animate-spin duration-[8000ms]" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-foreground">AI Automation Pipeline</h4>
                <p className="text-xs text-muted-foreground mt-1 font-medium">Connecting LLMs, Vector DBs & API routers</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-primary/10 text-[10px] font-bold text-primary border border-primary/20">DEPLOYED</span>
          </motion.div>

          {/* Layer 3: Terminal Output Capsule (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 100 }}
            className="absolute bottom-16 right-4 p-5 rounded-2xl border border-primary/20 bg-primary/15 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.2)] flex items-center gap-3.5"
          >
            <Activity className="w-5.5 h-5.5 text-primary animate-pulse" />
            <span className="text-xs font-bold tracking-widest font-mono uppercase text-foreground">Pipeline Status: 200 OK</span>
          </motion.div>
        </div>
      );

    case "dcs": // ══════════════ CONSULTANCY SERVICES (DCS) ══════════════
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layer 1: Corporate Incorporation Certificate (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -45 }}
            className="absolute top-8 left-4 right-4 w-[400px] md:w-[440px] p-5 rounded-2xl border border-white/10 dark:border-white/5 bg-background/50 dark:bg-zinc-900/50 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] space-y-4"
          >
            <div className="flex justify-between items-center border-b border-border/20 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">UK Registrar of Companies</span>
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-extrabold">Dynime Enterprise Group Ltd.</h4>
              <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">Incorporated in England and Wales under Company No. 14829384 · Registered Legal Structure</p>
            </div>
          </motion.div>

          {/* Layer 2: Premium Dark Glassmorphism Bank Card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 55 }}
            className="absolute top-36 left-2 w-[300px] md:w-[330px] aspect-[1.58/1] rounded-[24px] border border-white/30 dark:border-white/10 bg-gradient-to-tr from-white/10 via-white/5 to-white/0 dark:from-white/[0.08] dark:via-white/[0.03] dark:to-transparent backdrop-blur-2xl shadow-[0_30px_70px_rgba(0,0,0,0.35)] p-6 flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-indigo-500/10 pointer-events-none" />
            
            <div className="flex justify-between items-start relative z-10">
              <CreditCard className="w-9 h-9 text-white/80" />
              <span className="text-[10px] font-bold text-white/40 tracking-widest">BUSINESS DEBIT</span>
            </div>
            
            <div className="space-y-2.5 relative z-10">
              <div className="text-base sm:text-lg font-mono text-white/95 tracking-widest">•••• •••• •••• 9284</div>
              <div className="flex justify-between items-center text-[10px] uppercase text-white/60 tracking-wider font-semibold">
                <span>Dynime Inc.</span>
                <span>EXP: 12/30</span>
              </div>
            </div>
          </motion.div>

          {/* Layer 3: Compliance Checklist Card (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 110 }}
            className="absolute bottom-16 right-2 p-5 rounded-2xl border border-emerald-500/20 bg-background/90 dark:bg-zinc-900/90 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.25)] flex items-center gap-4 border-l-[6px] border-l-emerald-500"
          >
            <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 border border-emerald-500/25">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-foreground">Compliance Approved</div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">IRS EIN, Corporate Bank & gateway ready</div>
            </div>
          </motion.div>
        </div>
      );

    case "os": // ══════════════ DYNIME OS (Homepage OS Slide Visual) ══════════════
    case "dbm":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layer 1: Main Platform UI mock (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -35 }}
            className="absolute top-8 left-4 right-4 w-[420px] md:w-[460px] p-5 rounded-2xl border border-white/10 dark:border-white/5 bg-background/50 dark:bg-zinc-900/50 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] space-y-4"
          >
            <div className="flex justify-between items-center border-b border-border/20 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Operating System Dashboard</span>
              <Activity className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div className="grid grid-cols-3 gap-3 py-1">
              {[
                { label: "CRM System", val: "99.9% Sync" },
                { label: "Revenue Target", val: "105% Achieved" },
                { label: "Engine Load", val: "8ms Latency" }
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-muted/40 border border-border/10">
                  <div className="text-[9px] font-bold text-muted-foreground leading-none uppercase tracking-wider">{item.label}</div>
                  <div className="text-xs sm:text-sm font-extrabold text-foreground mt-2">{item.val}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Layer 2: Global Database Sync Node Card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-44 left-0 w-[320px] md:w-[350px] p-5 rounded-2xl border border-white/20 bg-background/80 dark:bg-zinc-900/80 shadow-[0_30px_70px_rgba(0,0,0,0.25)] space-y-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Globe className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold">Active Nodes Registry</h4>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Automated synchronization across 35 countries</p>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2.5 border-t border-border/15">
              <span className="text-[10px] text-muted-foreground font-mono font-semibold">Node latency: 12ms avg</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-[9px] font-bold text-emerald-500 border border-emerald-500/20">OPERATIONAL</span>
            </div>
          </motion.div>

          {/* Layer 3: Pulse Trigger Action Card (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 right-2 p-5 rounded-2xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.2)] flex items-center gap-4 border-l-[6px] border-l-primary"
          >
            <div className="relative w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
              <div className="absolute inset-0 rounded-full bg-primary/45 animate-ping" />
              <Play className="w-3 h-3 text-primary-foreground fill-current ml-0.5" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-foreground">Trigger Automated CRM</div>
              <div className="text-[10px] text-muted-foreground mt-1 font-medium">Executes multi-channel outbound workflow</div>
            </div>
          </motion.div>
        </div>
      );

    case "dws": // ══════════════ WEB SERVICES (Default) (DWS) ══════════════
    default:
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layer 1: Code editor window mockup (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -35 }}
            className="absolute top-10 right-0 w-[320px] md:w-[350px] rounded-2xl border border-white/10 bg-zinc-950/90 shadow-[0_20px_50px_rgba(0,0,0,0.25)] overflow-hidden font-mono"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-white/[0.03]">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              <span className="text-[10px] text-white/40 ml-2 font-medium">App.tsx</span>
            </div>
            <div className="p-4.5 text-xs text-indigo-300 space-y-2 leading-relaxed">
              <div><span className="text-purple-400">const</span> DynimeWeb = () =&gt; &#123;</div>
              <div className="pl-4"><span className="text-purple-400">const</span> speed = usePageSpeed();</div>
              <div className="pl-4 text-emerald-400">return &lt;<span className="text-amber-300">FastLoad</span> score=&#123;99&#125; /&gt;</div>
              <div>&#125;;</div>
            </div>
          </motion.div>

          {/* Layer 2: Main Floating Browser Window (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-32 left-0 w-[380px] md:w-[420px] rounded-2xl border border-white/20 bg-background/80 dark:bg-zinc-900/80 shadow-[0_30px_70px_rgba(0,0,0,0.25)] overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-border/20 bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-4.5 h-4.5 text-muted-foreground" />
                <span className="text-xs font-semibold font-mono text-muted-foreground bg-border/40 px-3 py-0.5 rounded-full">dynime.com</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-border" />
                <div className="w-2 h-2 rounded-full bg-border" />
                <div className="w-2 h-2 rounded-full bg-border" />
              </div>
            </div>
            
            {/* Visual SaaS Website content layout */}
            <div className="p-5 space-y-4">
              <div className="h-5 w-[65%] rounded-md bg-primary/20" />
              <div className="space-y-2.5">
                <div className="h-3 w-[95%] rounded bg-muted" />
                <div className="h-3 w-[85%] rounded bg-muted" />
                <div className="h-3 w-[45%] rounded bg-muted" />
              </div>
              <div className="pt-3 flex gap-3">
                <div className="h-9 w-24 rounded-xl bg-primary/90" />
                <div className="h-9 w-28 rounded-xl bg-muted" />
              </div>
            </div>
          </motion.div>

          {/* Layer 3: Database & Speed Score status card (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 right-0 w-[190px] md:w-[210px] p-5 rounded-2xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.2)] space-y-2 border-l-[6px] border-l-primary"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">PageSpeed</span>
              <Zap className="w-5 h-5 text-primary animate-bounce" />
            </div>
            <div className="text-3xl font-black text-foreground font-heading leading-none">99 / 100</div>
            <div className="text-[10px] text-muted-foreground font-medium">Fully optimized for Core Web Vitals</div>
          </motion.div>
        </div>
      );
  }
}
