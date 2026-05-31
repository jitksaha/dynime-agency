---
name: FlexAuthGuard dual-JWT
description: NestJS guard that accepts both NestJS-issued JWTs and Supabase access tokens during the strangler-fig migration period.
---

## Rule
Use `FlexAuthGuard` (not `JwtAuthGuard`) on any NestJS route that must be called by the frontend while it still uses Supabase auth.

## How it works
1. Extract Bearer token from Authorization header.
2. Try `jwtService.verify(token, { secret: JWT_ACCESS_SECRET })` — accepts if `type === 'access'`.
3. Fallback: decode the JWT manually (no signature verification), confirm `sub` exists in `auth.users` via raw Prisma query, enforce `exp > now()`, then load roles from `user_roles`.
4. Sets `req.user: AuthUser` in both cases.

**Why:** Frontend still issues Supabase JWTs. NestJS JwtAuthGuard only accepts tokens signed with `JWT_ACCESS_SECRET`. A bridge guard is required until the auth seam flip (Module 2 cutover to NestJS tokens).

**How to apply:** Import `FlexAuthGuard` into the feature module (it needs `JwtModule`, `PrismaModule`). Apply `@UseGuards(FlexAuthGuard)` per-route (skip on public endpoints like the webhook).

## Location
`backend/src/auth/guards/flex-auth.guard.ts`
`backend/src/verification/verification.module.ts` (imports JwtModule.register({}), PrismaModule, provides FlexAuthGuard)
