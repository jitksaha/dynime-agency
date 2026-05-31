import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { Request } from 'express';
import { FlexAuthGuard } from '../auth/guards/flex-auth.guard';
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
    // Raw body is set by NestJS rawBody middleware (enabled in main.ts)
    const raw = (req as RawBodyRequest<Request>).rawBody?.toString('utf-8') ?? '';
    return this.svc.handleWebhook(raw, headers);
  }

  /** Current user's own KYC + KYB status. */
  @Get('me')
  @Version('1')
  @UseGuards(FlexAuthGuard)
  getMyStatus(@CurrentUser() user: AuthUser) {
    return this.svc.getMyStatus(user.id);
  }

  /** Admin: get any user's verification status. */
  @Get('status/:userId')
  @Version('1')
  @UseGuards(FlexAuthGuard)
  getUserStatus(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.getUserStatus(userId, user);
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
}
