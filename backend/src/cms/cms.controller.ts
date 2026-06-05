import {
  Body, Controller, Delete, Get, Param, Patch, Post,
  Query, UseGuards, Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CmsService } from './cms.service';
import { FlexAuthGuard } from '../auth/guards/flex-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const ADMIN = ['super_admin', 'manager', 'editor', 'admin'];

@ApiTags('cms')
@Controller('cms')
export class CmsController {
  constructor(private readonly svc: CmsService) {}

  // ── Site Settings ──────────────────────────────────────────────────────
  @Get('site-settings')
  @Version('1')
  getSiteSettings() {
    return this.svc.getSiteSettings();
  }

  @Get('site-settings/:key')
  @Version('1')
  getSiteSetting(@Param('key') key: string) {
    return this.svc.getSiteSetting(key);
  }

  @Post('site-settings')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  upsertSiteSetting(@Body() body: { key: string; value: any }) {
    return this.svc.upsertSiteSetting(body.key, body.value);
  }

  @Post('site-settings/bulk')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  bulkUpsertSiteSettings(@Body() body: { settings: { key: string; value: any }[] }) {
    return this.svc.bulkUpsertSiteSettings(body.settings);
  }

  @Post('site-settings/test-gateway')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  testGateway(@Body() body: { gateway: string; credentials: Record<string, any> }) {
    return this.svc.testGateway(body.gateway, body.credentials);
  }

  @Get('flexpay-settings')
  @Version('1')
  getFlexpaySettings() {
    return this.svc.getFlexpaySettings();
  }

  @Patch('flexpay-settings')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  updateFlexpaySettings(@Body('enabled') enabled: boolean) {
    return this.svc.updateFlexpaySettings(enabled);
  }

  // ── Blog Posts ─────────────────────────────────────────────────────────
  @Get('blog-posts')
  @Version('1')
  getBlogPosts(
    @Query('category') category?: string,
    @Query('tag') tag?: string,
    @Query('is_featured') isFeatured?: string,
  ) {
    return this.svc.getBlogPosts({
      category,
      tag,
      is_published: true,
      is_featured: isFeatured === 'true' ? true : undefined,
    });
  }

  @Get('blog-posts/admin')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  getBlogPostsAdmin() {
    return this.svc.getBlogPosts();
  }

  @Get('blog-posts/slug/:slug')
  @Version('1')
  getBlogPostBySlug(@Param('slug') slug: string) {
    return this.svc.getBlogPostBySlug(slug);
  }

  @Get('blog-posts/id/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  getBlogPostById(@Param('id') id: string) {
    return this.svc.getBlogPostById(id);
  }

  @Post('blog-posts')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  createBlogPost(@Body() body: any) {
    return this.svc.upsertBlogPost(body);
  }

  @Patch('blog-posts/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  updateBlogPost(@Param('id') id: string, @Body() body: any) {
    return this.svc.upsertBlogPost({ ...body, id });
  }

  @Delete('blog-posts/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  deleteBlogPost(@Param('id') id: string) {
    return this.svc.deleteBlogPost(id);
  }

  @Post('blog-posts/:id/view')
  @Version('1')
  incrementBlogPostViewCount(@Param('id') id: string) {
    return this.svc.incrementBlogPostViewCount(id);
  }

  // ── Careers ────────────────────────────────────────────────────────────
  @Get('careers')
  @Version('1')
  getCareers(@Query('department') department?: string) {
    return this.svc.getCareers({ is_active: true, department });
  }

  @Get('careers/admin')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  getCareersAdmin() {
    return this.svc.getCareers();
  }

  @Get('careers/slug/:slug')
  @Version('1')
  getCareerBySlug(@Param('slug') slug: string) {
    return this.svc.getCareerBySlug(slug);
  }

  @Get('careers/id/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  getCareerById(@Param('id') id: string) {
    return this.svc.getCareerById(id);
  }

