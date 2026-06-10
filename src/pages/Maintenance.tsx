import { useEffect } from "react";
import { Mail, Clock, ShieldCheck, Cpu } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";
import { useSiteSettings } from "@/hooks/use-data";

const Maintenance = () => {
  const { data: settings } = useSiteSettings();
  const siteName = settings?.site_name || "Dynime";

  useSEO({
    title: `Under Scheduled Maintenance | ${siteName}`,
    description: `${siteName} is currently undergoing scheduled maintenance. We'll be back shortly.`,
  });

  // Prevent scrolling on the body while on this screen
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div className="relative min-h-screen w-screen flex items-center justify-center bg-[#050507] text-foreground font-sans overflow-hidden select-none">
      {/* Premium Ambient Background Glows */}
      <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 -z-10 w-[45rem] h-[45rem] rounded-full bg-gradient-to-tr from-primary/10 to-transparent blur-[130px] animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute bottom-1/3 right-1/3 translate-x-1/2 translate-y-1/2 -z-10 w-[45rem] h-[45rem] rounded-full bg-gradient-to-br from-accent/10 to-transparent blur-[130px] animate-pulse" style={{ animationDuration: '9s' }} />
      
      {/* Decorative Cybernetic Patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:3rem_3rem] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_100%_200px,#ffffff02,transparent)]" />

      {/* Main Glassmorphic Container */}
      <div className="relative z-10 w-full max-w-lg mx-4 p-8 md:p-12 rounded-[2.5rem] border border-white/5 bg-[#0a0a0f]/60 backdrop-blur-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col items-center text-center overflow-hidden">
        {/* Accent Top Border Glow */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        {/* Animated Cyber Ring Icon Container */}
        <div className="mb-10 relative flex h-24 w-24 items-center justify-center">
          {/* Pulsing Outer Aura */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary via-accent to-primary opacity-20 blur-xl animate-pulse" />
          
          {/* Orbital Rotating Ring */}
          <div className="absolute inset-0 rounded-full border border-dashed border-primary/40 animate-spin" style={{ animationDuration: '25s' }} />
          
          {/* Inner Rotating Gear-like Ring */}
          <div className="absolute inset-2 rounded-full border border-double border-accent/30 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
          
          {/* Solid Center Icon Core */}
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-primary to-accent text-white shadow-lg flex items-center justify-center relative z-10">
            <Cpu className="w-7 h-7 animate-pulse" style={{ animationDuration: '3s' }} />
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="mb-6 tracking-widest text-[10px] font-bold uppercase text-primary flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5">
          <Clock className="w-3.5 h-3.5 animate-bounce" />
          System Optimizing
        </div>

        {/* Premium Typography Heading */}
        <h1 className="font-heading text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-b from-white via-white/90 to-white/40 bg-clip-text text-transparent">
          Back Shortly
        </h1>

        {/* Elegant Body Description */}
        <p className="text-muted-foreground/80 mt-4 text-sm md:text-base leading-relaxed max-w-sm font-light">
          {siteName} is currently undergoing scheduled engineering updates to strengthen security and speed. We appreciate your patience.
        </p>

        {/* Minimal Divider */}
        <div className="w-2/3 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent my-10" />

        {/* Urgent Contact & Assistance Section */}
        <div className="space-y-4 w-full">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60 font-semibold flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary/80" /> Urgent Support
          </p>
          <div className="flex justify-center">
            <a
              href="mailto:hello@dynime.com"
              className="flex items-center gap-2.5 px-6 py-3 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/30 text-sm text-muted-foreground hover:text-white transition-all duration-300 shadow-sm"
            >
              <Mail className="w-4 h-4 text-primary" />
              hello@dynime.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
