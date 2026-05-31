import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';

@Injectable()
export class CreditService {
  constructor(private readonly prisma: PrismaService) {}

  async listApplicationsAdmin() {
    const rows = await this.prisma.credit_applications.findMany({
      orderBy: { created_at: 'desc' },
    });
    const uids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
    let profileMap = new Map<string, any>();
    if (uids.length) {
      const profiles = await this.prisma.profiles.findMany({
        where: { id: { in: uids } },
        select: { id: true, email: true, full_name: true },
      });
      profileMap = new Map(profiles.map((p) => [p.id, p]));
    }
    return rows.map((r) => ({ ...r, profiles: profileMap.get(r.user_id) ?? null }));
  }

  async listApplicationsForUser(userId: string) {
    return this.prisma.credit_applications.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  async createApplication(dto: CreateApplicationDto, userId: string) {
    return this.prisma.credit_applications.create({
      data: {
        user_id: userId,
        requested_limit: dto.requested_limit,
        business_revenue: dto.business_revenue ?? null,
        business_age: dto.business_age ?? null,
        industry: dto.industry ?? null,
        country: dto.country ?? null,
        notes: dto.notes ?? null,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  async reviewApplication(id: string, dto: ReviewApplicationDto, adminUserId: string) {
    const app = await this.prisma.credit_applications.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    return this.prisma.credit_applications.update({
      where: { id },
      data: {
        status: dto.status,
        admin_notes: dto.admin_notes ?? null,
        reviewed_by: adminUserId,
        reviewed_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  async listCreditAccounts(userId?: string) {
    return this.prisma.flexpay_credit_accounts.findMany({
      where: userId ? { user_id: userId } : undefined,
      orderBy: { created_at: 'desc' },
    });
  }

  async listEmiPlans(userId?: string) {
    const plans = await this.prisma.flexpay_emi_plans.findMany({
      where: userId ? { user_id: userId } : undefined,
      orderBy: { created_at: 'desc' },
    });
    if (!plans.length) return plans;
    const planIds = plans.map((p) => p.id);
    const installments = await this.prisma.flexpay_emi_installments.findMany({
      where: { plan_id: { in: planIds } },
      orderBy: { sequence: 'asc' },
    });
    const byPlan = new Map<string, any[]>();
    installments.forEach((i) => {
      if (!byPlan.has(i.plan_id)) byPlan.set(i.plan_id, []);
      byPlan.get(i.plan_id)!.push(i);
    });
    return plans.map((p) => ({ ...p, installments: byPlan.get(p.id) ?? [] }));
  }
}
