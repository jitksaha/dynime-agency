import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Leads ──────────────────────────────────────────────────────────────
  getLeads(filters?: { status?: string; source?: string; q?: string }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.source) where.source = filters.source;
    if (filters?.q) {
      const q = `%${filters.q}%`;
      where.OR = [
        { full_name: { contains: filters.q, mode: 'insensitive' } },
        { email: { contains: filters.q, mode: 'insensitive' } },
        { company: { contains: filters.q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.crm_leads.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 500,
    });
  }

  async upsertLead(payload: any) {
    if (payload.id) {
      const { id, ...data } = payload;
      return this.prisma.crm_leads.update({ where: { id }, data });
    }
    return this.prisma.crm_leads.create({ data: payload });
  }

  updateLeadStatus(id: string, status: string) {
    return this.prisma.crm_leads.update({ where: { id }, data: { status } });
  }

  getLeadStatusCounts(filters?: { status?: string }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    return this.prisma.crm_leads.groupBy({
      by: ['status'],
      _count: { status: true },
      where,
    });
  }

  // ── Activities ─────────────────────────────────────────────────────────
  getActivities(filters?: { mine?: boolean; assigneeId?: string; status?: string }) {
    const where: any = {};
    if (filters?.mine && filters.assigneeId) where.assignee_id = filters.assigneeId;
    if (filters?.status) where.status = filters.status;
    return this.prisma.crm_activities.findMany({
      where,
      orderBy: [{ due_at: 'asc' }],
      take: 500,
    });
  }

  async upsertActivity(payload: any) {
    if (payload.id) {
      const { id, ...data } = payload;
      return this.prisma.crm_activities.update({ where: { id }, data });
    }
    return this.prisma.crm_activities.create({ data: payload });
  }

  // ── Deals ──────────────────────────────────────────────────────────────
  getDeals(pipelineId: string) {
    return this.prisma.crm_deals.findMany({
      where: { pipeline_id: pipelineId },
      orderBy: { position: 'asc' },
    });
  }

  async upsertDeal(payload: any) {
    if (payload.id) {
      const { id, ...data } = payload;
      return this.prisma.crm_deals.update({ where: { id }, data });
    }
    return this.prisma.crm_deals.create({ data: payload });
  }

  moveDeal(id: string, stage_id: string) {
    return this.prisma.crm_deals.update({ where: { id }, data: { stage_id } });
  }

  // ── Pipelines ──────────────────────────────────────────────────────────
  async getPipelines() {
    const pipelines = await this.prisma.crm_pipelines.findMany({
      where: { is_active: true },
      include: { crm_stages: { orderBy: { position: 'asc' } } },
      orderBy: { created_at: 'asc' },
    });
    return pipelines.map((p: any) => ({ ...p, stages: p.crm_stages }));
  }

  // ── Workflows ──────────────────────────────────────────────────────────
  async getWorkflows() {
    const [workflows, runs] = await Promise.all([
      this.prisma.crm_workflows.findMany({
        include: { crm_workflow_steps: { orderBy: { position: 'asc' } } },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.crm_workflow_runs.groupBy({
        by: ['workflow_id', 'status'],
        _count: { status: true },
      }),
    ]);
    const runMap: Record<string, Record<string, number>> = {};
    for (const r of runs) {
      if (!runMap[r.workflow_id]) runMap[r.workflow_id] = {};
      runMap[r.workflow_id][r.status] = (r._count as any).status;
    }
    return workflows.map((w: any) => ({
      ...w,
      steps: w.crm_workflow_steps,
      run_stats: runMap[w.id] ?? {},
    }));
  }

  createWorkflow(data: any, createdBy: string) {
    return this.prisma.crm_workflows.create({
      data: { ...data, created_by: createdBy },
    });
  }

  getWorkflow(id: string) {
    return this.prisma.crm_workflows.findUnique({
      where: { id },
      include: { crm_workflow_steps: { orderBy: { position: 'asc' } } },
    });
  }

  updateWorkflow(id: string, data: any, steps?: any[]) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.crm_workflows.update({
        where: { id },
        data,
      });

      if (steps) {
        await tx.crm_workflow_steps.deleteMany({
          where: { workflow_id: id },
        });

        if (steps.length > 0) {
          const payload = steps.map((s, i) => ({
            workflow_id: id,
            position: i,
            step_type: s.step_type,
            config: s.config || {},
          }));
          await tx.crm_workflow_steps.createMany({
            data: payload,
          });
        }
      }
      return updated;
    });
  }

  deleteWorkflow(id: string) {
    return this.prisma.crm_workflows.delete({ where: { id } });
  }

  // ── Email Templates ────────────────────────────────────────────────────
  getEmailTemplates() {
    return this.prisma.crm_email_templates.findMany({ orderBy: { name: 'asc' } });
  }

  async upsertEmailTemplate(payload: any) {
    if (payload.id) {
      const { id, ...data } = payload;
      return this.prisma.crm_email_templates.update({ where: { id }, data });
    }
    return this.prisma.crm_email_templates.create({ data: payload });
  }

  deleteEmailTemplate(id: string) {
    return this.prisma.crm_email_templates.delete({ where: { id } });
  }

  // ── Score Weights ──────────────────────────────────────────────────────
  async getScoreWeights() {
    return this.prisma.crm_score_weights.findFirst({ where: { id: 1 } });
  }

  async updateScoreWeights(weights: any) {
    const row = await this.prisma.crm_score_weights.upsert({
      where: { id: 1 },
      update: { weights },
      create: { id: 1, weights },
    });
    await this.prisma.$executeRaw`SELECT recompute_crm_lead_scores()`;
    return row;
  }

  // ── Workflow Stats ─────────────────────────────────────────────────────
  async getWorkflowStats() {
    const rows = await this.prisma.$queryRaw<{ status: string; cnt: bigint }[]>`
      SELECT status, COUNT(*) AS cnt FROM crm_workflow_runs GROUP BY status
    `;
    const byStatus: Record<string, number> = {};
    rows.forEach(r => { byStatus[r.status] = Number(r.cnt); });
    return {
      total: Object.values(byStatus).reduce((a, b) => a + b, 0),
      running: (byStatus['running'] ?? 0) + (byStatus['pending'] ?? 0),
      done: byStatus['done'] ?? 0,
      failed: byStatus['failed'] ?? 0,
    };
  }

  // ── Campaigns & Segments ───────────────────────────────────────────────
  getCampaigns() {
    return this.prisma.crm_campaigns.findMany({ orderBy: { created_at: 'desc' } });
  }

  getSegments() {
    return this.prisma.crm_segments.findMany({ orderBy: { created_at: 'desc' } });
  }
}
