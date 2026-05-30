// Default + types for the About page "Our Story" timeline.
// Stored in `site_settings` under the `about_timeline` key as JSON.
import {
  Sparkles, Briefcase, Globe, Landmark, MapPin, Building2, Globe2,
  Cpu, Rocket, TrendingUp, Award, Target, Eye, Heart, Users, Zap,
  Star, Flag, Calendar, type LucideIcon,
} from "lucide-react";

export type TimelineItem = {
  year: string;
  tag: string;
  icon: string; // lucide icon name
  title: string;
  desc: string;
};

export const TIMELINE_ICONS: Record<string, LucideIcon> = {
  Sparkles, Briefcase, Globe, Landmark, MapPin, Building2, Globe2,
  Cpu, Rocket, TrendingUp, Award, Target, Eye, Heart, Users, Zap,
  Star, Flag, Calendar,
};

export const TIMELINE_ICON_NAMES = Object.keys(TIMELINE_ICONS);

export const getTimelineIcon = (name: string): LucideIcon =>
  TIMELINE_ICONS[name] || Sparkles;

export const ABOUT_TIMELINE_KEY = "about_timeline";

export const DEFAULT_ABOUT_TIMELINE: TimelineItem[] = [
  { year: "2020", tag: "The Beginning", icon: "Sparkles", title: "A Small Vision, Nationwide", desc: "Started as a small business with a vision to deliver WordPress services to businesses nationwide." },
  { year: "2022", tag: "Agency Born", icon: "Briefcase", title: "Launched Our Named Agency", desc: "Established the agency under its own brand, serving clients in specific countries with focused expertise." },
  { year: "Late 2023", tag: "Going Global", icon: "Globe", title: "Planning Cross-Border Expansion", desc: "Began planning to expand our model into the USA, Europe, and Asia — operating remotely as an unregistered entity." },
  { year: "Mar 2024", tag: "Registered", icon: "Landmark", title: "Officially Registered in London", desc: "Registered and permitted to operate globally from London — our first official headquarters." },
  { year: "Late 2024", tag: "USA Entry", icon: "MapPin", title: "Texas, USA — Permitted & Live", desc: "Received government permission and expanded operations into Texas, USA." },
  { year: "2025", tag: "New York", icon: "Building2", title: "Expanded to New York", desc: "Brought our services to New York and strengthened our US presence." },
  { year: "2025", tag: "Worldwide", icon: "Globe2", title: "Serving Eligible Countries Worldwide", desc: "Expanded service delivery to many eligible countries with no major legal restrictions." },
  { year: "Mid 2025", tag: "Consultancy", icon: "Briefcase", title: "Registered Consultancy in US, UK & BD", desc: "Introduced consultancy services as a registered business across the US, UK, and Bangladesh." },
  { year: "2025", tag: "R&D", icon: "Cpu", title: "Building AI, Dynime & SaaS", desc: "Started dedicated work on AI products, the Dynime platform, and SaaS offerings." },
  { year: "2026", tag: "Launch", icon: "Rocket", title: "Launching Dynime — Complete Business OS", desc: "Bringing Dynime to the world: a complete operating system for modern businesses." },
  { year: "Beyond", tag: "What's Next", icon: "TrendingUp", title: "Planning the Next Chapter of Growth", desc: "Continuing to scale, innovate, and shape the future of global digital business." },
];
