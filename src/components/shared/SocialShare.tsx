import { Facebook, Linkedin, Twitter, Link2, MessageCircle, Mail } from "lucide-react";
import { toast } from "sonner";

interface Props {
  title: string;
  url?: string;
  text?: string;
  className?: string;
}

const SocialShare = ({ title, url, text, className = "" }: Props) => {
  const shareUrl =
    url || (typeof window !== "undefined" ? window.location.href : "");
  const shareText = text || title;
  const enc = encodeURIComponent;

  const targets = [
    {
      name: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}`,
      color: "hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]",
    },
    {
      name: "X / Twitter",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${enc(shareUrl)}&text=${enc(shareText)}`,
      color: "hover:bg-foreground hover:text-background hover:border-foreground",
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}`,
      color: "hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2]",
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${enc(`${shareText} ${shareUrl}`)}`,
      color: "hover:bg-[#25D366] hover:text-white hover:border-[#25D366]",
    },
    {
      name: "Email",
      icon: Mail,
      href: `mailto:?subject=${enc(title)}&body=${enc(`${shareText}\n\n${shareUrl}`)}`,
      color: "hover:bg-primary hover:text-primary-foreground hover:border-primary",
    },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs font-medium text-muted-foreground mr-1">Share:</span>
      {targets.map((t) => {
        const Icon = t.icon;
        return (
          <a
            key={t.name}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share on ${t.name}`}
            title={`Share on ${t.name}`}
            className={`inline-flex items-center justify-center w-9 h-9 rounded-full border border-border bg-secondary/40 text-muted-foreground transition-all ${t.color}`}
          >
            <Icon className="w-4 h-4" />
          </a>
        );
      })}
      <button
        type="button"
        onClick={copy}
        aria-label="Copy link"
        title="Copy link"
        className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-border bg-secondary/40 text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
      >
        <Link2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export default SocialShare;
