import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, Request, Query,
} from '@nestjs/common';
import { CreditService } from './credit.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { FlexAuthGuard } from '../auth/guards/flex-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(FlexAuthGuard)
@Controller('credit')
export class CreditController {
  constructor(private readonly svc: CreditService) {}

  @Get('applications')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  listAdmin() {
    return this.svc.listApplicationsAdmin();
  }

  @Get('applications/mine')
  listMine(@Request() req: any) {
    return this.svc.listApplicationsForUser(req.user.sub);
  }

  @Post('applications')
  create(@Body() dto: CreateApplicationDto, @Request() req: any) {
    return this.svc.createApplication(dto, req.user.sub);
  }

  @Patch('applications/:id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  review(@Param('id') id: string, @Body() dto: ReviewApplicationDto, @Request() req: any) {
    return this.svc.reviewApplication(id, dto, req.user.sub);
  }

  @Get('accounts')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  listAccounts() {
    return this.svc.listCreditAccounts();
  }

  @Get('accounts/mine')
  myAccount(@Request() req: any) {
    return this.svc.listCreditAccounts(req.user.sub);
  }

  @Get('emi-plans')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  listPlans() {
    return this.svc.listEmiPlans();
  }

  @Get('emi-plans/mine')
  myPlans(@Request() req: any) {
    return this.svc.listEmiPlans(req.user.sub);
  }
}
