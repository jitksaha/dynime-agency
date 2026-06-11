import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { 
  Code2, Sparkles, Terminal, FileText, Database, Shield, Globe, 
  TrendingUp, CreditCard, ShoppingCart, Percent, Laptop, Search, 
  Share2, Award, Zap, HelpCircle, Activity, Play, CheckCircle2,
  Lock, Check, ArrowRight, UserCheck, Smartphone, Layers, Server,
  BarChart3, Megaphone, Palette, Mail, Users2, Eye, ShieldAlert,
  Fingerprint, Briefcase, FileCode, CheckCircle, RefreshCw, Cpu,
  Bot, Clock, Coins, ShieldCheck
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

  // Use slug directly to pick unique visual; fallback to category label
  const activeKey = slug ? slug : (category || "dws").toLowerCase();

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[450px] md:h-[500px] lg:h-[560px] flex items-center justify-center select-none overflow-visible"
      style={{ perspective: 1200 }}
    >
      {/* Dynamic colorful ambient glow orbs in the background */}
      <div className="absolute inset-0 flex items-center justify-center -z-10 pointer-events-none overflow-visible">
        <div className="w-[320px] h-[320px] md:w-[420px] md:h-[420px] rounded-full bg-gradient-to-tr from-primary/30 to-indigo-500/20 blur-[90px] animate-pulse duration-[8000ms] absolute -top-10 -right-10" />
        <div className="w-[280px] h-[280px] rounded-full bg-gradient-to-br from-fuchsia-500/10 to-violet-500/20 blur-[80px] absolute -bottom-10 -left-10" />
      </div>

      {/* Main 3D Card Stage Container with original compact layout bounds */}
      <motion.div 
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative w-full max-w-[500px] h-full flex items-center justify-center overflow-visible scale-[0.85] xs:scale-[0.9] sm:scale-[0.95] md:scale-100"
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
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Floating Palette Card (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[240px] p-4 rounded-2xl border border-white/10 dark:border-white/5 bg-background/50 backdrop-blur-xl shadow-lg space-y-3"
          >
            <div className="flex gap-2 items-center">
              <Palette className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Style System</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-muted-foreground border-b border-white/5 pb-1">
              <span>Font Family</span>
              <span className="font-mono text-foreground font-semibold">Outfit, Inter</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
              <span>Border Radius</span>
              <span className="font-mono text-foreground font-semibold">16px (Fluid)</span>
            </div>
            <div className="flex gap-2.5 pt-1">
              <div className="w-6 h-6 rounded-full bg-primary shadow-lg" />
              <div className="w-6 h-6 rounded-full bg-indigo-500 shadow-lg" />
              <div className="w-6 h-6 rounded-full bg-fuchsia-500 shadow-lg" />
            </div>
          </motion.div>
          {/* Layout 2: Premium Browser Window with Responsive Layout (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[310px] md:w-[340px] rounded-2xl border border-white/20 bg-background/80 dark:bg-zinc-900/80 shadow-2xl overflow-hidden"
          >
            <div className="px-3.5 py-2.5 border-b border-border/20 bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] font-semibold font-mono text-muted-foreground bg-border/40 px-2 py-0.5 rounded-full">wp-designer.app</span>
              </div>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              </div>
            </div>
            <div className="p-4 space-y-3.5">
              <div className="flex justify-between items-center">
                <div className="h-4 w-24 rounded bg-primary/20" />
                <span className="text-[9px] font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">Gutenberg Active</span>
              </div>
              <div className="h-20 rounded-xl bg-gradient-to-tr from-primary/10 to-indigo-500/5 border border-border/10 flex flex-col items-center justify-center p-3">
                <Code2 className="w-7 h-7 text-primary animate-pulse mb-1.5" />
                <div className="flex gap-2 text-[9px] text-muted-foreground">
                  <span>↳ Header</span>
                  <span>↳ Grid</span>
                  <span>↳ Footer</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded bg-muted/60" />
                <div className="h-2 w-5/6 rounded bg-muted/60" />
              </div>
            </div>
          </motion.div>
          {/* Layout 3: Custom WordPress badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <div className="text-[11px] font-bold text-foreground">Blocks Ready</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">FSE Engine & Sync Loaded</div>
          </motion.div>
        </div>
      );

    case "website-redesign":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Old Wireframe (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[240px] p-4 rounded-2xl border border-red-500/20 bg-background/50 backdrop-blur-xl shadow-lg opacity-40 space-y-2"
          >
            <div className="flex justify-between items-center text-[9px] text-red-500 font-mono uppercase font-bold">
              <span>Legacy Website</span>
              <ShieldAlert className="w-3 h-3" />
            </div>
            <div className="space-y-1.5 text-[10px] font-mono text-muted-foreground">
              <div className="flex justify-between"><span>Page Load:</span><span>5.4s</span></div>
              <div className="flex justify-between"><span>LCP Core:</span><span>4.8s</span></div>
            </div>
            <div className="h-16 border-2 border-dashed border-red-500/20 rounded-lg mt-2 flex flex-col items-center justify-center">
              <span className="text-[10px] text-red-500 font-mono font-bold">Bounce 84%</span>
              <span className="text-[8px] text-red-400 font-mono">Poor UX Score</span>
            </div>
          </motion.div>
          {/* Layout 2: Modern Redesigned Mockup (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[310px] md:w-[340px] rounded-2xl border border-emerald-500/20 bg-background/90 shadow-2xl border-t-[6px] border-t-emerald-500 overflow-hidden"
          >
            <div className="p-4 space-y-3.5">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">NEW SYSTEM</span>
                <span className="text-[9px] text-muted-foreground font-mono">LCP 1.1s (Good)</span>
              </div>
              <div className="h-20 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 flex flex-col justify-center px-4 space-y-2 border border-emerald-500/10">
                <div className="h-3.5 w-3/4 rounded bg-emerald-500/20" />
                <div className="h-3 w-1/2 rounded bg-emerald-500/10" />
                <div className="h-6 w-20 rounded-lg bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center cursor-pointer hover:bg-emerald-600 transition">Get Started</div>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground pt-1">
                <span>SEO Score: 100/100</span>
                <span>INP Speed: 80ms</span>
              </div>
            </div>
          </motion.div>
          {/* Layout 3: Growth Metric Bubble (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-emerald-500 animate-pulse" />
              <div className="text-[11px] font-bold text-foreground">+310% Leads</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Conversion Rate: 6.4%</div>
          </motion.div>
        </div>
      );

    case "wordpress-maintenance":
    case "maintenance-security":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Backup Offsite Nodes (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[240px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              <span>Backups</span>
              <Database className="w-3 h-3 text-indigo-500" />
            </div>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between font-mono"><span>S3 Sync:</span><span className="text-emerald-500">Success</span></div>
              <div className="flex justify-between font-mono"><span>Frequency:</span><span>Daily</span></div>
              <div className="flex justify-between font-mono"><span>Size:</span><span>1.42 GB</span></div>
            </div>
          </motion.div>
          {/* Layout 2: Active Security Firewall Monitor (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[310px] md:w-[330px] p-4 rounded-2xl border border-primary/20 bg-background/85 shadow-2xl space-y-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">WAF Status</span>
              <Shield className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <div className="p-2.5 bg-muted/40 rounded-xl space-y-1.5 border border-border/10 font-mono text-[9px] text-emerald-400">
              <div>&gt; Shield Activated</div>
              <div>&gt; SSL secured [SHA-256]</div>
              <div>&gt; Malware Scan: 0 Threats Found</div>
              <div>&gt; Blocks blocked: 24 (last hr)</div>
            </div>
          </motion.div>
          {/* Layout 3: Uptime badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <div className="text-[11px] font-bold text-foreground">99.99% Uptime</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Checked every 60s</div>
          </motion.div>
        </div>
      );

    case "speed-optimization":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Asset Compression Monitor (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[240px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Compression</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>WebP conversion</span>
              <span className="text-emerald-500">-84%</span>
            </div>
            <div className="space-y-1 text-[9px] font-mono text-muted-foreground">
              <div className="flex justify-between"><span>Gzip/Brotli:</span><span className="text-emerald-500">Active</span></div>
              <div className="flex justify-between"><span>Minify CSS/JS:</span><span className="text-emerald-500">Complete</span></div>
            </div>
          </motion.div>
          {/* Layout 2: Speed Score Dial (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[280px] md:w-[300px] p-5 rounded-2xl border border-primary/20 bg-background/85 shadow-2xl flex flex-col items-center space-y-3.5"
          >
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="hsl(var(--muted))" strokeWidth="6" fill="transparent" />
                <circle cx="50" cy="50" r="40" stroke="hsl(var(--primary))" strokeWidth="8" fill="transparent" strokeDasharray="251" strokeDashoffset="2.5" />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-black text-foreground font-heading">100</span>
                <span className="text-[7px] text-muted-foreground font-bold tracking-widest">MOBILE</span>
              </div>
            </div>
            <div className="w-full text-center space-y-1 text-[10px] font-mono text-muted-foreground">
              <div>LCP: 0.8s | FID: 12ms | CLS: 0.01</div>
              <div className="text-emerald-500 font-bold">Passed Core Web Vitals</div>
            </div>
          </motion.div>
          {/* Layout 3: Rocket Particle badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-primary animate-bounce" />
              <div className="text-[11px] font-bold text-foreground">TTFB: 52ms</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Server Load: Perfect</div>
          </motion.div>
        </div>
      );

    case "woocommerce":
    case "wordpress-woocommerce":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Cart Items Floating (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[240px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <div className="flex justify-between items-center text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
              <span>Woo Cart</span>
              <ShoppingCart className="w-3 h-3 text-primary" />
            </div>
            <div className="text-[11px] font-bold text-foreground">Premium Coffee Roast</div>
            <div className="flex justify-between items-center text-[9px] text-muted-foreground">
              <span>Quantity: 2</span>
              <span>Subtotal: $59.80</span>
            </div>
            <div className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono w-fit">Promo: DYNIME20 (-$12.00)</div>
          </motion.div>
          {/* Layout 2: Invoice checkout panel (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[290px] md:w-[310px] p-5 rounded-2xl border border-white/20 bg-background/80 dark:bg-zinc-900/80 shadow-2xl space-y-3.5"
          >
            <div className="flex justify-between items-center border-b border-border/20 pb-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Securing</span>
              <span className="px-1.5 py-0.5 bg-indigo-500/10 text-[9px] text-indigo-500 font-bold rounded">WooCommerce</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground"><span>Items</span><span>$59.80</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>Free</span></div>
              <div className="flex justify-between text-muted-foreground border-t border-border/20 pt-1.5"><span>Tax (5%)</span><span>$2.39</span></div>
              <div className="flex justify-between font-bold text-foreground pt-1.5"><span>Total</span><span>$50.19</span></div>
            </div>
            <div className="w-full h-9 rounded-xl bg-primary text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer">
              <Lock className="w-3 h-3" /> Place Order
            </div>
          </motion.div>
          {/* Layout 3: Order Completed (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <div className="text-[11px] font-bold text-foreground">Order Completed</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Receipt sent to email</div>
          </motion.div>
        </div>
      );

    case "shopify":
    case "shopify-ecommerce":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Live Order Tracker (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[240px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Active Orders</span>
            <div className="text-[11px] font-bold text-foreground">Shopify Syncing...</div>
            <div className="space-y-1 text-[9px] font-mono text-muted-foreground">
              <div className="flex justify-between"><span>Webhooks status:</span><span className="text-emerald-500">Connected</span></div>
              <div className="flex justify-between"><span>Products synced:</span><span>148 items</span></div>
            </div>
          </motion.div>
          {/* Layout 2: Shopify Dashboard analytics (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[290px] md:w-[310px] p-5 rounded-2xl border border-[#95bf47]/20 bg-background/85 shadow-2xl space-y-3.5"
          >
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Shopify Stats</span>
              <span className="text-[10px] text-emerald-500 font-bold">+18.4% this week</span>
            </div>
            <div className="text-xl font-black text-foreground font-heading">$18,482.00</div>
            <div className="h-12 flex items-end gap-1">
              {[30, 45, 38, 55, 48, 75, 68, 95].map((h, idx) => (
                <div key={idx} className="flex-1 rounded bg-[#95bf47]" style={{ height: `${h}%` }} />
              ))}
            </div>
          </motion.div>
          {/* Layout 3: Shopify Badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-[#95bf47]/20 bg-[#95bf47]/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <Check className="w-4 h-4 text-[#95bf47]" />
              <div className="text-[11px] font-bold text-foreground">OS 2.0 Compliant</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Compatible with Dawn & custom</div>
          </motion.div>
        </div>
      );

    case "ui-ux-design":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Layers Board (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[220px] p-3.5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Design Layers</span>
            <div className="space-y-1.5 font-mono text-[9px]">
              <div className="text-primary font-bold"># Card Container</div>
              <div className="pl-3 text-muted-foreground">↳ Auto Layout [H]</div>
              <div className="pl-6 text-muted-foreground">↳ Icon (24x24)</div>
              <div className="pl-6 text-muted-foreground">↳ Content Wrapper [V]</div>
            </div>
          </motion.div>
          {/* Layout 2: Main Figma Canvas interface (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[300px] md:w-[320px] p-5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-3"
          >
            <div className="flex justify-between items-center text-[10px] font-semibold text-muted-foreground">
              <span>Interactive Figma Canvas</span>
              <span className="font-mono text-primary">Align: Center</span>
            </div>
            <div className="h-24 border border-dashed border-primary/30 rounded-xl relative flex items-center justify-center bg-primary/5">
              <div className="w-14 h-7 border border-primary bg-primary/10 rounded flex items-center justify-center text-[9px] font-bold text-primary">
                Button
              </div>
              <div className="absolute top-1 right-2 text-[8px] font-mono text-muted-foreground">W: 140px | H: 44px</div>
            </div>
            <div className="flex justify-between text-[9px] font-mono text-muted-foreground pt-1">
              <span>Gap: 12px</span>
              <span>Padding: 16px 20px</span>
            </div>
          </motion.div>
          {/* Layout 3: Design spec overlay (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <Palette className="w-4 h-4 text-primary" />
              <div className="text-[11px] font-bold text-foreground">Style system</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">120+ Components Documented</div>
          </motion.div>
        </div>
      );

    case "custom-web-apps":
    case "react-mern-apps":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Database node (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[240px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              <span>MongoDB</span>
              <Database className="w-3 h-3 text-emerald-500" />
            </div>
            <div className="text-[10px] font-mono font-bold text-foreground">db.users.find()</div>
            <div className="space-y-1 text-[9px] font-mono text-muted-foreground">
              <div>ReplicaSet: Primary</div>
              <div>Connections: 128 active</div>
            </div>
          </motion.div>
          {/* Layout 2: React State Editor (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[310px] md:w-[330px] rounded-2xl border border-white/20 bg-zinc-950 shadow-2xl overflow-hidden font-mono"
          >
            <div className="flex items-center gap-1.5 px-3.5 py-2 border-b border-white/5 bg-white/[0.03] text-[10px] text-white/40">
              <span className="text-indigo-400">useState</span> hook
            </div>
            <div className="p-4 text-[9px] text-indigo-300 space-y-1.5 leading-relaxed">
              <div><span className="text-purple-400">const</span> [state, setState] = useState(initial);</div>
              <div>useEffect(() =&gt; &#123;</div>
              <div className="pl-3">api.post("/sync").then(res =&gt; setState(res.data));</div>
              <div>&#125;, []);</div>
            </div>
          </motion.div>
          {/* Layout 3: Fast Response capsule (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-primary" />
              <div className="text-[11px] font-bold text-foreground">Latency: 14ms</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Response code: 200 OK</div>
          </motion.div>
        </div>
      );

    case "saas-development":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Tenant Tier List (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[240px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Multi-Tenant Tier</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Enterprise</span>
              <span className="text-primary">$499/mo</span>
            </div>
            <div className="space-y-1 text-[9px] font-mono text-muted-foreground">
              <div className="flex justify-between"><span>Tenant DB isolation:</span><span className="text-emerald-500">Enforced</span></div>
              <div className="flex justify-between"><span>Gateway Sync:</span><span>Active</span></div>
            </div>
          </motion.div>
          {/* Layout 2: Subscription Dashboard metrics (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[310px] md:w-[330px] p-5 rounded-2xl border border-white/25 bg-background/80 shadow-2xl space-y-3.5"
          >
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">SaaS</span>
                <h4 className="text-base font-black text-foreground">$48,290 MRR</h4>
              </div>
              <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Churn: 1.2%</span>
            </div>
            <div className="h-10 flex items-end gap-1">
              {[20, 35, 30, 55, 45, 68, 58, 85].map((h, idx) => (
                <div key={idx} className="flex-1 rounded-sm bg-gradient-to-t from-primary/50 to-primary" style={{ height: `${h}%` }} />
              ))}
            </div>
          </motion.div>
          {/* Layout 3: Secure Signups badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/15 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <UserCheck className="w-4 h-4 text-primary" />
              <div className="text-[11px] font-bold text-foreground">Tenants: 4.2K+</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">API Requests: 2.1M / day</div>
          </motion.div>
        </div>
      );

    case "webflow-development":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Flex Box settings panel (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[240px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Webflow Flex</span>
            <div className="flex justify-between text-xs font-bold text-foreground">
              <span>Align: Center</span>
              <span>Justify: Start</span>
            </div>
            <div className="space-y-1 text-[9px] font-mono text-muted-foreground">
              <div className="flex justify-between"><span>Flex Direction:</span><span>Row</span></div>
              <div className="flex justify-between"><span>Wrap:</span><span>Wrap</span></div>
            </div>
          </motion.div>
          {/* Layout 2: Navigator mockup (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[290px] md:w-[310px] p-5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-3.5"
          >
            <div className="flex justify-between items-center border-b border-border/20 pb-2">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Webflow navigator</span>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="text-[#4353ff] font-bold">&lt;body&gt;</div>
              <div className="pl-3 text-emerald-500">&lt;Section class="hero"&gt;</div>
              <div className="pl-6 text-indigo-400">&lt;Container class="centered"&gt;</div>
              <div className="pl-9 text-muted-foreground">&lt;Heading class="h1"&gt;</div>
            </div>
          </motion.div>
          {/* Layout 3: Hosted status (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <div className="text-[11px] font-bold text-foreground">Webflow Live</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Custom attributes parsed [OK]</div>
          </motion.div>
        </div>
      );

    // ══════════════════════ DMS (MARKETING) SLUGS ══════════════════════
    case "social-media":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Post Analytics Overview (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[240px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Organic Analytics</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Viral Reach</span>
              <span className="text-emerald-500">4.2x Boost</span>
            </div>
            <div className="space-y-1 text-[9px] font-mono text-muted-foreground">
              <div className="flex justify-between"><span>Impression count:</span><span>248K</span></div>
              <div className="flex justify-between"><span>Audience growth:</span><span className="text-emerald-500">+14%</span></div>
            </div>
          </motion.div>
          {/* Layout 2: Simulated Social Post Card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[290px] md:w-[310px] p-5 rounded-2xl border border-white/20 bg-background/90 shadow-2xl space-y-3"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">D</div>
              <div>
                <h4 className="text-[10px] font-bold text-foreground">Dynime Agency</h4>
                <div className="text-[8px] text-muted-foreground">Sponsored · Instagram</div>
              </div>
            </div>
            <p className="text-[10px] text-foreground/80 leading-relaxed">
              Transforming traditional brands into modern SaaS revenue giants.
            </p>
            <div className="flex gap-4 text-[9px] text-muted-foreground border-t border-border/20 pt-2.5">
              <span>❤ 1.2K Likes</span>
              <span>💬 84 Comments</span>
              <span>✈ 24 Shares</span>
            </div>
          </motion.div>
          {/* Layout 3: Social Interactions Badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <div className="text-[11px] font-bold text-foreground">12.8K Engagements</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Target CTR: 3.8%</div>
          </motion.div>
        </div>
      );

    case "facebook-ads":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Pixel Integration check (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[240px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Meta Pixel SDK</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Pixel active</span>
              <span className="text-emerald-500 font-bold">OK</span>
            </div>
            <div className="space-y-1 text-[9px] font-mono text-muted-foreground">
              <div className="flex justify-between"><span>Purchase Events:</span><span>1,490</span></div>
              <div className="flex justify-between"><span>Custom Audience size:</span><span>84K</span></div>
            </div>
          </motion.div>
          {/* Layout 2: FB Ads Campaign Manager (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[290px] md:w-[310px] p-5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-3.5"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Meta Ads</span>
              <span className="px-2 py-0.5 bg-primary/15 text-primary text-[9px] font-bold rounded">ACTIVE</span>
            </div>
            <div className="text-2xl font-black text-foreground font-heading">$842.50 CPC</div>
            <div className="h-10 flex items-end gap-1 bg-muted/20 rounded-xl p-2.5 border border-border/10">
              {[45, 55, 38, 65, 50, 78].map((h, idx) => (
                <div key={idx} className="flex-1 rounded-sm bg-gradient-to-t from-primary/50 to-primary" style={{ height: `${h}%` }} />
              ))}
            </div>
          </motion.div>
          {/* Layout 3: Target ROAS Gauge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <div className="text-[11px] font-bold text-foreground">7.4x Target ROAS</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Cost Per Purchase: $14.20</div>
          </motion.div>
        </div>
      );

    case "google-ads":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Target Keyword Bid Tracker (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[260px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Google Bid</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>CPC Bid</span>
              <span className="text-emerald-500">$0.84 max</span>
            </div>
            <div className="space-y-1 text-[9px] font-mono text-muted-foreground">
              <div>Keyword Match: Exact Match</div>
              <div>Search Volume: 12.4K / mo</div>
            </div>
          </motion.div>
          {/* Layout 2: SERP Sponsored Ad Card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[310px] md:w-[330px] p-5 rounded-2xl border border-blue-500/20 bg-background/90 shadow-2xl space-y-2.5"
          >
            <div className="flex items-center justify-between text-[9px] text-blue-500 font-bold uppercase tracking-wider">
              <span>Sponsored</span>
              <span className="text-muted-foreground text-[8px]">Google Search</span>
            </div>
            <h4 className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400">
              Professional Web Development Agency | Scale Your SaaS Business
            </h4>
            <p className="text-[9px] text-muted-foreground leading-normal">
              Get an interactive, high-converting product ready in weeks. Free consultation.
            </p>
            <div className="flex gap-2 text-[8px] font-mono bg-blue-500/5 p-1 rounded border border-blue-500/10 text-blue-600 dark:text-blue-400">
              <span>↳ Pricing</span>
              <span>↳ Services</span>
              <span>↳ Case Studies</span>
            </div>
          </motion.div>
          {/* Layout 3: CTR Metric bubble (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-blue-500/20 bg-blue-500/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <Percent className="w-4 h-4 text-blue-500" />
              <div className="text-[11px] font-bold text-foreground">18.4% Average CTR</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Quality Score: 9/10</div>
          </motion.div>
        </div>
      );

    case "seo":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Keyword Difficulty Meter (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[260px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Keyword Audit</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Difficulty KD</span>
              <span className="text-amber-500">Medium (34)</span>
            </div>
            <div className="space-y-1 text-[9px] font-mono text-muted-foreground">
              <div className="flex justify-between"><span>Search intent:</span><span>Informational</span></div>
              <div className="flex justify-between"><span>Avg Position:</span><span>#2.4</span></div>
            </div>
          </motion.div>
          {/* Layout 2: Google Ranking chart (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[310px] md:w-[330px] p-5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">SEO Console</span>
                <h4 className="text-base font-black text-foreground">Top #1 Rank</h4>
              </div>
              <span className="text-[9px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Domain Auth: 52</span>
            </div>
            <div className="h-10 flex items-end gap-1 bg-muted/20 rounded-xl p-2 border border-border/10">
              {[15, 30, 25, 48, 40, 68].map((h, idx) => (
                <div key={idx} className="flex-1 rounded-sm bg-gradient-to-t from-primary/50 to-primary" style={{ height: `${h}%` }} />
              ))}
            </div>
          </motion.div>
          {/* Layout 3: Position Audit badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <Search className="w-4 h-4 text-primary" />
              <div className="text-[11px] font-bold text-foreground">2,800 page-1 keywords</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Backlink Speed: +120/mo</div>
          </motion.div>
        </div>
      );

    case "brand-strategy":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Brand Archetype selector (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[260px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Core Archetype</span>
            <div className="text-xs font-bold text-foreground">The Innovator · Visionary</div>
            <div className="space-y-1 text-[9px] text-muted-foreground font-mono">
              <div>Mission: Empower digital builders</div>
              <div>Tone: Premium, Technical, Warm</div>
            </div>
          </motion.div>
          {/* Layout 2: Brand Board elements (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[290px] md:w-[310px] p-5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-4"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Brand Board Layout</span>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/25">
                <span className="text-[8px] text-primary font-bold uppercase tracking-wider">Type</span>
                <div className="font-heading font-black text-foreground mt-1">Outfit</div>
              </div>
              <div className="p-2 rounded-xl bg-muted/40 border border-border/10">
                <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider">Tone</span>
                <div className="font-extrabold text-foreground mt-1">Premium</div>
              </div>
            </div>
          </motion.div>
          {/* Layout 3: Strategy Seal (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/15 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <Award className="w-4 h-4 text-primary" />
              <div className="text-[11px] font-bold text-foreground">Approved Strategy</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Brand Book & Assets Verified</div>
          </motion.div>
        </div>
      );

    case "content-marketing":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Editorial Calendar (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[260px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Editorial Calendar</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>updates</span>
              <span className="text-primary">3 Posts ready</span>
            </div>
            <div className="space-y-1 text-[9px] text-muted-foreground font-mono">
              <div className="flex justify-between"><span>Medium queue:</span><span>1 Scheduled</span></div>
              <div className="flex justify-between"><span>LinkedIn queue:</span><span>2 Scheduled</span></div>
            </div>
          </motion.div>
          {/* Layout 2: Draft status monitor (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[290px] md:w-[310px] p-5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Content Engine</span>
              <span className="px-2 py-0.5 bg-indigo-500/15 text-indigo-500 text-[9px] font-bold rounded">PUBLISHED</span>
            </div>
            <div className="space-y-2 text-[10px]">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-5/6 rounded bg-muted" />
              <div className="flex justify-between font-mono text-[9px] text-muted-foreground pt-1">
                <span>Word Count: 1,480</span>
                <span>SEO Density: 1.4%</span>
              </div>
            </div>
          </motion.div>
          {/* Layout 3: Reach meter (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-primary animate-pulse" />
              <div className="text-[11px] font-bold text-foreground">4.2 min Dwell Time</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Organic Scroll Depth: 74%</div>
          </motion.div>
        </div>
      );

    case "email-marketing":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Mailing subscriber counter (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[260px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Mailing Segment</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Target segment</span>
              <span className="text-primary">12,840</span>
            </div>
            <div className="space-y-1 text-[9px] text-muted-foreground font-mono">
              <div className="flex justify-between"><span>Engaged tags:</span><span>8.4K users</span></div>
              <div className="flex justify-between"><span>Bounce rate:</span><span className="text-emerald-500">0.2%</span></div>
            </div>
          </motion.div>
          {/* Layout 2: Email campaign newsletter mockup (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[290px] md:w-[310px] p-5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-border/20 pb-2.5">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Newsletter preview</span>
              <Mail className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="space-y-2 text-xs">
              <div className="h-3.5 w-2/3 rounded bg-primary/20" />
              <div className="h-3 w-5/6 rounded bg-muted/60" />
              <div className="h-8 w-full rounded-xl bg-primary text-white text-[10px] font-bold flex items-center justify-center cursor-pointer">
                Claim Offer Now
              </div>
            </div>
          </motion.div>
          {/* Layout 3: Campaign open-rate badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <Check className="w-4 h-4 text-primary" />
              <div className="text-[11px] font-bold text-foreground">42.8% Open Rate</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Click-Through-Rate: 8.4%</div>
          </motion.div>
        </div>
      );

    case "analytics":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Conversion Rate Dial (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[260px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Conversion Goal</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Checkout settled</span>
              <span className="text-emerald-500 font-bold">6.42% CVR</span>
            </div>
            <div className="space-y-1.5 text-[9px] text-muted-foreground font-mono">
              <div className="flex justify-between"><span>Signups target:</span><span>80% met</span></div>
              <div className="flex justify-between"><span>Revenue sync:</span><span>Active</span></div>
            </div>
          </motion.div>
          {/* Layout 2: Central Metrics Control Panel (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[310px] md:w-[330px] p-5 rounded-2xl border border-white/20 bg-background/80 dark:bg-zinc-900/80 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Real-time sessions</span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-bold rounded">LIVE</span>
            </div>
            <div className="text-xl font-black text-foreground font-heading">248 active users</div>
            <div className="h-10 flex items-end gap-1">
              {[20, 35, 45, 38, 55, 48].map((h, idx) => (
                <div key={idx} className="flex-1 rounded-sm bg-gradient-to-t from-primary/50 to-primary" style={{ height: `${h}%` }} />
              ))}
            </div>
          </motion.div>
          {/* Layout 3: Tracking seal (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-primary" />
              <div className="text-[11px] font-bold text-foreground">GA4 Integrated</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">GTM DataLayer: Active</div>
          </motion.div>
        </div>
      );

    // ══════════════════════ DCS (CONSULTANCY) SLUGS ══════════════════════
    case "us-company":
    case "uk-company":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Legal Registration Seal (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[280px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Incorporated Structure</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Official Registry File</span>
              <span className="text-emerald-500 font-bold text-[9px]">APPROVED</span>
            </div>
            <div className="space-y-1 text-[9px] text-muted-foreground font-mono">
              <div className="flex justify-between"><span>State Agent:</span><span>Delaware Active</span></div>
              <div className="flex justify-between"><span>IRS Processing:</span><span className="text-primary font-bold">In-Progress</span></div>
            </div>
          </motion.div>
          {/* Layout 2: Corporate Business Debit Card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 45 }}
            className="absolute top-20 right-2 w-[260px] md:w-[280px] aspect-[1.58/1] rounded-[20px] border border-white/30 dark:border-white/10 bg-gradient-to-tr from-white/10 via-white/5 to-white/0 dark:from-white/[0.08] dark:via-white/[0.03] dark:to-transparent backdrop-blur-2xl shadow-2xl p-4 flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-indigo-500/10 pointer-events-none" />
            <div className="flex justify-between items-start relative z-10">
              <CreditCard className="w-7 h-7 text-white/80" />
              <span className="font-bold text-[8px] text-white/60 tracking-wider">BUSINESS PLATINUM</span>
            </div>
            <div className="space-y-1 relative z-10 font-mono text-white/90 text-xs tracking-widest">
              •••• •••• 9284
              <div className="text-[7px] text-white/50 tracking-normal pt-1.5">DYNIME GROUP LLC</div>
            </div>
          </motion.div>
          {/* Layout 3: IRS EIN seal (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-emerald-500/20 bg-background/90 dark:bg-zinc-900/90 backdrop-blur-xl shadow-xl flex flex-col gap-1 border-l-[6px] border-l-emerald-500"
          >
            <div className="flex items-center gap-3">
              <Check className="w-4 h-4 text-emerald-500" />
              <div className="text-[11px] font-bold text-foreground">IRS EIN Assigned</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Tax Form 1120-F Prep: Ready</div>
          </motion.div>
        </div>
      );

    case "virtual-address":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Mail Scans (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[240px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Mailroom Scanner</span>
            <div className="text-xs font-bold text-foreground">PDF scan ready</div>
            <div className="space-y-1 text-[9px] text-muted-foreground font-mono">
              <div>Resolution: 300 DPI</div>
              <div>Forwarding: Instant</div>
            </div>
          </motion.div>
          {/* Layout 2: Mail Inbox Dashboard (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[290px] md:w-[310px] p-5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-3.5"
          >
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Mailroom Inbox</span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded">1 NEW</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-lg bg-muted/40 border border-border/10 flex justify-between items-center">
                <span>IRS Tax Form 1099</span>
                <span className="text-primary font-mono text-[9px]">Scan PDF</span>
              </div>
              <div className="p-2 rounded-lg bg-muted/40 border border-border/10 flex justify-between items-center text-[10px] text-muted-foreground">
                <span>Bank Statement (Wise)</span>
                <span>Archived</span>
              </div>
            </div>
          </motion.div>
          {/* Layout 3: Location validation (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-primary animate-pulse" />
              <div className="text-[11px] font-bold text-foreground">US & UK Address</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Physical Address Verification: Active</div>
          </motion.div>
        </div>
      );

    case "itin-services":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Certification Agent Stamp (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[260px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">IRS CAA Certified</span>
            <div className="text-xs font-bold text-foreground">CAA agent processing active</div>
            <div className="space-y-1 text-[9px] font-mono text-muted-foreground">
              <div>Agent Code: CAA-1942</div>
              <div>Passport verification: Online</div>
            </div>
          </motion.div>
          {/* Layout 2: ITIN Document checklist (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[290px] md:w-[310px] p-5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-3.5"
          >
            <div className="flex justify-between items-center border-b border-border/20 pb-2">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">W-7 Application</span>
              <span className="text-[9px] text-emerald-500 font-bold">Status: Ready</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-500"><CheckCircle className="w-3.5 h-3.5" /> <span>W-7 Form Filled</span></div>
              <div className="flex items-center gap-2 text-emerald-500"><CheckCircle className="w-3.5 h-3.5" /> <span>Identity Verified</span></div>
              <div className="flex items-center gap-2 text-primary"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> <span className="text-muted-foreground">IRS Shipping Prep</span></div>
            </div>
          </motion.div>
          {/* Layout 3: Safe ID validation (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <Fingerprint className="w-4 h-4 text-primary" />
              <div className="text-[11px] font-bold text-foreground">Secure Identity Check</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">No original passports mailed to IRS</div>
          </motion.div>
        </div>
      );

    case "dropshipping-solution":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Product margins (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[240px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Gross Profit Target</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>product markup</span>
              <span className="text-emerald-500">65% Margins</span>
            </div>
            <div className="space-y-1 text-[9px] font-mono text-muted-foreground border-t border-white/5 pt-1.5">
              <div className="flex justify-between"><span>COGS:</span><span>$12.40</span></div>
              <div className="flex justify-between"><span>Retail Sell:</span><span className="text-emerald-500">$34.99</span></div>
            </div>
          </motion.div>
          {/* Layout 2: Inventory sourcer panel (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[290px] md:w-[310px] p-5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Suppliers Sourcing</span>
              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 text-[9px] font-bold rounded">AUTOMATED</span>
            </div>
            <div className="p-2.5 bg-muted/40 rounded-xl space-y-1.5 border border-border/10 text-xs">
              <div className="flex justify-between"><span>Supplier status</span><span className="text-emerald-500 font-bold">Connected</span></div>
              <div className="flex justify-between text-muted-foreground text-[10px]"><span>Auto order sync</span><span>Active (API)</span></div>
              <div className="flex justify-between text-muted-foreground text-[10px]"><span>Stock level check</span><span>Hourly</span></div>
            </div>
          </motion.div>
          {/* Layout 3: Shipping validation (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-primary" />
              <div className="text-[11px] font-bold text-foreground">Global Auto-Fulfillment</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">US/EU Shipping: 5-8 Days Tracking</div>
          </motion.div>
        </div>
      );

    case "marketplace-solution":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Seller payout tier (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[240px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Commission Logic</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Platform Take-Rate</span>
              <span className="text-primary">15% Split</span>
            </div>
            <div className="space-y-1 text-[9px] text-muted-foreground font-mono border-t border-white/5 pt-1.5">
              <div className="flex justify-between"><span>Payout delay:</span><span>Instant</span></div>
              <div className="flex justify-between"><span>VAT collection:</span><span>Auto-managed</span></div>
            </div>
          </motion.div>
          {/* Layout 2: Multi-vendor dashboard (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[290px] md:w-[310px] p-5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-3.5"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Vendor Ledger</span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded">STRIPE CONNECT</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center p-2 rounded bg-muted/40 border border-border/10">
                <span>Merchant #1094</span>
                <span className="font-bold text-foreground">$1,480.00</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/40 border border-border/10 text-[10px] text-muted-foreground">
                <span>Merchant #1095</span>
                <span className="font-semibold">$842.10</span>
              </div>
            </div>
          </motion.div>
          {/* Layout 3: Marketplace node status (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <Users2 className="w-4 h-4 text-primary" />
              <div className="text-[11px] font-bold text-foreground">Stripe Connect Sync</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">KYC / AML Onboarding Checklist Complete</div>
          </motion.div>
        </div>
      );

    case "payment-gateway":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: KYC Validation check (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[240px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Compliance Audit</span>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between items-center font-bold text-foreground">
                <span>KYC Identity Check</span>
                <span className="text-emerald-500">Passed</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>AML screening</span>
                <span className="text-emerald-500 font-medium">Clear</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Risk rating</span>
                <span className="text-primary font-medium">Low Risk</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Watchlist matches</span>
                <span className="text-emerald-500 font-medium">0 Matches</span>
              </div>
            </div>
          </motion.div>
          {/* Layout 2: Gateway checkout modal (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-24 right-2 w-[290px] md:w-[310px] p-5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-3.5"
          >
            <div className="flex justify-between items-center border-b border-border/20 pb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Authorize Payment</span>
              <Lock className="w-3 h-3 text-primary animate-pulse" />
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2 bg-muted/40 rounded-xl flex justify-between items-center border border-border/10">
                <span>Credit Card sync</span>
                <span className="text-emerald-500 font-bold">READY</span>
              </div>
              <div className="p-2 bg-muted/40 rounded-xl flex justify-between items-center border border-border/10 text-[10px] text-muted-foreground">
                <span>Stripe gateway</span>
                <span className="text-emerald-500">Connected</span>
              </div>
              <div className="p-2 bg-muted/40 rounded-xl flex justify-between items-center border border-border/10 text-[10px] text-muted-foreground">
                <span>3D Secure 2.0</span>
                <span className="text-emerald-500">Enforced</span>
              </div>
            </div>
          </motion.div>
          {/* Layout 3: Gateway compliance status (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-2xl shadow-xl space-y-2"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
              <div className="text-[11px] font-bold text-foreground">PCI-DSS Level 1 Secured</div>
            </div>
            <div className="flex gap-1.5 flex-wrap pt-1">
              {["AES-256", "TLS 1.3", "Tokenization"].map(t => (
                <span key={t} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground border border-white/5">{t}</span>
              ))}
            </div>
          </motion.div>
        </div>
      );

    case "consulting":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Consultant Scheduler Widget (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[260px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Live Roadmap Strategy</span>
            <div className="text-xs font-bold text-foreground">Q3 Scaling Targets Approved</div>
            <div className="space-y-1 text-[9px] text-muted-foreground font-mono pt-1">
              <div>Advisory Hours: 12 hrs/mo</div>
              <div>Consult Pipeline: Activated</div>
            </div>
          </motion.div>
          {/* Layout 2: Business Advice roadmap card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[290px] md:w-[310px] p-5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-3.5"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Growth Roadmap</span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded">CONSULTANCY</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span>Phase 1: Structure</span><span className="text-emerald-500 font-bold">Ready</span></div>
              <div className="flex justify-between"><span>Phase 2: Payment flow</span><span className="text-emerald-500 font-bold">Ready</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Phase 3: Scale Ads</span><span className="text-primary font-bold">In-Progress</span></div>
            </div>
          </motion.div>
          {/* Layout 3: ROI badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <Award className="w-4 h-4 text-primary" />
              <div className="text-[11px] font-bold text-foreground">Certified Advisers</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Average ROI Multiplier: 4.8x</div>
          </motion.div>
        </div>
      );

    // ══════════════════════ DSS (SOFTWARE & AI) SLUGS ══════════════════════
    case "ai-software-development":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: AI Prompt node (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[280px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">LLM Prompter</span>
            <div className="text-xs font-bold text-foreground">"Generate React table..."</div>
            <div className="space-y-1 text-[9px] font-mono text-muted-foreground">
              <div>Temperature: 0.2 (Stricter)</div>
              <div>System Prompts: Enforced</div>
            </div>
          </motion.div>
          {/* Layout 2: Chat-to-Component AI code log (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[300px] md:w-[320px] rounded-2xl border border-primary/20 bg-zinc-950 shadow-2xl overflow-hidden font-mono"
          >
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/5 bg-white/[0.03] text-xs text-white/40">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-primary animate-pulse" /> AI Assistant
              </div>
              <span className="text-[9px] text-emerald-500 font-bold">12ms response</span>
            </div>
            <div className="p-3.5 text-[9px] text-emerald-400 space-y-1 leading-relaxed">
              <div className="text-white/60">router.get('/health', (req, res) =&gt; &#123;</div>
              <div className="pl-3 text-white/60">res.status(200).json(&#123; status: 'active' &#125;);</div>
              <div className="text-white/60">&#125;);</div>
              <div className="text-muted-foreground pt-1.5">&gt; Vector DB indexing sync: Complete</div>
            </div>
          </motion.div>
          {/* Layout 3: Vector connection (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <Cpu className="w-4 h-4 text-primary animate-pulse" />
              <div className="text-[11px] font-bold text-foreground">Vector synced</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Gemini Flash-1.5 Embeddings Active</div>
          </motion.div>
        </div>
      );

    case "custom-software-development":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Migration script (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[260px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">DB Migration script</span>
            <div className="text-xs font-mono font-bold text-foreground">Schema::create('tenants')</div>
            <div className="space-y-1 text-[9px] font-mono text-muted-foreground">
              <div>$ php artisan migrate --force</div>
              <div className="text-emerald-500">Migration database completed successfully</div>
            </div>
          </motion.div>
          {/* Layout 2: FSD modular structure blueprint (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[290px] md:w-[310px] p-5 rounded-2xl border border-white/20 bg-background/85 shadow-2xl space-y-3.5"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-mono">FSD Architecture</span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded">ENTERPRISE</span>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="text-primary font-bold">↳ app/</div>
              <div className="pl-3 text-muted-foreground">↳ pages/ (routes)</div>
              <div className="pl-3 text-muted-foreground">↳ widgets/ (compositions)</div>
              <div className="pl-3 text-muted-foreground">↳ entities/ (business logic)</div>
            </div>
          </motion.div>
          {/* Layout 3: Health test badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <Server className="w-4 h-4 text-primary" />
              <div className="text-[11px] font-bold text-foreground">Docker compiled</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Uptime: 100% | Kubernetes replica ok</div>
          </motion.div>
        </div>
      );

    case "software-built-with-ai":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: AI Prompt generator (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[260px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Refactor Suggestion</span>
            <div className="text-xs font-bold text-foreground">Optimize SQL users indices</div>
            <div className="text-[9px] text-emerald-500 font-mono">Found 3 indexing redundancy bugs</div>
          </motion.div>
          {/* Layout 2: Code AI generation interface (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[300px] md:w-[320px] rounded-2xl border border-primary/25 bg-zinc-950 shadow-2xl overflow-hidden font-mono"
          >
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/5 bg-white/[0.03] text-xs text-white/40">
              <div className="flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 text-primary animate-pulse" /> AI Refactorer
              </div>
              <span className="text-[9px] text-primary">review code</span>
            </div>
            <div className="p-3.5 text-[9px] text-indigo-300 space-y-1.5 leading-relaxed">
              <div className="text-emerald-400">&gt; Applying callback patch... [OK]</div>
              <div className="text-white/60">CREATE INDEX idx_user_role ON users (role, status);</div>
              <div className="text-emerald-500">&gt; Query execution optimized +140%</div>
            </div>
          </motion.div>
          {/* Layout 3: AI Sync check (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <div className="text-[11px] font-bold text-foreground">Gemini Model Active</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Self-Correction Engine: Active</div>
          </motion.div>
        </div>
      );

    case "software-testing-qa":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Cypress check (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[260px] p-4 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-2"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Unit Coverage</span>
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Test coverage</span>
              <span className="text-emerald-500 font-bold">98%</span>
            </div>
            <div className="space-y-1 text-[9px] text-muted-foreground font-mono">
              <div className="flex justify-between"><span>Files tested:</span><span>142 files</span></div>
              <div className="flex justify-between"><span>Integration tests:</span><span>Passed</span></div>
            </div>
          </motion.div>
          {/* Layout 2: Test assertion terminal runner (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[300px] md:w-[320px] rounded-2xl border border-white/20 bg-zinc-950 shadow-2xl overflow-hidden font-mono"
          >
            <div className="flex items-center gap-2 px-3.5 py-2 border-b border-white/5 bg-white/[0.03] text-xs text-white/40 font-medium">
              <Terminal className="w-3.5 h-3.5 text-primary" /> cypress run
            </div>
            <div className="p-3.5 text-[9px] text-emerald-400 space-y-1.5 leading-relaxed">
              <div className="flex justify-between"><span>✔ Assert items added</span><span className="text-emerald-500">12ms</span></div>
              <div className="flex justify-between"><span>✔ Verify Stripe token</span><span className="text-emerald-500">84ms</span></div>
              <div className="flex justify-between"><span>✔ Validate JWT payload</span><span className="text-emerald-500">18ms</span></div>
            </div>
          </motion.div>
          {/* Layout 3: QA status badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <div className="text-[11px] font-bold text-foreground">QA Pipeline 100% Stable</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Jenkins / GitHub Actions Status: Pass</div>
          </motion.div>
        </div>
      );

    // ══════════════════════ DES (ECOMMERCE) SLUGS ══════════════════════
    case "wordpress-ecommerce":
    case "nodejs-mern-ecommerce":
    case "laravel-ecommerce":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layout 1: Admin Order Notification (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[270px] p-5 rounded-xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-lg space-y-1.5"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Store Backend Log</span>
            <div className="text-xs font-bold text-foreground">Webhook order event dispatched</div>
            <div className="space-y-1 text-[9px] text-muted-foreground font-mono border-t border-white/5 pt-1">
              <div>Job queue: active (0 jobs pending)</div>
              <div>Route status: 200 OK</div>
            </div>
          </motion.div>
          {/* Layout 2: Ecommerce database analytics grid (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-20 right-2 w-[310px] md:w-[330px] p-6 rounded-2xl border border-white/25 bg-background/80 shadow-2xl space-y-3.5"
          >
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Sales Monitor</span>
                <h4 className="text-xl font-black text-foreground">$18,290.00</h4>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 font-bold text-[9px] rounded border border-emerald-500/20">+42% Growth</span>
            </div>
            <div className="h-10 flex items-end gap-1">
              {[25, 45, 38, 55, 48, 68].map((h, idx) => (
                <div key={idx} className="flex-1 rounded-sm bg-gradient-to-t from-primary/50 to-primary" style={{ height: `${h}%` }} />
              ))}
            </div>
          </motion.div>
          {/* Layout 3: Payment gateway node sync (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-2xl shadow-xl space-y-1"
          >
            <div className="flex items-center gap-3">
              <Server className="w-4 h-4 text-primary" />
              <div className="text-[11px] font-bold text-foreground">API Webhook connected</div>
            </div>
            <div className="text-[9px] text-muted-foreground font-mono">Secure Token verification check: Valid</div>
          </motion.div>
        </div>
      );

    // ══════════════════════ CORE CATEGORY DEFAULT VISUALS ══════════════════════
    case "des": // ══════════════ DEFAULT ECOMMERCE CATEGORY ══════════════
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layer 1: Background Monthly Sales Graph Card (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-2 w-[280px] p-4 rounded-2xl border border-white/10 dark:border-white/5 bg-background/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-lg space-y-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Sales growth</span>
              <span className="text-xs font-bold text-emerald-500">+124.5%</span>
            </div>
            <div className="text-2xl font-extrabold text-foreground font-heading">$84,392.50</div>
            <div className="h-14 flex items-end gap-1">
              {[20, 30, 25, 45, 38, 55, 48, 70].map((h, idx) => (
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
            <div className="w-20 h-4 bg-zinc-800 rounded-full mx-auto -mt-2 mb-2 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
            </div>

            <div className="flex-1 flex flex-col justify-between pt-2">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] text-zinc-400">
                  <span>Pay Dynime</span>
                </div>
                <div className="text-center py-2 bg-zinc-900/50 rounded-xl border border-zinc-800/80">
                  <div className="text-[9px] text-zinc-400">Total Due</div>
                  <div className="text-lg font-bold text-white tracking-tight">$1,299.00</div>
                </div>
              </div>

              <div className="space-y-2 pb-1">
                <div className="w-full h-8 rounded-xl bg-primary text-white text-[10px] font-bold flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" /> Pay with Stripe
                </div>
              </div>
            </div>
          </motion.div>

          {/* Layer 3: Floating Success Bubble Card (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 left-6 p-4 rounded-2xl border border-emerald-500/20 bg-background/90 backdrop-blur-xl shadow-2xl flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-[12px] font-bold text-foreground">Order Completed</div>
            </div>
          </motion.div>
        </div>
      );

    case "dms": // ══════════════ DEFAULT MARKETING CATEGORY ══════════════
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layer 1: Huge Search Console Rank (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 right-2 w-[260px] p-4 rounded-2xl border border-white/10 dark:border-white/5 bg-background/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-lg space-y-3"
          >
            <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <span>Google Rank Metrics</span>
              <Search className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-2xl font-extrabold text-foreground font-heading">Top #1 Rank</div>
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
            </div>
            
            <div className="space-y-3">
              <div className="h-16 flex items-end gap-1 bg-muted/20 rounded-lg p-2 border border-border/10">
                {[15, 30, 20, 40, 35, 60, 50, 80].map((h, idx) => (
                  <div 
                    key={idx} 
                    className="flex-1 rounded-sm bg-gradient-to-t from-primary/50 to-primary"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Layer 3: Ads Return on Investment Badge (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 95 }}
            className="absolute bottom-12 right-2 w-[180px] p-4 rounded-2xl border border-primary/20 bg-primary/10 backdrop-blur-xl shadow-2xl"
          >
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Performance Ads</div>
            <div className="text-xl font-heading font-extrabold text-foreground tracking-tight">6.8x ROAS</div>
          </motion.div>
        </div>
      );

    case "dss": // ══════════════ DEFAULT SOFTWARE & AI CATEGORY ══════════════
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layer 1: Code Terminal Log Card (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -25 }}
            className="absolute top-2 left-2 right-2 rounded-2xl border border-white/10 bg-zinc-950/80 shadow-lg overflow-hidden font-mono"
          >
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              <span className="text-[10px] text-white/40 ml-2">ai_automated_qa.sh</span>
            </div>
            <div className="p-4 text-[10px] text-emerald-400 space-y-1.5 leading-relaxed">
              <div><span className="text-indigo-400">$</span> npm run test:ai-agents</div>
              <div className="text-white/60">&gt; Starting QA execution loops...</div>
            </div>
          </motion.div>

          {/* Layer 2: Main AI Neural Nodes Connection Card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-36 left-4 right-4 p-4 rounded-2xl border border-white/20 bg-background/85 shadow-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-primary/20 animate-pulse">
                <Sparkles className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">AI Pipeline</h4>
              </div>
            </div>
          </motion.div>

          {/* Layer 3: Terminal Output Capsule (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 right-6 p-4 rounded-xl border border-primary/20 bg-primary/15 backdrop-blur-xl shadow-xl flex items-center gap-3"
          >
            <Activity className="w-4.5 h-4.5 text-primary animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider font-mono uppercase text-foreground">Status: 200 OK</span>
          </motion.div>
        </div>
      );

    case "dcs": // ══════════════ DEFAULT CONSULTANCY CATEGORY ══════════════
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layer 1: Corporate Incorporation Certificate (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -30 }}
            className="absolute top-2 left-4 right-4 p-4 rounded-2xl border border-white/10 dark:border-white/5 bg-background/40 dark:bg-zinc-900/40 backdrop-blur-xl shadow-lg space-y-3"
          >
            <div className="flex justify-between items-center border-b border-border/20 pb-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">UK Company Registrar</span>
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold">Dynime Enterprise Group Ltd.</h4>
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
            </div>
            
            <div className="space-y-2 relative z-10">
              <div className="text-sm font-mono text-white/90 tracking-widest">•••• •••• •••• 9284</div>
            </div>
          </motion.div>

          {/* Layer 3: Compliance Checklist Card (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 95 }}
            className="absolute bottom-12 right-4 p-4 rounded-xl border border-emerald-500/20 bg-background/90 backdrop-blur-xl shadow-2xl flex items-center gap-3"
          >
            <Check className="w-4 h-4 text-emerald-500" />
            <div>
              <div className="text-[11px] font-bold text-foreground">Compliance Approved</div>
            </div>
          </motion.div>
        </div>
      );

    case "os": // ══════════════ DEFAULT DYNIME OS ══════════════
    case "dbm":
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layer 1: Main Platform UI mock (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -25 }}
            className="absolute top-2 left-4 right-4 p-4 rounded-2xl border border-white/10 dark:border-white/5 bg-background/40 dark:bg-zinc-900/40 backdrop-blur-xl shadow-lg space-y-3"
          >
            <div className="flex justify-between items-center border-b border-border/20 pb-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Operating System</span>
              <Activity className="w-4 h-4 text-primary animate-pulse" />
            </div>
          </motion.div>

          {/* Layer 2: Global Database Sync Node Card (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 40 }}
            className="absolute top-32 left-2 w-[280px] p-4 rounded-2xl border border-white/20 bg-background/80 shadow-2xl space-y-3"
          >
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-primary" />
              <div>
                <h4 className="text-xs font-bold">Node Replication Sync</h4>
              </div>
            </div>
          </motion.div>

          {/* Layer 3: Pulse Trigger Action Card (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 right-4 p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-xl shadow-xl flex items-center gap-3"
          >
            <Play className="w-3.5 h-3.5 text-primary" />
            <div>
              <div className="text-[11px] font-bold text-foreground">Trigger CRM</div>
            </div>
          </motion.div>
        </div>
      );

    case "dws": // ══════════════ DEFAULT WEB SERVICES CATEGORY ══════════════
    default:
      return (
        <div className="relative w-full h-[400px] lg:h-[480px]">
          {/* Layer 1: Code editor window mockup (Far) */}
          <motion.div 
            style={{ x: depthFarX, y: depthFarY, translateZ: -25 }}
            className="absolute top-2 right-2 w-[280px] rounded-2xl border border-white/10 bg-zinc-950/85 shadow-lg overflow-hidden font-mono"
          >
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5 bg-white/[0.02]">
              <span className="text-[9px] text-white/40 ml-2">App.tsx</span>
            </div>
            <div className="p-3 text-[10px] text-indigo-300 space-y-1.5 leading-relaxed">
              <div><span className="text-purple-400">const</span> Dynime = () =&gt; &#123;</div>
              <div className="pl-3 text-emerald-400">return &lt;<span className="text-amber-300">FastLoad</span> score=99 /&gt;</div>
            </div>
          </motion.div>

          {/* Layer 2: Main Floating Browser Window (Mid) */}
          <motion.div 
            style={{ x: depthMidX, y: depthMidY, translateZ: 35 }}
            className="absolute top-24 left-2 w-[340px] rounded-2xl border border-white/20 bg-background/80 shadow-2xl overflow-hidden"
          >
            <div className="px-3.5 py-2.5 border-b border-border/20 bg-muted/40 flex items-center justify-between">
              <Globe className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="p-4 space-y-3">
              <div className="h-4 w-[60%] rounded bg-primary/20" />
              <div className="space-y-2">
                <div className="h-2.5 w-[95%] rounded bg-muted" />
              </div>
            </div>
          </motion.div>

          {/* Layer 3: Database & Speed Score status card (Close) */}
          <motion.div 
            style={{ x: depthCloseX, y: depthCloseY, translateZ: 90 }}
            className="absolute bottom-12 right-2 w-[160px] p-4 rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-xl shadow-xl space-y-1.5"
          >
            <Zap className="w-4.5 h-4.5 text-primary" />
            <div className="text-2xl font-extrabold text-foreground font-heading">99 / 100</div>
          </motion.div>
        </div>
      );
  }
}