  @Post('careers')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  createCareer(@Body() body: any) {
    return this.svc.upsertCareer(body);
  }

  @Patch('careers/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  updateCareer(@Param('id') id: string, @Body() body: any) {
    return this.svc.upsertCareer({ ...body, id });
  }

  @Delete('careers/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  deleteCareer(@Param('id') id: string) {
    return this.svc.deleteCareer(id);
  }

  @Post('careers/:id/view')
  @Version('1')
  incrementCareerViewCount(@Param('id') id: string) {
    return this.svc.incrementCareerViewCount(id);
  }

  @Post('careers/slug/:slug/view')
  @Version('1')
  incrementCareerViewCountBySlug(@Param('slug') slug: string) {
    return this.svc.incrementCareerViewCountBySlug(slug);
  }

  @Get('careers/slug/:slug/stats')
  @Version('1')
  getCareerStats(@Param('slug') slug: string) {
    return this.svc.getCareerStatsBySlug(slug);
  }

  // ── Portfolio Projects ─────────────────────────────────────────────────
  @Get('portfolio-projects')
  @Version('1')
  getPortfolioProjects(@Query('category') category?: string) {
    return this.svc.getPortfolioProjects({ is_published: true, category });
  }

  @Get('portfolio-projects/admin')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  getPortfolioProjectsAdmin() {
    return this.svc.getPortfolioProjects();
  }

  @Post('portfolio-projects')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  createPortfolioProject(@Body() body: any) {
    return this.svc.upsertPortfolioProject(body);
  }

  @Patch('portfolio-projects/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  updatePortfolioProject(@Param('id') id: string, @Body() body: any) {
    return this.svc.upsertPortfolioProject({ ...body, id });
  }

  @Delete('portfolio-projects/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  deletePortfolioProject(@Param('id') id: string) {
    return this.svc.deletePortfolioProject(id);
  }

  @Post('portfolio-projects/bulk-update')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  bulkUpdatePortfolioProjects(@Body() body: { ids: string[]; data: any }) {
    return this.svc.bulkUpdatePortfolioProjects(body.ids, body.data);
  }

  @Post('portfolio-projects/bulk-delete')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  bulkDeletePortfolioProjects(@Body() body: { ids: string[] }) {
    return this.svc.bulkDeletePortfolioProjects(body.ids);
  }

  // ── Coupons ────────────────────────────────────────────────────────────
  @Get('coupons')
  @Version('1')
  @UseGuards(FlexAuthGuard)
  @ApiBearerAuth()
  getCoupons() {
    return this.svc.getCoupons({ is_active: true });
  }

  @Get('coupons/admin')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  getCouponsAdmin() {
    return this.svc.getCoupons();
  }

  @Get('coupons/code/:code')
  @Version('1')
  @UseGuards(FlexAuthGuard)
  @ApiBearerAuth()
  getCouponByCode(@Param('code') code: string) {
    return this.svc.getCouponByCode(code);
  }

  @Post('coupons')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  createCoupon(@Body() body: any) {
    return this.svc.upsertCoupon(body);
  }

  @Patch('coupons/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  updateCoupon(@Param('id') id: string, @Body() body: any) {
    return this.svc.upsertCoupon({ ...body, id });
  }

  @Delete('coupons/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  deleteCoupon(@Param('id') id: string) {
    return this.svc.deleteCoupon(id);
  }

  // ── Office Locations ───────────────────────────────────────────────────
  @Get('office-locations')
  @Version('1')
  getOfficeLocations() {
    return this.svc.getOfficeLocations();
  }

  @Post('office-locations')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  createOfficeLocation(@Body() body: any) {
    return this.svc.upsertOfficeLocation(body);
  }

  @Patch('office-locations/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  updateOfficeLocation(@Param('id') id: string, @Body() body: any) {
    return this.svc.upsertOfficeLocation({ ...body, id });
  }

