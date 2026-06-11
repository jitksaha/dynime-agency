import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { 
  Code2, Sparkles, Terminal, FileText, Database, Shield, Globe, 
  TrendingUp, CreditCard, ShoppingCart, Percent, Laptop, Search, 
  Share2, Award, Zap, HelpCircle, Activity, Play, CheckCircle2,
  Lock, Check, ArrowRight, UserCheck
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
  const springConfig = { damping: 28, stiffness: 100, mass: 0.6 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);
  
  // 3D rotation transforms for the base card grid container
  const rotateX = useTransform(smoothMouseY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(smoothMouseX, [-0.5, 0.5], [-12, 12]);

  // Layered translation transforms for parallax depth
  const depthFarX = useTransform(smoothMouseX, [-0.5, 0.5], [-12, 12]);
  const depthFarY = useTransform(smoothMouseY, [-0.5, 0.5], [-12, 12]);
  
  const depthMidX = useTransform(smoothMouseX, [-0.5, 0.5], [-24, 24]);
  const depthMidY = useTransform(smoothMouseY, [-0.5, 0.5], [-24, 24]);
  
  const depthCloseX = useTransform(smoothMouseX, [-0.5, 0.5], [-40, 40]);
  const depthCloseY = useTransform(smoothMouseY, [-0.5, 0.5], [-40, 40]);

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
      className="relative w-full h-[450px] md:h-[500px] lg:h-[560px] flex items-center justify-center select-none"
      style={{ perspective: 1200 }}
    >
      {/* Dynamic colorful ambient glow orbs in the background */}
      <div className="absolute inset-0 flex items-center justify-center -z-10 pointer-events-none">
        <div className="w-[320px] h-[320px] md:w-[420px] md:h-[420px] rounded-full bg-gradient-to-tr from-primary/30 to-indigo-500/20 blur-[90px] animate-pulse duration-[8000ms] absolute -top-10 -right-10" />
        <div className="w-[280px] h-[280px] rounded-full bg-gradient-to-br from-fuchsia-500/10 to-violet-500/20 blur-[80px] absolute -bottom-10 -left-10" />
      </div>

      {/* Main 3D Card Stage Container - no border/background constraints, elements float freely */}
      <motion.div 
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative w-full max-w-[500px] h-full flex items-center justify-center"
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
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layer 1: Background Monthly Sales Graph Card (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-4 left-2 w-[280px] p-4 rounded-2xl border border-white/10 dark:border-white/5 bg-background/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-lg space-y-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Monthly Growth</span>
              <span className="text-xs font-bold text-emerald-500">+124.5%</span>
            </div>
            <div className="text-2xl font-extrabold text-foreground font-heading">$84,392.50</div>
            {/* Minimalist smooth graphic path representation */}
            <div className="h-14 flex items-end gap-1">
              {[20, 30, 25, 45, 38, 55, 48, 70, 65, 80, 75, 95].map((h, idx) => (
                <div 
                  key={idx} 
                  className="flex-1 rounded-t bg-gradient-to-t from-primary/30 to-primary/80"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </motion.div>

          {/* Layer 2: Premium Phone Checkout Mockup Card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[210px] aspect-[1/2] rounded-[36px] border-[5px] border-zinc-800 bg-zinc-950 shadow-2xl p-4 flex flex-col justify-between overflow-hidden"
          >
            {/* Phone notch */}
            <div className="w-20 h-4 bg-zinc-800 rounded-full mx-auto -mt-2 mb-2 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
            </div>

            {/* Mock Checkout content */}
            <div className="flex-1 flex flex-col justify-between pt-2">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] text-zinc-400">
                  <span>Pay Dynime</span>
                  <span>Invoice #1029</span>
                </div>
                <div className="text-center py-2 bg-zinc-900/50 rounded-xl border border-zinc-800/80">
                  <div className="text-[9px] text-zinc-400">Total Due</div>
                  <div className="text-lg font-bold text-white tracking-tight">$1,299.00</div>
                </div>
                {/* Visual product list */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-1.5 rounded bg-zinc-900/30 border border-zinc-800/40">
                    <div className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center"><ShoppingCart className="w-3.5 h-3.5 text-zinc-300" /></div>
                    <div className="flex-1 min-w-0"><div className="text-[9px] font-bold text-white truncate">Enterprise Store Setup</div></div>
                  </div>
                </div>
              </div>

              {/* Secure Checkout Pay Button */}
              <div className="space-y-2 pb-1">
                <div className="w-full h-8 rounded-xl bg-primary hover:bg-primary/90 text-white text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-lg shadow-primary/20">
                  <Lock className="w-3 h-3" /> Pay with Stripe
                </div>
                <div className="text-center text-[8px] text-zinc-500">Secure 256-bit encryption</div>
              </div>
            </div>
          </motion.div>

          {/* Layer 3: Floating Success Bubble Card (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 100 }}
            className="absolute bottom-16 left-6 p-4 rounded-2xl border border-emerald-500/20 bg-background/90 backdrop-blur-xl shadow-2xl flex items-center gap-3.5"
          >
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[12px] font-bold text-foreground leading-none">Order Completed</div>
              <div className="text-[10px] text-muted-foreground mt-1">Transaction settled via Stripe gateway</div>
            </div>
          </motion.div>
        </div>
      );

    case "dms": // ══════════════ MARKETING SERVICES (DMS) ══════════════
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layer 1: Huge Search Console Rank (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-4 right-2 w-[260px] p-4 rounded-2xl border border-white/10 dark:border-white/5 bg-background/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-lg space-y-3"
          >
            <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <span>Google Rank Metrics</span>
              <Search className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-3xl font-extrabold text-foreground font-heading tracking-tight">Top #1 Rank</div>
            <div className="text-[10px] text-muted-foreground">SEO optimization for 2,400+ targeted keywords</div>
          </motion.div>

          {/* Layer 2: Main Traffic Dashboard Card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 35 }}
            className="absolute top-28 left-2 w-[300px] p-4 rounded-2xl border border-white/20 bg-background/80 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Growth Funnel</span>
                <h3 className="text-lg font-extrabold text-foreground mt-0.5">+480% Sessions</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-[9px] font-bold text-emerald-500 border border-emerald-500/20">LIVE DATA</span>
            </div>
            
            {/* Visual Analytics graph grid layout */}
            <div className="space-y-3">
              <div className="h-16 flex items-end gap-1 bg-muted/20 rounded-lg p-2 border border-border/10">
                {[15, 30, 20, 40, 35, 60, 50, 80, 65, 90].map((h, idx) => (
                  <div 
                    key={idx} 
                    className="flex-1 rounded-sm bg-gradient-to-t from-primary/50 to-primary"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                <span>JAN</span>
                <span>APR</span>
                <span>JUN</span>
              </div>
            </div>
          </motion.div>

          {/* Layer 3: Ads Return on Investment Badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 95 }}
            className="absolute bottom-12 right-2 w-[180px] p-4 rounded-2xl border border-primary/20 bg-primary/10 backdrop-blur-xl shadow-2xl space-y-1"
          >
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Performance Ads</div>
            <div className="text-xl font-heading font-extrabold text-foreground tracking-tight">6.8x ROAS</div>
            <div className="text-[9px] text-muted-foreground mt-1">Facebook & Google ads campaign structure</div>
          </motion.div>
        </div>
      );

    case "dss": // ══════════════ SOFTWARE & AI (DSS) ══════════════
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layer 1: Code Terminal Log Card (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -25 }}
            className="absolute top-4 left-2 right-2 rounded-2xl border border-white/10 bg-zinc-950/80 shadow-lg overflow-hidden font-mono"
          >
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              <span className="text-[10px] text-white/40 ml-2">ai_automated_qa.sh</span>
            </div>
            <div className="p-4 text-[10px] text-emerald-400 space-y-1.5 leading-relaxed">
              <div><span className="text-indigo-400">$</span> npm run test:ai-agents</div>
              <div className="text-white/60">&gt; Starting automated QA execution loops...</div>
              <div><span className="text-white/30">L12:</span> Testing endpoints /api/v1/auth/register [OK]</div>
              <div><span className="text-white/30">L24:</span> Asserting token verification payloads [OK]</div>
              <div className="text-amber-400">&gt; Process finished successfully (built in 1.48s)</div>
            </div>
          </motion.div>

          {/* Layer 2: Main AI Neural Nodes Connection Card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-36 left-4 right-4 p-4 rounded-2xl border border-white/20 bg-background/85 shadow-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-primary/20 animate-pulse">
                <Sparkles className="w-5 h-5 animate-spin duration-[8000ms]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">AI Automation Workflow</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Connecting LLMs & API routers</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-[9px] font-bold text-primary">DEPLOYED</span>
          </motion.div>

          {/* Layer 3: Terminal Output Capsule (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-16 right-6 p-4 rounded-xl border border-primary/20 bg-primary/15 backdrop-blur-xl shadow-xl flex items-center gap-3"
          >
            <Activity className="w-4.5 h-4.5 text-primary animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider font-mono uppercase text-foreground">Pipeline Status: 200 OK</span>
          </motion.div>
        </div>
      );

    case "dcs": // ══════════════ CONSULTANCY SERVICES (DCS) ══════════════
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layer 1: Corporate Incorporation Certificate (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-4 left-4 right-4 p-4 rounded-2xl border border-white/10 dark:border-white/5 bg-background/40 dark:bg-zinc-900/40 backdrop-blur-xl shadow-lg space-y-3"
          >
            <div className="flex justify-between items-center border-b border-border/20 pb-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">UK Registrar of Companies</span>
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold">Dynime Enterprise Group Ltd.</h4>
              <p className="text-[9px] text-muted-foreground font-mono">Incorporated in England and Wales under Company No. 14829384</p>
            </div>
          </motion.div>

          {/* Layer 2: Premium Dark Glassmorphism Bank Card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 45 }}
            className="absolute top-28 left-4 w-[280px] aspect-[1.58/1] rounded-2xl border border-white/30 dark:border-white/10 bg-gradient-to-tr from-white/10 via-white/5 to-white/0 dark:from-white/[0.06] dark:via-white/[0.02] dark:to-transparent backdrop-blur-2xl shadow-2xl p-5 flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-indigo-500/10 pointer-events-none" />
            
            <div className="flex justify-between items-start relative z-10">
              <CreditCard className="w-8 h-8 text-white/80" />
              <span className="text-[9px] font-bold text-white/40 tracking-wider">BUSINESS DEBIT</span>
            </div>
            
            <div className="space-y-2 relative z-10">
              <div className="text-sm font-mono text-white/90 tracking-widest">•••• •••• •••• 9284</div>
              <div className="flex justify-between items-center text-[9px] uppercase text-white/60 tracking-wider">
                <span>Dynime Inc.</span>
                <span>EXP: 12/30</span>
              </div>
            </div>
          </motion.div>

          {/* Layer 3: Compliance Checklist Card (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 95 }}
            className="absolute bottom-16 right-4 p-4 rounded-xl border border-emerald-500/20 bg-background/90 backdrop-blur-xl shadow-2xl flex items-center gap-3"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 border border-emerald-500/25">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-foreground">Compliance Approved</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">IRS EIN & banking setup ready</div>
            </div>
          </motion.div>
        </div>
      );

    case "os": // ══════════════ DYNIME OS (Homepage OS Slide Visual) ══════════════
    case "dbm":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layer 1: Main Platform UI mock (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -25 }}
            className="absolute top-4 left-4 right-4 p-4 rounded-2xl border border-white/10 dark:border-white/5 bg-background/40 dark:bg-zinc-900/40 backdrop-blur-xl shadow-lg space-y-3"
          >
            <div className="flex justify-between items-center border-b border-border/20 pb-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Operating System Dashboard</span>
              <Activity className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <div className="grid grid-cols-3 gap-2 py-1">
              {["CRM Status", "Monthly Target", "Server Load"].map((label, idx) => (
                <div key={idx} className="p-2 rounded bg-muted/40 border border-border/10">
                  <div className="text-[8px] text-muted-foreground leading-none">{label}</div>
                  <div className="text-xs font-bold text-foreground mt-1">{idx === 0 ? "99.8%" : idx === 1 ? "$12K" : "14ms"}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Layer 2: Global Database Sync Node Card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-32 left-2 w-[280px] p-4 rounded-2xl border border-white/20 bg-background/80 shadow-2xl space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center text-primary">
                <Globe className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold">Node Replication Sync</h4>
                <p className="text-[9px] text-muted-foreground">Active nodes spanning 25+ countries</p>
              </div>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-border/15">
              <span className="text-[8px] text-muted-foreground font-mono">Sync latency: 12ms</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[8px] font-bold text-emerald-500">OPERATIONAL</span>
            </div>
          </motion.div>

          {/* Layer 3: Pulse Trigger Action Card (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-16 right-4 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-xl shadow-xl flex items-center gap-3"
          >
            <div className="relative w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-primary/45 animate-ping" />
              <Play className="w-2.5 h-2.5 text-primary-foreground fill-current ml-0.5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-foreground">Trigger Automated CRM</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">Executes AI outreach sequence</div>
            </div>
          </motion.div>
        </div>
      );

    case "dws": // ══════════════ WEB SERVICES (Default) (DWS) ══════════════
    default:
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layer 1: Code editor window mockup (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -25 }}
            className="absolute top-4 right-2 w-[280px] rounded-2xl border border-white/10 bg-zinc-950/85 shadow-lg overflow-hidden font-mono"
          >
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5 bg-white/[0.02]">
              <div className="w-2 h-2 rounded-full bg-red-500/50" />
              <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
              <div className="w-2 h-2 rounded-full bg-green-500/50" />
              <span className="text-[9px] text-white/40 ml-2">App.tsx</span>
            </div>
            <div className="p-3.5 text-[10px] text-indigo-300 space-y-1.5 leading-relaxed">
              <div><span className="text-purple-400">const</span> DynimeWeb = () =&gt; &#123;</div>
              <div className="pl-3"><span className="text-purple-400">const</span> speed = usePageSpeed();</div>
              <div className="pl-3 text-emerald-400">return &lt;<span className="text-amber-300">FastLoad</span> score=&#123;99&#125; /&gt;</div>
              <div>&#125;;</div>
            </div>
          </motion.div>

          {/* Layer 2: Main Floating Browser Window (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 35 }}
            className="absolute top-24 left-2 w-[340px] rounded-2xl border border-white/20 bg-background/80 shadow-2xl overflow-hidden"
          >
            <div className="px-3.5 py-2.5 border-b border-border/20 bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] font-mono text-muted-foreground bg-border/40 px-2.5 py-0.5 rounded-full">dynime.com</span>
              </div>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-border" />
                <div className="w-1.5 h-1.5 rounded-full bg-border" />
                <div className="w-1.5 h-1.5 rounded-full bg-border" />
              </div>
            </div>
            
            {/* Visual SaaS Website content layout */}
            <div className="p-4 space-y-3">
              <div className="h-4 w-[60%] rounded bg-primary/20" />
              <div className="space-y-2">
                <div className="h-2.5 w-[95%] rounded bg-muted" />
                <div className="h-2.5 w-[80%] rounded bg-muted" />
                <div className="h-2.5 w-[45%] rounded bg-muted" />
              </div>
              <div className="pt-2 flex gap-2">
                <div className="h-7 w-20 rounded bg-primary/80" />
                <div className="h-7 w-24 rounded bg-muted/60" />
              </div>
            </div>
          </motion.div>

          {/* Layer 3: Database & Speed Score status card (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-16 right-2 w-[160px] p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-xl shadow-xl space-y-1.5"
          >
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">PageSpeed</span>
              <Zap className="w-4 h-4 text-primary animate-bounce" />
            </div>
            <div className="text-2xl font-extrabold text-foreground font-heading">99 / 100</div>
            <div className="text-[8px] text-muted-foreground">Mobile & desktop optimized</div>
          </motion.div>
        </div>
      );
  }
}
