import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private supabaseUrl(): string {
    const dbUrl = this.config.get<string>('SUPABASE_DB_URL') ?? '';
    const m = dbUrl.match(/postgres\.([a-zA-Z0-9]+):/);
    if (m) return `https://${m[1]}.supabase.co`;
    return this.config.get<string>('SUPABASE_URL') ?? '';
  }

  // ── Reads ──────────────────────────────────────────────────────────────
  getRuns() {
    return this.prisma.payroll_runs.findMany({
      orderBy: [{ period_year: 'desc' }, { period_month: 'desc' }],
      take: 200,
    });
  }

  getItems(runId: string) {
    return this.prisma.payroll_items.findMany({
      where: { run_id: runId },
      orderBy: { employee_name: 'asc' },
    });
  }

  getAdjustments(itemId: string) {
    return this.prisma.payroll_adjustments.findMany({
      where: { item_id: itemId },
      orderBy: { created_at: 'asc' },
    });
  }

  getAudit(runId: string) {
    return this.prisma.payroll_audit_logs.findMany({
      where: { run_id: runId },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }

  async getActiveEmployeeCount() {
    return this.prisma.employees.count({ where: { status: 'active' } });
  }

  // ── RPCs (stored procedures) ───────────────────────────────────────────
  async ensureCurrentMonth(currency: string, workingDays: number) {
    const r = await this.prisma.$queryRawUnsafe<{ result: string }[]>(
      `SELECT payroll_ensure_current_month($1::text, $2::int) AS result`,
      currency,
      workingDays,
    );
    return (r[0] as any)?.result ?? null;
  }

  async syncRun(runId: string) {
    const r = await this.prisma.$queryRawUnsafe<{ result: number }[]>(
      `SELECT payroll_sync_run($1::uuid) AS result`,
      runId,
    );
    return (r[0] as any)?.result ?? 0;
  }

  async generateRun(params: {
    currency?: string; workingDays?: number;
    periodYear: number; periodMonth: number;
  }) {
    const r = await this.prisma.$queryRawUnsafe<{ result: string }[]>(
      `SELECT payroll_generate_run(gen_random_uuid(), $1::text, $2::int, $3::int, $4::int) AS result`,
      params.currency ?? 'USD',
      params.workingDays ?? 22,
      params.periodYear,
      params.periodMonth,
    );
    return (r[0] as any)?.result ?? null;
  }

  async approveRun(runId: string) {
    await this.prisma.$queryRawUnsafe(
      `SELECT payroll_approve_run($1::uuid)`,
      runId,
    );
    return { ok: true };
  }

  async markPaid(runId: string, itemIds: string[] | null, method: string) {
    await this.prisma.$queryRawUnsafe(
      `SELECT payroll_mark_paid($1::uuid, $2::uuid[], $3::text)`,
      runId,
      itemIds,
      method,
    );
    return { ok: true };
  }

  async cancelItem(itemId: string, reason: string) {
    await this.prisma.$queryRawUnsafe(
      `SELECT payroll_cancel_item($1::uuid, $2::text)`,
      itemId,
      reason,
    );
    return { ok: true };
  }

  async lockRun(runId: string, lock: boolean) {
    await this.prisma.$queryRawUnsafe(
      `SELECT payroll_lock_run($1::uuid, $2::bool)`,
      runId,
      lock,
    );
    return { ok: true };
  }

  // ── Edge Function Proxy — payroll-history-seed ─────────────────────────
  async seedHistory() {
    const url = `${this.supabaseUrl()}/functions/v1/payroll-history-seed`;
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => res.statusText);
      throw new Error(`payroll-history-seed failed: ${txt}`);
    }
    return res.json();
  }
}
