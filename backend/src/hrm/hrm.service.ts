import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HrmService {
  private readonly logger = new Logger(HrmService.name);

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

  // ── Employees ──────────────────────────────────────────────────────────
  getEmployees(activeOnly = false) {
    return this.prisma.employees.findMany({
      where: activeOnly ? { status: 'active' } : undefined,
      orderBy: { full_name: 'asc' },
    });
  }

  createEmployee(data: any) {
    return this.prisma.employees.create({ data });
  }

  updateEmployee(id: string, data: any) {
    return this.prisma.employees.update({ where: { id }, data });
  }

  deleteEmployee(id: string) {
    return this.prisma.employees.delete({ where: { id } });
  }

  async upsertEmployee(payload: any) {
    const { conflict_on, ...data } = payload;
    if (!conflict_on || !data[conflict_on]) {
      return this.prisma.employees.create({ data });
    }
    const where: any = { [conflict_on]: data[conflict_on] };
    const existing = await this.prisma.employees.findFirst({ where });
    if (existing) {
      return this.prisma.employees.update({ where: { id: existing.id }, data });
    }
    return this.prisma.employees.create({ data });
  }

  bulkUpdateEmployees(ids: string[], data: any) {
    return this.prisma.employees.updateMany({ where: { id: { in: ids } }, data });
  }

  /** Returns auth.users + profiles joined — replacement for manage-team. */
  async getTeamUsers() {
    return this.prisma.$queryRaw<any[]>`
      SELECT u.id, u.email, u.last_sign_in_at,
             p.full_name, p.avatar_url, p.phone
      FROM   auth.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      ORDER  BY u.email
    `;
  }

  // ── Careers ────────────────────────────────────────────────────────────
  getCareers() {
    return this.prisma.$queryRaw<{ title: string; department: string | null }[]>`
      SELECT title, department FROM careers ORDER BY title
    `;
  }

  // ── Site Settings ──────────────────────────────────────────────────────
  async getSiteSettingByKey(key: string) {
    const rows = await this.prisma.$queryRaw<{ value: any }[]>`
      SELECT value FROM site_settings WHERE key = ${key} LIMIT 1
    `;
    return rows[0] ?? null;
  }

  async upsertSiteSettingByKey(key: string, value: string) {
    await this.prisma.$executeRaw`
      INSERT INTO site_settings (key, value)
      VALUES (${key}, ${value}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
    return { ok: true };
  }

  // ── ID Card Assignments ────────────────────────────────────────────────
  async getIdCardAssignments(kind: string, subjectKeys: string[]) {
    if (!subjectKeys.length) return [];
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT subject_key, card_id FROM id_card_assignments WHERE kind = $1 AND subject_key = ANY($2::text[])`,
      kind,
      subjectKeys,
    );
  }

  async getIdCardAssignmentSingle(kind: string, subjectKey: string) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT card_id FROM id_card_assignments
      WHERE kind = ${kind} AND subject_key = ${subjectKey}
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  // ── Attendance ─────────────────────────────────────────────────────────
  getAttendance(filters?: { employeeId?: string; from?: string; to?: string }) {
    return this.prisma.attendance_records.findMany({
      where: {
        ...(filters?.employeeId ? { employee_id: filters.employeeId } : {}),
        ...(filters?.from ? { work_date: { gte: filters.from } } : {}),
        ...(filters?.to ? { work_date: { lte: filters.to } } : {}),
      },
      orderBy: { work_date: 'desc' },
      take: 500,
    });
  }

  async clockInOut(employeeId: string, action: 'in' | 'out') {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const existing = await this.prisma.attendance_records.findFirst({
      where: { employee_id: employeeId, work_date: today },
    });
    if (action === 'in') {
      if (existing?.clock_in) throw new Error('Already clocked in today');
      if (existing) {
        return this.prisma.attendance_records.update({
          where: { id: existing.id },
          data: { clock_in: now.toISOString() },
        });
      }
      return this.prisma.attendance_records.create({
        data: { employee_id: employeeId, work_date: today, clock_in: now.toISOString(), source: 'self' },
      });
    } else {
      if (!existing?.clock_in) throw new Error("You haven't clocked in today");
      if (existing.clock_out) throw new Error('Already clocked out');
      const mins = Math.round((now.getTime() - new Date(existing.clock_in as any).getTime()) / 60000);
      return this.prisma.attendance_records.update({
        where: { id: existing.id },
        data: { clock_out: now.toISOString(), total_minutes: mins },
      });
    }
  }

  // ── Leave ──────────────────────────────────────────────────────────────
  getLeaveTypes() {
    return this.prisma.leave_types.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });
  }

  getLeaveRequests(employeeId?: string) {
    return this.prisma.leave_requests.findMany({
      where: employeeId ? { employee_id: employeeId } : undefined,
      include: { leave_types: { select: { name: true, color: true } } },
      orderBy: { created_at: 'desc' },
      take: 500,
    });
  }

  submitLeave(data: any) {
    return this.prisma.leave_requests.create({ data });
  }

  decideLeave(id: string, status: string, note: string | undefined, decidedBy: string) {
    return this.prisma.leave_requests.update({
      where: { id },
      data: { status, decision_note: note ?? null, decided_at: new Date(), decided_by: decidedBy },
    });
  }

  // ── KPI Goals ──────────────────────────────────────────────────────────
  getKpiGoals(employeeId?: string) {
    return this.prisma.kpi_goals.findMany({
      where: employeeId ? { employee_id: employeeId } : undefined,
      orderBy: { created_at: 'desc' },
    });
  }

  // ── Announcements ──────────────────────────────────────────────────────
  getAnnouncements() {
    return this.prisma.announcements.findMany({
      where: { is_published: true },
      orderBy: [{ pinned: 'desc' }, { publish_at: 'desc' }],
      take: 50,
    });
  }

  async upsertAnnouncement(payload: any, authorId?: string) {
    if (payload.id) {
      const { id, ...data } = payload;
      return this.prisma.announcements.update({ where: { id }, data });
    }
    return this.prisma.announcements.create({
      data: { ...payload, author_id: authorId ?? null },
    });
  }

  // ── HR Requests ────────────────────────────────────────────────────────
  async getHrRequests() {
    const requests = await this.prisma.hr_requests.findMany({
      orderBy: { created_at: 'desc' },
    });

    const empIds = [...new Set(
      requests.map(r => r.employee_id).filter(Boolean) as string[]
    )];

    let empMap: Record<string, any> = {};
    if (empIds.length > 0) {
      const emps = await this.prisma.employees.findMany({
        where: { id: { in: empIds } },
        select: {
          id: true,
          full_name: true,
          employee_code: true,
          email: true,
          designation: true,
          department: true,
        },
      });
      emps.forEach(e => { empMap[e.id] = e; });
    }

    return requests.map(r => ({
      ...r,
      employees: empMap[r.employee_id as string] ?? null,
    }));
  }

  getHrRequest(id: string) {
    return this.prisma.hr_requests.findUnique({ where: { id } });
  }

  updateHrRequest(id: string, data: any) {
    return this.prisma.hr_requests.update({ where: { id }, data });
  }

  getHrRequestEvents(requestId: string) {
    return this.prisma.hr_request_events.findMany({
      where: { request_id: requestId },
      orderBy: { created_at: 'asc' },
    });
  }

  addHrRequestEvent(requestId: string, data: any) {
    return this.prisma.hr_request_events.create({
      data: { ...data, request_id: requestId },
    });
  }

  // ── HR Documents ───────────────────────────────────────────────────────
  getHrDocuments() {
    return this.prisma.hr_documents.findMany({
      orderBy: { created_at: 'desc' },
      take: 500,
    });
  }

  voidHrDocument(id: string) {
    return this.prisma.hr_documents.update({
      where: { id },
      data: { status: 'void' },
    });
  }

  // ── Edge Function Proxy — issue-hr-document ────────────────────────────
  async issueHrDocument(payload: any) {
    const url = `${this.supabaseUrl()}/functions/v1/issue-hr-document`;
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => res.statusText);
      throw new Error(`issue-hr-document failed: ${txt}`);
    }
    return res.json();
  }
}
