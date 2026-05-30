import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type Country = {
  name: string;
  iso2: string;
  dial: string; // without "+"
  flag: string;
};

// Curated common list. Ordered by dial length DESC for prefix detection.
export const COUNTRIES: Country[] = [
  { name: "United Kingdom", iso2: "GB", dial: "44", flag: "🇬🇧" },
  { name: "United States", iso2: "US", dial: "1", flag: "🇺🇸" },
  { name: "Canada", iso2: "CA", dial: "1", flag: "🇨🇦" },
  { name: "Bangladesh", iso2: "BD", dial: "880", flag: "🇧🇩" },
  { name: "India", iso2: "IN", dial: "91", flag: "🇮🇳" },
  { name: "Pakistan", iso2: "PK", dial: "92", flag: "🇵🇰" },
  { name: "Malaysia", iso2: "MY", dial: "60", flag: "🇲🇾" },
  { name: "Singapore", iso2: "SG", dial: "65", flag: "🇸🇬" },
  { name: "Indonesia", iso2: "ID", dial: "62", flag: "🇮🇩" },
  { name: "Philippines", iso2: "PH", dial: "63", flag: "🇵🇭" },
  { name: "Thailand", iso2: "TH", dial: "66", flag: "🇹🇭" },
  { name: "Vietnam", iso2: "VN", dial: "84", flag: "🇻🇳" },
  { name: "China", iso2: "CN", dial: "86", flag: "🇨🇳" },
  { name: "Hong Kong", iso2: "HK", dial: "852", flag: "🇭🇰" },
  { name: "Japan", iso2: "JP", dial: "81", flag: "🇯🇵" },
  { name: "South Korea", iso2: "KR", dial: "82", flag: "🇰🇷" },
  { name: "Australia", iso2: "AU", dial: "61", flag: "🇦🇺" },
  { name: "New Zealand", iso2: "NZ", dial: "64", flag: "🇳🇿" },
  { name: "UAE", iso2: "AE", dial: "971", flag: "🇦🇪" },
  { name: "Saudi Arabia", iso2: "SA", dial: "966", flag: "🇸🇦" },
  { name: "Qatar", iso2: "QA", dial: "974", flag: "🇶🇦" },
  { name: "Kuwait", iso2: "KW", dial: "965", flag: "🇰🇼" },
  { name: "Oman", iso2: "OM", dial: "968", flag: "🇴🇲" },
  { name: "Bahrain", iso2: "BH", dial: "973", flag: "🇧🇭" },
  { name: "Turkey", iso2: "TR", dial: "90", flag: "🇹🇷" },
  { name: "Egypt", iso2: "EG", dial: "20", flag: "🇪🇬" },
  { name: "South Africa", iso2: "ZA", dial: "27", flag: "🇿🇦" },
  { name: "Nigeria", iso2: "NG", dial: "234", flag: "🇳🇬" },
  { name: "Kenya", iso2: "KE", dial: "254", flag: "🇰🇪" },
  { name: "Germany", iso2: "DE", dial: "49", flag: "🇩🇪" },
  { name: "France", iso2: "FR", dial: "33", flag: "🇫🇷" },
  { name: "Spain", iso2: "ES", dial: "34", flag: "🇪🇸" },
  { name: "Italy", iso2: "IT", dial: "39", flag: "🇮🇹" },
  { name: "Netherlands", iso2: "NL", dial: "31", flag: "🇳🇱" },
  { name: "Belgium", iso2: "BE", dial: "32", flag: "🇧🇪" },
  { name: "Sweden", iso2: "SE", dial: "46", flag: "🇸🇪" },
  { name: "Norway", iso2: "NO", dial: "47", flag: "🇳🇴" },
  { name: "Denmark", iso2: "DK", dial: "45", flag: "🇩🇰" },
  { name: "Finland", iso2: "FI", dial: "358", flag: "🇫🇮" },
  { name: "Ireland", iso2: "IE", dial: "353", flag: "🇮🇪" },
  { name: "Switzerland", iso2: "CH", dial: "41", flag: "🇨🇭" },
  { name: "Austria", iso2: "AT", dial: "43", flag: "🇦🇹" },
  { name: "Portugal", iso2: "PT", dial: "351", flag: "🇵🇹" },
  { name: "Poland", iso2: "PL", dial: "48", flag: "🇵🇱" },
  { name: "Russia", iso2: "RU", dial: "7", flag: "🇷🇺" },
  { name: "Brazil", iso2: "BR", dial: "55", flag: "🇧🇷" },
  { name: "Mexico", iso2: "MX", dial: "52", flag: "🇲🇽" },
  { name: "Argentina", iso2: "AR", dial: "54", flag: "🇦🇷" },
];

const COUNTRIES_BY_PREFIX = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

export const detectCountryFromPhone = (raw: string): Country | undefined => {
  if (!raw) return undefined;
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return undefined;
  return COUNTRIES_BY_PREFIX.find((c) => digits.startsWith(c.dial));
};

interface PhoneInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

const PhoneInput = ({ value, onChange, placeholder = "+44 7000 000000", id, disabled, className }: PhoneInputProps) => {
  const handleChange = (next: string) => {
    const cleaned = next.replace(/[^\d+\s\-()]/g, "");
    if (!cleaned) return onChange("");
    const normalized = cleaned.startsWith("+") ? cleaned : `+${cleaned.replace(/^\+*/, "")}`;
    onChange(normalized);
  };

  return (
    <Input
      id={id}
      type="tel"
      inputMode="tel"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => handleChange(e.target.value)}
      className={cn("h-10", className)}
    />
  );
};

export default PhoneInput;
