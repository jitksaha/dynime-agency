import { Controller, Post, Get, Patch, Body, UseGuards, Param, Query } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { FlexAuthGuard } from '../auth/guards/flex-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth-user';

@UseGuards(FlexAuthGuard)
@Controller('referrals')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  /**
   * Public click tracker (does not require authentication)
   */
  @Public()
  @Post('public/track')
  async trackClick(
    @Body()
    dto: {
      referralCode: string;
      visitorIp?: string;
      deviceFingerprint?: string;
      landingPage?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      cookieId?: string;
    },
  ) {
    return this.referralService.trackClick(dto);
  }

  /**
   * Register logged in user as a partner
   */
  @Post('partner/register')
  async registerPartner(
    @CurrentUser() user: AuthUser,
    @Body('name') name: string,
    @Body('parentReferralCode') parentReferralCode?: string,
  ) {
    return this.referralService.registerPartner(user.id, user.email || '', name, parentReferralCode);
  }

  /**
   * Get current partner stats
   */
  @Get('partner/stats')
  async getPartnerStats(@CurrentUser() user: AuthUser) {
    return this.referralService.getPartnerStats(user.id);
  }

  /**
   * Get current partner commission logs
   */
  @Get('partner/commissions')
  async getPartnerCommissions(@CurrentUser() user: AuthUser) {
    return this.referralService.getPartnerCommissions(user.id);
  }

  /**
   * Get current partner payout history
   */
  @Get('partner/payout-requests')
  async getPartnerPayouts(@CurrentUser() user: AuthUser) {
    return this.referralService.getPartnerPayouts(user.id);
  }

  /**
   * Update partner profile settings (e.g. customized referral code)
   */
  @Patch('partner/profile')
  async updatePartnerProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: { referralCode?: string },
  ) {
    return this.referralService.updatePartnerProfile(user.id, dto);
  }

  /**
   * Partner request payout
   */
  @Post('partner/payout-request')
  async requestPayout(
    @CurrentUser() user: AuthUser,
    @Body('payoutMethod') payoutMethod: string,
    @Body('details') details: any,
  ) {
    return this.referralService.requestPayout(user.id, payoutMethod, details);
  }

  /**
   * Admin: Get dashboard global metrics & fraud highlights
   */
  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  async getAdminStats() {
    return this.referralService.getAdminStats();
  }

  /**
   * Admin: List all partners
   */
  @Get('admin/partners')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  async getAdminPartners() {
    return this.referralService.getAdminPartners();
  }

  /**
   * Admin: Update partner tier, status, or multiplier
   */
  @Patch('admin/partners/:id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  async updatePartner(
    @Param('id') id: string,
    @Body() dto: { status?: string; tier?: string; commission_multiplier?: number },
  ) {
    return this.referralService.updatePartner(id, dto);
  }

  /**
   * Admin: List payout requests
   */
  @Get('admin/payouts')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  async getAdminPayouts() {
    return this.referralService.getAdminPayouts();
  }

  /**
   * Admin: Approve/Pay a payout request
   */
  @Post('admin/payouts/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  async approvePayout(
    @Param('id') id: string,
    @Body('transactionId') transactionId: string,
    @Body('adminNotes') adminNotes?: string,
  ) {
    return this.referralService.approvePayout(id, transactionId, adminNotes);
  }

  /**
   * Admin: Reject a payout request
   */
  @Post('admin/payouts/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'admin')
  async rejectPayout(
    @Param('id') id: string,
    @Body('adminNotes') adminNotes?: string,
  ) {
    return this.referralService.rejectPayout(id, adminNotes);
  }
}
