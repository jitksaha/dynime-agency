---
name: Auth migration — NestJS pure auth
description: Supabase auth fully replaced by NestJS JWT auth in use-auth.tsx, api.ts, all login pages, and AuthDialog. Supabase client.ts kept only for data queries in remaining pages.
---

## What was replaced
- `use-auth.tsx` — no longer uses `supabase.auth.*`; uses NestJS `/api/v1/auth/login`, `/api/v1/auth/logout`, `/api/v1/auth/profile` + JWT decode from `nestjs-tokens.ts`
- `api.ts` — removed Supabase fallback; pure NestJS token with auto-refresh
- `nestjs-tokens.ts` — removed `exchangeForNestTokens` and `getBestToken` (Supabase-dependent); kept only `setNestTokens`, `getNestAccessToken`, `getNestRefreshToken`, `clearNestTokens`, `refreshNestTokens`
- `AuthDialog.tsx` — replaced supabase.auth with NestJS login/register endpoints; removed magic link tab
- `AdminLogin.tsx`, `AccountLogin.tsx`, `EmployeeLogin.tsx`, `InvestorLogin.tsx` — all replaced supabase.auth with NestJS auth via `useAuth().signIn` + fetch to `/api/v1/auth/register`

## New NestJS auth endpoint
`GET /api/v1/auth/profile` — returns `{ full_name, avatar_url }` from `profiles` table; used by `use-auth.tsx` to populate `user.user_metadata`.

## AppUser type
```ts
export interface AppUser {
  id: string;
  email: string | null;
  roles: string[];
  user_metadata?: { full_name?: string; avatar_url?: string; [key: string]: unknown };
}
```
This replaces the Supabase `User` type. Same fields used by most downstream components (`id`, `email`, `user_metadata?.full_name`).

## Magic link removed
OTP/magic-link sign-in was removed (Supabase-only feature). Password reset still works via `POST /api/v1/auth/password/reset-request`.

## Supabase client still present
`src/integrations/supabase/client.ts` remains for ~100 data-page files that still call `supabase.from('table')`. These need per-table NestJS endpoints and frontend rewrites as follow-up work.

**Why:** Can't remove client.ts until all data calls are migrated to NestJS API endpoints — removing it would break 100+ pages.

## Removed artifacts
- `.lovable/` folder deleted
- `docs/` folder (Lovable migration guides) deleted
- `migration/` folder (Supabase→NestJS scripts) deleted
- `src/pages/SupabaseStatus.tsx` deleted
- Route `/diagnostics/supabase` removed from App.tsx
