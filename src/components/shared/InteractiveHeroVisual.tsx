import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { 
  Code2, Sparkles, Terminal, FileText, Database, Shield, Globe, 
  TrendingUp, CreditCard, ShoppingCart, Percent, Laptop, Search, 
  Share2, Award, Zap, HelpCircle, Activity, Play, CheckCircle2
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
  const springConfig = { damping: 25, stiffness: 120, mass: 0.5 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);
  
  // 3D rotation transforms for the base card grid container
  const rotateX = useTransform(smoothMouseY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(smoothMouseX, [-0.5, 0.5], [-12, 12]);

  // Layered translation transforms for parallax depth
  const depthFarX = useTransform(smoothMouseX, [-0.5, 0.5], [-8, 8]);
  const depthFarY = useTransform(smoothMouseY, [-0.5, 0.5], [-8, 8]);
  
  const depthMidX = useTransform(smoothMouseX, [-0.5, 0.5], [-18, 18]);
  const depthMidY = useTransform(smoothMouseY, [-0.5, 0.5], [-18, 18]);
  
  const depthCloseX = useTransform(smoothMouseX, [-0.5, 0.5], [-32, 32]);
  const depthCloseY = useTransform(smoothMouseY, [-0.5, 0.5], [-32, 32]);

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
      className="relative w-full h-[360px] md:h-[420px] lg:h-[480px] flex items-center justify-center select-none"
      style={{ perspective: 1000 }}
    >
      {/* Ambient background glow orb */}
      <div className="absolute inset-0 flex items-center justify-center -z-10 pointer-events-none">
        <div className="w-[280px] h-[280px] md:w-[350px] md:h-[350px] rounded-full bg-gradient-to-tr from-primary/20 to-indigo-500/10 blur-[80px] animate-pulse duration-[6000ms]" />
      </div>

      {/* Main 3D Card Stage Container */}
      <motion.div 
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative w-[85%] max-w-[380px] aspect-square rounded-2xl border border-white/10 dark:border-white/5 bg-gradient-to-b from-white/10 to-white/0 dark:from-white/[0.03] dark:to-transparent backdrop-blur-[4px] shadow-[0_32px_64px_rgba(0,0,0,0.12)] p-6 flex flex-col justify-between overflow-hidden"
      >
        {/* Stage background lines grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
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
    case "des": // ══════════════ ECOMMERCE SOLUTION ══════════════
      return (
        <>
          {/* Layer 1: Base grid and stats (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: 20 }}
            className="absolute top-4 left-4 right-4 p-4 rounded-xl border border-white/10 bg-background/40 backdrop-blur-md shadow-md"
          >
            <div className="flex items-center justify-between border-b border-border/20 pb-2 mb-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Revenue
              </span>
              <span className="text-[11px] font-semibold text-emerald-500 font-mono">+42.8%</span>
            </div>
            <div className="text-xl font-heading font-extrabold text-foreground tracking-tight">$18,492.00</div>
          </motion.div>

          {/* Layer 2: Sneaker Card Preview (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 left-6 w-[200px] rounded-xl border border-white/20 bg-background/80 shadow-2xl p-3 space-y-2.5"
          >
            <div className="relative aspect-video rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-border/30 flex items-center justify-center overflow-hidden">
              <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-primary/10 text-[9px] font-bold text-primary">BESTSELLER</div>
              <Laptop className="w-9 h-9 text-orange-500" />
            </div>
            <div>
              <div className="text-xs font-bold truncate">Premium SaaS Product</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">$99.00 / mo</div>
            </div>
          </motion.div>

          {/* Layer 3: Floating Checkout & Card (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 85 }}
            className="absolute bottom-6 right-6 p-3 rounded-lg border border-primary/20 bg-primary/10 backdrop-blur-xl shadow-xl flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-foreground leading-none">Cart Checkout</div>
              <div className="text-[9px] text-muted-foreground mt-1">1 item added successfully</div>
            </div>
          </motion.div>
        </>
      );

    case "dms": // ══════════════ MARKETING SERVICES ══════════════
      return (
        <>
          {/* Layer 1: Background Analytics Chart (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: 25 }}
            className="absolute top-4 left-4 right-4 p-4 rounded-xl border border-white/10 bg-background/40 backdrop-blur shadow-md"
          >
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">SEO Organic Traffic</div>
            <div className="flex items-end gap-1.5 h-16 mt-3">
              {[30, 45, 35, 60, 50, 75, 90, 85, 110].map((h, i) => (
                <div 
                  key={i} 
                  className="flex-1 rounded-t bg-gradient-to-t from-primary/50 to-primary transition-all duration-300 hover:opacity-80"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </motion.div>

          {/* Layer 2: Ads CTR Card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 60 }}
            className="absolute bottom-20 left-6 p-3.5 rounded-xl border border-white/20 bg-background/80 shadow-2xl space-y-2 w-[160px]"
          >
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
              <span>Google Ads</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">ROAS Metric</div>
              <div className="text-base font-extrabold text-foreground tracking-tight">5.8x CTR</div>
            </div>
          </motion.div>

          {/* Layer 3: Search Engine Rank Badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-8 right-6 p-3 rounded-lg border border-primary/20 bg-primary/10 backdrop-blur-xl shadow-xl flex items-center gap-2"
          >
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Search className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-[11px] font-bold leading-none">Rank #1 Google</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">Optimized dynamically</div>
            </div>
          </motion.div>
        </>
      );

    case "dss": // ══════════════ SOFTWARE & AI ══════════════
      return (
        <>
          {/* Layer 1: Code terminal window (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: 20 }}
            className="absolute top-4 left-4 right-4 rounded-xl border border-white/10 bg-zinc-950/80 shadow-lg overflow-hidden font-mono"
          >
            <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5 bg-white/[0.02]">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              <span className="text-[9px] text-white/40 ml-2">ai_agent.py</span>
            </div>
            <div className="p-3 text-[10px] text-emerald-400 space-y-1">
              <div><span className="text-indigo-400">import</span> openai_agent</div>
              <div>agent = openai_agent.init()</div>
              <div className="text-white/60">&gt; Executing workflow steps...</div>
              <div className="text-amber-400">&gt; Status: 200 OK (0.24s)</div>
            </div>
          </motion.div>

          {/* Layer 2: Floating Node connections (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 55 }}
            className="absolute top-32 right-6 p-3 rounded-xl border border-white/20 bg-background/80 shadow-2xl flex items-center gap-3 w-[180px]"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-indigo-500 flex items-center justify-center text-white shadow-lg animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-foreground">AI Automation Node</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">Active connections</div>
            </div>
          </motion.div>

          {/* Layer 3: Terminal Output Pill (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 85 }}
            className="absolute bottom-6 left-6 p-3 rounded-lg border border-primary/20 bg-primary/10 backdrop-blur-xl shadow-xl flex items-center gap-2"
          >
            <Terminal className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-[10px] font-bold tracking-wider font-mono uppercase text-foreground">Deploy Status: Active</span>
          </motion.div>
        </>
      );

    case "dcs": // ══════════════ CONSULTANCY SERVICES ══════════════
      return (
        <>
          {/* Layer 1: Certificate mock (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: 15 }}
            className="absolute top-4 left-4 right-4 p-4 rounded-xl border border-white/10 bg-background/40 backdrop-blur shadow-md space-y-2"
          >
            <div className="flex justify-between items-center border-b border-border/20 pb-2">
              <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">INCORPORATION CERTIFICATE</div>
              <Shield className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-bold">Dynime Enterprise Ltd.</div>
              <div className="text-[9px] text-muted-foreground font-mono">Company No: #09284729</div>
            </div>
          </motion.div>

          {/* Layer 2: Glass Bank Card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 left-6 w-[220px] aspect-[1.58/1] rounded-xl border border-white/30 bg-gradient-to-tr from-white/10 via-white/5 to-white/0 dark:from-white/[0.05] dark:via-white/[0.02] dark:to-transparent backdrop-blur-xl shadow-2xl p-4 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <CreditCard className="w-7 h-7 text-white/80" />
              <div className="text-[9px] font-bold text-white/50 tracking-wider">BUSINESS</div>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-mono text-white/90 tracking-widest">•••• •••• •••• 9028</div>
              <div className="text-[9px] uppercase text-white/60 tracking-wider">Dynime Inc.</div>
            </div>
          </motion.div>

          {/* Layer 3: Compliance Status Checklist (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 85 }}
            className="absolute bottom-6 right-6 p-3 rounded-lg border border-primary/20 bg-primary/10 backdrop-blur-xl shadow-xl flex items-center gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <div>
              <div className="text-[11px] font-bold leading-none">EIN / VAT Verified</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">Compliant globally</div>
            </div>
          </motion.div>
        </>
      );

    case "os": // ══════════════ DYNIME OS (Homepage OS slide visual) ══════════════
    case "dbm":
      return (
        <>
          {/* Layer 1: Core Analytics Charts (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: 20 }}
            className="absolute top-4 left-4 right-4 p-4 rounded-xl border border-white/10 bg-background/40 backdrop-blur shadow-md"
          >
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Unified Dashboard</span>
              <Activity className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="mt-2 flex gap-3 items-center">
              <div>
                <div className="text-[9px] text-muted-foreground">Active Tasks</div>
                <div className="text-sm font-bold text-foreground">84 / 92</div>
              </div>
              <div className="flex-1 h-2 rounded bg-border/40 overflow-hidden">
                <div className="h-full bg-primary rounded" style={{ width: "88%" }} />
              </div>
            </div>
          </motion.div>

          {/* Layer 2: Interactive Operations Terminal (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 left-6 w-[210px] rounded-xl border border-white/20 bg-background/80 shadow-2xl p-3.5 space-y-3"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-[11px] font-bold">Global Operations</div>
                <div className="text-[9px] text-muted-foreground leading-none">Syncing across nodes</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-mono text-muted-foreground">API Sync: 99.98%</span>
            </div>
          </motion.div>

          {/* Layer 3: Pulse AI Core (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 80 }}
            className="absolute bottom-6 right-6 p-3 rounded-lg border border-primary/20 bg-primary/10 backdrop-blur-xl shadow-xl flex items-center gap-2"
          >
            <div className="relative w-4.5 h-4.5 rounded-full bg-primary flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-primary/45 animate-ping" />
              <Play className="w-2 h-2 text-primary-foreground fill-current ml-0.5" />
            </div>
            <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">Run Automated CRM</span>
          </motion.div>
        </>
      );

    case "dws": // ══════════════ WEB SERVICES (Default) ══════════════
    default:
      return (
        <>
          {/* Layer 1: Code editor window mockup (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: 20 }}
            className="absolute top-4 left-4 right-4 rounded-xl border border-white/10 bg-zinc-950/80 shadow-lg overflow-hidden font-mono"
          >
            <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5 bg-white/[0.02]">
              <div className="w-2 h-2 rounded-full bg-red-500/50" />
              <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
              <div className="w-2 h-2 rounded-full bg-green-500/50" />
              <span className="text-[9px] text-white/40 ml-2">Header.tsx</span>
            </div>
            <div className="p-3 text-[10px] text-indigo-300 space-y-0.5">
              <div><span className="text-purple-400">const</span> Header = () =&gt; &#123;</div>
              <div className="pl-3 text-emerald-400">const [active, setActive] = useState(true);</div>
              <div className="pl-3"><span className="text-purple-400">return</span> ( &lt;<span className="text-amber-300">MegaMenu</span> active=&#123;active&#125; /&gt; )</div>
              <div>&#125;;</div>
            </div>
          </motion.div>

          {/* Layer 2: Floating browser window / mockup (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 left-6 w-[200px] rounded-xl border border-white/20 bg-background/80 shadow-2xl overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-border/20 bg-muted/40 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              <div className="h-3.5 flex-1 rounded bg-border/40 text-[9px] text-muted-foreground px-1.5 truncate flex items-center">dynime.com</div>
            </div>
            <div className="p-3 space-y-2">
              <div className="h-3 w-[70%] rounded bg-primary/20" />
              <div className="h-2 w-[90%] rounded bg-muted" />
              <div className="h-2 w-[40%] rounded bg-muted" />
            </div>
          </motion.div>

          {/* Layer 3: Database & Ping status (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 85 }}
            className="absolute bottom-6 right-6 p-3 rounded-lg border border-primary/20 bg-primary/10 backdrop-blur-xl shadow-xl flex items-center gap-2"
          >
            <Database className="w-4 h-4 text-primary animate-bounce" />
            <span className="text-[10px] font-bold tracking-wider font-mono text-foreground">PING: 14ms (OK)</span>
          </motion.div>
        </>
      );
  }
}
