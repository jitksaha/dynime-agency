# Dynime — Migration Audit Report

_Supabase → self-hosted NestJS + PostgreSQL (Prisma) + MinIO + Redis/BullMQ + Docker/Nginx._

## 1. Current architecture
- **Frontend:** React + Vite SPA (Lovable-generated). Ships as a static bundle (`dist/`).
- **Backend:** None in-repo — **Supabase is the entire backend** (DB, Auth, Storage, Realtime, Edge Functions).

## 2. Supabase footprint
| Surface | Detail |
|---|---|
| Source files referencing Supabase | ~176 in `src/` |
| Database models (introspected) | **153** total — 123 `public`, 32 `auth`, 9 `storage` |
| SQL migrations (historical) | 204 in `supabase/migrations/` |
| Edge Functions (Deno) | 43 in `supabase/functions/` |
| Storage buckets | `og_images`, `site_assets`, `resumes`, user `documents`, team avatars |
| Realtime | Global `postgres_changes` sync + orders/mail toasts |
| Auth | `signInWithPassword`, `onAuthStateChange`, sessions in `localStorage`, roles via `user_roles` |

## 3. Key integration seams (to be re-pointed at NestJS)
- Client init: `src/integrations/supabase/client.ts`
- Generated types: `src/integrations/supabase/types.ts`
- Auth: `src/hooks/use-auth.tsx`
- Data: `src/hooks/use-data.ts`
- Realtime: `src/hooks/use-realtime-sync.ts`, `src/hooks/useOrdersRealtime.ts`
- Storage uploaders: `src/components/admin/{OgImage,SiteLogo,TeamAvatar}Uploader.tsx`, `src/components/account/DocumentManager.tsx`, `src/components/careers/JobApplicationForm.tsx`

## 4. Edge Functions by domain (→ NestJS modules)
- **Payments:** process-payment, payment-webhook, bkash-callback, attach-bank-receipt, cancel-recurring, recurring-renewal-cron, payment-gateway-test
- **KYC/KYB/AML:** didit-create-session, didit-webhook, companies-house-search
- **FlexPay:** flexpay-apply (+ flexpay_checkout / flexpay_pay_installment RPCs)
- **HR/ATS:** ats-scan-application, issue-hr-document, get-my-hr-document, manage-team, payroll-*
- **CRM:** crm-automation-tick, crm-workflow-run
- **Email:** send-transactional-email, subscribe-newsletter, imap-poll, handle-email-*
- **SEO:** seo-analyze, seo-audit, seo-health, gsc-data, track-keywords
- **Misc/seeders:** seed-*, generate-og-image, generate-investment-agreement

## 5. Target architecture
- **Backend:** NestJS (TypeScript) — modular, DI, service + repository layers, DTO validation.
- **DB:** PostgreSQL via Prisma ORM (schema introspected, IDs/timestamps/relations preserved).
- **Storage:** MinIO (S3-compatible).
- **Cache/Queue:** Redis + BullMQ.
- **Edge:** Nginx reverse proxy; Docker Compose for all services.

## 6. Migration strategy
Strangler-fig: NestJS runs **alongside** Supabase. Each domain is migrated, tested, and its frontend seam flipped behind an env feature-flag; Supabase removed last. No data/table deletion. Per-phase rollback.

## 7. Module sequence
Users → Auth → Storage → KYC → KYB → AML → Orders → Transactions → Notifications → Admin → (Payments, FlexPay, CRM, HR/ATS, SEO, Email).

## 8. Risks & mitigations
- **Password hashes:** preserve `auth.users` bcrypt hashes on import so logins keep working.
- **Realtime:** replace with backend WebSocket/SSE gateway, or polling, behind the same hook surface.
- **Data integrity:** dump/restore + per-table row-count verification before any cutover.
- **Replit limits:** Docker/Nginx/MinIO/Redis are deliverables for self-hosting, not run on Replit.
