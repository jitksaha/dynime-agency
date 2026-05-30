import type { GlobalUrls } from "./_types.ts";

export async function getPaymentSettings(supabaseAdmin: any, prefix: string): Promise<Record<string, string>> {
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("key, value")
    .like("key", `${prefix}_%`);
  if (error) throw new Error(`Failed to load ${prefix} settings: ${error.message}`);
  const settings: Record<string, string> = {};
  data?.forEach((row: any) => {
    const val = typeof row.value === "string" ? row.value.replace(/^"|"$/g, "") : String(row.value);
    settings[row.key] = val;
  });
  return settings;
}

export async function getGlobalUrls(supabaseAdmin: any): Promise<GlobalUrls> {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("key, value")
    .in("key", ["payment_success_url", "payment_fail_url", "payment_cancel_url"]);
  const map: Record<string, string> = {};
  data?.forEach((row: any) => {
    const v = typeof row.value === "string" ? row.value.replace(/^"|"$/g, "") : String(row.value);
    map[row.key] = v;
  });
  return {
    success_url: map.payment_success_url || "",
    fail_url: map.payment_fail_url || "",
    cancel_url: map.payment_cancel_url || "",
  };
}
