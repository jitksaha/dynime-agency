---
name: Verification module architecture
description: NestJS Modules 4/5/6 — KYC, KYB, AML via Didit API. Covers service, controller, guard, frontend integration, and admin trigger from Orders.
---

## Required env vars (all optional at startup — service throws 503 when missing)
- `DIDIT_API_KEY` — Didit REST API key
- `DIDIT_KYC_WORKFLOW_ID` — KYC workflow
- `DIDIT_KYB_WORKFLOW_ID` — KYB workflow
- `DIDIT_AML_WORKFLOW_ID` — AML workflow (falls back to KYC workflow ID if unset)
- `DIDIT_WEBHOOK_SECRET` — HMAC-SHA256 secret for webhook signature verification

## API endpoints (all under `/api/v1/verification/`)
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/session` | FlexAuthGuard | Create KYC/KYB/AML session (user or admin for other user) |
| POST | `/webhook` | None | Didit webhook; HMAC-verified inside service |
| GET | `/me` | FlexAuthGuard | Current user's KYC + KYB status |
| GET | `/status/:userId` | FlexAuthGuard | Admin: any user's status |
| GET | `/kyc` | FlexAuthGuard (admin) | All KYC records with profile |
| GET | `/kyb` | FlexAuthGuard (admin) | All KYB records with profile |
| POST | `/admin/request` | FlexAuthGuard (admin) | Trigger verification for a user (e.g. from Orders) |

## Webhook
- `rawBody: true` enabled in `main.ts` (NestFactory.create option).
- HMAC verified with `x-signature` / `x-didit-signature` / `x-webhook-signature` header.
- Timestamp freshness: ±5 minutes using `x-timestamp` / `x-didit-timestamp`.
- All events logged to `didit_webhook_events`; status changes propagated to `kyc_verifications` or `kyb_verifications`.

## Frontend integration
- `src/lib/api.ts` — `apiGet`/`apiPost`/`apiPatch`/`apiDelete` auto-attach Supabase session Bearer token.
- `AccountVerification.tsx` — KYC+KYB via NestJS; credit_applications via `/credit/applications` NestJS endpoint.
- `AdminKyc.tsx` / `AdminKyb.tsx` — replaced supabase queries with `apiGet("/verification/kyc|kyb")`. Profile field is `r.profile`.
- `AdminOrders.tsx` — "Request Verification" panel; status updates via `apiPatch("/orders/:id")`.

## Admin roles
`ADMIN_ROLES = ['super_admin', 'manager', 'admin']` — defined in VerificationService.

## Prisma models used
`kyc_verifications` (user_id unique), `kyb_verifications` (multiple per user), `didit_webhook_events` — all in `@@schema("public")`.
