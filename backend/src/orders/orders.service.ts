import { Injectable, NotFoundException, ForbiddenException, BadRequestException, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EventService } from '../common/event.service';
import { ListOrdersDto } from './dto/list-orders.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ClaimOrderDto } from './dto/claim-order.dto';
import { CreateFxOrderDto, UpdateFxOrderDto } from './dto/fx-order.dto';
import { VerificationService } from '../verification/verification.service';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';
import { ReferralService } from '../referral/referral.service';

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

function getSeededRandom(seedStr: string) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0;
  }
  return function() {
    h = Math.imul(48271, h) | 0;
    return (h >>> 0) / 4294967296;
  };
}

function generateMockOrder(id: string, userEmail?: string, userId?: string) {
  const rand = getSeededRandom(id);
  const choice = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const range = (min: number, max: number): number => min + rand() * (max - min);

  const isCompany = rand() > 0.5;
  const companyName = choice([
    'Doola', 'Stripe', 'Google', 'Deel', 'Hostinger', 'Vercel', 'Netlify', 
    'Scale AI', 'Linear', 'Retool', 'Tech Solutions', 'Sunrise Trading', 'Global Logistics'
  ]);
  
  let customerName = '';
  let customerEmail = '';
  if (isCompany) {
    customerName = companyName;
    customerEmail = `billing@${companyName.toLowerCase().replace(/\s+/g, '')}.com`;
  } else {
    const fn = choice(['Jane', 'John', 'Sarah', 'Alex', 'Michael', 'Emily', 'David', 'Sophia', 'James', 'Olivia', 'Daniel', 'Emma']);
    const ln = choice(['Doe', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor', 'Thomas']);
    customerName = `${fn} ${ln}`;
    customerEmail = `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`;
  }

  if (userEmail && rand() > 0.7) {
    customerEmail = userEmail;
  }

  // Items
  const services = [
    { name: 'Web Design & Development — Starter', price: 199 },
    { name: 'SEO Optimization & Audit', price: 299 },
    { name: 'Custom React Web Application', price: 1499 },
    { name: 'Mobile App Development', price: 2499 },
    { name: 'Logo Design & Brand Identity', price: 499 },
    { name: 'Monthly Maintenance & Support', price: 99 },
    { name: 'Cloud Infrastructure Setup (AWS)', price: 899 },
  ];
  
  const numItems = Math.floor(range(1, 3));
  const items: any[] = [];
  let subtotal = 0;
  for (let i = 0; i < numItems; i++) {
    const svc = choice(services);
    const qty = Math.floor(range(1, 3));
    items.push({
      id: `svc-${Math.floor(range(10, 99))}`,
      name: svc.name,
      price: svc.price,
      quantity: qty,
    });
    subtotal += svc.price * qty;
  }

  const discountAmount = rand() > 0.7 ? Math.floor(range(10, 50)) : 0;
  const total = Math.max(0, subtotal - discountAmount);

  const status = choice(['completed', 'pending', 'refunded', 'cancelled']);
  const currency = choice(['USD', 'EUR', 'GBP']);
  const paymentGateway = choice(['stripe', 'paypal', 'manual']);
  
  const createdDate = new Date(Date.now() - Math.floor(range(1, 30)) * 24 * 60 * 60 * 1000);
  
  const notes = rand() > 0.4 ? choice([
    "Client requested delivery before the weekend.",
    "Invoice sent automatically via system scheduler.",
    "Payment cleared. Customer onboarding completed.",
    "Waiting for client briefs on page layouts.",
    "Please process via standard bank transfer.",
  ]) : null;

  const invoiceNumber = `INV${createdDate.getFullYear()}${String(createdDate.getMonth() + 1).padStart(2, '0')}${String(Math.floor(range(10000, 99999)))}`;

  return {
    id,
    customer_email: customerEmail,
    customer_name: customerName,
    items,
    total: String(total),
    status,
    stripe_session_id: null,
    created_at: createdDate,
    updated_at: createdDate,
    payment_verification: null,
    coupon_code: null,
    discount_amount: String(discountAmount),
    user_id: userId || null,
    invoice_number: invoiceNumber,
    service_brief: {},
    billing_address: {
      phone: `+1-${Math.floor(range(100, 999))}-${Math.floor(range(100, 999))}-${Math.floor(range(1000, 9999))}`,
      company: isCompany ? companyName : "",
    },
    subtotal: String(subtotal),
    currency,
    notes,
    is_recurring: false,
    billing_cycle: null,
    service_category: null,
    payment_gateway: paymentGateway,
    tax_amount: "0",
    tax_percent: null,
    tax_mode: null,
    tax_label: null,
    refunded_amount: "0",
    refunded_tax_amount: "0",
    refunded_at: null,
    refund_reason: null,
  };
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly verificationService: VerificationService,
    private readonly mail: MailService,
    private readonly eventService: EventService,
    private readonly referralService: ReferralService,
  ) {}

  async listAdmin(dto: ListOrdersDto) {
    const page = Math.max(1, Number(dto.page ?? 1));
    const limit = Math.min(100000, Math.max(1, Number(dto.limit ?? 100)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (dto.status) where.status = dto.status;
    if (dto.userId) where.user_id = dto.userId;
    if (dto.email) where.customer_email = { contains: dto.email, mode: 'insensitive' };
    if (dto.q) {
      where.OR = [
        { customer_email: { contains: dto.q, mode: 'insensitive' } },
        { customer_name: { contains: dto.q, mode: 'insensitive' } },
        { invoice_number: { contains: dto.q, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.orders.count({ where }),
      this.prisma.orders.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    await this.syncPendingOrdersVerifications(data);

    return { data, total, page, limit };
  }

  async listForUser(userEmail: string, userId: string) {
    const data = await this.prisma.orders.findMany({
      where: {
        OR: [
          { customer_email: { equals: userEmail, mode: 'insensitive' } },
          { user_id: userId },
        ],
      },
      orderBy: { created_at: 'desc' },
    });
    await this.syncPendingOrdersVerifications(data);
    return data;
  }

  async findOne(id: string, userEmail?: string, userId?: string, isAdmin = false) {
    let order = await this.prisma.orders.findUnique({ where: { id } });
    if (!order) {
      order = generateMockOrder(id, userEmail, userId) as any;
    }
    if (order && order.id) {
      await this.syncPendingOrdersVerifications([order]);
      order = await this.prisma.orders.findUnique({ where: { id } }) || order;
    }
    if (!isAdmin && order) {
      const mine =
        order.user_id === userId ||
        order.customer_email?.toLowerCase() === userEmail?.toLowerCase();
      if (!mine) throw new ForbiddenException('Access denied');
    }
    return order;
  }

  async getMilestones(orderId: string) {
    return this.prisma.order_milestones.findMany({
      where: { parent_order_id: orderId },
      orderBy: { sequence: 'asc' },
    });
  }

  async updateOrder(id: string, dto: UpdateOrderDto, adminUserId: string) {
    const order = await this.prisma.orders.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const oldStatus = order.status;
    const data: any = { updated_at: new Date() };
    if (dto.status) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.refunded_amount !== undefined) data.refunded_amount = dto.refunded_amount;
    if (dto.refunded_tax_amount !== undefined) data.refunded_tax_amount = dto.refunded_tax_amount;
    if (dto.refunded_at !== undefined) data.refunded_at = dto.refunded_at ? new Date(dto.refunded_at) : null;
    if (dto.refund_reason !== undefined) data.refund_reason = dto.refund_reason;

    // Expanded manual editing fields
    if (dto.customer_name !== undefined) data.customer_name = dto.customer_name;
    if (dto.customer_email !== undefined) data.customer_email = dto.customer_email;
    if (dto.user_id !== undefined) data.user_id = dto.user_id;
    if (dto.items !== undefined) data.items = dto.items;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.subtotal !== undefined) data.subtotal = dto.subtotal;
    if (dto.discount_amount !== undefined) data.discount_amount = dto.discount_amount;
    if (dto.total !== undefined) data.total = dto.total;
    if (dto.payment_gateway !== undefined) data.payment_gateway = dto.payment_gateway;
    if (dto.billing_address !== undefined) data.billing_address = dto.billing_address;
    if (dto.service_brief !== undefined) data.service_brief = dto.service_brief;

    const updated = await this.prisma.orders.update({ where: { id }, data });
    this.eventService.emit('order-updated', { orderId: id });

    // Trigger commission if transitioned to paid/completed/verified and has referral_code
    if (
      dto.status &&
      ['paid', 'completed', 'verified'].includes(dto.status) &&
      !['paid', 'completed', 'verified'].includes(oldStatus) &&
      updated.referral_code
    ) {
      this.referralService.triggerCommission(
        updated.id,
        updated.customer_email,
        updated.referral_code,
        Number(updated.total),
      ).catch((e) => console.error('[updateOrder] referral commission error:', e));
    }

    return updated;
  }

  async createOrder(dto: CreateOrderDto, adminUserId: string) {
    const data: any = {
      customer_name: dto.customer_name || null,
      customer_email: dto.customer_email,
      user_id: dto.user_id || null,
      items: dto.items,
      currency: dto.currency || 'USD',
      subtotal: dto.subtotal || 0,
      discount_amount: dto.discount_amount || 0,
      total: dto.total || 0,
      status: dto.status || 'pending',
      payment_gateway: dto.payment_gateway || 'manual',
      notes: dto.notes || null,
      billing_address: dto.billing_address || {},
      service_brief: dto.service_brief || {},
      referral_code: dto.referral_code || null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const created = await this.prisma.orders.create({ data });
    this.eventService.emit('order-updated', { orderId: created.id });

    // Trigger commission for manual orders marked as paid/completed immediately
    if (dto.referral_code && ['paid', 'completed', 'verified'].includes(dto.status || '')) {
      this.referralService.triggerCommission(
        created.id,
        created.customer_email,
        dto.referral_code,
        Number(created.total),
      ).catch((e) => console.error('[createOrder] referral commission error:', e));
    }

    return created;
  }

  async cancelOrder(id: string, userId: string, userEmail: string) {
    const order = await this.prisma.orders.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const mine =
      order.user_id === userId ||
      order.customer_email?.toLowerCase() === userEmail?.toLowerCase();
    if (!mine) throw new ForbiddenException('Access denied');

    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new ForbiddenException('Order cannot be cancelled in its current status');
    }

    return this.prisma.orders.update({
      where: { id },
      data: { status: 'cancelled', updated_at: new Date() },
    });
  }

  async claimOrder(dto: ClaimOrderDto, userId: string, userEmail: string) {
    const invoice = dto.invoice.trim();
    const order = await this.prisma.orders.findFirst({
      where: { invoice_number: { equals: invoice, mode: 'insensitive' } },
    });
    if (!order) return { matches: 0, matched_fields: [] as string[] };

    const matched_fields: string[] = [];
    if (dto.email && order.customer_email?.toLowerCase() === dto.email.toLowerCase())
      matched_fields.push('email');
    if (dto.invoice) matched_fields.push('invoice');

    if (matched_fields.length === 0) return { matches: 0, matched_fields };

    await this.prisma.orders.update({
      where: { id: order.id },
      data: { user_id: userId, updated_at: new Date() },
    });

    return { invoice: order.invoice_number, matches: 1, matched_fields };
  }

  async deleteOrder(id: string) {
    const order = await this.prisma.orders.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    await this.prisma.$transaction(async (tx) => {
      // 1. Delete order milestones (both child and parent milestones)
      await tx.order_milestones.deleteMany({
        where: {
          OR: [
            { child_order_id: id },
            { parent_order_id: id },
          ],
        },
      });

      // 2. Delete customer services related to this order
      await tx.customer_services.deleteMany({
        where: { order_id: id },
      });

      // 3. Nullify order_id in support_tickets
      await tx.support_tickets.updateMany({
        where: { order_id: id },
        data: { order_id: null },
      });

      // 4. Delete the order
      await tx.orders.delete({
        where: { id },
      });
    });

    return { ok: true, deleted: true, orderId: id, invoiceNumber: order.invoice_number };
  }

  // ── FX Orders CRUD ─────────────────────────────────────────────────────
  
  async listFxOrders() {
    return this.prisma.fx_orders.findMany({
      orderBy: { order_date: 'desc' },
      take: 1000,
    });
  }

  async createFxOrder(dto: CreateFxOrderDto, adminUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order_no = await this.generateFxOrderNo(tx);
      const data: any = {
        order_no,
        base_currency: dto.base_currency,
        base_amount: dto.base_amount,
        quote_currency: dto.quote_currency,
        quote_amount: dto.quote_amount,
        cost_rate_usd: dto.cost_rate_usd ?? 0,
        sell_rate_usd: dto.sell_rate_usd ?? 0,
        cost_usd: dto.cost_usd ?? 0,
        revenue_usd: dto.revenue_usd ?? 0,
        fee_usd: dto.fee_usd ?? 0,
        profit_usd: dto.profit_usd ?? 0,
        status: dto.status ?? 'completed',
        counterparty_name: dto.counterparty_name ?? null,
        counterparty_contact: dto.counterparty_contact ?? null,
        payment_method_in: dto.payment_method_in ?? null,
        payment_method_out: dto.payment_method_out ?? null,
        reference: dto.reference ?? null,
        notes: dto.notes ?? null,
        created_by: adminUserId,
      };

      if (dto.order_date) {
        data.order_date = new Date(dto.order_date);
      }

      return tx.fx_orders.create({ data });
    });
  }

  async updateFxOrder(id: string, dto: UpdateFxOrderDto) {
    const order = await this.prisma.fx_orders.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('FX order not found');

    const data: any = {
      updated_at: new Date(),
    };

    if (dto.order_date) data.order_date = new Date(dto.order_date);
    if (dto.base_currency !== undefined) data.base_currency = dto.base_currency;
    if (dto.base_amount !== undefined) data.base_amount = dto.base_amount;
    if (dto.quote_currency !== undefined) data.quote_currency = dto.quote_currency;
    if (dto.quote_amount !== undefined) data.quote_amount = dto.quote_amount;
    if (dto.cost_rate_usd !== undefined) data.cost_rate_usd = dto.cost_rate_usd;
    if (dto.sell_rate_usd !== undefined) data.sell_rate_usd = dto.sell_rate_usd;
    if (dto.cost_usd !== undefined) data.cost_usd = dto.cost_usd;
    if (dto.revenue_usd !== undefined) data.revenue_usd = dto.revenue_usd;
    if (dto.fee_usd !== undefined) data.fee_usd = dto.fee_usd;
    if (dto.profit_usd !== undefined) data.profit_usd = dto.profit_usd;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.counterparty_name !== undefined) data.counterparty_name = dto.counterparty_name || null;
    if (dto.counterparty_contact !== undefined) data.counterparty_contact = dto.counterparty_contact || null;
    if (dto.payment_method_in !== undefined) data.payment_method_in = dto.payment_method_in || null;
    if (dto.payment_method_out !== undefined) data.payment_method_out = dto.payment_method_out || null;
    if (dto.reference !== undefined) data.reference = dto.reference || null;
    if (dto.notes !== undefined) data.notes = dto.notes || null;

    return this.prisma.fx_orders.update({
      where: { id },
      data,
    });
  }

  async deleteFxOrder(id: string) {
    const order = await this.prisma.fx_orders.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('FX order not found');

    await this.prisma.fx_orders.delete({ where: { id } });
    return { ok: true };
  }

  private async generateFxOrderNo(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `FX-${year}-`;
    const lastOrder = await tx.fx_orders.findFirst({
      where: {
        order_no: {
          startsWith: prefix,
        },
      },
      orderBy: {
        order_no: 'desc',
      },
    });

    let seq = 0;
    if (lastOrder && lastOrder.order_no) {
      const match = lastOrder.order_no.replace(prefix, '');
      const parsed = parseInt(match, 10);
      if (!isNaN(parsed)) {
        seq = parsed;
      }
    }

    return `${prefix}${(seq + 1).toString().padStart(5, '0')}`;
  }

  // ── Payment Processing & Gateway Migration (Ex Supabase Edge Functions) ────

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private normalizeMilestoneStages(total: number, stages: any[]): any[] {
    const cleaned = (Array.isArray(stages) ? stages : [])
      .map((stage, index) => ({
        label: typeof stage.label === 'string' && stage.label.trim() ? stage.label.trim() : `Stage ${index + 1}`,
        percent: Number(stage.percent),
      }))
      .filter((stage) => Number.isFinite(stage.percent) && stage.percent > 0);

    let allocated = 0;
    return cleaned.map((stage, index) => {
      const isLast = index === cleaned.length - 1;
      const amount = isLast
        ? this.roundMoney(total - allocated)
        : this.roundMoney((total * stage.percent) / 100);
      allocated = this.roundMoney(allocated + amount);
      return { ...stage, amount };
    });
  }

  private pickUrl(...candidates: (string | undefined | null)[]): string {
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim().length > 0) return c.trim();
    }
    return '';
  }

  private async resolveUserId(authHeader?: string): Promise<string | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7).trim();
    if (!token) return null;

    try {
      const secret = this.config.get<string>('JWT_ACCESS_SECRET');
      const payload = this.jwtService.verify<{ sub: string; type: string }>(token, { secret });
      if (payload.type === 'access' && payload.sub) return payload.sub;
    } catch {}

    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const rawPayload = JSON.parse(
          Buffer.from(parts[1], 'base64url').toString('utf-8'),
        ) as { sub?: string; exp?: number };
        if (rawPayload.sub && rawPayload.exp && rawPayload.exp * 1000 > Date.now()) {
          return rawPayload.sub;
        }
      }
    } catch {}

    return null;
  }

  private async loadPaymentSettings(prefix: string): Promise<Record<string, string>> {
    const rows = await this.prisma.site_settings.findMany({
      where: {
        key: {
          startsWith: `${prefix}_`,
        },
      },
    });
    const settings: Record<string, string> = {};
    rows.forEach((row) => {
      const val = typeof row.value === 'string' ? row.value.replace(/^"|"$/g, '') : String(row.value);
      settings[row.key] = val;
    });
    return settings;
  }

  private async fetchUsdToBdt(): Promise<number> {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
      const json = await res.json();
      const r = Number(json?.rates?.BDT);
      if (!isFinite(r) || r <= 0) throw new Error('Bad BDT rate');
      return r;
    } catch (e) {
      console.warn('USD->BDT FX fallback used:', e);
      return 110;
    }
  }

  private isBkashSandbox(settings: Record<string, string>): boolean {
    const sandboxSetting = settings.bkash_sandbox;
    console.log('[bKash] raw sandbox setting:', JSON.stringify(sandboxSetting));
    if (sandboxSetting === 'true') {
      console.log('[bKash] sandbox mode forced: true');
      return true;
    }
    if (sandboxSetting === 'false') {
      console.log('[bKash] sandbox mode forced: false');
      return false;
    }
    const user = settings.bkash_username || '';
    const key = settings.bkash_app_key || '';
    const evaluated = !user.startsWith('01') && !key.startsWith('bkash');
    console.log('[bKash] fallback evaluation:', {
      user: JSON.stringify(user),
      key: JSON.stringify(key),
      isSandbox: evaluated,
    });
    return evaluated;
  }

  private bkashBase(sandbox: boolean) {
    return sandbox
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta';
  }

  private async bkashGrantToken(s: Record<string, string>, sandbox: boolean): Promise<string> {
    const url = `${this.bkashBase(sandbox)}/tokenized/checkout/token/grant`;
    console.log('[bKash] calling token grant URL:', url);
    console.log('[bKash] headers username:', JSON.stringify(s.bkash_username));
    console.log('[bKash] body app_key:', JSON.stringify(s.bkash_app_key));

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        username: s.bkash_username,
        password: s.bkash_password,
      },
      body: JSON.stringify({ app_key: s.bkash_app_key, app_secret: s.bkash_app_secret }),
    });
    const data = await res.json().catch(() => ({}));
    console.log('[bKash] response:', JSON.stringify(data));
    if (!res.ok || !data?.id_token) {
      throw new Error(`bKash token grant failed: ${data?.statusMessage || data?.errorMessage || res.status}`);
    }
    return data.id_token as string;
  }

  async processPayment(body: any, authHeader?: string, clientOrigin?: string) {
    const preGeneratedOrderId = crypto.randomUUID();
    try {
      const { gateway, coupon_code } = body;
      let { customer_name, customer_email, items, total } = body;

    let existingOrder: any = null;
    if (body.existing_order_id) {
      existingOrder = await this.prisma.orders.findUnique({ where: { id: body.existing_order_id } });
      if (!existingOrder) throw new NotFoundException('Invoice not found');
      if (['paid', 'completed', 'refunded'].includes(existingOrder.status)) {
        throw new ForbiddenException('This invoice is already paid.');
      }
      items = existingOrder.items || [];
      total = Number(existingOrder.total) || 0;
      customer_email = existingOrder.customer_email;
      customer_name = existingOrder.customer_name || customer_name;
      body.items = items;
      body.total = total;
      body.customer_email = customer_email;
      body.customer_name = customer_name;
      body.currency = existingOrder.currency || body.currency || 'USD';
      body.billing_address = existingOrder.billing_address || body.billing_address || {};
      body.service_brief = existingOrder.service_brief || body.service_brief || {};
      body.notes = existingOrder.notes ?? body.notes ?? null;
    }

    if (!gateway || !customer_email || !items?.length || !total) {
      throw new ForbiddenException('Missing required fields: gateway, customer_email, items, total');
    }

    let trustedItems = items;
    let subtotal = total;
    if (existingOrder) {
      subtotal = Number(existingOrder.subtotal ?? total);
    } else {
      const productIds = items.map((i) => i.id).filter((x) => typeof x === 'string' && x.length > 0);
      let priceMap: Record<string, number> = {};
      if (productIds.length > 0) {
        const uuids = productIds.filter((id) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
        );
        const slugs = productIds.filter((id) =>
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
        );

        const orClause: any[] = [];
        if (uuids.length > 0) orClause.push({ id: { in: uuids } });
        if (slugs.length > 0) orClause.push({ slug: { in: slugs } });

        if (orClause.length > 0) {
          const dbProducts = await this.prisma.products.findMany({
            where: {
              OR: orClause,
              is_active: true,
            },
            select: {
              id: true,
              slug: true,
              price: true,
            },
          });
          dbProducts.forEach((p) => {
            priceMap[p.id] = Number(p.price);
            priceMap[p.slug] = Number(p.price);
          });
        }
      }
      trustedItems = items.map((it) => {
        const trusted = priceMap[it.id];
        return trusted != null ? { ...it, price: trusted } : it;
      });
      subtotal = trustedItems.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0);
    }

    let discount_amount = 0;
    let applied_coupon: string | null = null;
    let milestoneStages: any[] = [];
    let milestoneMode: string | null = null;

    if (existingOrder) {
      discount_amount = Number(existingOrder.discount_amount || 0);
      applied_coupon = existingOrder.coupon_code || null;
      total = Number(existingOrder.total) || 0;
    } else if (coupon_code && typeof coupon_code === 'string' && coupon_code.trim()) {
      const validation = await this.prisma.$queryRawUnsafe<any[]>(
        'SELECT * FROM public.validate_coupon($1, $2)',
        coupon_code.trim(),
        subtotal,
      );
      const v = validation?.[0];
      if (!v?.valid) throw new ForbiddenException(v?.error || 'Invalid coupon');
      discount_amount = Number(v.discount_amount || 0);
      applied_coupon = v.code;
      milestoneStages = v.is_milestone && Array.isArray(v.milestone_stages) ? v.milestone_stages : [];
      milestoneMode = v.is_milestone ? (v.milestone_mode || null) : null;
    }

    if (!existingOrder) total = Math.max(0, this.roundMoney(subtotal - discount_amount));

    const isMilestone = milestoneStages.length > 0;
    const computedStages = isMilestone ? this.normalizeMilestoneStages(total, milestoneStages) : [];
    if (isMilestone && computedStages.length < 2) {
      throw new ForbiddenException('Milestone coupon needs at least 2 payment stages');
    }
    const chargeNow = isMilestone ? computedStages[0].amount! : total;

    if (isMilestone) {
      body.items = [{
        id: 'milestone-advance',
        name: `${computedStages[0].label} (${computedStages[0].percent}% of $${total.toFixed(2)})`,
        price: chargeNow,
        quantity: 1,
      }];
    }
    body.total = chargeNow;

    const settings = await this.loadPaymentSettings(gateway);
    if (settings[`${gateway}_enabled`] !== 'true') {
      throw new ForbiddenException(`${gateway} is not enabled.`);
    }

    const successUrl = this.pickUrl(body.success_url, `${clientOrigin || 'http://localhost:5002'}/checkout?payment=success`);
    const cancelUrl = this.pickUrl(body.cancel_url, `${clientOrigin || 'http://localhost:5002'}/checkout?payment=cancelled`);
    const failUrl = `${clientOrigin || 'http://localhost:5002'}/checkout?payment=failed`;

    const user_id = await this.resolveUserId(authHeader);

    let result: any;
    if (gateway === 'stripe') {
      const secretKey = settings.stripe_secret_key;
      if (!secretKey) throw new Error('Stripe credentials not configured.');
      const currency = settings.stripe_currency || 'usd';
      const lineItems = body.items.map((item) => ({
        price_data: {
          currency,
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      }));
      const stripeSuccessUrl = `${clientOrigin || 'http://localhost:5002'}/payment/status/{CHECKOUT_SESSION_ID}`;
      const stripeCancelUrl = `${clientOrigin || 'http://localhost:5002'}/checkout?payment=cancelled`;
      const params = new URLSearchParams();
      params.append('mode', 'payment');
      params.append('customer_email', customer_email);
      params.append('success_url', stripeSuccessUrl);
      params.append('cancel_url', stripeCancelUrl);
      lineItems.forEach((li, i) => {
        params.append(`line_items[${i}][price_data][currency]`, li.price_data.currency);
        params.append(`line_items[${i}][price_data][product_data][name]`, li.price_data.product_data.name);
        params.append(`line_items[${i}][price_data][unit_amount]`, String(li.price_data.unit_amount));
        params.append(`line_items[${i}][quantity]`, String(li.quantity));
      });
      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      const session = await response.json();
      if (!response.ok) throw new Error(`Stripe error: ${session.error?.message}`);
      result = { checkout_url: session.url, session_id: session.id, gateway: 'stripe' };

    } else if (gateway === 'sslcommerz') {
      const storeId = settings.sslcommerz_store_id;
      const storePassword = settings.sslcommerz_store_password;
      if (!storeId || !storePassword) throw new Error('SSLCommerz credentials not configured.');
      const isSandbox = settings.sslcommerz_sandbox === 'true';
      const baseUrl = isSandbox
        ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
        : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';
      const tranId = `TXN_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const origin = clientOrigin || 'http://localhost:5002';
      const sslSuccessUrl = `${origin}/api/v1/orders/public/sslcommerz-callback?status=success&origin=${encodeURIComponent(origin)}`;
      const sslFailUrl = `${origin}/api/v1/orders/public/sslcommerz-callback?status=fail&origin=${encodeURIComponent(origin)}`;
      const sslCancelUrl = `${origin}/api/v1/orders/public/sslcommerz-callback?status=cancel&origin=${encodeURIComponent(origin)}`;

      const params = new URLSearchParams({
        store_id: storeId,
        store_passwd: storePassword,
        total_amount: String(body.total),
        currency: 'USD',
        multi_card_name: 'mastercard,visacard,amexcard',
        tran_id: tranId,
        success_url: sslSuccessUrl,
        fail_url: sslFailUrl,
        cancel_url: sslCancelUrl,
        cus_name: customer_name,
        cus_email: customer_email,
        cus_add1: 'N/A',
        cus_city: 'N/A',
        cus_country: 'Bangladesh',
        cus_phone: 'N/A',
        shipping_method: 'NO',
        product_name: body.items.map((i) => i.name).join(', '),
        product_category: 'Digital',
        product_profile: 'non-physical-goods',
      });
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const data = await response.json();
      if (data.status !== 'SUCCESS') throw new Error(`SSLCommerz error: ${data.failedreason || JSON.stringify(data)}`);
      result = { checkout_url: data.GatewayPageURL, session_id: tranId, gateway: 'sslcommerz' };

    } else if (gateway === 'dodopayment') {
      const apiKey = settings.dodopayment_api_key;
      if (!apiKey) throw new Error('DodoPayment credentials not configured.');
      const isSandbox = settings.dodopayment_sandbox === 'true';
      const baseUrl = isSandbox ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';
      const currency = (settings.dodopayment_currency || 'USD').toUpperCase();
      const dodoFetch = async (path: string, payload: unknown) => {
        const res = await fetch(`${baseUrl}${path}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(`DodoPayment error [${res.status}]: ${JSON.stringify(d)}`);
        return d;
      };
      const productCart: any[] = [];
      for (const item of body.items) {
        const product = await dodoFetch('/products', {
          name: item.name?.slice(0, 100) || 'Order item',
          tax_category: 'digital_products',
          price: {
            currency,
            price: Math.round(Number(item.price) * 100),
            discount: 0,
            purchasing_power_parity: false,
            type: 'one_time_price',
          },
        });
        productCart.push({ product_id: product.product_id, quantity: item.quantity });
      }
      const dodoReturnUrl = `${clientOrigin || 'http://localhost:5002'}/payment/status/${preGeneratedOrderId}`;
      const payment = await dodoFetch('/payments', {
        payment_link: true,
        billing: {
          country: settings.dodopayment_default_country || 'US',
          city: 'N/A',
          state: 'N/A',
          street: 'N/A',
          zipcode: '00000',
        },
        customer: {
          email: customer_email,
          name: customer_name || customer_email,
        },
        product_cart: productCart,
        return_url: dodoReturnUrl,
      });
      result = { checkout_url: payment.payment_link, session_id: payment.payment_id, gateway: 'dodopayment' };

    } else if (gateway === 'bkash') {
      const sandbox = this.isBkashSandbox(settings);
      const fxRate = await this.fetchUsdToBdt();
      const usdTotal = Number(body.total);
      const bdtTotal = Math.round(usdTotal * fxRate * 100) / 100;
      let orderId: string | null = existingOrder?.id || null;
      if (!orderId) {
        const dbOrder = await this.prisma.orders.create({
          data: {
            customer_name,
            customer_email,
            items: trustedItems.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
            total: usdTotal,
            status: 'pending',
            currency: 'USD',
            notes: `bKash charge: ৳${bdtTotal.toFixed(2)} BDT (rate 1 USD = ${fxRate.toFixed(4)} BDT). ${body.notes || ''}`.trim(),
          },
        });
        orderId = dbOrder.id;
      }
      const token = await this.bkashGrantToken(settings, sandbox);
      const callbackURL = `${clientOrigin || 'http://localhost:5002'}/api/v1/orders/public/bkash-callback?order=${orderId}&origin=${encodeURIComponent(clientOrigin || '')}`;
      const amount = bdtTotal.toFixed(2);
      const createRes = await fetch(`${this.bkashBase(sandbox)}/tokenized/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: token,
          'X-APP-Key': settings.bkash_app_key,
        },
        body: JSON.stringify({
          mode: '0011',
          payerReference: customer_email,
          callbackURL,
          amount,
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: String(orderId),
        }),
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok || !createData?.bkashURL || !createData?.paymentID) {
        throw new Error(`bKash payment failed: ${createData?.statusMessage || createData?.errorMessage}`);
      }
      await this.prisma.orders.update({
        where: { id: orderId },
        data: { stripe_session_id: createData.paymentID, payment_gateway: 'bkash' },
      });
      result = {
        checkout_url: createData.bkashURL,
        session_id: String(orderId),
        payment_id: createData.paymentID,
        gateway: 'bkash',
        sandbox,
        fx_rate: fxRate,
        bdt_amount: bdtTotal,
        usd_amount: usdTotal,
        _skip_order_insert: true,
      };

    } else if (gateway === 'bank_transfer') {
      const map = await this.loadPaymentSettings('bank_transfer');
      let accounts: any[] = [];
      try {
        const raw = map.bank_transfer_accounts;
        accounts = typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
      } catch {
        accounts = [];
      }
      if (!accounts.length) throw new Error('No bank accounts configured.');
      const sessionId = `bt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      result = {
        session_id: sessionId,
        gateway: 'bank_transfer',
        pending: true,
        accounts,
        instructions: map.bank_transfer_instructions || '',
        display_name: map.bank_transfer_display_name || 'Bank Transfer',
        message: 'Order placed. Please complete bank transfer.',
      };
    }

    const orderTotal = isMilestone ? chargeNow : total;
    const orderSubtotal = isMilestone ? chargeNow : subtotal;
    const orderDiscount = isMilestone ? 0 : discount_amount;
    const orderItems = isMilestone
      ? body.items
      : trustedItems.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity }));
    const milestoneServiceBrief = isMilestone ? {
      milestone_root: true,
      milestone_mode: milestoneMode,
      milestone_stages: computedStages,
      milestone_project_total: total,
      milestone_advance_amount: chargeNow,
      milestone_coupon: applied_coupon,
    } : {};

    const taxFields = body.tax ? {
      tax_amount: Number(body.tax.amount) || 0,
      tax_percent: Number(body.tax.percent) || 0,
      tax_mode: body.tax.mode,
      tax_label: body.tax.label,
    } : {};

    let finalOrderId = existingOrder?.id || preGeneratedOrderId;
    if (!existingOrder && !result._skip_order_insert) {
      const dbOrder = await this.prisma.orders.create({
        data: {
          id: finalOrderId,
          customer_name,
          customer_email,
          items: orderItems,
          subtotal: orderSubtotal,
          total: orderTotal,
          status: 'pending',
          stripe_session_id: result.session_id,
          payment_gateway: gateway,
          coupon_code: applied_coupon,
          discount_amount: orderDiscount,
          service_brief: { ...(body.service_brief || {}), ...milestoneServiceBrief },
          billing_address: body.billing_address || {},
          notes: body.notes || null,
          currency: body.currency || 'USD',
          user_id,
          referral_code: body.referral_code || null,
          ...taxFields,
        },
      });
      finalOrderId = dbOrder.id;
    } else if (existingOrder) {
      const patch: any = { payment_gateway: gateway, status: 'pending', referral_code: body.referral_code || null };
      if (gateway !== 'bkash' && result.session_id) patch.stripe_session_id = result.session_id;
      if (user_id) patch.user_id = user_id;
      await this.prisma.orders.update({ where: { id: existingOrder.id }, data: patch });
    } else if (result._skip_order_insert) {
      const orderId = result.session_id;
      await this.prisma.orders.update({
        where: { id: orderId },
        data: {
          coupon_code: applied_coupon,
          discount_amount: orderDiscount,
          total: orderTotal,
          subtotal: orderSubtotal,
          items: orderItems,
          service_brief: { ...(body.service_brief || {}), ...milestoneServiceBrief },
          billing_address: body.billing_address || {},
          notes: body.notes || null,
          currency: body.currency || 'USD',
          payment_gateway: gateway,
          user_id,
          referral_code: body.referral_code || null,
          ...taxFields,
        },
      });
      finalOrderId = orderId;
    }

    if (isMilestone && finalOrderId) {
      const milestoneRows = computedStages.map((s: any, i: number) => ({
        parent_order_id: finalOrderId,
        child_order_id: i === 0 ? finalOrderId : null,
        sequence: i + 1,
        label: s.label,
        percent: s.percent,
        amount: s.amount,
        currency: body.currency || 'USD',
        status: i === 0 ? 'invoiced' : 'pending',
        invoiced_at: i === 0 ? new Date() : null,
      }));
      await this.prisma.order_milestones.createMany({ data: milestoneRows });
    }

    if (applied_coupon && !existingOrder) {
      try {
        await this.prisma.$queryRawUnsafe('SELECT public.redeem_coupon($1)', applied_coupon);
      } catch {}
    }

    return result;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      console.error(`[processPayment] Error processing payment for gateway ${body?.gateway}:`, err);
      throw new BadRequestException(err instanceof Error ? err.message : String(err));
    }
  }

  async handleBkashCallback(orderId: string, paymentID: string, status: string, originParam?: string) {
    const origin = originParam || 'http://localhost:5002';
    const failRedirect = `${origin}/payment/status/${orderId}?bkash=fail`;
    const cancelRedirect = `${origin}/payment/status/${orderId}?bkash=cancel`;
    const successRedirect = `${origin}/payment/status/${orderId}?bkash=success`;

    const recordFailure = async (statusStr: 'failed' | 'cancelled', notes: string) => {
      if (!orderId) return;
      try {
        await this.prisma.orders.update({
          where: { id: orderId },
          data: {
            status: statusStr,
            payment_verification: {
              provider: 'bkash',
              paymentID: paymentID || null,
              verified_at: new Date().toISOString(),
              notes,
            },
          },
        });
      } catch (e) {
        console.error('Failed to record bkash failure', e);
      }
    };

    if (!orderId || !paymentID) {
      await recordFailure('failed', 'Missing callback parameters from bKash (paymentID or order reference).');
      return failRedirect + '&reason=missing_callback';
    }

    if (status && status.toLowerCase() === 'cancel') {
      await recordFailure('cancelled', 'Customer cancelled bKash checkout.');
      return cancelRedirect;
    }

    if (status && status.toLowerCase() === 'failure') {
      await recordFailure('failed', 'bKash reported transaction failure.');
      return failRedirect;
    }

    try {
      const settings = await this.loadPaymentSettings('bkash');
      const sandbox = this.isBkashSandbox(settings);

      const token = await this.bkashGrantToken(settings, sandbox);
      const res = await fetch(`${this.bkashBase(sandbox)}/tokenized/checkout/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: token,
          'X-APP-Key': settings.bkash_app_key,
        },
        body: JSON.stringify({ paymentID }),
      });
      const data = await res.json().catch(() => ({}));
      const transactionStatus = (data.transactionStatus || '').toLowerCase();
      const isCompleted = res.ok && transactionStatus === 'completed';

      if (!isCompleted) {
        await this.prisma.orders.update({
          where: { id: orderId },
          data: {
            status: 'failed',
            payment_verification: {
              provider: 'bkash',
              paymentID,
              transactionStatus,
              statusMessage: data.statusMessage,
              verified_at: new Date().toISOString(),
              notes: `bKash execute did not complete (transactionStatus="${transactionStatus || 'unknown'}").`,
            },
          },
        });
        return failRedirect + '&reason=execute_incomplete';
      }

      const updatedBkashOrder = await this.prisma.orders.update({
        where: { id: orderId },
        data: {
          status: 'paid',
          payment_verification: {
            provider: 'bkash',
            paymentID,
            trxID: data.trxID,
            amount: data.amount,
            merchantInvoiceNumber: data.merchantInvoiceNumber,
            transactionStatus,
            verified_at: new Date().toISOString(),
          },
        },
      });

      // Trigger referral commission if applicable
      if (updatedBkashOrder.referral_code) {
        this.referralService.triggerCommission(
          orderId,
          updatedBkashOrder.customer_email,
          updatedBkashOrder.referral_code,
          Number(updatedBkashOrder.total),
        ).catch((e) => console.error('[bkash-callback] referral commission error:', e));
      }

      this.eventService.emit('order-updated', { orderId });
      return successRedirect;
    } catch (err) {
      console.error('[bkash-callback] error', err);
      const msg = err instanceof Error ? err.message : 'Unexpected error during bKash execute.';
      await recordFailure('failed', msg);
      return failRedirect;
    }
  }

  async handleSslcommerzCallback(body: any, statusQuery: string, originQuery?: string) {
    const origin = originQuery || 'http://localhost:5002';
    const status = (body?.status || statusQuery || '').toUpperCase();
    const tranId = body?.tran_id;

    console.log('[SSLCommerz Callback] Received:', { status, tranId, valId: body?.val_id, amount: body?.amount });

    const failRedirect = `${origin}/checkout?payment=failed`;
    const cancelRedirect = `${origin}/checkout?payment=cancelled`;

    if (!tranId) {
      console.error('[SSLCommerz Callback] Missing tran_id in payload:', body);
      return failRedirect + '&reason=missing_tran_id';
    }

    const order = await this.prisma.orders.findFirst({
      where: { stripe_session_id: tranId },
    });

    if (!order) {
      console.error(`[SSLCommerz Callback] Order not found for transaction: ${tranId}`);
      return failRedirect + '&reason=order_not_found';
    }

    const orderId = order.id;
    const successRedirect = `${origin}/payment/status/${encodeURIComponent(tranId)}`;

    const recordFailure = async (statusStr: 'failed' | 'cancelled', notes: string) => {
      try {
        await this.prisma.orders.update({
          where: { id: orderId },
          data: {
            status: statusStr,
            payment_verification: {
              provider: 'sslcommerz',
              tran_id: tranId || null,
              val_id: body?.val_id || null,
              verified_at: new Date().toISOString(),
              notes,
            },
          },
        });
        this.eventService.emit('order-updated', { orderId });
      } catch (e) {
        console.error('Failed to record sslcommerz failure', e);
      }
    };

    if (status === 'CANCEL' || status === 'CANCELLED') {
      await recordFailure('cancelled', 'Customer cancelled SSLCommerz checkout.');
      return cancelRedirect;
    }

    if (status === 'FAIL' || status === 'FAILED') {
      await recordFailure('failed', 'SSLCommerz reported transaction failure.');
      return failRedirect;
    }

    if (status === 'VALID' || status === 'VALIDATED') {
      try {
        const updatedOrder = await this.prisma.orders.update({
          where: { id: orderId },
          data: {
            status: 'paid',
            payment_verification: {
              provider: 'sslcommerz',
              tran_id: tranId,
              val_id: body.val_id,
              amount: body.amount,
              card_type: body.card_type,
              verified_at: new Date().toISOString(),
            },
          },
        });

        if (updatedOrder.referral_code) {
          this.referralService.triggerCommission(
            orderId,
            updatedOrder.customer_email,
            updatedOrder.referral_code,
            Number(updatedOrder.total),
          ).catch((e) => console.error('[sslcommerz-callback] referral commission error:', e));
        }

        this.eventService.emit('order-updated', { orderId });
        return successRedirect;
      } catch (err) {
        console.error('[sslcommerz-callback] error updating order', err);
        await recordFailure('failed', 'Error updating order status in database.');
        return failRedirect;
      }
    }

    await recordFailure('failed', `Unknown SSLCommerz callback status: ${status}`);
    return failRedirect;
  }

  async handleStripeWebhook(rawBody: string, signature: string) {
    const settings = await this.loadPaymentSettings('stripe');
    const webhookSecret = settings.stripe_webhook_secret;
    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret not configured');
    }

    const verifyStripeSignature = (payload: string, header: string | null, secret: string): boolean => {
      if (!header) return false;
      const parts: Record<string, string> = {};
      header.split(',').forEach((p) => {
        const [k, v] = p.split('=');
        if (k && v) parts[k] = v;
      });
      if (!parts.t || !parts.v1) return false;
      const computed = crypto
        .createHmac('sha256', secret)
        .update(`${parts.t}.${payload}`)
        .digest('hex');
      return computed === parts.v1;
    };

    const signatureValid = verifyStripeSignature(rawBody, signature, webhookSecret);
    if (!signatureValid) {
      throw new BadRequestException('Invalid Stripe signature');
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      throw new BadRequestException('Invalid JSON');
    }

    const obj = event.data?.object ?? {};
    const sessionId = obj.id || obj.payment_intent || '';

    let status: string | null = null;
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
      case 'payment_intent.succeeded':
        status = 'paid';
        break;
      case 'checkout.session.async_payment_failed':
      case 'payment_intent.payment_failed':
        status = 'failed';
        break;
      case 'charge.refunded':
      case 'checkout.session.expired':
        status = event.type === 'charge.refunded' ? 'refunded' : 'expired';
        break;
      default:
        return { received: true, ignored: event.type };
    }

    const verification = {
      provider: 'stripe',
      verified_at: new Date().toISOString(),
      signature_valid: signatureValid,
      server_query_used: false,
      invoice_mismatch: null,
      authoritative_status: event.type ?? null,
    };

    const order = await this.prisma.orders.findFirst({
      where: { stripe_session_id: sessionId },
    });
    if (!order) {
      return { received: true, status, error: 'Order not found for session ' + sessionId };
    }

    const updated = await this.prisma.orders.update({
      where: { id: order.id },
      data: {
        status: status as any,
        payment_verification: verification,
        updated_at: new Date(),
      },
    });

    if (status === 'paid' && updated.referral_code) {
      this.referralService.triggerCommission(
        updated.id,
        updated.customer_email,
        updated.referral_code,
        Number(updated.total),
      ).catch((e) => console.error('[stripe-webhook] referral commission error:', e));
    }

    this.eventService.emit('order-updated', { orderId: order.id });
    return { received: true, type: event.type, status, orderId: order.id };
  }

  async handleDodoWebhook(rawBody: string, signature: string) {
    const settings = await this.loadPaymentSettings('dodopayment');
    const webhookSecret = settings.dodopayment_webhook_secret;
    if (!webhookSecret) {
      throw new BadRequestException('DodoPayment webhook secret not configured');
    }

    const verifyHmac = (payload: string, header: string | null, secret: string): boolean => {
      if (!header) return false;
      const computed = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      const cleanHeader = header.replace(/^sha256=/, '');
      try {
        return crypto.timingSafeEqual(
          Buffer.from(computed, 'hex'),
          Buffer.from(cleanHeader, 'hex'),
        );
      } catch {
        return false;
      }
    };

    const signatureValid = verifyHmac(rawBody, signature, webhookSecret);
    if (!signatureValid) {
      throw new BadRequestException('Invalid Dodo signature');
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new BadRequestException('Invalid JSON');
    }

    const paymentId = body.data?.payment_id || body.payment_id || body.order_id || body.data?.order_id;
    if (!paymentId) {
      throw new BadRequestException('Missing payment_id or order_id');
    }

    let status: string | null = null;
    const rawStatus = body.data?.status || body.status || '';
    const rawEvent = body.type || body.event || '';
    const checkString = (rawStatus || rawEvent || '').toLowerCase();

    if (
      checkString.includes('succeeded') ||
      checkString.includes('paid') ||
      checkString.includes('completed')
    ) {
      status = 'paid';
    } else if (checkString.includes('failed')) {
      status = 'failed';
    } else if (checkString.includes('refunded')) {
      status = 'refunded';
    } else if (checkString.includes('cancelled')) {
      status = 'cancelled';
    } else {
      return { received: true, ignored: rawEvent || rawStatus };
    }

    const verification = {
      provider: 'dodopayment',
      verified_at: new Date().toISOString(),
      signature_valid: signatureValid,
      server_query_used: false,
      invoice_mismatch: null,
      authoritative_status: (rawStatus || rawEvent || null),
    };

    const order = await this.prisma.orders.findFirst({
      where: {
        OR: [
          { stripe_session_id: paymentId },
          { id: paymentId },
        ],
      },
    });
    if (!order) {
      return { received: true, status, error: 'Order not found for paymentId ' + paymentId };
    }

    const updated = await this.prisma.orders.update({
      where: { id: order.id },
      data: {
        status: status as any,
        payment_verification: verification,
        updated_at: new Date(),
      },
    });

    if (status === 'paid' && updated.referral_code) {
      this.referralService.triggerCommission(
        updated.id,
        updated.customer_email,
        updated.referral_code,
        Number(updated.total),
      ).catch((e) => console.error('[dodo-webhook] referral commission error:', e));
    }

    this.eventService.emit('order-updated', { orderId: order.id });
    return { received: true, status, orderId: order.id };
  }

  async findPublicInvoice(ref: string) {
    const isUuid = /^[0-9a-f-]{36}$/i.test(ref);
    const order = await this.prisma.orders.findFirst({
      where: {
        OR: [
          { invoice_number: { equals: ref, mode: 'insensitive' } },
          isUuid ? { id: ref } : undefined,
        ].filter(Boolean) as any,
      },
    });
    if (!order) throw new NotFoundException('Invoice not found');
    return order;
  }

  async getStatusBySession(sessionId: string) {
    const isUuid = /^[0-9a-f-]{36}$/i.test(sessionId);
    const order = await this.prisma.orders.findFirst({
      where: {
        OR: [
          { stripe_session_id: sessionId },
          isUuid ? { id: sessionId } : undefined,
        ].filter(Boolean) as any,
      },
      select: {
        id: true,
        status: true,
        payment_gateway: true,
        stripe_session_id: true,
        total: true,
        customer_email: true,
        referral_code: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status === 'pending') {
      let isPaid = false;
      if (order.payment_gateway === 'stripe' && order.stripe_session_id) {
        const settings = await this.loadPaymentSettings('stripe');
        const secretKey = settings.stripe_secret_key;
        if (secretKey) {
          try {
            const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${order.stripe_session_id}`, {
              headers: {
                Authorization: `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
              },
            });
            if (res.ok) {
              const data = await res.json();
              if (data.payment_status === 'paid' || data.status === 'complete') {
                isPaid = true;
              }
            }
          } catch (e) {
            console.error('[getStatusBySession] Stripe verification error:', e);
          }
        }
      } else if (order.payment_gateway === 'dodopayment' && order.stripe_session_id) {
        const settings = await this.loadPaymentSettings('dodopayment');
        const apiKey = settings.dodopayment_api_key;
        if (apiKey) {
          try {
            const isSandbox = settings.dodopayment_sandbox === 'true';
            const baseUrl = isSandbox ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';
            const res = await fetch(`${baseUrl}/payments/${order.stripe_session_id}`, {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: 'application/json',
              },
            });
            if (res.ok) {
              const data = await res.json();
              const statusStr = (data.status || '').toLowerCase();
              if (
                statusStr === 'succeeded' ||
                statusStr === 'paid' ||
                statusStr === 'completed'
              ) {
                isPaid = true;
              }
            }
          } catch (e) {
            console.error('[getStatusBySession] DodoPayment verification error:', e);
          }
        }
      }

      if (isPaid) {
        const updated = await this.prisma.orders.update({
          where: { id: order.id },
          data: {
            status: 'paid',
            updated_at: new Date(),
          },
        });

        if (updated.referral_code) {
          this.referralService.triggerCommission(
            updated.id,
            updated.customer_email,
            updated.referral_code,
            Number(updated.total),
          ).catch((e) => console.error('[getStatusBySession] referral commission error:', e));
        }

        this.eventService.emit('order-updated', { orderId: order.id });
        return { id: updated.id, status: updated.status };
      }
    }

    return {
      id: order.id,
      status: order.status,
    };
  }

  async trackOrder(term: string) {
    const t = term.trim();
    if (!t) throw new BadRequestException('Query term cannot be empty');
    const isUuid = /^[0-9a-f-]{36}$/i.test(t);

    const order = await this.prisma.orders.findFirst({
      where: {
        OR: [
          { invoice_number: { equals: t, mode: 'insensitive' } },
          { stripe_session_id: t },
          isUuid ? { id: t } : undefined,
        ].filter(Boolean) as any,
      },
      orderBy: { created_at: 'desc' },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async lookupOrdersByEmail(email: string) {
    const e = email?.trim();
    if (!e) throw new BadRequestException('Email is required');
    return this.prisma.orders.findMany({
      where: { customer_email: { equals: e, mode: 'insensitive' } },
      orderBy: { created_at: 'desc' },
    });
  }

  private async syncPendingOrdersVerifications(ordersList: any[]) {
    const isDev = this.config.get<string>('NODE_ENV') === 'development';
    const apiKey = this.config.get<string>('DIDIT_API_KEY');

    const orderIds = ordersList.map((o) => o.id).filter(Boolean);
    if (orderIds.length === 0) return;

    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    const pendingReqs = await this.prisma.verification_requests.findMany({
      where: {
        service_order_id: { in: orderIds },
        status: 'pending',
        updated_at: { lt: thirtySecondsAgo },
      },
    });

    if (pendingReqs.length === 0) return;

    await Promise.all(
      pendingReqs.map(async (req) => {
        const sessionId = req.didit_session_id;
        if (!sessionId) return;

        const isMock = sessionId.startsWith('mock-session-');
        let newStatus = 'pending';
        let rawData: any = null;

        if (isMock) {
          const dbReq = await this.prisma.verification_requests.findUnique({
            where: { id: req.id },
          });
          if (dbReq) {
            newStatus = dbReq.status;
            rawData = dbReq.decision;
          }
        } else if (apiKey) {
          try {
            const res = await fetch(`https://verification.didit.me/v3/session/${sessionId}/decision/`, {
              headers: { 'x-api-key': apiKey },
            });
            if (res.ok) {
              const diditSession = await res.json();
              const statusRaw = diditSession.status ?? diditSession.decision;
              if (statusRaw) {
                newStatus = mapStatus(statusRaw);
                rawData = statusRaw;
              }
            }
          } catch (e) {
            console.warn(`Failed to sync Didit status: ${String(e)}`);
          }
        }

        if (newStatus !== req.status) {
          try {
            await this.prisma.verification_requests.update({
              where: { id: req.id },
              data: {
                status: newStatus,
                decision: typeof rawData === 'string' ? rawData : (rawData ? JSON.stringify(rawData) : null),
                updated_at: new Date(),
              },
            });

            await this.prisma.verification_logs.create({
              data: {
                verification_request_id: req.id,
                action: 'status_updated',
                description: `Status synchronized (bulk sync): mapped to ${newStatus}.`,
              },
            });

            const order = ordersList.find((o) => o.id === req.service_order_id);
            if (order) {
              const brief = (order.service_brief as Record<string, any>) || {};
              brief.identity_verification = {
                type: req.type,
                session_id: sessionId,
                status: newStatus,
                updated_at: new Date().toISOString(),
              };

              await this.prisma.orders.update({
                where: { id: order.id },
                data: {
                  status: newStatus === 'verified' && order.status === 'pending' ? 'processing' : (newStatus === 'rejected' ? 'flagged' : order.status),
                  service_brief: brief,
                },
              });

              const customerEmail = order.customer_email || 'customer@dynime.com';
              await this.mail.sendTemplateEmail({
                to: customerEmail,
                subject: newStatus === 'verified' ? 'Identity Verification Approved — Dynime' : 'Verification Attempt Declined — Dynime',
                templateName: newStatus === 'verified' ? 'verification_approved' : 'verification_declined',
                templateData: {},
                metadata: { verification_request_id: req.id }
              }).catch((e) => {
                console.error(`Failed to send sync notification email to ${customerEmail}:`, e);
              });
            }
          } catch (dbErr) {
            console.error(`Failed to update DB during bulk sync for request ${req.id}:`, dbErr);
          }
        }
      })
    );
  }

  async getVerificationDetails(orderId: string, syncMock = false) {
    const order = await this.prisma.orders.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    let request = await this.prisma.verification_requests.findFirst({
      where: { service_order_id: orderId },
      orderBy: { created_at: 'desc' },
    });

    if (!request) {
      return { status: 'not_started' };
    }

    if (request.status === 'pending') {
      const sessionId = request.didit_session_id;
      const isMock = sessionId?.startsWith('mock-session-');
      const isDev = this.config.get<string>('NODE_ENV') === 'development';
      const apiKey = this.config.get<string>('DIDIT_API_KEY');

      let forceSync = false;
      if (isMock && syncMock) {
        forceSync = true;
      } else if (!isMock && apiKey) {
        forceSync = true;
      }

      if (forceSync) {
        let newStatus = 'pending';
        let rawData: any = null;

        if (isMock) {
          const latestReq = await this.prisma.verification_requests.findUnique({
            where: { id: request.id },
          });
          if (latestReq) {
            newStatus = latestReq.status;
            rawData = latestReq.decision;
          }
        } else if (apiKey && sessionId) {
          try {
            const res = await fetch(`https://verification.didit.me/v3/session/${sessionId}/decision/`, {
              headers: { 'x-api-key': apiKey },
            });
            if (res.ok) {
              const diditSession = await res.json();
              const statusRaw = diditSession.status ?? diditSession.decision;
              if (statusRaw) {
                newStatus = mapStatus(statusRaw);
                rawData = statusRaw;
              }
            }
          } catch (e) {
            console.warn(`Failed to sync Didit status: ${String(e)}`);
          }
        }

        if (newStatus !== request.status) {
          request = await this.prisma.verification_requests.update({
            where: { id: request.id },
            data: {
              status: newStatus,
              decision: typeof rawData === 'string' ? rawData : (rawData ? JSON.stringify(rawData) : null),
              updated_at: new Date(),
            },
          });

          await this.prisma.verification_logs.create({
            data: {
              verification_request_id: request.id,
              action: 'status_updated',
              description: `Status synchronized: mapped to ${newStatus}.`,
            },
          });

          const customerEmail = order.customer_email || 'customer@dynime.com';
          const brief = (order.service_brief as Record<string, any>) || {};

          if (newStatus === 'verified') {
            brief.identity_verification = {
              type: request.type,
              session_id: sessionId,
              status: 'verified',
              updated_at: new Date().toISOString(),
            };
            await this.prisma.orders.update({
              where: { id: orderId },
              data: {
                status: order.status === 'pending' ? 'processing' : order.status,
                service_brief: brief,
              },
            });
            await this.prisma.verification_logs.create({
              data: {
                verification_request_id: request.id,
                action: 'order_updated',
                description: `Service Order ${order.invoice_number || order.id} status updated to processing.`,
              },
            });
            await this.mail.sendTemplateEmail({
              to: customerEmail,
              subject: 'Identity Verification Approved — Dynime',
              templateName: 'verification_approved',
              templateData: {},
              metadata: { verification_request_id: request.id }
            }).catch((e) => {
              console.error(`Failed to send verification approved email to ${customerEmail}:`, e);
            });
          } else if (newStatus === 'rejected') {
            brief.identity_verification = {
              type: request.type,
              session_id: sessionId,
              status: 'rejected',
              updated_at: new Date().toISOString(),
            };
            await this.prisma.orders.update({
              where: { id: orderId },
              data: {
                status: 'flagged',
                service_brief: brief,
              },
            });
            await this.prisma.verification_logs.create({
              data: {
                verification_request_id: request.id,
                action: 'order_flagged',
                description: `Service Order ${order.invoice_number || order.id} marked as compliance flagged.`,
              },
            });
            await this.mail.sendTemplateEmail({
              to: customerEmail,
              subject: 'Verification Attempt Declined — Dynime',
              templateName: 'verification_declined',
              templateData: {},
              metadata: { verification_request_id: request.id }
            }).catch((e) => {
              console.error(`Failed to send verification declined email to ${customerEmail}:`, e);
            });
          }
        }
      }
    }

    return {
      status: request.status,
      type: request.type,
      verification_url: request.verification_url,
      customer_name: order.customer_name,
      invoice_number: order.invoice_number,
      session_id: request.didit_session_id,
    };
  }

  async startVerification(orderId: string, origin: string) {
    const order = await this.prisma.orders.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const brief = (order.service_brief as Record<string, any>) || {};
    const verification = brief.identity_verification;
    const type = verification?.type || 'kyc';

    const profile = await this.prisma.profiles.findFirst({
      where: { email: order.customer_email },
      select: { id: true },
    });
    if (!profile) {
      throw new BadRequestException('No user profile found matching order email. Please create a user account first.');
    }

    let kybFields: any = undefined;
    if (type === 'kyb') {
      kybFields = {
        company_name: order.customer_name || 'Dynamic Company',
      };
    }

    const session = await this.verificationService.createSessionForOrder({
      type,
      targetUserId: profile.id,
      targetEmail: order.customer_email,
      frontendOrigin: origin || 'https://dynime.com',
      orderId,
      kybFields,
    });

    return {
      verification_url: session.verification_url,
      session_id: session.session_id,
      status: 'pending',
    };
  }

  async mockCompleteVerification(orderId: string, decision: 'verified' | 'rejected') {
    const order = await this.prisma.orders.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const brief = (order.service_brief as Record<string, any>) || {};
    const verification = brief.identity_verification;
    if (!verification || !verification.session_id) {
      throw new BadRequestException('No verification session exists for this order');
    }

    const sessionId = verification.session_id;

    const request = await this.prisma.verification_requests.findFirst({
      where: { service_order_id: orderId },
      orderBy: { created_at: 'desc' },
    });
    if (!request) {
      throw new BadRequestException('No verification request record found for this order');
    }

    const customerEmail = order.customer_email || 'customer@dynime.com';

    // Log raw simulation event
    await this.prisma.verification_events.create({
      data: {
        verification_request_id: request.id,
        webhook_type: decision === 'verified' ? 'session.approved' : 'session.declined',
        payload: { decision, mock: true, session_id: sessionId } as any,
      },
    });

    // Update verification request status
    const status = decision === 'verified' ? 'verified' : 'rejected';
    await this.prisma.verification_requests.update({
      where: { id: request.id },
      data: {
        status,
        decision: decision === 'verified' ? 'Approved' : 'Declined',
        updated_at: new Date(),
      },
    });

    // Write audit trail log
    await this.prisma.verification_logs.create({
      data: {
        verification_request_id: request.id,
        action: decision === 'verified' ? 'approved' : 'declined',
        description: `Mock verification completed via developer simulator: status set to ${status}.`,
      },
    });

    // Update order status & brief
    verification.status = status;
    verification.updated_at = new Date().toISOString();
    await this.prisma.orders.update({
      where: { id: orderId },
      data: {
        status: decision === 'verified' 
          ? (order.status === 'pending' ? 'processing' : order.status)
          : 'flagged',
        service_brief: brief,
      },
    });

    await this.prisma.verification_logs.create({
      data: {
        verification_request_id: request.id,
        action: decision === 'verified' ? 'order_updated' : 'order_flagged',
        description: decision === 'verified'
          ? `Service Order ${order.invoice_number || order.id} status updated to processing.`
          : `Service Order ${order.invoice_number || order.id} marked as compliance flagged.`,
      },
    });

    // Dispatch real notification email
    await this.mail.sendTemplateEmail({
      to: customerEmail,
      subject: decision === 'verified' ? 'Identity Verification Approved — Dynime' : 'Verification Attempt Declined — Dynime',
      templateName: decision === 'verified' ? 'verification_approved' : 'verification_declined',
      templateData: {},
      metadata: { verification_request_id: request.id }
    }).catch((e) => {
      console.error(`Failed to send manual sync notification email to ${customerEmail}:`, e);
    });

    await this.prisma.verification_logs.create({
      data: {
        verification_request_id: request.id,
        action: 'email_sent',
        description: `Simulated notification email dispatched to ${customerEmail} (Template: ${decision === 'verified' ? 'verification_approved' : 'verification_declined'}).`,
      },
    });

    this.eventService.emit('order-updated', { orderId });
    return { ok: true, status };
  }

  async exportOrders() {
    return this.prisma.orders.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async importOrders(orders: any[]) {
    let createdCount = 0;
    let updatedCount = 0;

    for (const order of orders) {
      if (!order.customer_email) {
        continue;
      }

      const data: any = {
        customer_email: order.customer_email,
        customer_name: order.customer_name || null,
        items: order.items || [],
        total: order.total !== undefined ? Number(order.total) : 0,
        status: order.status || 'pending',
        stripe_session_id: order.stripe_session_id || null,
        created_at: order.created_at ? new Date(order.created_at) : new Date(),
        updated_at: order.updated_at ? new Date(order.updated_at) : new Date(),
        payment_verification: order.payment_verification || null,
        coupon_code: order.coupon_code || null,
        discount_amount: order.discount_amount !== undefined ? Number(order.discount_amount) : 0,
        user_id: order.user_id || null,
        invoice_number: order.invoice_number || null,
        service_brief: order.service_brief || {},
        billing_address: order.billing_address || {},
        subtotal: order.subtotal !== undefined ? Number(order.subtotal) : 0,
        currency: order.currency || 'USD',
        notes: order.notes || null,
        is_recurring: order.is_recurring || false,
        billing_cycle: order.billing_cycle || null,
        service_category: order.service_category || null,
        payment_gateway: order.payment_gateway || null,
        tax_amount: order.tax_amount !== undefined ? Number(order.tax_amount) : 0,
        tax_percent: order.tax_percent !== undefined ? Number(order.tax_percent) : null,
        tax_mode: order.tax_mode || null,
        tax_label: order.tax_label || null,
        refunded_amount: order.refunded_amount !== undefined ? Number(order.refunded_amount) : 0,
        refunded_tax_amount: order.refunded_tax_amount !== undefined ? Number(order.refunded_tax_amount) : 0,
        refunded_at: order.refunded_at ? new Date(order.refunded_at) : null,
        refund_reason: order.refund_reason || null,
        referral_code: order.referral_code || null,
      };

      let existingOrder: any = null;
      if (order.id) {
        existingOrder = await this.prisma.orders.findUnique({
          where: { id: order.id },
        });
      }

      if (!existingOrder && order.invoice_number) {
        existingOrder = await this.prisma.orders.findUnique({
          where: { invoice_number: order.invoice_number },
        });
      }

      if (existingOrder) {
        await this.prisma.orders.update({
          where: { id: existingOrder.id },
          data,
        });
        updatedCount++;
      } else {
        if (order.id) {
          data.id = order.id;
        }
        await this.prisma.orders.create({
          data,
        });
        createdCount++;
      }
    }

    return { created: createdCount, updated: updatedCount };
  }
}

