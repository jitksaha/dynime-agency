---
name: TFINAL auth seam flip
description: How the NestJS token layer was inserted on top of Supabase auth — zero-breaking dual-token approach.
---

## What was built

### Backend: POST /api/v1/auth/exchange
- Route protected by `FlexAuthGuard` — accepts any valid Bearer token (Supabase or NestJS)
- Calls `AuthService.exchangeToken()` which issues a brand-new NestJS access+refresh pair via `TokenService.issueNewSession()`
- Audits as `token_exchange` event

### Frontend: src/lib/nestjs-tokens.ts
- localStorage keys: `nj_at` (access), `nj_rt` (refresh), `nj_exp` (absolute expiry ms)
- `setNestTokens` / `getNestAccessToken` / `getNestRefreshToken` / `clearNestTokens`
- `refreshNestTokens()` — calls POST /api/v1/auth/refresh, updates store
- `exchangeForNestTokens(bearer)` — calls POST /api/v1/auth/exchange, stores result
- `getBestToken(supabaseFallback)` — NestJS token → refresh → Supabase fallback

### Frontend: src/lib/api.ts
- Uses `getBestToken()` for every request
- On 401: clears NestJS tokens, fires `exchangeForNestTokens` in background, retries with Supabase token
- All four helpers: `apiGet`, `apiPost`, `apiPatch`, `apiDelete`

### Frontend: src/hooks/use-auth.tsx
- On `SIGNED_IN` / `TOKEN_REFRESHED` / `USER_UPDATED` events: calls `ensureNestTokens(access_token)` (fire-and-forget, only if no refresh token stored)
- On startup (getSession): also calls `ensureNestTokens` if no NestJS tokens
- On `SIGNED_OUT` event and explicit `signOut()`: calls NestJS logout endpoint + `clearNestTokens()`
- Supabase auth state machine unchanged — users see no difference

## Why dual-token (not hard cutover)
- Many pages still use `supabase.from()` directly (admin analytics, CRM, HRM, payroll) — removing Supabase SDK would break those
- Magic links / OTP / OAuth still routed through Supabase
- FlexAuthGuard accepts both, so NestJS API calls work regardless of which token is present

## What remains for full Supabase removal
- Replace `supabase.from()` calls in remaining admin pages (analytics, CRM, HRM, payroll)
- Replace magic-link / OTP login with NestJS email module
- Remove `supabase.auth.*` calls from `AdminLayout`, `InvestorPortalLayout`, `EmployeePortalLayout`
- Remove `supabase` import from `api.ts` entirely
- Remove `@supabase/supabase-js` package
- Docker/Nginx production config
