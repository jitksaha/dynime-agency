import type { CheckoutRequest, GatewayResult } from "./_types.ts";

export async function processBankTransfer(
  supabaseAdmin: any,
  _req: CheckoutRequest,
): Promise<GatewayResult> {
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("key, value")
    .in("key", [
      "bank_transfer_accounts",
      "bank_transfer_instructions",
      "bank_transfer_display_name",
    ]);
  if (error) throw new Error(`Failed to load bank transfer settings: ${error.message}`);

  const map: Record<string, unknown> = {};
  data?.forEach((row: { key: string; value: unknown }) => {
    const v = row.value;
    map[row.key] = typeof v === "string" ? v.replace(/^"|"$/g, "") : v;
  });

  let accounts: unknown[] = [];
  try {
    const raw = map.bank_transfer_accounts;
    accounts = typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
  } catch {
    accounts = [];
  }

  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error("No bank accounts configured. Add at least one in Super Admin → Settings → Bank Transfer.");
  }

  const sessionId = `bt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return {
    session_id: sessionId,
    gateway: "bank_transfer",
    pending: true,
    accounts,
    instructions: map.bank_transfer_instructions || "",
    display_name: map.bank_transfer_display_name || "Bank Transfer",
    message: "Order placed. Please complete the bank transfer using the details provided.",
  };
}
