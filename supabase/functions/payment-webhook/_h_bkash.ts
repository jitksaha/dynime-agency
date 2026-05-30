import { json, getSetting, loadRetryPolicy, type Admin, type VerificationMeta } from "./_shared.ts";
import { hmacHex, constantTimeEqual } from "./_crypto.ts";
import { withRetry } from "./_retry.ts";
import { loadBkashCreds, getBkashGrantToken, queryBkashPayment } from "./_bkash.ts";
import { updateOrder } from "./_orders.ts";

export async function handleBkash(req: Request, admin: Admin) {
  const raw = await req.text();
  let body: { transactionStatus?: string; merchantInvoiceNumber?: string; paymentID?: string };
  try { body = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }

  const paymentID = body.paymentID;
  const orderId = body.merchantInvoiceNumber;
  if (!paymentID || !orderId) return json({ error: "Missing paymentID or merchantInvoiceNumber" }, 400);

  const callbackSecret = await getSetting(admin, "bkash_callback_secret");
  let signatureValid: boolean | null = null;
  if (callbackSecret) {
    const url = new URL(req.url);
    const provided = url.searchParams.get("sig") || req.headers.get("x-bkash-signature") || "";
    if (!provided) return json({ error: "Missing bKash callback signature" }, 401);
    const expected = await hmacHex(paymentID, callbackSecret);
    signatureValid = constantTimeEqual(provided.toLowerCase(), expected.toLowerCase());
    if (!signatureValid) {
      console.warn("[payment-webhook] bkash signature mismatch", { paymentID });
      return json({ error: "Invalid bKash signature" }, 401);
    }
  }

  const creds = await loadBkashCreds(admin);
  let authoritativeStatus = (body.transactionStatus || "").toLowerCase();
  let verifiedOrderId = orderId;
  let invoiceMismatch: boolean | null = null;
  let serverQueryUsed = false;
  let totalAttempts = 0;
  let retryExhausted = false;

  if (creds) {
    const retryPolicy = await loadRetryPolicy(admin, "bkash");

    const tokenResult = await withRetry(() => getBkashGrantToken(creds), {
      maxAttempts: retryPolicy.maxAttempts,
      baseDelayMs: retryPolicy.baseDelayMs,
      maxDelayMs: retryPolicy.maxDelayMs,
      label: "bkash:token-grant",
    });
    totalAttempts += tokenResult.attempts;

    if (!tokenResult.ok) {
      const verification: VerificationMeta = {
        provider: "bkash",
        verified_at: new Date().toISOString(),
        signature_valid: signatureValid,
        server_query_used: false,
        invoice_mismatch: null,
        authoritative_status: null,
        retry_attempts: totalAttempts,
        retry_exhausted: tokenResult.transient,
        notes: tokenResult.transient
          ? `bKash token grant unavailable after ${tokenResult.attempts} attempts — order left pending for callback retry.`
          : `bKash token grant rejected: ${tokenResult.error.message}`,
      };
      if (tokenResult.transient) {
        await admin.from("orders").update({ payment_verification: verification, updated_at: new Date().toISOString() }).eq("id", orderId);
        return json({ received: true, retry: true, attempts: totalAttempts, verification }, 503);
      }
      const updated = await updateOrder(admin, { id: orderId }, "failed", verification);
      return json({ received: true, status: "failed", updated, verification }, 502);
    }

    const queryResult = await withRetry(
      () => queryBkashPayment(creds, tokenResult.value, paymentID),
      {
        maxAttempts: retryPolicy.maxAttempts,
        baseDelayMs: retryPolicy.baseDelayMs,
        maxDelayMs: retryPolicy.maxDelayMs,
        label: "bkash:status-query",
      },
    );
    totalAttempts += queryResult.attempts;

    if (!queryResult.ok) {
      const verification: VerificationMeta = {
        provider: "bkash",
        verified_at: new Date().toISOString(),
        signature_valid: signatureValid,
        server_query_used: false,
        invoice_mismatch: null,
        authoritative_status: null,
        retry_attempts: totalAttempts,
        retry_exhausted: queryResult.transient,
        notes: queryResult.transient
          ? `bKash status query unavailable after ${queryResult.attempts} attempts — order left pending for callback retry.`
          : `bKash status query rejected: ${queryResult.error.message}`,
      };
      if (queryResult.transient) {
        retryExhausted = true;
        await admin.from("orders").update({ payment_verification: verification, updated_at: new Date().toISOString() }).eq("id", orderId);
        return json({ received: true, retry: true, attempts: totalAttempts, verification }, 503);
      }
      const updated = await updateOrder(admin, { id: orderId }, "failed", verification);
      return json({ received: true, status: "failed", updated, verification }, 502);
    }

    const result = queryResult.value;
    serverQueryUsed = true;
    authoritativeStatus = (result.transactionStatus || "").toLowerCase();
    if (result.merchantInvoiceNumber) verifiedOrderId = result.merchantInvoiceNumber;
    invoiceMismatch = verifiedOrderId !== orderId;
    if (invoiceMismatch) {
      console.warn("[payment-webhook] bkash invoice mismatch", { claimed: orderId, actual: verifiedOrderId });
    }
  } else {
    console.warn("[payment-webhook] bKash credentials missing — trusting callback payload (UNSAFE)");
  }

  let internal: string | null = null;
  switch (authoritativeStatus) {
    case "completed":
    case "successful":
      internal = "paid"; break;
    case "failed": internal = "failed"; break;
    case "cancelled": internal = "cancelled"; break;
    default:
      return json({ received: true, ignored: authoritativeStatus });
  }

  const verification: VerificationMeta = {
    provider: "bkash",
    verified_at: new Date().toISOString(),
    signature_valid: signatureValid,
    server_query_used: serverQueryUsed,
    invoice_mismatch: invoiceMismatch,
    authoritative_status: authoritativeStatus || null,
    retry_attempts: totalAttempts || undefined,
    retry_exhausted: retryExhausted || undefined,
    notes: !creds
      ? "bKash merchant credentials missing — payload trusted without server-side check."
      : !callbackSecret
        ? "Callback shared-secret not configured — only authoritative server query enforced."
        : totalAttempts > 1
          ? `Verified after ${totalAttempts} bKash API attempts (transient errors retried).`
          : undefined,
  };

  const updated = await updateOrder(admin, { id: verifiedOrderId }, internal, verification);
  return json({ received: true, status: internal, updated, verified: !!creds, verification });
}
