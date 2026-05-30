# Didit KYC/KYB Verification System

A complete identity (KYC) and business (KYB) verification system integrated with Didit, plus a credit application workflow that gates on both verifications.

## What you'll get

**For customers (user dashboard):**
- A new **Verification Center** with three cards: Identity, Business, Credit Eligibility
- "Verify Identity" button that opens the Didit KYC flow in a new tab and tracks status live
- Business Verification form (company name, registration number, country, business type, website, tax ID) that creates a Didit KYB session
- Status badges everywhere: Not Started / Pending / In Review / Verified / Rejected / Expired
- Credit Application form unlocked only when both KYC + KYB are Verified

**For admins (super admin panel):**
- **KYC Management** page — table of all users with status, date, session ID; can trigger a verification request and copy/send the verification link to any user
- **KYB Management** page — same for business verifications
- **Credit Review** page — approve / reject / request more info on credit applications, with admin notes

**Service gating** (enforced on the relevant order/checkout pages):
- Company Formation → KYC only
- Payment Services → KYC + KYB
- Credit Limits & Business Financing → KYC + KYB
- Virtual Cards → uses Credit Limit (so KYC + KYB indirectly)
- Exchange Services → no verification (manual POS, per your note)

**Verified badges** display next to user/company names across the site once approved.

## Didit integration

- Two Supabase edge functions:
  - `didit-create-session` — server-side call to Didit to create a KYC or KYB session, returns the verification URL
  - `didit-webhook` — receives Didit `status.updated` events, verifies HMAC signature against `DIDIT_WEBHOOK_SECRET`, updates verification rows, logs every event
- Secrets stored server-side only: `DIDIT_API_KEY`, `DIDIT_KYC_WORKFLOW_ID`, `DIDIT_KYB_WORKFLOW_ID`, `DIDIT_WEBHOOK_SECRET`
- Webhook URL you'll paste into Didit: `https://isweduliawwjqwhyvwhp.supabase.co/functions/v1/didit-webhook`

## Database

New tables (all with RLS — users see their own rows, admins see all):
- `kyc_verifications` — user_id, didit_session_id, workflow_id, verification_url, status, verification_date
- `kyb_verifications` — same + company_name, registration_number, country, business_type, website, tax_id
- `credit_applications` — requested_limit, business_revenue, business_age, industry, country, notes, status, admin_notes
- `didit_webhook_events` — raw event log for debugging

## What I need from you

1. **Didit webhook setup** (per your screenshot): create a webhook destination in Didit with
   - Name: `Dynime Production`
   - URL: `https://isweduliawwjqwhyvwhp.supabase.co/functions/v1/didit-webhook`
   - Events: select all 9 (status.updated, data.updated, user.status.updated, user.data.updated, business.status.updated, business.data.updated, activity.created, transaction.created, transaction.status.updated)
   - After creating, Didit shows a **Webhook Secret** — copy it; I'll prompt for it via the secrets tool
2. I'll add `DIDIT_API_KEY` (primary key `JpAneH1gvRQiHJsVFhLGFOq9eEi4ta4zFPSfkYJ92io`), `DIDIT_KYC_WORKFLOW_ID`, `DIDIT_KYB_WORKFLOW_ID`, `DIDIT_WEBHOOK_SECRET` as Supabase secrets

## Build order

1. Migration: 4 tables + RLS + grants
2. Secrets prompt
3. Edge functions: `didit-create-session`, `didit-webhook`
4. User Verification Center page + route
5. Admin KYC / KYB / Credit Review pages + routes
6. Verified badge component, reused across dashboards
7. Service-page gating banners pointing to Verification Center

## Notes
- Your existing FX dashboard, settings, and other features are not touched
- Verification links can be reopened anytime until status is final
- All Didit calls go through edge functions; the frontend never sees the API key
