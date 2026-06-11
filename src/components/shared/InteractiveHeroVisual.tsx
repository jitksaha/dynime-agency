import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { 
  Code2, Sparkles, Terminal, FileText, Database, Shield, Globe, 
  TrendingUp, CreditCard, ShoppingCart, Percent, Laptop, Search, 
  Share2, Award, Zap, HelpCircle, Activity, Play, CheckCircle2,
  Lock, Check, ArrowRight, UserCheck, Smartphone, Layers, Server,
  BarChart3, Megaphone, Palette, Mail, Users2, Eye, ShieldAlert,
  Fingerprint, Briefcase, FileCode, CheckCircle, RefreshCw
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

  // Use slug directly to pick unique visual; fallback to category label
  const activeKey = slug ? slug : (category || "dws").toLowerCase();

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

      {/* Main 3D Card Stage Container - elements float freely with GPU acceleration */}
      <motion.div 
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative w-full max-w-[600px] h-full flex items-center justify-center overflow-visible"
      >
        {renderVisualContent(activeKey, { depthFarX, depthFarY, depthMidX, depthMidY, depthCloseX, depthCloseY })}
      </motion.div>
    </div>
  );
}

// Render dynamic elements based on selected slug or category
function renderVisualContent(key: string, transforms: any) {
  const { depthFarX, depthFarY, depthMidX, depthMidY, depthCloseX, depthCloseY } = transforms;

  switch (key) {
    // ══════════════════════ DWS (WEB SERVICES) SLUGS ══════════════════════
    case "wordpress-design":
    case "web-design-development":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Floating Palette Card (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[300px] p-4 rounded-2xl border border-white/10 dark:border-white/5 bg-background/60 backdrop-blur-2xl shadow-xl space-y-3"
          >
            <div className="flex gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Style System</span>
              <Palette className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary shadow-lg" />
              <div className="w-8 h-8 rounded-full bg-indigo-500 shadow-lg" />
              <div className="w-8 h-8 rounded-full bg-fuchsia-500 shadow-lg" />
              <div className="w-8 h-8 rounded-full bg-sky-500 shadow-lg" />
            </div>
          </motion.div>
          {/* Layout 2: Premium Browser Window with Responsive Layout (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[380px] md:w-[420px] rounded-2xl border border-white/20 bg-background/80 dark:bg-zinc-900/80 shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-border/20 bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold font-mono text-muted-foreground bg-border/40 px-3 py-0.5 rounded-full">wp-designer.app</span>
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                <div className="w-2 h-2 rounded-full bg-green-500/50" />
              </div>
            </div>
            <div className="p-5 space-y-3.5">
              <div className="flex gap-2">
                <div className="h-6 w-20 rounded bg-primary/20" />
                <div className="h-6 w-24 rounded bg-muted/80" />
              </div>
              <div className="h-28 rounded-xl bg-gradient-to-tr from-primary/10 to-indigo-500/5 border border-border/10 flex items-center justify-center">
                <Code2 className="w-10 h-10 text-primary animate-pulse" />
              </div>
            </div>
          </motion.div>
          {/* Layout 3: Custom WordPress badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 110 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center border border-primary/30">
              <Sparkles className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="text-xs font-bold text-foreground">Custom Blocks Ready</div>
          </motion.div>
        </div>
      );

    case "website-redesign":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Old Wireframe (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[320px] p-5 rounded-2xl border border-red-500/20 bg-background/50 backdrop-blur-xl shadow-lg opacity-40"
          >
            <div className="flex justify-between items-center text-[10px] text-red-500 font-mono uppercase font-bold">
              <span>Legacy Website (Slow)</span>
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <div className="h-24 border-2 border-dashed border-red-500/20 rounded-lg mt-3 flex items-center justify-center">
              <span className="text-[10px] text-red-500 font-mono">Bounce Rate 84%</span>
            </div>
          </motion.div>
          {/* Layout 2: Modern Redesigned Mockup (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[380px] md:w-[420px] rounded-2xl border border-emerald-500/20 bg-background/90 shadow-2xl border-t-[8px] border-t-emerald-500 overflow-hidden"
          >
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">NEW CONVERSION SYSTEM</span>
                <span className="text-xs font-black text-foreground font-mono">99% UX Rank</span>
              </div>
              <div className="h-32 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 flex flex-col justify-center px-6 space-y-2.5 border border-emerald-500/10">
                <div className="h-4 w-3/4 rounded bg-emerald-500/20" />
                <div className="h-3 w-1/2 rounded bg-muted" />
                <div className="h-8 w-24 rounded-lg bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">Get Started</div>
              </div>
            </div>
          </motion.div>
          {/* Layout 3: Growth Metric Bubble (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 110 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <div className="text-xs font-bold text-foreground">+310% Lead Conversion</div>
          </motion.div>
        </div>
      );

    case "wordpress-maintenance":
    case "maintenance-security":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Backup Offsite Nodes (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -40 }}
            className="absolute top-10 left-4 w-[320px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              <span>AWS Cloud Backups</span>
              <Database className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-xs font-bold text-foreground">Sync status: Complete (Daily)</div>
          </motion.div>
          {/* Layout 2: Active Security Firewall Monitor (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[360px] p-5 rounded-2xl border border-primary/20 bg-background/85 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">WAF Shield Status</span>
              <Shield className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div className="p-3 bg-muted/40 rounded-xl space-y-2 border border-border/10 font-mono text-[10px] text-emerald-400">
              <div>&gt; Shield Core Activated</div>
              <div>&gt; 0 Malware threats detected</div>
              <div>&gt; SSL handshake secured [SHA-256]</div>
            </div>
          </motion.div>
          {/* Layout 3: Uptime badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-20 left-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <div className="text-xs font-bold text-foreground">Uptime: 99.99%</div>
          </motion.div>
        </div>
      );

    case "speed-optimization":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Asset Compression Monitor (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-2 w-[320px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Image Compression</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Next-Gen WebP format</span>
              <span className="text-emerald-500">-84% size</span>
            </div>
          </motion.div>
          {/* Layout 2: Speed Score Dial (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[350px] p-6 rounded-2xl border border-primary/20 bg-background/85 shadow-2xl flex flex-col items-center space-y-4"
          >
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="hsl(var(--muted))" strokeWidth="6" fill="transparent" />
                <circle cx="50" cy="50" r="40" stroke="hsl(var(--primary))" strokeWidth="8" fill="transparent" strokeDasharray="251" strokeDashoffset="2.5" />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-foreground font-heading">100</span>
                <span className="text-[9px] text-muted-foreground font-bold tracking-widest">MOBILE</span>
              </div>
            </div>
            <div className="text-center font-heading text-sm font-extrabold text-foreground">Core Web Vitals Checked</div>
          </motion.div>
          {/* Layout 3: Rocket Particle badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <Zap className="w-5 h-5 text-primary animate-bounce" />
            <div className="text-xs font-bold text-foreground">Load Time: 0.8s</div>
          </motion.div>
        </div>
      );

    case "woocommerce":
    case "wordpress-woocommerce":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Cart Items Floating (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[280px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <div className="flex justify-between items-center text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
              <span>Woo Cart</span>
              <ShoppingCart className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-xs font-bold text-foreground">Premium Coffee Roast x 2</div>
          </motion.div>
          {/* Layout 2: Invoice checkout panel (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[360px] p-5.5 rounded-2xl border border-white/20 bg-background/80 dark:bg-zinc-900/80 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-border/20 pb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Securing Checkout</span>
              <span className="px-2 py-0.5 bg-indigo-500/10 text-[10px] text-indigo-500 font-bold rounded">WooCommerce</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between font-medium"><span>Subtotal</span><span>$89.00</span></div>
              <div className="flex justify-between font-bold text-emerald-500"><span>Coupon (W20)</span><span>-$17.80</span></div>
              <div className="flex justify-between font-extrabold text-foreground border-t border-border/20 pt-2 text-sm"><span>Total</span><span>$71.20</span></div>
            </div>
            <div className="w-full h-10 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md">
              <Lock className="w-3.5 h-3.5" /> Place Order
            </div>
          </motion.div>
          {/* Layout 3: Order Completed (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <div className="text-xs font-bold text-foreground">WooCommerce Order Settled</div>
          </motion.div>
        </div>
      );

    case "shopify":
    case "shopify-ecommerce":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Live Order Tracker (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[280px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Active Orders</span>
            <div className="text-xs font-bold text-foreground">Shopify Webhook Syncing...</div>
          </motion.div>
          {/* Layout 2: Shopify Dashboard analytics (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[370px] p-6 rounded-2xl border border-[#95bf47]/20 bg-background/85 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Shopify Store Stats</span>
              <span className="px-2 py-0.5 bg-[#95bf47]/10 text-[9px] text-[#95bf47] font-bold rounded border border-[#95bf47]/20">PARTNER EXPERT</span>
            </div>
            <div className="text-3xl font-black text-foreground font-heading">$18,482.00</div>
            <div className="h-16 flex items-end gap-1.5">
              {[30, 45, 38, 55, 48, 75, 68, 95].map((h, idx) => (
                <div key={idx} className="flex-1 rounded bg-[#95bf47]" style={{ height: `${h}%` }} />
              ))}
            </div>
          </motion.div>
          {/* Layout 3: Shopify Badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-[#95bf47]/20 bg-[#95bf47]/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <Check className="w-5 h-5 text-[#95bf47]" />
            <div className="text-xs font-bold text-foreground">Shopify OS 2.0 Compliant</div>
          </motion.div>
        </div>
      );

    case "ui-ux-design":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Layers Board (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[260px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Design Layers</span>
            <div className="space-y-1.5 font-mono text-[9px]">
              <div className="text-primary font-bold"># Header Container</div>
              <div className="pl-3 text-muted-foreground">↳ Text: "Unify online..."</div>
              <div className="pl-3 text-muted-foreground">↳ Component: "Action Buttons"</div>
            </div>
          </motion.div>
          {/* Layout 2: Main Figma Canvas interface (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[380px] p-5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
              <span>Interactive Figma Canvas</span>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
              </div>
            </div>
            {/* Visual Vector Node Mockup */}
            <div className="h-32 border border-dashed border-primary/30 rounded-xl relative flex items-center justify-center bg-primary/5">
              <div className="absolute top-4 left-4 w-3.5 h-3.5 bg-primary rounded border border-white" />
              <div className="absolute bottom-4 right-4 w-3.5 h-3.5 bg-primary rounded border border-white" />
              <div className="w-20 h-10 border border-primary bg-primary/10 rounded flex items-center justify-center text-[10px] font-bold text-primary">
                Button Component
              </div>
            </div>
          </motion.div>
          {/* Layout 3: Design spec overlay (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <Palette className="w-5 h-5 text-primary" />
            <div className="text-xs font-bold text-foreground">High-Fidelity Style system</div>
          </motion.div>
        </div>
      );

    case "custom-web-apps":
    case "react-mern-apps":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Database node (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[300px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              <span>MongoDB Collection</span>
              <Database className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-xs font-mono font-bold text-foreground">db.users.find(&#123; active: true &#125;)</div>
          </motion.div>
          {/* Layout 2: React State Editor (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[380px] rounded-2xl border border-white/20 bg-zinc-950 shadow-2xl overflow-hidden font-mono"
          >
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/5 bg-white/[0.03] text-xs text-white/40">
              <span className="text-indigo-400">useState</span> hook
            </div>
            <div className="p-5 text-xs text-indigo-300 space-y-2 leading-relaxed">
              <div><span className="text-purple-400">const</span> [state, setState] = useState(initial);</div>
              <div className="text-emerald-400">// Automatically syncs MERN state endpoints</div>
              <div>useEffect(() =&gt; &#123;</div>
              <div className="pl-4">api.post(<span className="text-amber-300">"/sync"</span>, state);</div>
              <div>&#125;, [state]);</div>
            </div>
          </motion.div>
          {/* Layout 3: Fast Response capsule (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <Activity className="w-5 h-5 text-primary" />
            <div className="text-xs font-bold text-foreground">API Latency: 14ms</div>
          </motion.div>
        </div>
      );

    case "saas-development":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Tenant Tier List (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[300px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Multi-Tenant Tier</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Enterprise Plan</span>
              <span className="text-primary">$499/mo</span>
            </div>
          </motion.div>
          {/* Layout 2: Subscription Dashboard metrics (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[380px] p-6 rounded-2xl border border-white/25 bg-background/80 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">SaaS Analytics</span>
                <h4 className="text-lg font-black text-foreground mt-0.5">$48,290 MRR</h4>
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-500 font-bold text-[10px] rounded border border-emerald-500/20">+14.2% LTV</span>
            </div>
            <div className="h-16 flex items-end gap-1.5 bg-muted/20 rounded-xl p-3 border border-border/10">
              {[20, 35, 30, 55, 45, 68, 58, 85].map((h, idx) => (
                <div key={idx} className="flex-1 rounded-sm bg-gradient-to-t from-primary/50 to-primary" style={{ height: `${h}%` }} />
              ))}
            </div>
          </motion.div>
          {/* Layout 3: Secure Signups badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/15 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <UserCheck className="w-5 h-5 text-primary" />
            <div className="text-xs font-bold text-foreground">Active Tenants: 4,200+</div>
          </motion.div>
        </div>
      );

    case "webflow-development":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Flex Box settings panel (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[280px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Webflow Flex Control</span>
            <div className="flex justify-between text-xs font-bold text-foreground">
              <span>Direction: Horizontal</span>
              <span>Align: Center</span>
            </div>
          </motion.div>
          {/* Layout 2: Navigator mockup (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[360px] p-5.5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-border/20 pb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-mono">Webflow Element Tree</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#4353ff]" />
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="text-[#4353ff] font-bold">&lt;body&gt;</div>
              <div className="pl-3 text-foreground">&lt;hero-section&gt;</div>
              <div className="pl-6 text-muted-foreground">↳ &lt;container-custom&gt;</div>
              <div className="pl-9 text-muted-foreground">↳ &lt;interactive-visual&gt;</div>
            </div>
          </motion.div>
          {/* Layout 3: Publish status (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <div className="text-xs font-bold text-foreground">Webflow Hosted · Live</div>
          </motion.div>
        </div>
      );

    // ══════════════════════ DMS (MARKETING) SLUGS ══════════════════════
    case "social-media":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Post Analytics Overview (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[300px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Organic Analytics</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Viral Reach multiplier</span>
              <span className="text-emerald-500">4.2x Boost</span>
            </div>
          </motion.div>
          {/* Layout 2: Simulated Social Post Card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[350px] p-5 rounded-2xl border border-white/20 bg-background/90 shadow-2xl space-y-4.5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">D</div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Dynime Agency</h4>
                <p className="text-[9px] text-muted-foreground">Sponsored post · Active</p>
              </div>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed">
              Transforming traditional brands into modern SaaS revenue giants. Explore our latest web developments!
            </p>
            <div className="h-24 rounded-lg bg-gradient-to-tr from-primary/20 to-fuchsia-500/10 border border-border/10 flex items-center justify-center">
              <Share2 className="w-8 h-8 text-primary animate-pulse" />
            </div>
          </motion.div>
          {/* Layout 3: Social Interactions Badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <Sparkles className="w-5 h-5 text-primary" />
            <div className="text-xs font-bold text-foreground">12.8K Engagements</div>
          </motion.div>
        </div>
      );

    case "facebook-ads":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Pixel Integration check (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[300px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Meta Pixel SDK</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Pixel active</span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] rounded font-mono font-bold">OK</span>
            </div>
          </motion.div>
          {/* Layout 2: FB Ads Campaign Manager (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[370px] p-6 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Meta Ads performance</span>
              <span className="px-2.5 py-0.5 bg-primary/15 text-primary text-[10px] font-bold rounded">ACTIVE</span>
            </div>
            <div className="text-3xl font-black text-foreground font-heading">$842.50 CPC</div>
            <div className="h-16 flex items-end gap-1.5 bg-muted/20 rounded-xl p-3 border border-border/10">
              {[45, 55, 38, 65, 50, 78, 62, 95].map((h, idx) => (
                <div key={idx} className="flex-1 rounded-sm bg-gradient-to-t from-primary/50 to-primary" style={{ height: `${h}%` }} />
              ))}
            </div>
          </motion.div>
          {/* Layout 3: Target ROAS Gauge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <TrendingUp className="w-5 h-5 text-primary" />
            <div className="text-xs font-bold text-foreground">7.4x Target ROAS</div>
          </motion.div>
        </div>
      );

    case "google-ads":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Target Keyword Bid Tracker (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[320px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Google Bid Optimiser</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Target CPC Bid</span>
              <span className="text-emerald-500">$0.84 max</span>
            </div>
          </motion.div>
          {/* Layout 2: SERP Sponsored Ad Card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[380px] p-6 rounded-2xl border border-blue-500/20 bg-background/90 shadow-2xl space-y-3"
          >
            <div className="flex items-center gap-2 text-[10px] text-blue-500 font-bold uppercase tracking-wider">
              <span>Sponsored</span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            </div>
            <h4 className="text-sm font-extrabold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
              Professional Web Development Agency | Scale Your SaaS Business
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We design and construct high-performance, conversion-optimized WordPress & React web solutions. Sub-3s load speed guaranteed!
            </p>
          </motion.div>
          {/* Layout 3: CTR Metric bubble (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-blue-500/20 bg-blue-500/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <Percent className="w-5 h-5 text-blue-500" />
            <div className="text-xs font-bold text-foreground">18.4% Average CTR</div>
          </motion.div>
        </div>
      );

    case "seo":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Keyword Difficulty Meter (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[300px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Keyword Audit</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Keyword difficulty</span>
              <span className="text-amber-500">Medium (KD 34)</span>
            </div>
          </motion.div>
          {/* Layout 2: Google Ranking chart (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[370px] p-6 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-4.5"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">SEO Traffic Console</span>
                <h4 className="text-xl font-black text-foreground mt-0.5">Top #1 Positioning</h4>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 font-bold text-[10px] rounded border border-emerald-500/20">+480% Organic clicks</span>
            </div>
            <div className="h-16 flex items-end gap-1.5 bg-muted/20 rounded-xl p-3 border border-border/10">
              {[15, 30, 25, 48, 40, 68, 55, 95].map((h, idx) => (
                <div key={idx} className="flex-1 rounded-sm bg-gradient-to-t from-primary/50 to-primary" style={{ height: `${h}%` }} />
              ))}
            </div>
          </motion.div>
          {/* Layout 3: Position Audit badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <Search className="w-5 h-5 text-primary" />
            <div className="text-xs font-bold text-foreground">2,800 keywords on Page 1</div>
          </motion.div>
        </div>
      );

    case "brand-strategy":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Brand Archetype selector (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[300px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Core Archetype</span>
            <div className="text-xs font-bold text-foreground">The Innovator · Visionary positioning</div>
          </motion.div>
          {/* Layout 2: Brand Board elements (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[360px] p-6 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-4"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Brand Board Layout</span>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/25 flex flex-col justify-between">
                <span className="text-[9px] text-primary font-bold uppercase tracking-wider">Typography</span>
                <span className="font-heading text-lg font-black text-foreground mt-2">Outfit</span>
              </div>
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/10 flex flex-col justify-between">
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Tone of Voice</span>
                <span className="text-xs font-extrabold text-foreground mt-2">Premium & Bold</span>
              </div>
            </div>
          </motion.div>
          {/* Layout 3: Strategy Seal (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/15 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <Award className="w-5 h-5 text-primary" />
            <div className="text-xs font-bold text-foreground">Approved Strategy Roadmap</div>
          </motion.div>
        </div>
      );

    case "content-marketing":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Editorial Calendar (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[300px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Editorial Calendar</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Weekly publications</span>
              <span className="text-primary">3 Posts ready</span>
            </div>
          </motion.div>
          {/* Layout 2: Draft status monitor (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[360px] p-6 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Content Engine status</span>
              <span className="px-2 py-0.5 bg-indigo-500/15 text-indigo-500 text-[9px] font-bold rounded">PUBLISHED</span>
            </div>
            <div className="space-y-3">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-5/6 rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
          </motion.div>
          {/* Layout 3: Reach meter (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <Eye className="w-5 h-5 text-primary animate-pulse" />
            <div className="text-xs font-bold text-foreground">4.2 min Avg Dwell Time</div>
          </motion.div>
        </div>
      );

    case "email-marketing":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Mailing subscriber counter (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[300px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Mailing List Segment</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Target segment size</span>
              <span className="text-primary">12,840 Leads</span>
            </div>
          </motion.div>
          {/* Layout 2: Email campaign newsletter mockup (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[360px] p-6 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-border/20 pb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-mono">Newsletter preview</span>
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-2.5">
              <div className="h-4 w-2/3 rounded bg-primary/20" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-5/6 rounded bg-muted" />
              <div className="h-8 w-full rounded-xl bg-primary hover:bg-primary/90 text-white text-[10px] font-bold flex items-center justify-center cursor-pointer">
                Claim Offer Now
              </div>
            </div>
          </motion.div>
          {/* Layout 3: Campaign open-rate badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <Check className="w-5 h-5 text-primary" />
            <div className="text-xs font-bold text-foreground">42.8% Average Open Rate</div>
          </motion.div>
        </div>
      );

    case "analytics":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Conversion Rate Dial (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[300px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Conversion Goal</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Checkout settled</span>
              <span className="text-emerald-500">6.42% CVR</span>
            </div>
          </motion.div>
          {/* Layout 2: Central Metrics Control Panel (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[370px] p-6 rounded-2xl border border-white/20 bg-background/80 dark:bg-zinc-900/80 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Real-time sessions monitor</span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-bold rounded">LIVE FEED</span>
            </div>
            <div className="text-3xl font-black text-foreground font-heading">248 active users</div>
            <div className="h-16 flex items-end gap-1.5">
              {[20, 35, 45, 38, 55, 48, 68, 95].map((h, idx) => (
                <div key={idx} className="flex-1 rounded-sm bg-gradient-to-t from-primary/50 to-primary" style={{ height: `${h}%` }} />
              ))}
            </div>
          </motion.div>
          {/* Layout 3: Tracking seal (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <BarChart3 className="w-5 h-5 text-primary" />
            <div className="text-xs font-bold text-foreground">Server-Side GA4 Integrated</div>
          </motion.div>
        </div>
      );

    // ══════════════════════ DCS (CONSULTANCY) SLUGS ══════════════════════
    case "us-company":
    case "uk-company":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Legal Registration Seal (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[340px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Incorporated Structure</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Official Registrars File</span>
              <span className="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-500 rounded text-[9px] font-bold">APPROVED</span>
            </div>
          </motion.div>
          {/* Layout 2: Corporate Business Debit Card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 55 }}
            className="absolute top-28 right-0 w-[300px] md:w-[330px] aspect-[1.58/1] rounded-[24px] border border-white/30 dark:border-white/10 bg-gradient-to-tr from-white/10 via-white/5 to-white/0 dark:from-white/[0.08] dark:via-white/[0.03] dark:to-transparent backdrop-blur-2xl shadow-2xl p-6 flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-indigo-500/10 pointer-events-none" />
            <div className="flex justify-between items-start relative z-10">
              <CreditCard className="w-9 h-9 text-white/80" />
              <span className="text-[10px] font-bold text-white/40 tracking-widest">BUSINESS DEBIT</span>
            </div>
            <div className="space-y-2 relative z-10">
              <div className="text-base sm:text-lg font-mono text-white/95 tracking-widest">•••• •••• •••• 9284</div>
              <div className="flex justify-between items-center text-[10px] uppercase text-white/60 tracking-wider font-semibold">
                <span>Dynime Inc.</span>
                <span>EXP: 12/30</span>
              </div>
            </div>
          </motion.div>
          {/* Layout 3: IRS EIN seal (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 110 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-emerald-500/20 bg-background/90 dark:bg-zinc-900/90 backdrop-blur-2xl shadow-xl flex items-center gap-3 border-l-[6px] border-l-emerald-500"
          >
            <Check className="w-5 h-5 text-emerald-500" />
            <div className="text-xs font-bold text-foreground">IRS EIN Number Assigned</div>
          </motion.div>
        </div>
      );

    case "virtual-address":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Mail Scans (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[280px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Secure Mail Scanner</span>
            <div className="text-xs font-bold text-foreground">New PDF document scan uploaded</div>
          </motion.div>
          {/* Layout 2: Mail Inbox Dashboard (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[360px] p-5.5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Mailroom Inbox</span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded">1 NEW MAIL</span>
            </div>
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/10 flex justify-between items-center">
                <span className="text-xs font-semibold text-foreground">IRS Tax Form 1099</span>
                <span className="text-[10px] text-muted-foreground font-mono">1.2 MB PDF</span>
              </div>
            </div>
          </motion.div>
          {/* Layout 3: Location validation (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <Globe className="w-5 h-5 text-primary animate-pulse" />
            <div className="text-xs font-bold text-foreground">Wyoming & London addresses</div>
          </motion.div>
        </div>
      );

    case "itin-services":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Certification Agent Stamp (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[300px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">IRS CAA Certified</span>
            <div className="text-xs font-bold text-foreground">CAA agent processing enabled</div>
          </motion.div>
          {/* Layout 2: ITIN Document checklist (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[360px] p-5.5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-border/20 pb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-mono">Form W-7 Application</span>
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-emerald-500"><CheckCircle className="w-4 h-4" /> <span>W-7 Form Filled</span></div>
              <div className="flex items-center gap-2 text-emerald-500"><CheckCircle className="w-4 h-4" /> <span>CAA Identity Verified</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><CheckCircle className="w-4 h-4 opacity-40" /> <span>IRS Direct Dispatch</span></div>
            </div>
          </motion.div>
          {/* Layout 3: Safe ID validation (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <Fingerprint className="w-5 h-5 text-primary" />
            <div className="text-xs font-bold text-foreground">100% Secure Identity check</div>
          </motion.div>
        </div>
      );

    case "dropshipping-solution":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Product margins (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[280px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Gross Profit Target</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Avg product markup</span>
              <span className="text-emerald-500">65% Margins</span>
            </div>
          </motion.div>
          {/* Layout 2: Inventory sourcer panel (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[360px] p-5.5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Suppliers Sourcing</span>
              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 text-[9px] font-bold rounded">AUTOMATED</span>
            </div>
            <div className="p-3 bg-muted/40 rounded-xl space-y-2 border border-border/10 text-xs">
              <div className="flex justify-between"><span>Supplier Status</span><span className="text-emerald-500 font-bold">Connected</span></div>
              <div className="flex justify-between"><span>Inventory replication</span><span className="font-semibold">Sync 2 min ago</span></div>
            </div>
          </motion.div>
          {/* Layout 3: Shipping validation (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <Globe className="w-5 h-5 text-primary" />
            <div className="text-xs font-bold text-foreground">Global Auto-Fulfillment ready</div>
          </motion.div>
        </div>
      );

    case "marketplace-solution":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Seller payout tier (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[280px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Commission Logic</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Platform Take-Rate</span>
              <span className="text-primary">15% Split</span>
            </div>
          </motion.div>
          {/* Layout 2: Multi-vendor dashboard (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[360px] p-5.5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Vendors Ledger</span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded">STRIPE CONNECT</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-2 rounded bg-muted/40 border border-border/10">
                <span>Merchant #1094</span>
                <span className="font-bold text-foreground">$1,480.00</span>
              </div>
            </div>
          </motion.div>
          {/* Layout 3: Marketplace node status (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <Users2 className="w-5 h-5 text-primary" />
            <div className="text-xs font-bold text-foreground">Stripe Connect Compliant</div>
          </motion.div>
        </div>
      );

    case "payment-gateway":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: KYC Validation check (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[280px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Compliance Audit</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>KYC identity check</span>
              <span className="text-emerald-500 font-bold">Passed</span>
            </div>
          </motion.div>
          {/* Layout 2: Gateway checkout modal (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[360px] p-5.5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-border/20 pb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Authorize Payment</span>
              <Lock className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-muted/40 rounded-xl flex justify-between items-center border border-border/10">
                <span className="text-xs text-foreground font-semibold">Credit Card swiper sync</span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-bold">READY</span>
              </div>
            </div>
          </motion.div>
          {/* Layout 3: Gateway compliance status (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <div className="text-xs font-bold text-foreground">PCI-DSS Level 1 Secured</div>
          </motion.div>
        </div>
      );

    case "consulting":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Consultant Scheduler Widget (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[300px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Live Roadmap Strategy</span>
            <div className="text-xs font-bold text-foreground">Q3 Scaling Targets Approved</div>
          </motion.div>
          {/* Layout 2: Business Advice roadmap card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[360px] p-5.5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Growth Roadmap Phase</span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded">CONSULTANCY</span>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between"><span>Phase 1: Tax planning</span><span className="text-emerald-500 font-bold">Ready</span></div>
              <div className="flex justify-between"><span>Phase 2: Payment flow</span><span className="text-emerald-500 font-bold">Ready</span></div>
              <div className="flex justify-between"><span>Phase 3: Scale ads campaign</span><span className="text-primary font-bold">In-Progress</span></div>
            </div>
          </motion.div>
          {/* Layout 3: ROI badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <Award className="w-5 h-5 text-primary" />
            <div className="text-xs font-bold text-foreground">Certified Business Advisers</div>
          </motion.div>
        </div>
      );

    // ══════════════════════ DSS (SOFTWARE & AI) SLUGS ══════════════════════
    case "ai-software-development":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: AI Prompt node (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[320px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">LLM Prompter</span>
            <div className="text-xs font-bold text-foreground">"Generate React table with MERN..."</div>
          </motion.div>
          {/* Layout 2: Chat-to-Component AI code log (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[380px] rounded-2xl border border-primary/20 bg-zinc-950 shadow-2xl overflow-hidden font-mono"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-white/[0.03] text-xs text-white/40">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" /> AI Agent Assistant
            </div>
            <div className="p-5 text-xs text-emerald-400 space-y-2 leading-relaxed">
              <div>&gt; Generating responsive MERN backend routing...</div>
              <div className="text-white/60">router.get('/health', (req, res) =&gt; &#123;</div>
              <div className="pl-4 text-white/60">res.status(200).json(&#123; status: 'active' &#125;);</div>
              <div className="text-white/60">&#125;);</div>
              <div className="text-primary font-bold">&gt; Component created in 0.4s [OK]</div>
            </div>
          </motion.div>
          {/* Layout 3: Vector connection (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <Cpu className="w-5 h-5 text-primary" />
            <div className="text-xs font-bold text-foreground">Vector Embedding synced</div>
          </motion.div>
        </div>
      );

    case "custom-software-development":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Migration script (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[300px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">DB Migration script</span>
            <div className="text-xs font-mono font-bold text-foreground">Schema::create('tenants', function...)</div>
          </motion.div>
          {/* Layout 2: FSD modular structure blueprint (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[370px] p-6 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-mono">Modular FSD Architecture</span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded">ENTERPRISE</span>
            </div>
            <div className="space-y-2.5 text-xs font-mono">
              <div className="text-primary font-bold">↳ app/</div>
              <div className="pl-3 text-muted-foreground">↳ pages/ (routes & views)</div>
              <div className="pl-3 text-muted-foreground">↳ entities/ (data definitions)</div>
            </div>
          </motion.div>
          {/* Layout 3: Health test badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <Server className="w-5 h-5 text-primary" />
            <div className="text-xs font-bold text-foreground">Docker containers compiled</div>
          </motion.div>
        </div>
      );

    case "software-built-with-ai":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: AI Prompt generator (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[300px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Refactor Suggestion</span>
            <div className="text-xs font-bold text-foreground">Optimize SQL indices for users table</div>
          </motion.div>
          {/* Layout 2: Code AI generation interface (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[380px] rounded-2xl border border-primary/25 bg-zinc-950 shadow-2xl overflow-hidden font-mono"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-white/[0.03] text-xs text-white/40">
              <Bot className="w-4 h-4 text-primary animate-pulse" /> AI Agent Refactorer
            </div>
            <div className="p-5 text-xs text-indigo-300 space-y-2 leading-relaxed">
              <div>&gt; Scanning codebase folders...</div>
              <div>&gt; Found bottleneck in nested map layout.</div>
              <div className="text-emerald-400">&gt; Applying memoized callback patch... [OK]</div>
            </div>
          </motion.div>
          {/* Layout 3: AI Sync check (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <Sparkles className="w-5 h-5 text-primary" />
            <div className="text-xs font-bold text-foreground">Gemini AI models active</div>
          </motion.div>
        </div>
      );

    case "software-testing-qa":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Cypress check (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[300px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Unit Coverage</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Branch test coverage</span>
              <span className="text-emerald-500">98.4% passing</span>
            </div>
          </motion.div>
          {/* Layout 2: Test assertion terminal runner (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[380px] rounded-2xl border border-white/20 bg-zinc-950 shadow-2xl overflow-hidden font-mono"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-white/[0.03] text-xs text-white/40 font-medium">
              <Terminal className="w-3.5 h-3.5 text-primary" /> cypress run:checkout-flow
            </div>
            <div className="p-5 text-[11px] text-emerald-400 space-y-2 leading-relaxed">
              <div className="flex justify-between"><span>✔ Assert items added to card</span><span className="text-emerald-500">12ms</span></div>
              <div className="flex justify-between"><span>✔ Check user auth redirects</span><span className="text-emerald-500">24ms</span></div>
              <div className="flex justify-between"><span>✔ Verify Stripe connection token</span><span className="text-emerald-500">84ms</span></div>
              <div className="text-white/60">Tests finished: 3 passed, 0 failed.</div>
            </div>
          </motion.div>
          {/* Layout 3: QA status badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <div className="text-xs font-bold text-foreground">QA pipeline 100% stable</div>
          </motion.div>
        </div>
      );

    // ══════════════════════ DES (ECOMMERCE) SLUGS ══════════════════════
    case "wordpress-ecommerce":
    case "nodejs-mern-ecommerce":
    case "laravel-ecommerce":
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Layout 1: Admin Order Notification (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -50 }}
            className="absolute top-12 left-0 w-[290px] p-4.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Store Backend Log</span>
            <div className="text-xs font-bold text-foreground">Webhook order event dispatched</div>
          </motion.div>
          {/* Layout 2: Ecommerce database analytics grid (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 50 }}
            className="absolute top-28 right-0 w-[370px] p-6 rounded-2xl border border-white/25 bg-background/80 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Weekly Sales Monitor</span>
                <h4 className="text-2xl font-black text-foreground mt-0.5">$18,290.00</h4>
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-500 font-bold text-[9px] rounded border border-emerald-500/20">+42% Growth</span>
            </div>
            <div className="h-16 flex items-end gap-1.5">
              {[25, 45, 38, 55, 48, 68, 58, 85].map((h, idx) => (
                <div key={idx} className="flex-1 rounded-sm bg-gradient-to-t from-primary/50 to-primary" style={{ height: `${h}%` }} />
              ))}
            </div>
          </motion.div>
          {/* Layout 3: Payment gateway node sync (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 105 }}
            className="absolute bottom-16 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl flex items-center gap-3"
          >
            <Server className="w-5 h-5 text-primary" />
            <div className="text-xs font-bold text-foreground">API Sync: Webhook connected</div>
          </motion.div>
        </div>
      );

    // ══════════════════════ CORE CATEGORY DEFAULT VISUALS ══════════════════════
    case "des": // ══════════════ DEFAULT ECOMMERCE CATEGORY ══════════════
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
            <div className="w-24 h-5 bg-zinc-800 rounded-full mx-auto -mt-2 mb-3 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-zinc-950" />
            </div>

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

    case "dms": // ══════════════ DEFAULT MARKETING CATEGORY ══════════════
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

    case "dss": // ══════════════ DEFAULT SOFTWARE & AI CATEGORY ══════════════
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

    case "dcs": // ══════════════ DEFAULT CONSULTANCY CATEGORY ══════════════
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

    case "os": // ══════════════ DEFAULT DYNIME OS ══════════════
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

    case "dws": // ══════════════ DEFAULT WEB SERVICES CATEGORY ══════════════
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
