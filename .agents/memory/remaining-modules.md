---
name: Modules 7-11 (Orders, Credit, Subscriptions, Tickets, Notifications)
description: NestJS modules built for remaining migration — covers routes, frontend pages updated, and what still uses Supabase directly.
---

## Modules built (all registered in AppModule)

### Module 7: OrdersModule (`/api/v1/orders`)
| Route | Auth | Notes |
|-------|------|-------|
| GET `/` | admin | paginated, filter by status/email/q |
| GET `/mine` | user | by userId OR customer_email |
| GET `/:id` | user/admin | ownership-checked for users |
| GET `/:id/milestones` | any auth | |
| PATCH `/:id` | admin | status, notes |
| POST `/:id/cancel` | user | only pending/confirmed |
| POST `/claim` | user | link unowned order by invoice# |

### Module 8: CreditModule (`/api/v1/credit`)
| Route | Auth |
|-------|------|
| GET `/applications` | admin |
| GET `/applications/mine` | user |
| POST `/applications` | user |
| PATCH `/applications/:id` | admin (approve/reject/info_requested) |
| GET `/accounts` | admin |
| GET `/accounts/mine` | user |
| GET `/emi-plans` | admin |
| GET `/emi-plans/mine` | user (with installments joined) |

### Module 9: SubscriptionsModule (`/api/v1/subscriptions`)
| Route | Auth |
|-------|------|
| GET `/` | admin |
| GET `/mine` | user |
| GET `/renewals` | admin |
| GET `/:id` | any auth |
| PATCH `/:id` | admin |

### Module 10: TicketsModule (`/api/v1/tickets`)
| Route | Auth |
|-------|------|
| GET `/` | admin |
| GET `/mine` | user |
| POST `/` | user |
| GET `/:id` | user (ownership-checked) |
| GET `/:id/messages` | user (internal messages filtered out) |
| POST `/:id/messages` | user/admin |
| PATCH `/:id/status` | admin |

### Module 11: NotificationsModule (`/api/v1/notifications`)
| Route | Auth |
|-------|------|
| GET `/submissions` | admin |
| PATCH `/submissions/read` | admin |
| GET `/chats` | admin |
| PATCH `/chats/read` | admin |
| GET `/email-log` | admin |
| GET `/settings` | admin |

## Frontend pages migrated to NestJS
- `AdminOrders.tsx` — status update → `apiPatch(/orders/:id)`
- `AccountOrders.tsx` — list → `apiGet(/orders/mine)`, cancel → `apiPost(/orders/:id/cancel)`, claim → `apiPost(/orders/claim)`
- `AdminCredit.tsx` — list + review → NestJS credit module
- `AccountVerification.tsx` — credit app submit/list → NestJS credit module
- `AdminCustomerServices.tsx` — list + update → NestJS subscriptions module
- `AccountRecurring.tsx` — auto-renew toggle → `apiPatch(/subscriptions/:id)`
- `AccountTickets.tsx` — create ticket + list → NestJS tickets module
- `AccountTicketDetail.tsx` — fetch ticket/messages/send/status → NestJS tickets module
- `NotificationsBell.tsx` — mark read → NestJS notifications module
- `use-customer-services.ts` hook — switched to `apiGet(/subscriptions/mine)`

## api.ts helpers available
`apiGet`, `apiPost`, `apiPatch`, `apiDelete` — all in `src/lib/api.ts`, auto-attach Supabase Bearer token.

## What still uses Supabase directly (not yet migrated)
- `AdminCustomerServices.tsx` line 99 — `supabase.functions.invoke("send-transactional-email")` (email sending, leave for now)
- `AdminOrders.tsx` — `supabase.functions.invoke("admin-delete-order")` (soft-delete edge function, leave for now)
- All other admin pages not listed above (analytics, CRM, HR, payroll, etc.) — still on Supabase
- Realtime subscriptions (`useOrdersRealtime`) still use Supabase channels

## TFINAL (not yet done)
- Auth seam flip: switch frontend from Supabase JWTs → NestJS tokens
- Remove Supabase SDK from frontend entirely
- Docker/Nginx production config
