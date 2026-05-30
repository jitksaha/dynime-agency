import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/country-to-language";
import { useLocation } from "@/contexts/LocationContext";

interface Props {
  className?: string;
  compact?: boolean;
}

const LanguageSwitcher = ({ className, compact }: Props) => {
  const { language, setLanguage } = useLocation();
  const active = SUPPORTED_LANGUAGES.find((l) => l.code === language) ?? SUPPORTED_LANGUAGES[0];

  return (
    <Select value={language} onValueChange={(v) => setLanguage(v as SupportedLanguage)}>
      <SelectTrigger
        className={`h-9 rounded-full border-border/60 bg-background/60 text-xs font-semibold gap-1 w-auto ${compact ? "px-2.5 min-w-0" : "px-3 min-w-0"} ${className ?? ""}`}
        aria-label="Select language"
      >
        <SelectValue>
          <span className="inline-flex items-center gap-1.5" lang={active.code}>
            <span aria-hidden>{active.flag}</span>
            <span className="text-foreground">{active.nativeLabel}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {SUPPORTED_LANGUAGES.map((l) => (
          <SelectItem
            key={l.code}
            value={l.code}
            className="text-xs focus:bg-primary focus:text-primary-foreground data-[highlighted]:bg-primary data-[highlighted]:text-primary-foreground"
          >
            <span className="inline-flex items-center gap-2">
              <span aria-hidden>{l.flag}</span>
              <span className="font-medium">{l.nativeLabel}</span>
              <span className="text-muted-foreground">— {l.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LanguageSwitcher;
