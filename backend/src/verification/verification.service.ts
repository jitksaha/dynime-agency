import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/types/auth-user';
import { CreateSessionDto, VerificationType } from './dto/create-session.dto';
import { AdminRequestDto } from './dto/admin-request.dto';

const DIDIT_BASE = 'https://verification.didit.me';
const ADMIN_ROLES = ['super_admin', 'manager', 'admin'];

function mapStatus(raw: string | null | undefined): string {
  if (!raw) return 'pending';
  const v = raw.toLowerCase();
  if (['approved', 'verified', 'complete', 'completed', 'success', 'confirmed'].includes(v))
    return 'verified';
  if (['declined', 'rejected', 'failed'].includes(v)) return 'rejected';
  if (['in_review', 'review', 'manual_review', 'kyc_review'].includes(v)) return 'in_review';
  if (['expired', 'abandoned', 'timeout'].includes(v)) return 'expired';
  if (['pending', 'not_started', 'initiated', 'started', 'in_progress'].includes(v))
    return 'pending';
  return v;
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ─── helpers ──────────────────────────────────────────────────────────────

  private diditConfig() {
    const apiKey = this.config.get<string>('DIDIT_API_KEY');
    const kycWf = this.config.get<string>('DIDIT_KYC_WORKFLOW_ID');
    const kybWf = this.config.get<string>('DIDIT_KYB_WORKFLOW_ID');
    const amlWf = this.config.get<string>('DIDIT_AML_WORKFLOW_ID');
    if (!apiKey || !kycWf || !kybWf) {
      throw new ServiceUnavailableException(
        'Didit is not configured on this server. Set DIDIT_API_KEY, ' +
          'DIDIT_KYC_WORKFLOW_ID and DIDIT_KYB_WORKFLOW_ID.',
      );
    }
    return { apiKey, kycWf, kybWf, amlWf: amlWf ?? kycWf };
  }

  private isAdmin(user: AuthUser) {
    return user.roles.some((r) => ADMIN_ROLES.includes(r));
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    const rows = await this.prisma.$queryRawUnsafe<{ email: string }[]>(
      'SELECT email FROM auth.users WHERE id = $1 LIMIT 1',
      userId,
    );
    return rows[0]?.email ?? null;
  }

  // ─── create Didit session (shared by user + admin paths) ─────────────────

  private async createDiditSession(opts: {
    type: VerificationType;
    targetUserId: string;
    targetEmail: string | null;
    frontendOrigin: string;
    orderId?: string;
    kybFields?: {
      company_name: string;
      registration_number?: string;
      country?: string;
      business_type?: string;
      website?: string;
      tax_id?: string;
    };
  }) {
    const { apiKey, kycWf, kybWf, amlWf } = this.diditConfig();

    const wfMap: Record<VerificationType, string> = {
      kyc: kycWf,
      kyb: kybWf,
      aml: amlWf,
    };
    const workflowId = wfMap[opts.type];

    const callbackPath =
      opts.type === 'kyb'
        ? '/account/verification?kyb_done=1'
        : '/account/verification?kyc_done=1';
    const callback = `${opts.frontendOrigin}${callbackPath}`;

    const diditPayload: Record<string, unknown> = {
      workflow_id: workflowId,
      vendor_data: opts.targetUserId,
      callback,
      metadata: {
        user_id: opts.targetUserId,
        email: opts.targetEmail,
        type: opts.type,
        ...(opts.orderId ? { order_id: opts.orderId } : {}),
      },
    };

    const res = await fetch(`${DIDIT_BASE}/v2/session/`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(diditPayload),
    });

    const text = await res.text();
    let didit: Record<string, unknown> = {};
    try {
      didit = JSON.parse(text) as Record<string, unknown>;
    } catch {}

    if (!res.ok) {
      this.logger.error(`Didit session create failed ${res.status}: ${text}`);
      throw new BadRequestException(
        `Didit returned ${res.status}: ${(didit as { message?: string }).message ?? text.slice(0, 200)}`,
      );
    }

    const sessionId = (didit.session_id ?? didit.id ?? '') as string;
    const verificationUrl = (
      didit.url ??
      didit.verification_url ??
      didit.session_url ??
      ''
    ) as string;

    // Persist to DB
    if (opts.type === 'kyc' || opts.type === 'aml') {
      const existing = await this.prisma.kyc_verifications.findUnique({
        where: { user_id: opts.targetUserId },
        select: { id: true },
      });
      if (existing) {
        await this.prisma.kyc_verifications.update({
          where: { id: existing.id },
          data: {
            didit_session_id: sessionId,
            workflow_id: workflowId,
            verification_url: verificationUrl,
            status: 'pending',
            raw_data: didit as never,
            updated_at: new Date(),
          },
        });
      } else {
        await this.prisma.kyc_verifications.create({
          data: {
            user_id: opts.targetUserId,
            didit_session_id: sessionId,
            workflow_id: workflowId,
            verification_url: verificationUrl,
            status: 'pending',
            raw_data: didit as never,
          },
        });
      }
    } else {
      if (!opts.kybFields?.company_name) {
        throw new BadRequestException('company_name is required for KYB');
      }
      await this.prisma.kyb_verifications.create({
        data: {
          user_id: opts.targetUserId,
          company_name: opts.kybFields.company_name,
          registration_number: opts.kybFields.registration_number ?? null,
          country: opts.kybFields.country ?? null,
          business_type: opts.kybFields.business_type ?? null,
          website: opts.kybFields.website ?? null,
          tax_id: opts.kybFields.tax_id ?? null,
          didit_session_id: sessionId,
          workflow_id: workflowId,
          verification_url: verificationUrl,
          status: 'pending',
          raw_data: didit as never,
        },
      });
    }

    return { ok: true, session_id: sessionId, verification_url: verificationUrl };
  }

  // ─── public API ───────────────────────────────────────────────────────────

  async createSession(dto: CreateSessionDto, caller: AuthUser) {
    const isAdmin = this.isAdmin(caller);
    const targetUserId =
      dto.target_user_id && isAdmin ? dto.target_user_id : caller.id;
    const targetEmail =
      targetUserId !== caller.id
        ? await this.getUserEmail(targetUserId)
        : (caller.email ?? null);

    return this.createDiditSession({
      type: dto.type,
      targetUserId,
      targetEmail,
      frontendOrigin: dto.frontend_origin ?? 'https://dynime.com',
      orderId: dto.order_id,
      kybFields: dto.company_name
        ? {
            company_name: dto.company_name,
            registration_number: dto.registration_number,
            country: dto.country,
            business_type: dto.business_type,
            website: dto.website,
            tax_id: dto.tax_id,
          }
        : undefined,
    });
  }

  async adminRequest(dto: AdminRequestDto, caller: AuthUser) {
    if (!this.isAdmin(caller)) {
      throw new UnauthorizedException('Admin role required');
    }
    const targetEmail = await this.getUserEmail(dto.user_id);
    return this.createDiditSession({
      type: dto.type,
      targetUserId: dto.user_id,
      targetEmail,
      frontendOrigin: dto.frontend_origin ?? 'https://dynime.com',
      orderId: dto.order_id,
      kybFields: dto.company_name
        ? {
            company_name: dto.company_name,
            registration_number: dto.registration_number,
            country: dto.country,
            business_type: dto.business_type,
            website: dto.website,
            tax_id: dto.tax_id,
          }
        : undefined,
    });
  }

  async getMyStatus(userId: string) {
    const kyc = await this.prisma.kyc_verifications.findUnique({
      where: { user_id: userId },
    });
    const kyb = await this.prisma.kyb_verifications.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return { kyc, kyb };
  }

  async getUserStatus(targetId: string, caller: AuthUser) {
    if (!this.isAdmin(caller) && caller.id !== targetId) {
      throw new UnauthorizedException('Cannot view other users\' verification status');
    }
    return this.getMyStatus(targetId);
  }

  async listKyc(caller: AuthUser) {
    if (!this.isAdmin(caller)) throw new UnauthorizedException('Admin role required');
    const rows = await this.prisma.kyc_verifications.findMany({
      orderBy: { updated_at: 'desc' },
    });
    return this.enrichWithProfiles(rows);
  }

  async listKyb(caller: AuthUser) {
    if (!this.isAdmin(caller)) throw new UnauthorizedException('Admin role required');
    const rows = await this.prisma.kyb_verifications.findMany({
      orderBy: { updated_at: 'desc' },
    });
    return this.enrichWithProfiles(rows);
  }

  private async enrichWithProfiles<T extends { user_id: string }>(
    rows: T[],
  ): Promise<(T & { profile: { email: string | null; full_name: string | null } | null })[]> {
    const uids = [...new Set(rows.map((r) => r.user_id))];
    if (!uids.length) return rows.map((r) => ({ ...r, profile: null }));

    const profiles = await this.prisma.$queryRawUnsafe<
      { id: string; email: string | null; full_name: string | null }[]
    >(
      `SELECT id, email, full_name FROM public.profiles WHERE id = ANY($1::uuid[])`,
      uids,
    );
    const map = new Map(profiles.map((p) => [p.id, p]));
    return rows.map((r) => ({
      ...r,
      profile: map.get(r.user_id) ?? null,
    }));
  }

  // ─── webhook ──────────────────────────────────────────────────────────────

  private verifyHmac(secret: string, rawBody: string, signature: string): boolean {
    const computed = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    const provided = signature.replace(/^sha256=/, '').toLowerCase().trim();
    if (computed.length !== provided.length) return false;
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(provided));
  }

  async handleWebhook(rawBody: string, headers: Record<string, string | undefined>) {
    const secret = this.config.get<string>('DIDIT_WEBHOOK_SECRET') ?? '';
    const sigHeader =
      headers['x-signature'] ??
      headers['x-didit-signature'] ??
      headers['x-webhook-signature'] ??
      '';
    const tsHeader = headers['x-timestamp'] ?? headers['x-didit-timestamp'] ?? null;

    const signatureValid = secret ? this.verifyHmac(secret, rawBody, sigHeader) : false;

    // Timestamp freshness (5 min window)
    let fresh = true;
    if (tsHeader) {
      const n = Number(tsHeader);
      if (Number.isFinite(n)) fresh = Math.abs(Date.now() / 1000 - n) < 300;
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {}

    const eventType = (
      (payload.event ?? payload.event_type ?? payload.type ?? 'unknown') as string
    );
    const sessionId = (
      (payload.session_id ??
        (payload.data as Record<string, unknown> | undefined)?.session_id ??
        payload.id ??
        (payload.data as Record<string, unknown> | undefined)?.id ??
        '') as string
    );

    // Always log raw event
    const logRow = await this.prisma.didit_webhook_events.create({
      data: {
        event_type: eventType,
        session_id: sessionId,
        payload: payload as never,
        signature_valid: signatureValid,
      },
      select: { id: true },
    });

    if (secret && !signatureValid) {
      await this.prisma.didit_webhook_events.update({
        where: { id: logRow.id },
        data: { error: 'invalid_signature' },
      });
      return { ok: false, error: 'invalid_signature' };
    }

    if (!fresh) {
      await this.prisma.didit_webhook_events.update({
        where: { id: logRow.id },
        data: { error: 'stale_timestamp' },
      });
      return { ok: false, error: 'stale_timestamp' };
    }

    const ACCEPTED = new Set([
      'status.updated', 'user.status.updated', 'user.data.updated',
      'business.status.updated', 'business.data.updated',
      'session.approved', 'session.declined', 'session.completed',
      'session.status.updated', 'verification.approved', 'verification.declined',
      'verification.completed', 'kyc.approved', 'kyc.declined', 'kyb.approved', 'kyb.declined',
    ]);

    if (!ACCEPTED.has(eventType)) {
      await this.prisma.didit_webhook_events.update({
        where: { id: logRow.id },
        data: { processed: true, error: 'event_type_ignored' },
      });
      return { ok: true, ignored: true };
    }

    try {
      if (sessionId) {
        const statusRaw = (
          (payload.status ??
            (payload.data as Record<string, unknown> | undefined)?.status ??
            payload.decision ??
            (payload.data as Record<string, unknown> | undefined)?.decision) as string | undefined
        );
        const workflowId = (
          (payload.workflow_id ??
            (payload.data as Record<string, unknown> | undefined)?.workflow_id) as string | undefined
        );
        const kybWf = this.config.get<string>('DIDIT_KYB_WORKFLOW_ID');

        const routeKyb =
          eventType.startsWith('business.') ||
          (workflowId && kybWf && workflowId === kybWf);

        const tryUpdate = async (table: 'kyc_verifications' | 'kyb_verifications') => {
          const row =
            table === 'kyc_verifications'
              ? await this.prisma.kyc_verifications.findFirst({
                  where: { didit_session_id: sessionId },
                  select: { id: true },
                })
              : await this.prisma.kyb_verifications.findFirst({
                  where: { didit_session_id: sessionId },
                  select: { id: true },
                });
          if (!row) return false;

          const update: Record<string, unknown> = {
            raw_data: payload as never,
            updated_at: new Date(),
          };
          if (statusRaw) {
            const newStatus = mapStatus(statusRaw);
            update.status = newStatus;
            if (newStatus === 'verified') update.verification_date = new Date();
          }

          if (table === 'kyc_verifications') {
            await this.prisma.kyc_verifications.update({
              where: { id: row.id },
              data: update as never,
            });
          } else {
            await this.prisma.kyb_verifications.update({
              where: { id: row.id },
              data: update as never,
            });
          }
          return true;
        };

        if (routeKyb) {
          if (!(await tryUpdate('kyb_verifications'))) await tryUpdate('kyc_verifications');
        } else {
          if (!(await tryUpdate('kyc_verifications'))) await tryUpdate('kyb_verifications');
        }
      }

      await this.prisma.didit_webhook_events.update({
        where: { id: logRow.id },
        data: { processed: true },
      });
    } catch (err) {
      this.logger.error('Webhook processing error', String(err));
      await this.prisma.didit_webhook_events.update({
        where: { id: logRow.id },
        data: { error: String(err) },
      });
    }

    return { ok: true };
  }
}
