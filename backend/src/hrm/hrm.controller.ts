import {
  Body, Controller, Delete, Get, Param, Patch, Post,
  Query, UseGuards, Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HrmService } from './hrm.service';
import { FlexAuthGuard } from '../auth/guards/flex-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

const ADMIN = ['super_admin', 'manager', 'admin'];

@ApiTags('hrm')
@Controller('hrm')
@UseGuards(FlexAuthGuard, RolesGuard)
@ApiBearerAuth()
export class HrmController {
  constructor(private readonly svc: HrmService) {}

  // ── Employees ──────────────────────────────────────────────────────────
  @Get('employees')
  @Version('1')
  @Roles(...ADMIN)
  getEmployees(@Query('active') active?: string) {
    return this.svc.getEmployees(active === 'true');
  }

  @Post('employees')
  @Version('1')
  @Roles(...ADMIN)
  createEmployee(@Body() body: any) { return this.svc.createEmployee(body); }

  @Post('employees/upsert')
  @Version('1')
  @Roles(...ADMIN)
  upsertEmployee(@Body() body: any) { return this.svc.upsertEmployee(body); }

  @Post('employees/bulk-update')
  @Version('1')
  @Roles(...ADMIN)
  bulkUpdateEmployees(@Body() body: { ids: string[]; data: any }) {
    return this.svc.bulkUpdateEmployees(body.ids, body.data);
  }

  @Patch('employees/:id')
  @Version('1')
  @Roles(...ADMIN)
  updateEmployee(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateEmployee(id, body);
  }

  @Delete('employees/:id')
  @Version('1')
  @Roles(...ADMIN)
  deleteEmployee(@Param('id') id: string) { return this.svc.deleteEmployee(id); }

  @Get('team-users')
  @Version('1')
  @Roles(...ADMIN)
  getTeamUsers() { return this.svc.getTeamUsers(); }

  // ── Careers ────────────────────────────────────────────────────────────
  @Get('careers')
  @Version('1')
  @Roles(...ADMIN)
  getCareers() { return this.svc.getCareers(); }

  // ── Site Settings ──────────────────────────────────────────────────────
  @Get('site-settings')
  @Version('1')
  @Roles(...ADMIN)
  getSiteSetting(@Query('key') key: string) {
    return this.svc.getSiteSettingByKey(key);
  }

  @Post('site-settings')
  @Version('1')
  @Roles(...ADMIN)
  upsertSiteSetting(@Body() body: { key: string; value: string }) {
    return this.svc.upsertSiteSettingByKey(body.key, body.value);
  }

  // ── ID Card Assignments ────────────────────────────────────────────────
  @Get('id-card-assignments')
  @Version('1')
  @Roles(...ADMIN)
  getIdCardAssignments(
    @Query('kind') kind: string,
    @Query('keys') keys?: string,
  ) {
    const subjectKeys = keys ? keys.split(',').filter(Boolean) : [];
    return this.svc.getIdCardAssignments(kind, subjectKeys);
  }

  @Get('id-card-assignments/single')
  @Version('1')
  @Roles(...ADMIN)
  getIdCardAssignmentSingle(
    @Query('kind') kind: string,
    @Query('subject_key') subjectKey: string,
  ) {
    return this.svc.getIdCardAssignmentSingle(kind, subjectKey);
  }

  // ── Attendance ─────────────────────────────────────────────────────────
  @Get('attendance')
  @Version('1')
  @Roles(...ADMIN)
  getAttendance(
    @Query('employee_id') employeeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.getAttendance({ employeeId, from, to });
  }

  @Post('attendance/clock')
  @Version('1')
  @Roles(...ADMIN, 'hr', 'employee')
  clockInOut(@Body() body: { employee_id: string; action: 'in' | 'out' }) {
    return this.svc.clockInOut(body.employee_id, body.action);
  }

  // ── Leave ──────────────────────────────────────────────────────────────
  @Get('leave-types')
  @Version('1')
  @Roles(...ADMIN, 'hr', 'employee')
  getLeaveTypes() { return this.svc.getLeaveTypes(); }

  @Get('leave-requests')
  @Version('1')
  @Roles(...ADMIN, 'hr', 'employee')
  getLeaveRequests(@Query('employee_id') employeeId?: string) {
    return this.svc.getLeaveRequests(employeeId);
  }

  @Post('leave-requests')
  @Version('1')
  @Roles(...ADMIN, 'hr', 'employee')
  submitLeave(@Body() body: any) { return this.svc.submitLeave(body); }

  @Patch('leave-requests/:id')
  @Version('1')
  @Roles(...ADMIN, 'hr')
  decideLeave(
    @Param('id') id: string,
    @Body() body: { status: string; note?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.svc.decideLeave(id, body.status, body.note, userId);
  }

  // ── KPI Goals ──────────────────────────────────────────────────────────
  @Get('kpi-goals')
  @Version('1')
  @Roles(...ADMIN, 'hr', 'employee')
  getKpiGoals(@Query('employee_id') employeeId?: string) {
    return this.svc.getKpiGoals(employeeId);
  }

  // ── Announcements ──────────────────────────────────────────────────────
  @Get('announcements')
  @Version('1')
  @Roles(...ADMIN, 'hr', 'employee')
  getAnnouncements() { return this.svc.getAnnouncements(); }

  @Post('announcements')
  @Version('1')
  @Roles(...ADMIN, 'hr')
  createAnnouncement(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.svc.upsertAnnouncement(body, userId);
  }

  @Patch('announcements/:id')
  @Version('1')
  @Roles(...ADMIN, 'hr')
  updateAnnouncement(@Param('id') id: string, @Body() body: any) {
    return this.svc.upsertAnnouncement({ ...body, id });
  }

  // ── HR Requests ────────────────────────────────────────────────────────
  @Get('hr-requests')
  @Version('1')
  @Roles(...ADMIN, 'hr')
  getHrRequests() { return this.svc.getHrRequests(); }

  @Get('hr-requests/:id')
  @Version('1')
  @Roles(...ADMIN, 'hr')
  getHrRequest(@Param('id') id: string) { return this.svc.getHrRequest(id); }

  @Patch('hr-requests/:id')
  @Version('1')
  @Roles(...ADMIN, 'hr')
  updateHrRequest(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateHrRequest(id, body);
  }

  @Get('hr-requests/:id/events')
  @Version('1')
  @Roles(...ADMIN, 'hr')
  getHrRequestEvents(@Param('id') id: string) {
    return this.svc.getHrRequestEvents(id);
  }

  @Post('hr-requests/:id/events')
  @Version('1')
  @Roles(...ADMIN, 'hr')
  addHrRequestEvent(@Param('id') id: string, @Body() body: any) {
    return this.svc.addHrRequestEvent(id, body);
  }

  // ── HR Documents ───────────────────────────────────────────────────────
  @Get('hr-documents')
  @Version('1')
  @Roles(...ADMIN, 'hr')
  getHrDocuments() { return this.svc.getHrDocuments(); }

  @Patch('hr-documents/:id/void')
  @Version('1')
  @Roles(...ADMIN, 'hr')
  voidHrDocument(@Param('id') id: string) { return this.svc.voidHrDocument(id); }

  @Post('issue-document')
  @Version('1')
  @Roles(...ADMIN, 'hr')
  issueHrDocument(@Body() body: any) { return this.svc.issueHrDocument(body); }
}
