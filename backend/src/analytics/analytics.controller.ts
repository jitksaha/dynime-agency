import { Controller, Get, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { FlexAuthGuard } from '../auth/guards/flex-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

const ADMIN = ['super_admin', 'manager', 'admin'];

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(FlexAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}

  @Get('orders')
  @Version('1')
  @Roles(...ADMIN)
  getOrders() { return this.svc.getOrders(); }

  @Get('subscribers')
  @Version('1')
  @Roles(...ADMIN)
  getSubscribers() { return this.svc.getSubscribers(); }

  @Get('fx-orders')
  @Version('1')
  @Roles(...ADMIN)
  getFxOrders() { return this.svc.getFxOrders(); }

  @Get('employees')
  @Version('1')
  @Roles(...ADMIN)
  getDynimeEmployees() { return this.svc.getDynimeEmployees(); }

  @Get('kpi')
  @Version('1')
  @Roles(...ADMIN)
  getKpiMonthly() { return this.svc.getKpiMonthly(); }

  @Get('counts')
  @Version('1')
  @Roles(...ADMIN)
  getCounts() { return this.svc.getCounts(); }
}
