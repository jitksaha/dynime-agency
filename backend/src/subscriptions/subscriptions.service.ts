import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAdmin(filters?: { category?: string; type?: string; status?: string }) {
    const where: any = {};
    if (filters?.category) where.category = filters.category;
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    return this.prisma.customer_services.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
  }

  async listForUser(userId: string, userEmail: string, filters?: { category?: string; type?: string }) {
    const where: any = {
      OR: [
        { user_id: userId },
        { customer_email: { equals: userEmail, mode: 'insensitive' } },
      ],
    };
    if (filters?.category) where.category = filters.category;
    if (filters?.type) where.type = filters.type;
    return this.prisma.customer_services.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const svc = await this.prisma.customer_services.findUnique({ where: { id } });
    if (!svc) throw new NotFoundException('Service not found');
    return svc;
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    const svc = await this.prisma.customer_services.findUnique({ where: { id } });
    if (!svc) throw new NotFoundException('Service not found');
    const data: any = { updated_at: new Date() };
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.auto_renew !== undefined) data.auto_renew = dto.auto_renew;
    if (dto.current_period_end !== undefined) data.current_period_end = new Date(dto.current_period_end);
    return this.prisma.customer_services.update({ where: { id }, data });
  }

  async listRenewals(customerServiceId?: string) {
    return this.prisma.service_renewals.findMany({
      where: customerServiceId ? { customer_service_id: customerServiceId } : undefined,
      orderBy: { attempted_at: 'desc' },
      take: 200,
    });
  }
}