  @Delete('office-locations/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  deleteOfficeLocation(@Param('id') id: string) {
    return this.svc.deleteOfficeLocation(id);
  }

  // ── USA State Pricing ──────────────────────────────────────────────────
  @Get('usa-state-pricing')
  @Version('1')
  getUsaStatePricing() {
    return this.svc.getUsaStatePricing({ is_active: true });
  }

  @Get('usa-state-pricing/admin')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  getUsaStatePricingAdmin() {
    return this.svc.getUsaStatePricing();
  }

  @Post('usa-state-pricing')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  createUsaStatePricing(@Body() body: any) {
    return this.svc.upsertUsaStatePricing(body);
  }

  @Patch('usa-state-pricing/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  updateUsaStatePricing(@Param('id') id: string, @Body() body: any) {
    return this.svc.upsertUsaStatePricing({ ...body, id });
  }

  @Delete('usa-state-pricing/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  deleteUsaStatePricing(@Param('id') id: string) {
    return this.svc.deleteUsaStatePricing(id);
  }

  // ── Country Eligibility ────────────────────────────────────────────────
  @Get('country-eligibility')
  @Version('1')
  getCountryEligibility() {
    return this.svc.getCountryEligibility({ is_active: true });
  }

  @Get('country-eligibility/admin')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  getCountryEligibilityAdmin() {
    return this.svc.getCountryEligibility();
  }

  @Post('country-eligibility')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  createCountryEligibility(@Body() body: any) {
    return this.svc.upsertCountryEligibility(body);
  }

  @Patch('country-eligibility/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  updateCountryEligibility(@Param('id') id: string, @Body() body: any) {
    return this.svc.upsertCountryEligibility({ ...body, id });
  }

  @Delete('country-eligibility/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  deleteCountryEligibility(@Param('id') id: string) {
    return this.svc.deleteCountryEligibility(id);
  }

  // ── Service Pricing ───────────────────────────────────────────────────
  @Get('service-pricing')
  @Version('1')
  getServicePricing() {
    return this.svc.getServicePricing();
  }

  @Get('service-pricing/:serviceSlug')
  @Version('1')
  getServicePricingBySlug(@Param('serviceSlug') serviceSlug: string) {
    return this.svc.getServicePricingBySlug(serviceSlug);
  }

  @Post('service-pricing')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  upsertServicePricing(@Body() body: any) {
    return this.svc.upsertServicePricing(body);
  }

  // ── Service Add-ons ───────────────────────────────────────────────────
  @Get('service-addons/:serviceSlug')
  @Version('1')
  getServiceAddons(@Param('serviceSlug') serviceSlug: string) {
    return this.svc.getServiceAddons(serviceSlug);
  }

  @Post('service-addons/:serviceSlug')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  upsertServiceAddons(@Param('serviceSlug') serviceSlug: string, @Body() body: { addons: any[] }) {
    return this.svc.upsertServiceAddons(serviceSlug, body.addons);
  }

  @Delete('service-addons/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  deleteServiceAddon(@Param('id') id: string) {
    return this.svc.deleteServiceAddon(id);
  }

  // ── Job Applications ───────────────────────────────────────────────────
  @Get('job-applications')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  getJobApplications() {
    return this.svc.getJobApplications();
  }

  @Get('job-applications/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  getJobApplication(@Param('id') id: string) {
    return this.svc.getJobApplication(id);
  }

  @Patch('job-applications/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  updateJobApplication(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateJobApplication(id, body);
  }

  @Delete('job-applications/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  deleteJobApplication(@Param('id') id: string) {
    return this.svc.deleteJobApplication(id);
  }

  @Post('job-applications/:id/scan')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  scanJobApplication(@Param('id') id: string) {
    return this.svc.scanJobApplication(id);
  }

  @Get('job-applications/:id/resume-url')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  getResumeSignedUrl(@Param('id') id: string) {
    return this.svc.getResumeSignedUrl(id);
  }
}

