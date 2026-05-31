import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListOrdersDto } from './dto/list-orders.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ClaimOrderDto } from './dto/claim-order.dto';

const ADMIN_ROLES = ['super_admin', 'manager', 'admin'];

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async listAdmin(dto: ListOrdersDto) {
    const page = Math.max(1, Number(dto.page ?? 1));
    const limit = Math.min(500, Math.max(1, Number(dto.limit ?? 100)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (dto.status) where.status = dto.status;
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

    return { data, total, page, limit };
  }

  async listForUser(userEmail: string, userId: string) {
    return this.prisma.orders.findMany({
      where: {
        OR: [
          { customer_email: { equals: userEmail, mode: 'insensitive' } },
          { user_id: userId },
        ],
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, userEmail?: string, userId?: string, isAdmin = false) {
    const order = await this.prisma.orders.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (!isAdmin) {
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

    const data: any = { updated_at: new Date() };
    if (dto.status) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.orders.update({ where: { id }, data });
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
}
