/**
 * Placeholder system for admin-editable footer text.
 *
 * Tokens are case-insensitive and written as `{token}`.
 * Add new tokens here — they are picked up by both the live Footer
 * and the admin preview automatically.
 */

export interface PlaceholderDef {
  token: string;
  label: string;
  example: string;
  resolve: () => string;
}

const now = () => new Date();

export const FOOTER_PLACEHOLDERS: PlaceholderDef[] = [
  {
    token: "year",
    label: "Current year",
    example: String(now().getFullYear()),
    resolve: () => String(now().getFullYear()),
  },
  {
    token: "month",
    label: "Current month name",
    example: now().toLocaleString("en-US", { month: "long" }),
    resolve: () => now().toLocaleString("en-US", { month: "long" }),
  },
  {
    token: "date",
    label: "Today (YYYY-MM-DD)",
    example: now().toISOString().slice(0, 10),
    resolve: () => now().toISOString().slice(0, 10),
  },
  {
    token: "company",
    label: "Company name",
    example: "Dynime LLC",
    resolve: () => "Dynime LLC",
  },
  {
    token: "brand",
    label: "Brand short name",
    example: "Dynime",
    resolve: () => "Dynime",
  },
];

const TOKEN_RE = /\{([a-zA-Z][a-zA-Z0-9_-]*)\}/g;

/** Replace all `{token}` occurrences with their resolved value. */
export const renderPlaceholders = (input: string | null | undefined): string => {
  if (!input) return "";
  const map = new Map(FOOTER_PLACEHOLDERS.map((p) => [p.token.toLowerCase(), p.resolve()]));
  return input.replace(TOKEN_RE, (full, name: string) => {
    const value = map.get(name.toLowerCase());
    return value ?? full;
  });
};
