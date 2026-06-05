/**
 * ReferralTracker — reads ?ref=CODE from the URL, stores it in a 90-day cookie
 * and localStorage, then calls the backend track endpoint (fire-and-forget).
 * Place this as a side-effect component inside BrowserRouter at the top-level.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const COOKIE_NAME = 'dynime_ref';
const STORAGE_KEY = 'dynime_ref';
const EXPIRY_DAYS = 90;
const API_BASE = (import.meta.env.VITE_API_URL as string) || '/api/v1';

function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getReferralCode(): string | null {
  return getCookie(COOKIE_NAME) || localStorage.getItem(STORAGE_KEY);
}

export default function ReferralTracker() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref') || params.get('referral');
    if (!ref) return;

    const code = ref.trim().toUpperCase();
    // Store in cookie + localStorage (90-day)
    setCookie(COOKIE_NAME, code, EXPIRY_DAYS);
    localStorage.setItem(STORAGE_KEY, code);

    // Generate a stable cookie ID for dedup
    let cookieId = localStorage.getItem('dynime_cid');
    if (!cookieId) {
      cookieId = `cid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem('dynime_cid', cookieId);
    }

    // Fire-and-forget track call
    fetch(`${API_BASE}/referrals/public/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referralCode: code,
        landingPage: window.location.href,
        utmSource: params.get('utm_source') || undefined,
        utmMedium: params.get('utm_medium') || undefined,
        utmCampaign: params.get('utm_campaign') || undefined,
        cookieId,
      }),
    }).catch(() => {/* silent */});
  }, [location.search]);

  return null;
}
