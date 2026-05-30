import type { Admin } from "./_shared.ts";
import { getSetting } from "./_shared.ts";
import { isTransientStatus } from "./_retry.ts";

export type BkashCreds = {
  app_key: string;
  app_secret: string;
  username: string;
  password: string;
  sandbox: boolean;
};

export type BkashStatus = {
  transactionStatus?: string;
  merchantInvoiceNumber?: string;
  trxID?: string;
  amount?: string;
};

export async function loadBkashCreds(admin: Admin): Promise<BkashCreds | null> {
  const [appKey, appSecret, username, password, sandbox] = await Promise.all([
    getSetting(admin, "bkash_app_key"),
    getSetting(admin, "bkash_app_secret"),
    getSetting(admin, "bkash_username"),
    getSetting(admin, "bkash_password"),
    getSetting(admin, "bkash_sandbox"),
  ]);
  if (!appKey || !appSecret || !username || !password) return null;
  return { app_key: appKey, app_secret: appSecret, username, password, sandbox: sandbox === "true" };
}

export const bkashBase = (sandbox: boolean) =>
  sandbox
    ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
    : "https://tokenized.pay.bka.sh/v1.2.0-beta";

export async function getBkashGrantToken(creds: BkashCreds): Promise<string> {
  const res = await fetch(`${bkashBase(creds.sandbox)}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: creds.username,
      password: creds.password,
    },
    body: JSON.stringify({ app_key: creds.app_key, app_secret: creds.app_secret }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id_token) {
    const err = new Error(`bKash token grant failed: ${data?.statusMessage || res.status}`) as Error & {
      transient?: boolean; status?: number;
    };
    err.status = res.status;
    err.transient = isTransientStatus(res.status);
    throw err;
  }
  return data.id_token as string;
}

export async function queryBkashPayment(creds: BkashCreds, token: string, paymentID: string): Promise<BkashStatus> {
  const res = await fetch(`${bkashBase(creds.sandbox)}/tokenized/checkout/payment/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "X-APP-Key": creds.app_key,
    },
    body: JSON.stringify({ paymentID }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`bKash status query failed: ${data?.statusMessage || res.status}`) as Error & {
      transient?: boolean; status?: number;
    };
    err.status = res.status;
    err.transient = isTransientStatus(res.status);
    throw err;
  }
  return data as BkashStatus;
}
