import {
  Body, Controller, Delete, Get, Param, Patch, Post,
  Query, UseGuards, Version, HttpStatus, HttpCode,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SeoService } from './seo.service';
import { FlexAuthGuard } from '../auth/guards/flex-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const ADMIN = ['super_admin', 'manager', 'editor', 'admin'];

@ApiTags('seo')
@Controller('seo')
export class SeoController {
  constructor(private readonly svc: SeoService) {}

  // ── Pages CRUD ──────────────────────────────────────────────────────────
  @Get('pages')
  @Version('1')
  getPages(@Query('is_published') isPublished?: string) {
    return this.svc.getPages({
      is_published: isPublished === undefined ? undefined : isPublished === 'true',
    });
  }

  @Get('pages/:id')
  @Version('1')
  getPageById(@Param('id') id: string) {
    return this.svc.getPageById(id);
  }

  @Get('pages/slug/:slug')
  @Version('1')
  getPageBySlug(@Param('slug') slug: string) {
    return this.svc.getPageBySlug(slug);
  }

  @Post('pages')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  createPage(@Body() body: any) {
    return this.svc.upsertPage(body);
  }

  @Patch('pages/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  updatePage(@Param('id') id: string, @Body() body: any) {
    return this.svc.upsertPage({ ...body, id });
  }

  @Delete('pages/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  deletePage(@Param('id') id: string) {
    return this.svc.deletePage(id);
  }

  // ── Product URLs CRUD ────────────────────────────────────────────────────
  @Get('product-urls')
  @Version('1')
  getProductUrls() {
    return this.svc.getProductUrls({ is_active: true });
  }

  @Get('product-urls/admin')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  getProductUrlsAdmin() {
    return this.svc.getProductUrls();
  }

  @Post('product-urls')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  createProductUrl(@Body() body: any) {
    return this.svc.upsertProductUrl(body);
  }

  @Patch('product-urls/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  updateProductUrl(@Param('id') id: string, @Body() body: any) {
    return this.svc.upsertProductUrl({ ...body, id });
  }

  @Delete('product-urls/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  deleteProductUrl(@Param('id') id: string) {
    return this.svc.deleteProductUrl(id);
  }

  // ── Tracked Keywords and Rank History ───────────────────────────────────
  @Get('keywords')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  getKeywords() {
    return this.svc.getKeywords();
  }

  @Post('keywords')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  trackKeyword(@Body() body: any) {
    return this.svc.trackKeyword(body);
  }

  @Delete('keywords/:id')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  deleteKeyword(@Param('id') id: string) {
    return this.svc.deleteKeyword(id);
  }

  @Post('keywords/refresh')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  refreshKeywords(@Body() body: { keywordId?: string }) {
    return this.svc.refreshKeywords(body?.keywordId);
  }

  // ── GSC Data ────────────────────────────────────────────────────────────
  @Post('gsc-data')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  gscData(@Body() body: any) {
    return this.svc.gscData(body);
  }

  // ── SEO Edge Functions ──────────────────────────────────────────────────
  @Post('analyze')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  analyzePage(@Body() body: any) {
    return this.svc.analyzePage(body);
  }

  @Post('audit')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  auditSite(@Body() body: any) {
    return this.svc.auditSite(body);
  }

  @Post('health')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  healthCheck(@Body() body: any) {
    return this.svc.healthCheck(body);
  }

  @Post('integrations')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  integrationsCheck(@Body() body: any) {
    return this.svc.integrationsCheck(body);
  }

  @Post('validate-og')
  @Version('1')
  @UseGuards(FlexAuthGuard, RolesGuard)
  @Roles(...ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  validateOg(@Body() body: any) {
    return this.svc.validateOg(body);
  }
}
