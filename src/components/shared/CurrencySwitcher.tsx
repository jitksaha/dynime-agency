import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SUPPORTED_CURRENCIES,
  getCurrencyMeta,
  type CurrencyCode,
} from "@/lib/currency";

interface CurrencySwitcherProps {
  value: CurrencyCode;
  onChange: (next: CurrencyCode) => void;
  className?: string;
  compact?: boolean;
}

const CurrencySwitcher = ({ value, onChange, className, compact }: CurrencySwitcherProps) => {
  const active = getCurrencyMeta(value);
  return (
    <Select value={value} onValueChange={(v) => onChange(v as CurrencyCode)}>
      <SelectTrigger
        className={`h-9 rounded-full border-border/60 bg-background/60 text-xs font-semibold gap-1 w-auto ${compact ? "px-2.5 min-w-0" : "px-3 min-w-0"} ${className ?? ""}`}
        aria-label="Select currency"
      >
        <SelectValue>
          <span className="inline-flex items-center gap-1" lang="en">
            <span className="text-foreground">{active.symbol}</span>
            <span className="text-muted-foreground">{active.code}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {SUPPORTED_CURRENCIES.map((c) => (
          <SelectItem
            key={c.code}
            value={c.code}
            className="text-xs group focus:bg-primary focus:text-primary-foreground data-[highlighted]:bg-primary data-[highlighted]:text-primary-foreground"
          >
            <span className="inline-flex items-center gap-2" lang="en">
              <span className="font-semibold w-6 text-foreground group-focus:text-primary-foreground group-data-[highlighted]:text-primary-foreground">{c.symbol}</span>
              <span className="font-medium group-focus:text-primary-foreground group-data-[highlighted]:text-primary-foreground">{c.code}</span>
              <span className="text-muted-foreground group-focus:text-primary-foreground/90 group-data-[highlighted]:text-primary-foreground/90">— {c.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CurrencySwitcher;
