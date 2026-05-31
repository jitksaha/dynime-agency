import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  getOrders() {
    return this.prisma.orders.findMany({
      select: {
        id: true, total: true, status: true,
        customer_name: true, customer_email: true, created_at: true,
        tax_amount: true, tax_percent: true, tax_mode: true, tax_label: true,
        refunded_amount: true, refunded_tax_amount: true, refunded_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  getSubscribers() {
    return this.prisma.newsletter_subscribers.findMany({
      select: { id: true, email: true, status: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }

  getFxOrders() {
    return this.prisma.fx_orders.findMany({
      select: {
        status: true, base_currency: true, base_amount: true,
        revenue_usd: true, cost_usd: true, profit_usd: true,
        fee_usd: true, order_date: true,
      },
      orderBy: { order_date: 'desc' },
      take: 2000,
    });
  }

  getDynimeEmployees() {
    return this.prisma.$queryRaw<any[]>`
      SELECT employee_id, full_name, department, designation, status,
             monthly_gross_usd, annual_salary_usd
      FROM   dynime_employees
    `;
  }

  getKpiMonthly() {
    return this.prisma.$queryRaw<any[]>`
      SELECT period, revenue_usd, net_income_usd, mrr_usd,
             headcount, churn_rate_pct, nps_score
      FROM   dynime_kpi_monthly
      ORDER  BY period ASC
    `;
  }

  async getCounts() {
    const [portfolio] = await Promise.all([
      this.prisma.portfolio_projects.count(),
    ]);
    return { portfolio };
  }
}
