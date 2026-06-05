import { Injectable, NotFoundException, BadRequestException, ConflictException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventService } from '../common/event.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReferralService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Public click tracking: Logs visit from a referral link
   */
  async trackClick(dto: {
    referralCode: string;
    visitorIp?: string;
    deviceFingerprint?: string;
    landingPage?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    cookieId?: string;
  }) {
    const code = dto.referralCode.trim();
    if (!code) {
      throw new BadRequestException('Referral code is required');
    }

    // Look up partner by code (case-insensitive)
    const partner = await this.prisma.partners.findFirst({
      where: { referral_code: { equals: code, mode: 'insensitive' } },
    });

    if (!partner) {
      throw new NotFoundException('Referral partner not found');
    }

    if (partner.status !== 'active') {
      return { ok: false, message: 'Referral partner account is inactive' };
    }

    // Upsert referral visit
    let referral: Awaited<ReturnType<typeof this.prisma.referrals.findUnique>> = null;
    if (dto.cookieId) {
      referral = await this.prisma.referrals.findUnique({
        where: { cookie_id: dto.cookieId },
      });
    }


    if (referral) {
      // Update existing session visit
      await this.prisma.referrals.update({
        where: { id: referral.id },
        data: {
          last_visit: new Date(),
          visitor_ip: dto.visitorIp || referral.visitor_ip,
          device_fingerprint: dto.deviceFingerprint || referral.device_fingerprint,
          landing_page: dto.landingPage || referral.landing_page,
          utm_source: dto.utmSource || referral.utm_source,
          utm_medium: dto.utmMedium || referral.utm_medium,
          utm_campaign: dto.utmCampaign || referral.utm_campaign,
        },
      });
    } else {
      // Create new session visit
      await this.prisma.referrals.create({
        data: {
          partner_id: partner.id,
          referral_code: partner.referral_code,
          visitor_ip: dto.visitorIp || null,
          device_fingerprint: dto.deviceFingerprint || null,
          landing_page: dto.landingPage || null,
          utm_source: dto.utmSource || null,
          utm_medium: dto.utmMedium || null,
          utm_campaign: dto.utmCampaign || null,
          cookie_id: dto.cookieId || null,
          converted: false,
        },
      });

      // Increment partner referral count
      await this.prisma.partners.update({
        where: { id: partner.id },
        data: { total_referrals: { increment: 1 } },
      });
    }

    this.eventService.emit('referral-updated', {
      userId: partner.user_id,
      partnerId: partner.id,
      type: 'click',
    });

    return { ok: true, partnerName: partner.name };
  }

  /**
   * Registers a logged-in user as a referral partner
   */
  async registerPartner(userId: string, email: string, name: string, parentReferralCode?: string) {
    const existing = await this.prisma.partners.findFirst({
      where: {
        OR: [
          { user_id: userId },
          { email: { equals: email, mode: 'insensitive' } },
        ],
      },
    });

    if (existing) {
      throw new ConflictException('You are already registered as a partner');
    }

    // Lookup parent partner if referral code is provided
    let parentPartnerId: string | null = null;
    if (parentReferralCode) {
      const parent = await this.prisma.partners.findFirst({
        where: { referral_code: { equals: parentReferralCode.trim(), mode: 'insensitive' } },
      });
      if (parent) {
        parentPartnerId = parent.id;
      }
    }

    // Generate unique referral code: UPPERCASE name first word + random 3 digits
    const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const prefix = cleanName.slice(0, 6) || 'REF';
    
    let uniqueCode = '';
    let attempts = 0;
    while (attempts < 10) {
      const suffix = attempts === 0 ? '' : Math.floor(100 + Math.random() * 900).toString();
      const testCode = `${prefix}${suffix}`;
      const exists = await this.prisma.partners.findUnique({
        where: { referral_code: testCode },
      });
      if (!exists) {
        uniqueCode = testCode;
        break;
      }
      attempts++;
    }

    if (!uniqueCode) {
      uniqueCode = `${prefix}${Date.now().toString().slice(-4)}`;
    }

    // Create partner profile
    const partner = await this.prisma.partners.create({
      data: {
        user_id: userId,
        email: email.toLowerCase().trim(),
        name,
        referral_code: uniqueCode,
        status: 'active',
        tier: 'standard',
        commission_multiplier: 1.0,
        parent_partner_id: parentPartnerId,
      },
    });

    // Assign 'partner' role to user_roles
    await this.prisma.user_roles.upsert({
      where: {
        user_id_role: {
          user_id: userId,
          role: 'partner',
        },
      },
      update: {},
      create: {
        user_id: userId,
        role: 'partner',
      },
    }).catch(() => {});

    this.eventService.emit('referral-updated', {
      userId: partner.user_id,
      partnerId: partner.id,
      type: 'register',
    });

    return partner;
  }

  /**
   * Get stats for a partner's dashboard
   */
  async getPartnerStats(userId: string) {
    const partner = await this.prisma.partners.findFirst({
      where: { user_id: userId },
    });

    if (!partner) {
      throw new NotFoundException('Partner profile not found');
    }

    const commissions = await this.prisma.commissions.findMany({
      where: { partner_id: partner.id },
      orderBy: { created_at: 'desc' },
    });

    const pendingBalance = commissions
      .filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + Number(c.commission_amount), 0);

    const approvedBalance = commissions
      .filter((c) => c.status === 'approved' && !c.payout_id)
      .reduce((sum, c) => sum + Number(c.commission_amount), 0);

    const paidBalance = Number(partner.commission_paid);

    const clicks = await this.prisma.referrals.count({
      where: { partner_id: partner.id },
    });

    const conversions = await this.prisma.commissions.count({
      where: { partner_id: partner.id },
    });

    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

    // Last 30 days click/sales trend
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const referrals30d = await this.prisma.referrals.findMany({
      where: {
        partner_id: partner.id,
        created_at: { gte: thirtyDaysAgo },
      },
      select: { created_at: true, converted: true, order_id: true },
    });

    const commissions30d = await this.prisma.commissions.findMany({
      where: {
        partner_id: partner.id,
        created_at: { gte: thirtyDaysAgo },
      },
      select: { created_at: true, commission_amount: true },
    });

    return {
      partner,
      summary: {
        totalEarned: Number(partner.commission_earned),
        totalPaid: paidBalance,
        pendingBalance,
        approvedBalance, // Available for payout
        clicks,
        conversions,
        conversionRate,
      },
      commissions: commissions.slice(0, 10), // Send recent 10
      trends: {
        referrals: referrals30d,
        commissions: commissions30d,
      },
    };
  }

  async getPartnerCommissions(userId: string) {
    const partner = await this.prisma.partners.findFirst({
      where: { user_id: userId },
    });

    if (!partner) {
      throw new NotFoundException('Partner profile not found');
    }

    const commissions = await this.prisma.commissions.findMany({
      where: { partner_id: partner.id },
      orderBy: { created_at: 'desc' },
    });

    const coolingRow = await this.prisma.site_settings.findUnique({
      where: { key: 'referral_cooling_period_days' },
    });
    let coolingDays = 14;
    if (coolingRow && coolingRow.value !== null && coolingRow.value !== undefined) {
      const parsed = Number(typeof coolingRow.value === 'string' ? (coolingRow.value as string).replace(/^"|"$/g, '') : coolingRow.value);
      if (!isNaN(parsed)) {
        coolingDays = parsed;
      }
    }

    if (commissions.length === 0) return [];

    const orderIds = commissions.map((c) => c.order_id).filter(Boolean);
    const orders = await this.prisma.orders.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, invoice_number: true },
    });

    const orderMap = new Map(orders.map((o) => [o.id, o.invoice_number]));

    return commissions.map((c) => ({
      ...c,
      invoice_number: orderMap.get(c.order_id) || null,
      referral_cooling_period_days: coolingDays,
    }));
  }

  /**
   * Get payout history for the logged-in partner
   */
  async getPartnerPayouts(userId: string) {
    const partner = await this.prisma.partners.findFirst({
      where: { user_id: userId },
    });
    if (!partner) {
      throw new NotFoundException('Partner profile not found');
    }
    return this.prisma.payouts.findMany({
      where: { partner_id: partner.id },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Update partner profile details (e.g. customized referral code)
   */
  async updatePartnerProfile(userId: string, dto: { referralCode?: string }) {
    const partner = await this.prisma.partners.findFirst({
      where: { user_id: userId },
    });

    if (!partner) {
      throw new NotFoundException('Partner profile not found');
    }

    const data: any = { updated_at: new Date() };

    if (dto.referralCode !== undefined) {
      const code = dto.referralCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!code) {
        throw new BadRequestException('Referral code cannot be empty');
      }
      if (code.length < 3 || code.length > 20) {
        throw new BadRequestException('Referral code must be between 3 and 20 characters');
      }

      // Check uniqueness if changed
      if (code !== partner.referral_code) {
        const exists = await this.prisma.partners.findUnique({
          where: { referral_code: code },
        });
        if (exists) {
          throw new ConflictException('This referral code is already taken');
        }
        data.referral_code = code;
      }
    }

    const updated = await this.prisma.partners.update({
      where: { id: partner.id },
      data,
    });

    this.eventService.emit('referral-updated', {
      userId: updated.user_id,
      partnerId: updated.id,
      type: 'profile-update',
    });

    return updated;
  }

  /**
   * Request a payout for approved commissions
   */
  async requestPayout(userId: string, payoutMethod: string, details: any) {
    const partner = await this.prisma.partners.findFirst({
      where: { user_id: userId },
    });

    if (!partner) {
      throw new NotFoundException('Partner profile not found');
    }

    if (partner.status !== 'active') {
      throw new BadRequestException('Your partner account is suspended or inactive');
    }

    // Find all approved, unpaid commissions not linked to any payout
    const approvedCommissions = await this.prisma.commissions.findMany({
      where: {
        partner_id: partner.id,
        status: 'approved',
        payout_id: null,
      },
    });

    const totalApproved = approvedCommissions.reduce(
      (sum, c) => sum + Number(c.commission_amount),
      0,
    );

    if (totalApproved <= 0) {
      throw new BadRequestException('No approved commissions available for payout');
    }

    // Create a new payout record
    const payout = await this.prisma.payouts.create({
      data: {
        partner_id: partner.id,
        amount: totalApproved,
        payout_method: payoutMethod,
        details: details || {},
        status: 'pending',
      },
    });

    // Link commissions to this payout
    await this.prisma.commissions.updateMany({
      where: { id: { in: approvedCommissions.map((c) => c.id) } },
      data: { payout_id: payout.id },
    });

    this.eventService.emit('referral-updated', {
      userId: partner.user_id,
      partnerId: partner.id,
      type: 'payout-request',
    });

    return payout;
  }

  /**
   * Get stats for Super Admin Referral Dashboard
   */
  async getAdminStats() {
    const partnersCount = await this.prisma.partners.count();
    const referralsCount = await this.prisma.referrals.count();
    const conversionsCount = await this.prisma.commissions.count({
      where: { commission_type: 'standard' },
    });

    const conversionRate = referralsCount > 0 ? (conversionsCount / referralsCount) * 100 : 0;

    const commissions = await this.prisma.commissions.findMany({});
    const totalRevenue = commissions.reduce((sum, c) => sum + Number(c.order_amount), 0);
    const totalProfit = commissions.reduce((sum, c) => sum + Number(c.profit_amount), 0);
    const totalCommission = commissions.reduce((sum, c) => sum + Number(c.commission_amount), 0);

    const payouts = await this.prisma.payouts.findMany({});
    const totalPaid = payouts
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const totalPendingPayouts = payouts
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Fraud alerts:
    // 1. Self-referrals: Converted referrals where the customer email matches the partner email
    const selfReferrals = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT r.id, r.referral_code, r.created_at, o.id as order_id, o.customer_email, o.total, p.name as partner_name, p.email as partner_email
       FROM public.referrals r
       JOIN public.partners p ON r.partner_id = p.id
       JOIN public.orders o ON r.order_id = o.id
       WHERE LOWER(o.customer_email) = LOWER(p.email)
         AND r.converted = TRUE`
    );

    // 2. IP matching: Converted referrals where visitor IP matches partner IP
    // Note: Since we don't store partner login IP logs directly, we can check if the referral visitor IP is identical to multiple different customer orders
    const ipClashes = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT r.visitor_ip, COUNT(DISTINCT r.id) as visit_count, COUNT(DISTINCT o.id) as conversion_count
       FROM public.referrals r
       JOIN public.orders o ON r.order_id = o.id
       WHERE r.visitor_ip IS NOT NULL 
         AND r.converted = TRUE
       GROUP BY r.visitor_ip
       HAVING COUNT(DISTINCT o.id) > 1`
    );

    return {
      metrics: {
        totalPartners: partnersCount,
        totalClicks: referralsCount,
        totalConversions: conversionsCount,
        conversionRate,
        totalRevenue,
        totalProfit,
        totalCommission,
        totalPaid,
        totalPendingPayouts,
      },
      fraudAlerts: {
        selfReferrals,
        ipClashes,
        count: selfReferrals.length + ipClashes.length,
      },
    };
  }

  /**
   * Admin: List all partners
   */
  async getAdminPartners() {
    return this.prisma.partners.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: { referrals: true, commissions: true },
        },
      },
    });
  }

  /**
   * Admin: Update partner tier, status, or commission multiplier
   */
  async updatePartner(
    id: string,
    dto: { status?: string; tier?: string; commission_multiplier?: number },
  ) {
    const partner = await this.prisma.partners.findUnique({ where: { id } });
    if (!partner) {
      throw new NotFoundException('Partner profile not found');
    }

    const data: any = { updated_at: new Date() };
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.tier !== undefined) data.tier = dto.tier;
    if (dto.commission_multiplier !== undefined) {
      data.commission_multiplier = new Decimal(dto.commission_multiplier);
    }

    return this.prisma.partners.update({
      where: { id },
      data,
    });
  }

  /**
   * Admin: List payout requests
   */
  async getAdminPayouts() {
    return this.prisma.payouts.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        partners: {
          select: { name: true, email: true, referral_code: true },
        },
      },
    });
  }

  /**
   * Admin: Approve/Pay a payout request
   */
  async approvePayout(payoutId: string, transactionId: string, adminNotes?: string) {
    const payout = await this.prisma.payouts.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException('Payout request not found');
    }

    if (payout.status !== 'pending') {
      throw new BadRequestException('Payout request has already been processed');
    }

    const partner = await this.prisma.partners.findUnique({
      where: { id: payout.partner_id },
    });

    if (!partner) {
      throw new NotFoundException('Partner associated with payout not found');
    }

    // Parse existing details JSON or default to {}
    let existingDetails: any = {};
    if (payout.details && typeof payout.details === 'object') {
      existingDetails = payout.details;
    } else if (payout.details && typeof payout.details === 'string') {
      try {
        existingDetails = JSON.parse(payout.details);
      } catch {}
    }

    const updatedDetails = {
      ...existingDetails,
      adminNotes: adminNotes || undefined,
    };

    // 1. Update payout status
    const updatedPayout = await this.prisma.payouts.update({
      where: { id: payoutId },
      data: {
        status: 'paid',
        transaction_id: transactionId || null,
        details: updatedDetails,
        paid_at: new Date(),
        updated_at: new Date(),
      },
    });

    // 2. Update all commissions linked to this payout to 'paid'
    await this.prisma.commissions.updateMany({
      where: { payout_id: payoutId },
      data: {
        status: 'paid',
        paid_at: new Date(),
        updated_at: new Date(),
      },
    });

    // 3. Update partner's paid commission accumulator
    await this.prisma.partners.update({
      where: { id: partner.id },
      data: {
        commission_paid: { increment: payout.amount },
      },
    });

    this.eventService.emit('referral-updated', {
      userId: partner.user_id,
      partnerId: partner.id,
      type: 'payout-approve',
    });

    return updatedPayout;
  }

  /**
   * Admin: Reject a payout request and release linked commissions
   */
  async rejectPayout(payoutId: string, adminNotes?: string) {
    const payout = await this.prisma.payouts.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException('Payout request not found');
    }

    if (payout.status !== 'pending') {
      throw new BadRequestException('Payout request has already been processed');
    }

    const partner = await this.prisma.partners.findUnique({
      where: { id: payout.partner_id },
    });

    if (!partner) {
      throw new NotFoundException('Partner associated with payout not found');
    }

    // Parse existing details JSON or default to {}
    let existingDetails: any = {};
    if (payout.details && typeof payout.details === 'object') {
      existingDetails = payout.details;
    } else if (payout.details && typeof payout.details === 'string') {
      try {
        existingDetails = JSON.parse(payout.details);
      } catch {}
    }

    const updatedDetails = {
      ...existingDetails,
      adminNotes: adminNotes || undefined,
    };

    // 1. Update payout status to rejected
    const updatedPayout = await this.prisma.payouts.update({
      where: { id: payoutId },
      data: {
        status: 'rejected',
        details: updatedDetails,
        updated_at: new Date(),
      },
    });

    // 2. Unlink all commissions from this payout and restore status to 'approved'
    await this.prisma.commissions.updateMany({
      where: { payout_id: payoutId },
      data: {
        payout_id: null,
        status: 'approved',
        updated_at: new Date(),
      },
    });

    this.eventService.emit('referral-updated', {
      userId: partner.user_id,
      partnerId: partner.id,
      type: 'payout-reject',
    });

    return updatedPayout;
  }

  /**
   * Triggered after an order is paid/completed — checks if first purchase
   * and creates a commission record based on bracket rules.
   */
  async triggerCommission(orderId: string, customerEmail: string, referralCode: string, orderTotal: number) {
    // Normalise inputs
    const code = referralCode.trim().toUpperCase();
    if (!code || !orderId || !customerEmail || orderTotal <= 0) return;

    // Find the partner
    const partner = await this.prisma.partners.findFirst({
      where: { referral_code: { equals: code, mode: 'insensitive' } },
    });
    if (!partner || partner.status !== 'active') return;

    // Prevent self-referral
    if (partner.email.toLowerCase() === customerEmail.toLowerCase()) {
      console.warn(`[ReferralService] Self-referral blocked: partner ${partner.id}`);
      return;
    }

    // Prevent duplicate commission for same order
    const existingCommission = await this.prisma.commissions.findFirst({
      where: { order_id: orderId },
    });
    if (existingCommission) return;

    // First-purchase check: count PAID orders for this email excluding this order
    const previousPaidOrders = await this.prisma.orders.count({
      where: {
        customer_email: { equals: customerEmail, mode: 'insensitive' },
        status: { in: ['paid', 'completed', 'verified'] },
        id: { not: orderId },
      },
    });
    if (previousPaidOrders > 0) {
      console.log(`[ReferralService] Commission skipped — not first purchase for ${customerEmail}`);
      return;
    }

    // Calculate base commission using fixed amount rules by order value
    let baseCommission = 0;
    if (orderTotal >= 5000) baseCommission = 100;
    else if (orderTotal >= 4000) baseCommission = 50;
    else if (orderTotal >= 3000) baseCommission = 40;
    else if (orderTotal >= 2000) baseCommission = 30;
    else if (orderTotal >= 1000) baseCommission = 20;
    else if (orderTotal >= 500) baseCommission = 10;
    else if (orderTotal >= 100) baseCommission = 5;
    else baseCommission = 0;

    const multiplier = Number(partner.commission_multiplier) || 1.0;
    const commissionAmount = Math.round(baseCommission * multiplier * 100) / 100;
    const profitAmount = Math.round(orderTotal * 0.4 * 100) / 100; // estimated 40% margin
    const costAmount = Math.round((orderTotal - profitAmount - commissionAmount) * 100) / 100;

    // Fetch order for service name
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      select: { items: true, customer_name: true },
    });
    const items = Array.isArray(order?.items) ? order.items as any[] : [];
    const serviceName = items[0]?.name || 'Digital Service';

    // Create commission record
    await this.prisma.commissions.create({
      data: {
        partner_id: partner.id,
        order_id: orderId,
        service_name: serviceName,
        order_amount: orderTotal,
        cost_amount: costAmount,
        profit_amount: profitAmount,
        commission_amount: commissionAmount,
        status: 'pending',
        commission_type: 'standard',
      },
    });

    // Update partner accumulators
    await this.prisma.partners.update({
      where: { id: partner.id },
      data: {
        commission_earned: { increment: commissionAmount },
        total_sales: { increment: orderTotal },
      },
    });

    // Check if partner was referred by another partner for override commission
    if (partner.parent_partner_id) {
      const parent = await this.prisma.partners.findUnique({
        where: { id: partner.parent_partner_id },
      });

      if (parent && parent.status === 'active') {
        const share = Number(partner.parent_commission_share) || 0.10;
        const overrideCommissionAmount = Math.round(commissionAmount * share * 100) / 100;
        const overrideCostAmount = Math.round((orderTotal - profitAmount - overrideCommissionAmount) * 100) / 100;

        if (overrideCommissionAmount > 0) {
          await this.prisma.commissions.create({
            data: {
              partner_id: parent.id,
              order_id: orderId,
              service_name: `${serviceName} (Override)`,
              order_amount: orderTotal,
              cost_amount: overrideCostAmount,
              profit_amount: profitAmount,
              commission_amount: overrideCommissionAmount,
              status: 'pending',
              commission_type: 'override',
            },
          });

          await this.prisma.partners.update({
            where: { id: parent.id },
            data: {
              commission_earned: { increment: overrideCommissionAmount },
              total_sales: { increment: orderTotal },
            },
          });
          console.log(`[ReferralService] Override commission $${overrideCommissionAmount} created for parent partner ${parent.referral_code}`);
        }
      }
    }

    // Mark referral as converted
    await this.prisma.referrals.updateMany({
      where: {
        partner_id: partner.id,
        order_id: null,
        converted: false,
      },
      data: {
        converted: true,
        order_id: orderId,
      },
    });

    this.eventService.emit('referral-updated', {
      userId: partner.user_id,
      partnerId: partner.id,
      type: 'commission',
    });

    if (partner.parent_partner_id) {
      const parent = await this.prisma.partners.findUnique({
        where: { id: partner.parent_partner_id },
        select: { user_id: true },
      });
      if (parent) {
        this.eventService.emit('referral-updated', {
          userId: parent.user_id,
          partnerId: partner.parent_partner_id,
          type: 'override-commission',
        });
      }
    }

    console.log(`[ReferralService] Commission $${commissionAmount} created for partner ${partner.referral_code} on order ${orderId}`);
  }

  async autoApproveCommissions() {
    try {
      const row = await this.prisma.site_settings.findUnique({
        where: { key: 'referral_cooling_period_days' },
      });
      let coolingDays = 14;
      if (row && row.value !== null && row.value !== undefined) {
        const parsed = Number(typeof row.value === 'string' ? (row.value as string).replace(/^"|"$/g, '') : row.value);
        if (!isNaN(parsed)) {
          coolingDays = parsed;
        }
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - coolingDays);

      const pendingCommissions = await this.prisma.commissions.findMany({
        where: {
          status: 'pending',
          created_at: { lte: cutoffDate },
        },
      });

      if (pendingCommissions.length === 0) return;

      const orderIds = pendingCommissions.map((c) => c.order_id);
      const validOrders = await this.prisma.orders.findMany({
        where: {
          id: { in: orderIds },
          status: { in: ['paid', 'completed', 'verified'] },
        },
        select: { id: true },
      });

      const validOrderIds = new Set(validOrders.map((o) => o.id));
      const commissionsToApprove = pendingCommissions.filter((c) =>
        validOrderIds.has(c.order_id),
      );

      if (commissionsToApprove.length === 0) return;

      console.log(`[ReferralService] Auto-approving ${commissionsToApprove.length} commissions...`);

      for (const commission of commissionsToApprove) {
        await this.prisma.commissions.update({
          where: { id: commission.id },
          data: {
            status: 'approved',
            approved_at: new Date(),
            updated_at: new Date(),
          },
        });

        const partner = await this.prisma.partners.findUnique({
          where: { id: commission.partner_id },
          select: { user_id: true },
        });
        if (partner) {
          this.eventService.emit('referral-updated', {
            userId: partner.user_id,
            partnerId: commission.partner_id,
            type: 'commission-approved',
          });
        }
      }
    } catch (e) {
      console.error('[ReferralService] Error in autoApproveCommissions:', e);
    }
  }

  async onModuleInit() {
    // Run once on startup
    this.autoApproveCommissions().catch((e) =>
      console.error('[ReferralService] Startup autoApproveCommissions error:', e),
    );
    // Run every 6 hours
    setInterval(() => {
      this.autoApproveCommissions().catch((e) =>
        console.error('[ReferralService] Interval autoApproveCommissions error:', e),
      );
    }, 6 * 60 * 60 * 1000);
  }
}
