import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  RawBodyRequest,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { Request } from 'express';
import { FlexAuthGuard } from '../auth/guards/flex-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth-user';
import { VerificationService } from './verification.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { AdminRequestDto } from './dto/admin-request.dto';

@Controller('verification')
export class VerificationController {
  constructor(private readonly svc: VerificationService) {}

  /** Create a Didit session (KYC / KYB / AML) for the caller or, if admin, for any user. */
  @Post('session')
  @Version('1')
  @UseGuards(FlexAuthGuard)
  createSession(@Body() dto: CreateSessionDto, @CurrentUser() user: AuthUser) {
    return this.svc.createSession(dto, user);
  }

  /** Didit webhook — no auth guard; HMAC-verified inside the service. */
  @Post('webhook')
  @Version('1')
  async webhook(
    @Req() req: Request,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    const raw = (req as RawBodyRequest<Request>).rawBody?.toString('utf-8') ?? '';
    return this.svc.handleWebhook(raw, headers);
  }

  /** Current user's own KYC + KYB status. */
  @Get('me')
  @Version('1')
  @UseGuards(FlexAuthGuard)
  getMyStatus(
    @CurrentUser() user: AuthUser,
    @Query('sync_mock') syncMock?: string,
  ) {
    return this.svc.getMyStatus(user.id, syncMock === 'true');
  }

  /** Admin: get any user's verification status. */
  @Get('status/:userId')
  @Version('1')
  @UseGuards(FlexAuthGuard)
  getUserStatus(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUser,
    @Query('sync_mock') syncMock?: string,
  ) {
    return this.svc.getUserStatus(userId, user, syncMock === 'true');
  }

  /** Admin: list all KYC records (with profile). */
  @Get('kyc')
  @Version('1')
  @UseGuards(FlexAuthGuard)
  listKyc(@CurrentUser() user: AuthUser) {
    return this.svc.listKyc(user);
  }

  /** Admin: list all KYB records (with profile). */
  @Get('kyb')
  @Version('1')
  @UseGuards(FlexAuthGuard)
  listKyb(@CurrentUser() user: AuthUser) {
    return this.svc.listKyb(user);
  }

  /** Admin: trigger a verification session for a user (e.g. from Orders). */
  @Post('admin/request')
  @Version('1')
  @UseGuards(FlexAuthGuard)
  adminRequest(@Body() dto: AdminRequestDto, @CurrentUser() user: AuthUser) {
    return this.svc.adminRequest(dto, user);
  }

  /** Admin: manually sync all pending verifications with Didit. */
  @Post('admin/sync-all')
  @Version('1')
  @UseGuards(FlexAuthGuard)
  syncAll(
    @CurrentUser() user: AuthUser,
    @Query('sync_mock') syncMock?: string,
  ) {
    return this.svc.syncPendingSessions(user, syncMock === 'true');
  }

  // ─── Super Admin Exclusive Verification Features ─────────────────────────

  @Get('admin/dashboard')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles('super_admin')
  getDashboardStats(@CurrentUser() user: AuthUser) {
    return this.svc.getDashboardStats(user);
  }

  @Get('admin/requests')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles('super_admin')
  getRequestsList(
    @CurrentUser() user: AuthUser,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.svc.getRequestsList(user, type, status, pageNum, limitNum);
  }

  @Get('admin/requests/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles('super_admin')
  getRequestDetails(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.getRequestDetails(id, user);
  }

  @Post('admin/requests/:id/sync')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles('super_admin')
  syncSingleSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.syncSingleSession(id, user);
  }

  @Post('admin/requests/:id/email')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles('super_admin')
  simulateEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.simulateEmail(id, user);
  }

  @Post('admin/requests/trigger')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles('super_admin')
  manualTrigger(
    @Body() dto: CreateSessionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.manualTrigger(dto, user);
  }
}
