import {
  Body, Controller, Delete, Get, Param, Patch, Post,
  Query, UseGuards, Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { FlexAuthGuard } from '../auth/guards/flex-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

const ADMIN = ['super_admin', 'manager', 'admin'];

@ApiTags('crm')
@Controller('crm')
@UseGuards(FlexAuthGuard, RolesGuard)
@Roles(...ADMIN)
@ApiBearerAuth()
export class CrmController {
  constructor(private readonly svc: CrmService) {}

  // ── Leads ──────────────────────────────────────────────────────────────
  @Get('leads')
  @Version('1')
  getLeads(@Query('status') status?: string, @Query('source') source?: string, @Query('q') q?: string) {
    return this.svc.getLeads({ status, source, q });
  }

  @Get('leads/status-counts')
  @Version('1')
  getLeadStatusCounts(@Query('status') status?: string) {
    return this.svc.getLeadStatusCounts({ status });
  }

  @Post('leads')
  @Version('1')
  createLead(@Body() body: any) { return this.svc.upsertLead(body); }

  @Patch('leads/:id')
  @Version('1')
  updateLead(@Param('id') id: string, @Body() body: any) {
    return this.svc.upsertLead({ ...body, id });
  }

  // ── Activities ─────────────────────────────────────────────────────────
  @Get('activities')
  @Version('1')
  getActivities(
    @Query('mine') mine?: string,
    @Query('status') status?: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.svc.getActivities({
      mine: mine === 'true',
      assigneeId: userId,
      status,
    });
  }

  @Post('activities')
  @Version('1')
  createActivity(@Body() body: any) { return this.svc.upsertActivity(body); }

  @Patch('activities/:id')
  @Version('1')
  updateActivity(@Param('id') id: string, @Body() body: any) {
    return this.svc.upsertActivity({ ...body, id });
  }

  // ── Deals ──────────────────────────────────────────────────────────────
  @Get('deals')
  @Version('1')
  getDeals(@Query('pipeline_id') pipelineId: string) {
    return this.svc.getDeals(pipelineId);
  }

  @Post('deals')
  @Version('1')
  createDeal(@Body() body: any) { return this.svc.upsertDeal(body); }

  @Patch('deals/:id')
  @Version('1')
  updateDeal(@Param('id') id: string, @Body() body: any) {
    return this.svc.upsertDeal({ ...body, id });
  }

  // ── Pipelines ──────────────────────────────────────────────────────────
  @Get('pipelines')
  @Version('1')
  getPipelines() { return this.svc.getPipelines(); }

  // ── Workflows ──────────────────────────────────────────────────────────
  @Get('workflows')
  @Version('1')
  getWorkflows() { return this.svc.getWorkflows(); }

  @Post('workflows')
  @Version('1')
  createWorkflow(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.svc.createWorkflow(body, userId);
  }

  @Get('workflows/:id')
  @Version('1')
  getWorkflow(@Param('id') id: string) {
    return this.svc.getWorkflow(id);
  }

  @Patch('workflows/:id')
  @Version('1')
  updateWorkflow(@Param('id') id: string, @Body() body: any) {
    const { steps, ...wfData } = body;
    return this.svc.updateWorkflow(id, wfData, steps);
  }

  @Delete('workflows/:id')
  @Version('1')
  deleteWorkflow(@Param('id') id: string) { return this.svc.deleteWorkflow(id); }

  // ── Email Templates ────────────────────────────────────────────────────
  @Get('email-templates')
  @Version('1')
  getEmailTemplates() { return this.svc.getEmailTemplates(); }

  @Post('email-templates')
  @Version('1')
  createEmailTemplate(@Body() body: any) { return this.svc.upsertEmailTemplate(body); }

  @Patch('email-templates/:id')
  @Version('1')
  updateEmailTemplate(@Param('id') id: string, @Body() body: any) {
    return this.svc.upsertEmailTemplate({ ...body, id });
  }

  @Delete('email-templates/:id')
  @Version('1')
  deleteEmailTemplate(@Param('id') id: string) { return this.svc.deleteEmailTemplate(id); }

  // ── Score Weights ──────────────────────────────────────────────────────
  @Get('score-weights')
  @Version('1')
  getScoreWeights() { return this.svc.getScoreWeights(); }

  @Patch('score-weights')
  @Version('1')
  updateScoreWeights(@Body() body: any) { return this.svc.updateScoreWeights(body.weights ?? body); }

  // ── Workflow Stats ─────────────────────────────────────────────────────
  @Get('workflow-stats')
  @Version('1')
  @Roles(...ADMIN)
  getWorkflowStats() { return this.svc.getWorkflowStats(); }

  // ── Campaigns & Segments ───────────────────────────────────────────────
  @Get('campaigns')
  @Version('1')
  getCampaigns() { return this.svc.getCampaigns(); }

  @Get('segments')
  @Version('1')
  getSegments() { return this.svc.getSegments(); }
}
