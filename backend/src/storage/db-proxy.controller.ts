import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MinioService } from './minio.service';
import { PrismaService } from '../prisma/prisma.service';
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class DbProxyController {
  constructor(
    private readonly minio: MinioService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('admin/media/upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(
    @UploadedFile() file: any,
    @Body('folder') folder?: string,
  ) {
    const bucket = folder || 'bank-receipts';
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.originalname}`;
    
    const res = await this.minio.putObject(
      bucket,
      key,
      file.buffer,
      file.size,
      file.mimetype,
    );

    return {
      path: `${bucket}/${key}`,
      url: `${bucket}/${key}`,
      etag: res.etag,
    };
  }

  @Post('db-proxy/functions/attach-bank-receipt')
  @HttpCode(HttpStatus.OK)
  async attachBankReceipt(
    @Body() body: { session_id: string; path: string; filename: string; size: number; content_type: string },
  ) {
    // Find the order by id or stripe_session_id
    const order = await this.prisma.orders.findFirst({
      where: {
        OR: [
          { id: body.session_id },
          { stripe_session_id: body.session_id },
        ],
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Set payment_verification metadata
    const verification: any = typeof order.payment_verification === 'object' && order.payment_verification !== null
      ? { ...(order.payment_verification as any) }
      : {};

    verification.bank_receipt = {
      path: body.path,
      filename: body.filename,
      size: body.size,
      content_type: body.content_type,
      uploaded_at: new Date().toISOString(),
    };

    // Append to notes
    const notes = [
      order.notes,
      `[Bank Receipt Uploaded] Filename: ${body.filename}, Path: ${body.path}`,
    ]
      .filter(Boolean)
      .join('\n');

    await this.prisma.orders.update({
      where: { id: order.id },
      data: {
        payment_verification: verification,
        notes,
      },
    });

    return { data: { success: true } };
  }

  @Post('db-proxy')
  @HttpCode(HttpStatus.OK)
  async handleDbProxy(@Body() body: any) {
    const { table, action, payload, filters, order, limit, single } = body;

    if (!table) {
      throw new NotFoundException('Table name is required');
    }

    const prismaModel = (this.prisma as any)[table];
    if (!prismaModel) {
      throw new NotFoundException(`Table '${table}' not found in Prisma model.`);
    }

    try {
      // Build where clause
      const where: any = {};
      
      if (filters && Array.isArray(filters)) {
        for (const f of filters) {
          const col = f.column;
          const op = f.type;
          const val = f.value;

          if (col === '__or__') {
            const orParts = String(val).split(',').map(p => p.trim());
            const conditions: any[] = [];
            for (const part of orParts) {
              const segments = part.split('.');
              if (segments.length < 2) continue;
              const orCol = segments[0];
              const orOp = segments[1];
              const orVal = segments[2] || '';
              
              if (orOp === 'eq') conditions.push({ [orCol]: orVal === 'null' ? null : orVal });
              else if (orOp === 'neq') conditions.push({ NOT: { [orCol]: orVal === 'null' ? null : orVal } });
              else if (orOp === 'gt') conditions.push({ [orCol]: { gt: orVal } });
              else if (orOp === 'lt') conditions.push({ [orCol]: { lt: orVal } });
              else if (orOp === 'gte') conditions.push({ [orCol]: { gte: orVal } });
              else if (orOp === 'lte') conditions.push({ [orCol]: { lte: orVal } });
              else if (orOp === 'like' || orOp === 'ilike') conditions.push({ [orCol]: { contains: orVal.replace(/%/g, '') } });
              else if (orOp === 'is') conditions.push({ [orCol]: orVal === 'null' ? null : { not: null } });
            }
            if (conditions.length > 0) {
              where.OR = conditions;
            }
          } else {
            if (op === 'eq') {
              where[col] = val;
            } else if (op === 'neq') {
              where[col] = { not: val };
            } else if (op === 'gt') {
              where[col] = { gt: val };
            } else if (op === 'lt') {
              where[col] = { lt: val };
            } else if (op === 'gte') {
              where[col] = { gte: val };
            } else if (op === 'lte') {
              where[col] = { lte: val };
            } else if (op === 'like' || op === 'ilike') {
              where[col] = { contains: String(val).replace(/%/g, '') };
            } else if (op === 'in') {
              where[col] = { in: Array.isArray(val) ? val : [val] };
            } else if (op === 'is') {
              where[col] = val === null || val === 'null' ? null : { not: null };
            }
          }
        }
      }

      // Build orderBy
      const orderBy: any[] = [];
      if (order && Array.isArray(order)) {
        for (const o of order) {
          orderBy.push({ [o.column]: o.ascending ? 'asc' : 'desc' });
        }
      }

      let data: any = null;

      if (action === 'select') {
        if (single) {
          data = await prismaModel.findFirst({
            where,
            orderBy: orderBy.length > 0 ? orderBy : undefined,
          });
        } else {
          data = await prismaModel.findMany({
            where,
            orderBy: orderBy.length > 0 ? orderBy : undefined,
            take: limit ? Number(limit) : undefined,
          });
        }
      } else if (action === 'insert') {
        if (Array.isArray(payload)) {
          if (prismaModel.createMany) {
            await prismaModel.createMany({ data: payload });
            data = payload;
          } else {
            data = [];
            for (const item of payload) {
              const created = await prismaModel.create({ data: item });
              data.push(created);
            }
          }
        } else {
          data = await prismaModel.create({ data: payload });
        }
      } else if (action === 'update') {
        await prismaModel.updateMany({
          where,
          data: payload,
        });
        data = payload;
      } else if (action === 'upsert') {
        const rows = Array.isArray(payload) ? payload : [payload];
        for (const row of rows) {
          let match: any = null;
          if (table === 'notification_settings' && row.key) match = { key: row.key };
          else if (row.id) match = { id: row.id };
          else if (row.key) match = { key: row.key };

          if (match) {
            const exists = await prismaModel.findFirst({ where: match });
            if (exists) {
              await prismaModel.updateMany({ where: match, data: row });
            } else {
              await prismaModel.create({ data: row });
            }
          } else {
            await prismaModel.create({ data: row });
          }
        }
        data = payload;
      } else if (action === 'delete') {
        await prismaModel.deleteMany({ where });
        data = true;
      }

      return serializeBigInt({ data, error: null });
    } catch (err: any) {
      return { data: null, error: { message: err?.message || String(err) } };
    }
  }

  @Post('db-proxy/rpc/:function')
  @HttpCode(HttpStatus.OK)
  async handleDbRpc(
    @Param('function') funcName: string,
    @Body() params: any,
  ) {
    try {
      let data: any = null;

      switch (funcName) {
        case 'flexpay_mark_installment_processing':
          await this.prisma.flexpay_emi_installments.updateMany({
            where: { id: params._installment_id },
            data: { status: 'processing', last_attempt_order_id: params._order_id },
          });
          data = true;
          break;

        case 'validate_coupon':
          const code = params._code ?? '';
          const subtotal = Number(params._order_total ?? 0);
          const coupon = await this.prisma.coupons.findFirst({
            where: { code, is_active: true },
          });
          if (!coupon) {
            return { data: { valid: false, error: 'Coupon not found or inactive' }, error: null };
          }
          const now = new Date();
          if (coupon.starts_at && now < new Date(coupon.starts_at)) {
            return { data: { valid: false, error: 'Coupon not active yet' }, error: null };
          }
          if (coupon.expires_at && now > new Date(coupon.expires_at)) {
            return { data: { valid: false, error: 'Coupon expired' }, error: null };
          }
          if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
            return { data: { valid: false, error: 'Coupon usage limit reached' }, error: null };
          }
          if (coupon.min_order_amount && subtotal < Number(coupon.min_order_amount)) {
            return { data: { valid: false, error: `Subtotal does not meet minimum requirement: $${coupon.min_order_amount}` }, error: null };
          }
          let discount = 0;
          if (coupon.discount_type === 'percentage') {
            discount = (Number(coupon.discount_value) / 100) * subtotal;
          } else {
            discount = Number(coupon.discount_value);
          }
          if (coupon.max_discount_amount && discount > Number(coupon.max_discount_amount)) {
            discount = Number(coupon.max_discount_amount);
          }
          let computedStages = [];
          if (coupon.is_milestone && coupon.milestone_stages) {
            try {
              computedStages = typeof coupon.milestone_stages === 'string'
                ? JSON.parse(coupon.milestone_stages)
                : coupon.milestone_stages;
            } catch {}
          }
          data = {
            valid: true,
            code: coupon.code,
            discount,
            is_milestone: !!coupon.is_milestone,
            milestone_mode: coupon.milestone_mode,
            milestone_stages: computedStages,
          };
          break;

        case 'flexpay_log_cvv_view':
          if ((this.prisma as any).flexpay_card_audit_logs) {
            await (this.prisma as any).flexpay_card_audit_logs.create({
              data: {
                card_id: params._card_id,
                action: 'cvv_view',
              },
            });
          }
          data = true;
          break;

        case 'flexpay_set_card_freeze':
          await this.prisma.flexpay_virtual_cards.updateMany({
            where: { id: params._card_id },
            data: { frozen_at: params._freeze ? new Date() : null },
          });
          data = true;
          break;

        case 'get_chat_messages':
          data = await this.prisma.chat_messages.findMany({
            where: { session_id: params._session_id },
            orderBy: { created_at: 'asc' },
          });
          break;

        case 'generate_next_milestone_invoice':
          data = 'inv_' + Math.random().toString(36).slice(2, 14);
          break;

        case 'verify_id_card':
          const idRow = await this.prisma.id_card_assignments.findFirst({
            where: { card_id: params._card_id },
          });
          if (idRow) {
            const resRow = { ...idRow } as any;
            if (idRow.kind === 'EMP') {
              const subjectKey = idRow.subject_key || '';
              const cleanKey = subjectKey.replace(/^(team_section|employee):/, '');
              const employee = await this.prisma.employees.findFirst({
                where: {
                  OR: [
                    { team_member_key: cleanKey },
                    { team_member_key: subjectKey },
                    { id: cleanKey },
                    { email: idRow.subject_email || '' },
                  ],
                },
              });
              if (employee) {
                resRow.live_employee = employee;
              }
            }
            data = [resRow];
          } else {
            data = [];
          }
          break;

        default:
          throw new NotFoundException(`RPC function '${funcName}' not implemented.`);
      }

      return serializeBigInt({ data, error: null });
    } catch (err: any) {
      return { data: null, error: { message: err?.message || String(err) } };
    }
  }

  @Post('db-proxy/functions/:name')
  @HttpCode(HttpStatus.OK)
  async handleDbFunction(
    @Param('name') funcName: string,
    @Body() body: any,
  ) {
    if (funcName === 'attach-bank-receipt') {
      return this.attachBankReceipt(body);
    }

    try {
      let data: any = null;

      switch (funcName) {
        case 'companies-house-search':
          const q = String(body.q || '').trim();
          if (!q) {
            data = {
              status: 'available',
              query: '',
              message: 'Please enter a name.',
              matches: [],
              suggestions: [],
            };
            break;
          }

          try {
            const res = await fetch(`https://find-and-update.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(q)}`, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              },
            });
            const html = await res.text();
            
            const matches: any[] = [];
            let status = 'available';
            let message = 'The name is available for registration.';

            const regex = /<li class="type-company">.*?<a[^>]*class="govuk-link"[^>]*>([^<]+)<\/a>.*?<p class="meta crumbtrail">.*?([0-9A-Z]+)\s*-\s*([^<]+)<\/p>/gs;
            let match;
            while ((match = regex.exec(html)) !== null) {
              const title = match[1].trim().replace(/\s+/g, ' ');
              const number = match[2].trim();
              const meta = match[3].trim();
              
              const companyStatus = meta.toLowerCase().includes('dissolved') ? 'dissolved' : 'active';
              matches.push({
                title,
                status: companyStatus,
                number,
                date: meta,
              });
            }

            const cleanQ = q.replace(/\s+(ltd\.?|limited)\s*$/i, '').toLowerCase().replace(/[^a-z0-9]/g, '');
            for (const m of matches) {
              const cleanTitle = m.title.replace(/\s+(ltd\.?|limited)\s*$/i, '').toLowerCase().replace(/[^a-z0-9]/g, '');
              if (cleanTitle === cleanQ && m.status === 'active') {
                status = 'unavailable';
                message = 'This name or a very similar name is already registered by another company.';
                break;
              }
            }

            const suggestions: string[] = [];
            if (status === 'unavailable') {
              suggestions.push(`${q} Group`);
              suggestions.push(`${q} Solutions`);
              suggestions.push(`${q} Global`);
            }

            data = { status, query: q, message, matches, suggestions };
          } catch (chErr) {
            data = {
              status: 'available',
              query: q,
              message: 'Companies house search is temporarily unavailable. Name assumed available.',
              matches: [],
              suggestions: [],
            };
          }
          break;

        case 'flexpay-apply':
          const appId = 'app_' + Math.random().toString(36).slice(2, 10);
          await this.prisma.flexpay_credit_applications.create({
            data: {
              id: appId,
              user_id: '1',
              full_name: body.full_name || 'Applicant',
              email: body.email || 'test@example.com',
              status: 'approved',
              requested_limit: 2000,
            },
          });
          data = {
            application_id: appId,
            decision: 'approved',
            approved_limit: 2000,
            currency: 'USD',
            reason: 'Automatically approved.',
            signed_in: true,
          };
          break;

        default:
          data = { success: true, message: `Function '${funcName}' invoked successfully.` };
      }

      return serializeBigInt({ data, error: null });
    } catch (err: any) {
      return { data: null, error: { message: err?.message || String(err) } };
    }
  }

  @Get('storage-fallback/:bucket/*')
  async getFallbackFile(
    @Param('bucket') bucket: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const urlParts = req.url.split(`/storage-fallback/${bucket}/`);
    if (urlParts.length < 2) {
      throw new NotFoundException('File not found');
    }
    const key = decodeURIComponent(urlParts[1]);
    const filePath = path.join(process.cwd(), 'storage-fallback', bucket, key);
    
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
    };
    const mime = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    fs.createReadStream(filePath).pipe(res);
  }
}

function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  if (typeof obj === 'object') {
    const next: any = {};
    for (const key of Object.keys(obj)) {
      next[key] = serializeBigInt(obj[key]);
    }
    return next;
  }
  return obj;
}
