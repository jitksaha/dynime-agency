import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EventService } from '../common/event.service';
import { AuthUser } from '../auth/types/auth-user';
import { CreateSessionDto, VerificationType } from './dto/create-session.dto';
import { AdminRequestDto } from './dto/admin-request.dto';
import { MailService } from '../mail/mail.service';

const DIDIT_BASE = 'https://verification.didit.me';

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
    private readonly mail: MailService,
    private readonly eventService: EventService,
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

  private isSuperAdmin(user: AuthUser): boolean {
    return user.roles.includes('super_admin');
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    const profile = await this.prisma.profiles.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return profile?.email ?? null;
  }

  // ─── create Didit session ─────────────────────────────────────────────────

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
    returnRawUrl?: boolean;
  }) {
    const isDev = this.config.get<string>('NODE_ENV') === 'development';
    const key = this.config.get<string>('DIDIT_API_KEY');
    const kycWf = this.config.get<string>('DIDIT_KYC_WORKFLOW_ID');
    const kybWf = this.config.get<string>('DIDIT_KYB_WORKFLOW_ID');

    if ((!key || !kycWf || !kybWf) && isDev) {
      this.logger.warn(`Didit env keys missing. Operating in DEVELOPMENT MOCK MODE.`);
      const sessionId = `mock-session-${crypto.randomUUID()}`;
      const callbackPath = opts.orderId
        ? `/verify-order/${opts.orderId}?done=1`
        : opts.type === 'kyb'
          ? '/account/verification?kyb_done=1'
          : '/account/verification?kyc_done=1';
      
      const mockFlowUrl = opts.orderId
        ? `${opts.frontendOrigin}/verify-order/${opts.orderId}/mock-flow`
        : `${opts.frontendOrigin}${callbackPath}`;

      // Create row in verification_requests
      const request = await this.prisma.verification_requests.create({
        data: {
          type: opts.type,
          customer_id: opts.targetUserId,
          company_id: opts.orderId ? opts.targetUserId : undefined, // fallback
          service_order_id: opts.orderId || null,
          didit_session_id: sessionId,
          workflow_id: 'mock-workflow',
          verification_url: mockFlowUrl,
          qr_code_url: mockFlowUrl,
          status: 'pending',
          company_name: opts.kybFields?.company_name || null,
          country: opts.kybFields?.country || null,
        },
      });

      // Write creation log
      await this.prisma.verification_logs.create({
        data: {
          verification_request_id: request.id,
          action: 'session_created',
          description: `Mock verification session initiated successfully for customer ${opts.targetEmail}.`,
        },
      });

      // Update service_brief if order context exists
      if (opts.orderId) {
        const order = await this.prisma.orders.findUnique({ where: { id: opts.orderId } });
        if (order) {
          const brief = (order.service_brief as Record<string, any>) || {};
          brief.identity_verification = {
            type: opts.type,
            session_id: sessionId,
            status: 'pending',
            verification_url: mockFlowUrl,
            updated_at: new Date().toISOString(),
          };
          await this.prisma.orders.update({
            where: { id: opts.orderId },
            data: { service_brief: brief },
          });
        }
      }

      // Simulate sending customer email notification
      await this.simulateNotificationEmail(request.id, 'verification_required', opts.targetEmail || 'customer@dynime.com');

      const returnUrl = (opts.orderId && !opts.returnRawUrl)
        ? `${opts.frontendOrigin}/verify-order/${opts.orderId}`
        : mockFlowUrl;

      return { ok: true, session_id: sessionId, verification_url: returnUrl };
    }

    // Real Didit Flow
    const { apiKey, kycWf: realKycWf, kybWf: realKybWf, amlWf } = this.diditConfig();
    const wfMap: Record<VerificationType, string> = {
      kyc: realKycWf,
      kyb: realKybWf,
      aml: amlWf,
    };
    const workflowId = wfMap[opts.type];

    const callbackPath = opts.orderId
      ? `/verify-order/${opts.orderId}?done=1`
      : opts.type === 'kyb'
        ? '/account/verification?kyb_done=1'
        : '/account/verification?kyc_done=1';
    const callback = `${opts.frontendOrigin}${callbackPath}`;

    const diditPayload: Record<string, any> = {
      workflow_id: workflowId,
      vendor_data: opts.targetUserId,
      callback,
      metadata: {
        user_id: opts.targetUserId,
        email: opts.targetEmail,
        service_order_id: opts.orderId,
        customer_id: opts.targetUserId,
      },
    };

    if (opts.type === 'kyb' && opts.kybFields) {
      diditPayload.company_name = opts.kybFields.company_name;
      if (opts.kybFields.registration_number)
        diditPayload.registration_number = opts.kybFields.registration_number;
      if (opts.kybFields.country) diditPayload.country = opts.kybFields.country;
      if (opts.kybFields.business_type)
        diditPayload.business_type = opts.kybFields.business_type;
      if (opts.kybFields.website) diditPayload.website = opts.kybFields.website;
      if (opts.kybFields.tax_id) diditPayload.tax_id = opts.kybFields.tax_id;
    }

    let sessionId = '';
    let verificationUrl = '';
    let didit: any = null;

    try {
      // Didit Unified v3 session endpoint
      const endpoint = '/v3/session/';
      const res = await fetch(`${DIDIT_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(diditPayload),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      didit = await res.json();
      sessionId = didit.session_id ?? didit.id;
      verificationUrl = didit.verification_url ?? didit.url ?? didit.session_url;
    } catch (e) {
      this.logger.error(`Didit session creation failed: ${String(e)}`);
      throw new ServiceUnavailableException(`Didit API failed: ${String(e)}`);
    }

    // Persist to unified requests table
    const request = await this.prisma.verification_requests.create({
      data: {
        type: opts.type,
        customer_id: opts.targetUserId,
        company_id: opts.orderId ? opts.targetUserId : undefined,
        service_order_id: opts.orderId || null,
        didit_session_id: sessionId,
        workflow_id: workflowId,
        verification_url: verificationUrl,
        qr_code_url: verificationUrl,
        status: 'pending',
        company_name: opts.kybFields?.company_name || null,
        country: opts.kybFields?.country || null,
      },
    });

    // Write creation log
    await this.prisma.verification_logs.create({
      data: {
        verification_request_id: request.id,
        action: 'session_created',
        description: `Didit verification session initiated successfully for customer ${opts.targetEmail}.`,
      },
    });

    // Update service_brief if order context exists
    if (opts.orderId) {
      const order = await this.prisma.orders.findUnique({ where: { id: opts.orderId } });
      if (order) {
        const brief = (order.service_brief as Record<string, any>) || {};
        brief.identity_verification = {
          type: opts.type,
          session_id: sessionId,
          status: 'pending',
          verification_url: verificationUrl,
          updated_at: new Date().toISOString(),
        };
        await this.prisma.orders.update({
          where: { id: opts.orderId },
          data: { service_brief: brief },
        });
      }
    }

    // Simulate sending customer email notification
    await this.simulateNotificationEmail(request.id, 'verification_required', opts.targetEmail || 'customer@dynime.com');

    const returnUrl = (opts.orderId && !opts.returnRawUrl)
      ? `${opts.frontendOrigin}/verify-order/${opts.orderId}`
      : verificationUrl;

    return { ok: true, session_id: sessionId, verification_url: returnUrl };
  }

  async createSessionForOrder(opts: {
    type: VerificationType;
    targetUserId: string;
    targetEmail: string | null;
    frontendOrigin: string;
    orderId: string;
    kybFields?: {
      company_name: string;
      registration_number?: string;
      country?: string;
      business_type?: string;
      website?: string;
      tax_id?: string;
    };
  }) {
    return this.createDiditSession({
      ...opts,
      returnRawUrl: true,
    });
  }

  // ─── simulate customer email notifications ───────────────────────────────

  private async simulateNotificationEmail(requestId: string, template: string, email: string) {
    try {
      const request = await this.prisma.verification_requests.findUnique({
        where: { id: requestId },
        include: {
          orders: true,
          profiles: true,
        },
      });

      const invoiceNumber = request?.orders?.invoice_number || 'N/A';
      const verificationUrl = request?.verification_url || '';
      const customerName = request?.profiles?.full_name || request?.profiles?.email?.split('@')[0] || 'Customer';

      await this.mail.sendTemplateEmail({
        to: email,
        subject: `Action Required: Verify Your Identity — Dynime`,
        templateName: template, // 'verification_required'
        templateData: {
          name: customerName,
          invoiceNumber,
          verificationUrl,
        },
        metadata: { verification_request_id: requestId }
      });

      await this.prisma.verification_logs.create({
        data: {
          verification_request_id: requestId,
          action: 'email_sent',
          description: `Compliance notification email dispatched to ${email} (Template: ${template}).`,
        },
      });
    } catch (e: any) {
      this.logger.warn(`Failed to send email notification: ${String(e.message || e)}`);
    }
  }

  // ─── sync single Didit session ──────────────────────────────────────────

  private async syncDiditSession(sessionId: string, apiKey: string): Promise<Record<string, any> | null> {
    if (sessionId.startsWith('mock-session-')) {
      return {
        session_id: sessionId,
        status: 'Approved',
        decision: 'Approved',
        mock: true,
      };
    }
    try {
      const res = await fetch(`${DIDIT_BASE}/v3/session/${sessionId}/decision/`, {
        headers: { 'x-api-key': apiKey },
      });
      if (res.ok) {
        return await res.json() as Record<string, any>;
      }
      return null;
    } catch (e) {
      this.logger.warn(`Failed to fetch Didit session status for ${sessionId}: ${String(e)}`);
      return null;
    }
  }

  // ─── public API ───────────────────────────────────────────────────────────

  async createSession(dto: CreateSessionDto, caller: AuthUser) {
    const isSuper = this.isSuperAdmin(caller);
    const targetUserId =
      dto.target_user_id && isSuper ? dto.target_user_id : caller.id;
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
    if (!this.isSuperAdmin(caller)) {
      throw new UnauthorizedException('Super Admin role required');
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

  async getMyStatus(userId: string, syncMock = false) {
    let requests = await this.prisma.verification_requests.findMany({
      where: { customer_id: userId },
      orderBy: { created_at: 'desc' },
    });

    // Auto-sync any pending request with Didit on retrieval
    let didSync = false;
    for (const req of requests) {
      if (req.status === 'pending') {
        try {
          const syncResult = await this.syncSingleSessionInternal(req);
          if (syncResult && syncResult.success) {
            didSync = true;
          }
        } catch (err) {
          this.logger.warn(`Auto-sync failed in getMyStatus for user ${userId}, request ${req.id}: ${String(err)}`);
        }
      }
    }

    if (didSync) {
      // Re-fetch to get updated values
      requests = await this.prisma.verification_requests.findMany({
        where: { customer_id: userId },
        orderBy: { created_at: 'desc' },
      });
    }

    const kyc = requests.find((r) => r.type === 'kyc' || r.type === 'aml') || null;
    const kyb = requests.filter((r) => r.type === 'kyb');

    // Sync if pending mock
    const isDev = this.config.get<string>('NODE_ENV') === 'development';
    if (isDev && syncMock) {
      if (kyc && kyc.status === 'pending' && kyc.didit_session_id?.startsWith('mock-session-')) {
        await this.prisma.verification_requests.update({
          where: { id: kyc.id },
          data: { status: 'verified', decision: 'Approved' },
        });
        await this.prisma.verification_logs.create({
          data: {
            verification_request_id: kyc.id,
            action: 'status_updated',
            description: 'Status synchronized: mock verification marked as verified.',
          },
        });
        if (kyc.didit_session_id) {
          await this.syncOrderStatus(kyc.didit_session_id, 'verified');
        }
        kyc.status = 'verified';
        kyc.decision = 'Approved';
      }

      for (const k of kyb) {
        if (k.status === 'pending' && k.didit_session_id?.startsWith('mock-session-')) {
          await this.prisma.verification_requests.update({
            where: { id: k.id },
            data: { status: 'verified', decision: 'Approved' },
          });
          await this.prisma.verification_logs.create({
            data: {
              verification_request_id: k.id,
              action: 'status_updated',
              description: 'Status synchronized: mock company verification marked as verified.',
            },
          });
          if (k.didit_session_id) {
            await this.syncOrderStatus(k.didit_session_id, 'verified');
          }
          k.status = 'verified';
          k.decision = 'Approved';
        }
      }
    }

    return { kyc, kyb };
  }

  async getUserStatus(targetId: string, caller: AuthUser, syncMock = false) {
    if (!this.isSuperAdmin(caller) && caller.id !== targetId) {
      throw new UnauthorizedException('Cannot view other users\' verification status');
    }
    return this.getMyStatus(targetId, syncMock);
  }

  async listKyc(caller: AuthUser) {
    if (!this.isSuperAdmin(caller)) throw new UnauthorizedException('Super Admin role required');
    const rows = await this.prisma.verification_requests.findMany({
      where: { type: 'kyc' },
      orderBy: { updated_at: 'desc' },
      include: {
        profiles: {
          select: {
            email: true,
            full_name: true,
          },
        },
      },
    });

    return rows.map((r) => ({
      ...r,
      profile: r.profiles,
    }));
  }

  async listKyb(caller: AuthUser) {
    if (!this.isSuperAdmin(caller)) throw new UnauthorizedException('Super Admin role required');
    const rows = await this.prisma.verification_requests.findMany({
      where: { type: 'kyb' },
      orderBy: { updated_at: 'desc' },
      include: {
        profiles: {
          select: {
            email: true,
            full_name: true,
          },
        },
      },
    });

    return rows.map((r) => ({
      ...r,
      profile: r.profiles,
    }));
  }

  async syncPendingSessions(caller: AuthUser, syncMock = false) {
    if (!this.isSuperAdmin(caller)) throw new UnauthorizedException('Super Admin role required');

    const pending = await this.prisma.verification_requests.findMany({
      where: { status: 'pending' },
    });

    let syncCount = 0;
    const isDev = this.config.get<string>('NODE_ENV') === 'development';
    const apiKey = this.config.get<string>('DIDIT_API_KEY') || '';

    for (const req of pending) {
      if (!req.didit_session_id) continue;
      
      const isMock = req.didit_session_id.startsWith('mock-session-');
      if (isMock) {
        if (isDev && syncMock) {
          await this.prisma.verification_requests.update({
            where: { id: req.id },
            data: { status: 'verified', decision: 'Approved' },
          });
          await this.prisma.verification_logs.create({
            data: {
              verification_request_id: req.id,
              action: 'status_updated',
              description: 'Status synchronized: mock session marked as verified.',
            },
          });
          await this.syncOrderStatus(req.didit_session_id, 'verified');
          syncCount++;
        }
      } else if (apiKey) {
        try {
          const diditSession = await this.syncDiditSession(req.didit_session_id, apiKey);
          if (diditSession) {
            const statusRaw = (diditSession.status ?? diditSession.decision) as string | undefined;
            if (statusRaw) {
              const mapped = mapStatus(statusRaw);
              const companyName = (diditSession.company_name || 
                                   diditSession.data?.company_name || 
                                   diditSession.metadata?.company_name || 
                                   diditSession.data?.metadata?.company_name ||
                                   diditSession.company_details?.company_name ||
                                   diditSession.company_details?.legal_name) as string | undefined;
              const country = (diditSession.country || 
                               diditSession.data?.country || 
                               diditSession.metadata?.country || 
                               diditSession.data?.metadata?.country ||
                               diditSession.company_details?.country) as string | undefined;

              const updateData: any = { status: mapped, decision: statusRaw };
              if (companyName) updateData.company_name = companyName;
              if (country) updateData.country = country;

              if (mapped !== req.status || companyName !== req.company_name || country !== req.country) {
                await this.prisma.verification_requests.update({
                  where: { id: req.id },
                  data: updateData,
                });
                await this.prisma.verification_logs.create({
                  data: {
                    verification_request_id: req.id,
                    action: 'status_updated',
                    description: `Status synchronized with Didit API: mapped to ${mapped}.`,
                  },
                });
                await this.syncOrderStatus(req.didit_session_id, mapped);
                syncCount++;
              }
            }
          }
        } catch {}
      }
    }

    return { success: true, synced_count: syncCount };
  }

  // ─── Super Admin Dashboard and Management APIs ────────────────────────────

  async getDashboardStats(caller: AuthUser) {
    if (!this.isSuperAdmin(caller)) throw new UnauthorizedException('Super Admin role required');

    const total = await this.prisma.verification_requests.count();
    const kycCount = await this.prisma.verification_requests.count({ where: { type: 'kyc' } });
    const kybCount = await this.prisma.verification_requests.count({ where: { type: 'kyb' } });
    const approved = await this.prisma.verification_requests.count({ where: { status: 'verified' } });
    const pending = await this.prisma.verification_requests.count({ where: { status: 'pending' } });
    const declined = await this.prisma.verification_requests.count({ where: { status: 'rejected' } });
    const inReview = await this.prisma.verification_requests.count({ where: { status: 'in_review' } });
    const expired = await this.prisma.verification_requests.count({ where: { status: 'expired' } });

    // Recent activity log
    const recentLogs = await this.prisma.verification_logs.findMany({
      orderBy: { created_at: 'desc' },
      take: 15,
      include: {
        request: {
          select: {
            type: true,
            status: true,
            profiles: {
              select: {
                email: true,
                full_name: true,
              },
            },
          },
        },
      },
    });

    // Recent webhook events log
    const recentEvents = await this.prisma.verification_events.findMany({
      orderBy: { created_at: 'desc' },
      take: 15,
      include: {
        request: {
          select: {
            type: true,
            didit_session_id: true,
          },
        },
      },
    });

    return {
      overview: {
        total,
        kyc: kycCount,
        kyb: kybCount,
        approved,
        pending,
        declined,
        inReview,
        expired,
      },
      recentLogs: recentLogs.map((l) => ({
        id: l.id,
        action: l.action,
        description: l.description,
        created_at: l.created_at,
        request_type: l.request?.type || 'unknown',
        customer_email: l.request?.profiles?.email || 'N/A',
        customer_name: l.request?.profiles?.full_name || 'N/A',
      })),
      webhookLogs: recentEvents.map((e) => ({
        id: e.id,
        webhook_type: e.webhook_type,
        session_id: e.request?.didit_session_id || 'N/A',
        request_type: e.request?.type || 'unknown',
        created_at: e.created_at,
      })),
    };
  }

  async getRequestsList(caller: AuthUser, type?: string, status?: string, page = 1, limit = 20) {
    if (!this.isSuperAdmin(caller)) throw new UnauthorizedException('Super Admin role required');

    const skip = (page - 1) * limit;
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const total = await this.prisma.verification_requests.count({ where });
    const items = await this.prisma.verification_requests.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      include: {
        profiles: {
          select: {
            email: true,
            full_name: true,
          },
        },
        orders: {
          select: {
            invoice_number: true,
            total: true,
          },
        },
      },
    });

    return {
      total,
      page,
      limit,
      items: items.map((i) => ({
        id: i.id,
        type: i.type,
        didit_session_id: i.didit_session_id,
        status: i.status,
        decision: i.decision,
        created_at: i.created_at,
        updated_at: i.updated_at,
        verification_url: i.verification_url,
        customer_name: i.profiles?.full_name || 'N/A',
        customer_email: i.profiles?.email || 'N/A',
        invoice_number: i.orders?.invoice_number || 'N/A',
      })),
    };
  }

  async getRequestDetails(id: string, caller: AuthUser) {
    if (!this.isSuperAdmin(caller)) throw new UnauthorizedException('Super Admin role required');

    let req = await this.prisma.verification_requests.findUnique({
      where: { id },
      include: {
        profiles: {
          select: {
            id: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
        orders: {
          select: {
            id: true,
            invoice_number: true,
            total: true,
            status: true,
          },
        },
        logs: {
          orderBy: { created_at: 'desc' },
        },
        events: {
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!req) throw new NotFoundException('Verification request not found');

    // Auto-sync pending request with Didit on retrieval
    if (req.status === 'pending') {
      try {
        const syncResult = await this.syncSingleSessionInternal(req);
        if (syncResult && syncResult.status !== req.status) {
          // Re-fetch to get updated logs and fields
          const updated = await this.prisma.verification_requests.findUnique({
            where: { id },
            include: {
              profiles: {
                select: {
                  id: true,
                  email: true,
                  full_name: true,
                  avatar_url: true,
                },
              },
              orders: {
                select: {
                  id: true,
                  invoice_number: true,
                  total: true,
                  status: true,
                },
              },
              logs: {
                orderBy: { created_at: 'desc' },
              },
              events: {
                orderBy: { created_at: 'desc' },
              },
            },
          });
          if (updated) req = updated;
        }
      } catch (err) {
        this.logger.warn(`Auto-sync failed in getRequestDetails for ${id}: ${String(err)}`);
      }
    }

    return req;
  }

  private async syncSingleSessionInternal(req: any) {
    const isMock = req.didit_session_id?.startsWith('mock-session-');
    if (isMock) {
      await this.prisma.verification_requests.update({
        where: { id: req.id },
        data: { status: 'verified', decision: 'Approved' },
      });
      await this.prisma.verification_logs.create({
        data: {
          verification_request_id: req.id,
          action: 'status_updated',
          description: 'Manual status synchronization: mock session marked as verified.',
        },
      });
      if (req.didit_session_id) {
        await this.syncOrderStatus(req.didit_session_id, 'verified');
      }
      this.eventService.emit('verification-updated', {
        userId: req.customer_id,
        requestId: req.id,
        status: 'verified',
      });
      return { success: true, status: 'verified' };
    }

    try {
      const { apiKey } = this.diditConfig();
      const diditSession = await this.syncDiditSession(req.didit_session_id || '', apiKey);
      if (diditSession) {
        const statusRaw = (diditSession.status ?? diditSession.decision) as string | undefined;
        if (statusRaw) {
          const mapped = mapStatus(statusRaw);
          const companyName = (diditSession.company_name || 
                               diditSession.data?.company_name || 
                               diditSession.metadata?.company_name || 
                               diditSession.data?.metadata?.company_name ||
                               diditSession.company_details?.company_name ||
                               diditSession.company_details?.legal_name) as string | undefined;
          const country = (diditSession.country || 
                           diditSession.data?.country || 
                           diditSession.metadata?.country || 
                           diditSession.data?.metadata?.country ||
                           diditSession.company_details?.country) as string | undefined;

          const updateData: any = { status: mapped, decision: statusRaw };
          if (companyName) updateData.company_name = companyName;
          if (country) updateData.country = country;

          await this.prisma.verification_requests.update({
            where: { id: req.id },
            data: updateData,
          });
          await this.prisma.verification_logs.create({
            data: {
              verification_request_id: req.id,
              action: 'status_updated',
              description: `Manual status synchronization with Didit API: mapped to ${mapped}.`,
            },
          });
          if (req.didit_session_id) {
            await this.syncOrderStatus(req.didit_session_id, mapped);
          }
          this.eventService.emit('verification-updated', {
            userId: req.customer_id,
            requestId: req.id,
            status: mapped,
          });
          return { success: true, status: mapped };
        }
      }
      return { success: false, error: 'Could not fetch Didit session decision.' };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }

  async syncSingleSession(id: string, caller: AuthUser) {
    if (!this.isSuperAdmin(caller)) throw new UnauthorizedException('Super Admin role required');

    const req = await this.prisma.verification_requests.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Verification request not found');

    const result = await this.syncSingleSessionInternal(req);
    if (!result.success) {
      throw new BadRequestException(`Manual sync failed: ${result.error}`);
    }
    return result;
  }

  async simulateEmail(id: string, caller: AuthUser) {
    if (!this.isSuperAdmin(caller)) throw new UnauthorizedException('Super Admin role required');

    const req = await this.prisma.verification_requests.findUnique({
      where: { id },
      include: { profiles: true },
    });
    if (!req) throw new NotFoundException('Verification request not found');

    const recipient = req.profiles?.email || 'customer@dynime.com';
    await this.simulateNotificationEmail(id, 'verification_reminder', recipient);
    return { success: true, recipient };
  }

  async manualTrigger(dto: CreateSessionDto, caller: AuthUser) {
    if (!this.isSuperAdmin(caller)) throw new UnauthorizedException('Super Admin role required');
    return this.createSession(dto, caller);
  }

  // ─── webhook processing ───────────────────────────────────────────────────

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

    let fresh = true;
    const isDev = this.config.get<string>('NODE_ENV') === 'development';
    if (tsHeader && !isDev) {
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
        (payload.data as Record<string, any> | undefined)?.session_id ??
        payload.id ??
        (payload.data as Record<string, any> | undefined)?.id ??
        payload.session ??
        (payload.data as Record<string, any> | undefined)?.session ??
        '') as string
    );

    const vendorData = (
      (payload.vendor_data ??
        (payload.data as Record<string, any> | undefined)?.vendor_data ??
        payload.user_id ??
        (payload.data as Record<string, any> | undefined)?.user_id ??
        (payload.metadata as Record<string, any> | undefined)?.user_id ??
        (payload.data as Record<string, any> | undefined)?.metadata?.user_id ??
        '') as string
    );

    // Look up associated verification request
    let requestRow = sessionId
      ? await this.prisma.verification_requests.findUnique({
          where: { didit_session_id: sessionId },
        })
      : null;

    if (!requestRow && vendorData) {
      requestRow = await this.prisma.verification_requests.findFirst({
        where: { customer_id: vendorData },
        orderBy: { created_at: 'desc' },
      });
    }

    if (!requestRow) {
      this.logger.warn(`Could not locate verification request for webhook session ${sessionId} / vendor ${vendorData}`);
      return { ok: false, error: 'request_not_found' };
    }

    // Log raw event in verification_events
    await this.prisma.verification_events.create({
      data: {
        verification_request_id: requestRow.id,
        webhook_type: eventType,
        payload: payload as never,
      },
    });

    if (secret && !signatureValid) {
      await this.prisma.verification_logs.create({
        data: {
          verification_request_id: requestRow.id,
          action: 'webhook_failed',
          description: `Signature validation failed for incoming webhook event: ${eventType}.`,
        },
      });
      return { ok: false, error: 'invalid_signature' };
    }

    if (!fresh) {
      await this.prisma.verification_logs.create({
        data: {
          verification_request_id: requestRow.id,
          action: 'webhook_failed',
          description: `Stale timestamp detected on incoming webhook event: ${eventType}.`,
        },
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
      await this.prisma.verification_logs.create({
        data: {
          verification_request_id: requestRow.id,
          action: 'webhook_ignored',
          description: `Ignored unhandled webhook event type: ${eventType}.`,
        },
      });
      return { ok: true, ignored: true };
    }

    try {
      const statusRaw = (
        (payload.status ??
          (payload.data as Record<string, unknown> | undefined)?.status ??
          payload.decision ??
          (payload.data as Record<string, unknown> | undefined)?.decision) as string | undefined
      );

      if (statusRaw) {
        const mapped = mapStatus(statusRaw);
        const companyName = (payload.company_name || 
                             (payload.data as Record<string, any> | undefined)?.company_name || 
                             (payload.metadata as Record<string, any> | undefined)?.company_name || 
                             (payload.data as Record<string, any> | undefined)?.metadata?.company_name ||
                             (payload.data as Record<string, any> | undefined)?.company_details?.company_name ||
                             (payload.data as Record<string, any> | undefined)?.company_details?.legal_name) as string | undefined;

        const country = (payload.country || 
                         (payload.data as Record<string, any> | undefined)?.country || 
                         (payload.metadata as Record<string, any> | undefined)?.country || 
                         (payload.data as Record<string, any> | undefined)?.metadata?.country ||
                         (payload.data as Record<string, any> | undefined)?.company_details?.country) as string | undefined;

        const updateData: any = {
          status: mapped,
          decision: statusRaw,
          updated_at: new Date(),
        };
        if (companyName) updateData.company_name = companyName;
        if (country) updateData.country = country;
        
        // Update request row
        await this.prisma.verification_requests.update({
          where: { id: requestRow.id },
          data: updateData,
        });

        this.eventService.emit('verification-updated', {
          userId: requestRow.customer_id,
          requestId: requestRow.id,
          status: mapped,
        });

        // Add log
        await this.prisma.verification_logs.create({
          data: {
            verification_request_id: requestRow.id,
            action: 'webhook_received',
            description: `Webhook event '${eventType}' processed. Status updated to ${mapped} (${statusRaw}).`,
          },
        });

        // Automations
        const customerEmail = await this.getUserEmail(requestRow.customer_id || '') || 'customer@dynime.com';

        if (mapped === 'verified') {
          await this.prisma.verification_logs.create({
            data: {
              verification_request_id: requestRow.id,
              action: 'approved',
              description: 'Compliance verification approved. Initiating onboarding flows.',
            },
          });
          // Update Order Status
          if (requestRow.service_order_id) {
            const order = await this.prisma.orders.findUnique({ where: { id: requestRow.service_order_id } });
            if (order) {
              const brief = (order.service_brief as Record<string, any>) || {};
              brief.identity_verification = {
                type: requestRow.type,
                session_id: sessionId,
                status: 'verified',
                updated_at: new Date().toISOString(),
              };
              await this.prisma.orders.update({
                where: { id: requestRow.service_order_id },
                data: {
                  status: order.status === 'pending' ? 'processing' : order.status,
                  service_brief: brief,
                },
              });
              this.eventService.emit('order-updated', { orderId: requestRow.service_order_id });
              await this.prisma.verification_logs.create({
                data: {
                  verification_request_id: requestRow.id,
                  action: 'order_updated',
                  description: `Service Order ${order.invoice_number || order.id} status updated to processing.`,
                },
              });
            }
          }
          // Simulate Notification Email
          await this.simulateNotificationEmail(requestRow.id, 'verification_approved', customerEmail);
        } else if (mapped === 'rejected') {
          await this.prisma.verification_logs.create({
            data: {
              verification_request_id: requestRow.id,
              action: 'declined',
              description: 'Compliance verification declined. Flagging compliance issues.',
            },
          });
          // Update Order to flagged
          if (requestRow.service_order_id) {
            const order = await this.prisma.orders.findUnique({ where: { id: requestRow.service_order_id } });
            if (order) {
              const brief = (order.service_brief as Record<string, any>) || {};
              brief.identity_verification = {
                type: requestRow.type,
                session_id: sessionId,
                status: 'rejected',
                updated_at: new Date().toISOString(),
              };
              await this.prisma.orders.update({
                where: { id: requestRow.service_order_id },
                data: {
                  status: 'flagged',
                  service_brief: brief,
                },
              });
              this.eventService.emit('order-updated', { orderId: requestRow.service_order_id });
              await this.prisma.verification_logs.create({
                data: {
                  verification_request_id: requestRow.id,
                  action: 'order_flagged',
                  description: `Service Order ${order.invoice_number || order.id} marked as compliance flagged.`,
                },
              });
            }
          }
          // Simulate Notification Email
          await this.simulateNotificationEmail(requestRow.id, 'verification_declined', customerEmail);
        } else {
          // just sync the order service brief status
          await this.syncOrderStatus(sessionId, mapped);
        }
      }
    } catch (err) {
      this.logger.error('Webhook processing error', String(err));
      await this.prisma.verification_logs.create({
        data: {
          verification_request_id: requestRow.id,
          action: 'error',
          description: `Error executing webhook automations: ${String(err)}`,
        },
      });
    }

    return { ok: true };
  }

  private async syncOrderStatus(sessionId: string, status: string) {
    if (!sessionId) return;
    try {
      const matched = await this.prisma.orders.findFirst({
        where: {
          service_brief: {
            path: ['identity_verification', 'session_id'],
            equals: sessionId,
          },
        },
      });

      if (matched) {
        const brief = (matched.service_brief as Record<string, any>) || {};
        if (brief.identity_verification) {
          brief.identity_verification.status = status;
          brief.identity_verification.updated_at = new Date().toISOString();
          await this.prisma.orders.update({
            where: { id: matched.id },
            data: { service_brief: brief },
          });
          this.logger.debug(`Synced order ${matched.id} verification status to ${status}`);
        }
      }
    } catch (e) {
      this.logger.warn(`Failed to sync order status for session ${sessionId}: ${String(e)}`);
    }
  }
}
