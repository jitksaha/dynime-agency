import {
  Body, Controller, Get, Param, Post,
  UseGuards, Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { FlexAuthGuard } from '../auth/guards/flex-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const ADMIN = ['super_admin', 'manager', 'admin'];

@ApiTags('payroll')
@Controller('payroll')
@UseGuards(FlexAuthGuard, RolesGuard)
@Roles(...ADMIN)
@ApiBearerAuth()
export class PayrollController {
  constructor(private readonly svc: PayrollService) {}

  @Get('runs')
  @Version('1')
  getRuns() { return this.svc.getRuns(); }

  @Get('runs/:id/items')
  @Version('1')
  getItems(@Param('id') id: string) { return this.svc.getItems(id); }

  @Get('runs/:id/audit')
  @Version('1')
  getAudit(@Param('id') id: string) { return this.svc.getAudit(id); }

  @Get('items/:id/adjustments')
  @Version('1')
  getAdjustments(@Param('id') id: string) { return this.svc.getAdjustments(id); }

  @Get('employees/count')
  @Version('1')
  getActiveEmployeeCount() { return this.svc.getActiveEmployeeCount(); }

  @Post('runs/ensure-current')
  @Version('1')
  ensureCurrentMonth(@Body() body: { currency?: string; working_days?: number }) {
    return this.svc.ensureCurrentMonth(body.currency ?? 'USD', body.working_days ?? 22);
  }

  @Post('runs/:id/sync')
  @Version('1')
  syncRun(@Param('id') id: string) { return this.svc.syncRun(id); }

  @Post('runs/generate')
  @Version('1')
  generateRun(@Body() body: any) { return this.svc.generateRun(body); }

  @Post('runs/:id/approve')
  @Version('1')
  approveRun(@Param('id') id: string) { return this.svc.approveRun(id); }

  @Post('runs/:id/mark-paid')
  @Version('1')
  markPaid(@Param('id') id: string, @Body() body: { item_ids?: string[] | null; method?: string }) {
    return this.svc.markPaid(id, body.item_ids ?? null, body.method ?? 'bank');
  }

  @Post('items/:id/cancel')
  @Version('1')
  cancelItem(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.svc.cancelItem(id, body.reason ?? 'Cancelled by admin');
  }

  @Post('runs/:id/lock')
  @Version('1')
  lockRun(@Param('id') id: string, @Body() body: { lock: boolean }) {
    return this.svc.lockRun(id, body.lock);
  }

  @Post('seed-history')
  @Version('1')
  seedHistory() { return this.svc.seedHistory(); }
}
