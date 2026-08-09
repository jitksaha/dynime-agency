import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../storage/minio.service';
import { AtsScanService } from '../public-forms/ats-scan.service';
import { testStripe, testBkash, testSSLCommerz, testDodo, testBankTransfer, testKeeal, Result } from './probes';

@Injectable()
export class CmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly atsScan: AtsScanService,
  ) {}

  // ── Site Settings ──────────────────────────────────────────────────────
  async getSiteSettings() {
    return this.prisma.site_settings.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async getPublicSettings() {
    const rows = await this.prisma.site_settings.findMany({
      where: {
        OR: [
          {
            key: {
              in: [
                'stripe_enabled',
                'stripe_sandbox',
                'stripe_publishable_key',
                'stripe_test_publishable_key',
                'stripe_currency',
                'keeal_enabled',
                'keeal_sandbox',
                'keeal_currency',
                'gateway_order',
              ],
            },
          },
          {
            key: {
              endsWith: '_enabled',
            },
          },
          {
            key: {
              startsWith: 'gateway_',
            },
          },
        ],
      },
    });

    const settings: Record<string, any> = {};
    rows.forEach((row) => {
      const val = typeof row.value === 'string' ? row.value.replace(/^"|"$/g, '') : row.value;
      settings[row.key] = val;
    });
    return settings;
  }

  async getSiteSetting(key: string) {
    return this.prisma.site_settings.findUnique({
      where: { key },
    });
  }

  async upsertSiteSetting(key: string, value: any) {
    // If value is a string, check if it can be parsed as JSON.
    // If it is already a parsed object/value, use it as is.
    let parsedVal = value;
    if (typeof value === 'string') {
      try {
        parsedVal = JSON.parse(value);
      } catch {
        // Keep as raw string if it fails to parse
      }
    }

    return this.prisma.site_settings.upsert({
      where: { key },
      update: { value: parsedVal },
      create: { key, value: parsedVal },
    });
  }

  async bulkUpsertSiteSettings(settings: { key: string; value: any }[]) {
    return this.prisma.$transaction(
      settings.map((s) => {
        let parsedVal = s.value;
        if (typeof s.value === 'string') {
          try {
            parsedVal = JSON.parse(s.value);
          } catch {
            // Keep as raw string if it fails to parse
          }
        }
        return this.prisma.site_settings.upsert({
          where: { key: s.key },
          update: { value: parsedVal },
          create: { key: s.key, value: parsedVal },
        });
      }),
    );
  }

  async testGateway(gateway: string, credentials: Record<string, any>): Promise<Result> {
    const gw = gateway.toLowerCase();
    switch (gw) {
      case 'stripe':
        return testStripe(credentials);
      case 'bkash':
        return testBkash(credentials);
      case 'sslcommerz':
        return testSSLCommerz(credentials);
      case 'dodopayment':
        return testDodo(credentials);
      case 'keeal':
        return testKeeal(credentials);
      case 'bank_transfer':
        return testBankTransfer(credentials);
      default:
        return {
          ok: false,
          status: 'fail',
          summary: `Unknown gateway: ${gateway}`,
          latency_ms: 0,
        };
    }
  }

  async getFlexpaySettings() {
    const settings = await this.prisma.flexpay_settings.findUnique({
      where: { id: 1 },
    });
    if (!settings) return null;
    return {
      ...settings,
      id: Number(settings.id),
    };
  }

  async updateFlexpaySettings(enabled: boolean) {
    const settings = await this.prisma.flexpay_settings.update({
      where: { id: 1 },
      data: { enabled },
    });
    return {
      ...settings,
      id: Number(settings.id),
    };
  }

  // ── Blog Posts ─────────────────────────────────────────────────────────
  async getBlogPosts(filters?: { category?: string; tag?: string; is_published?: boolean; is_featured?: boolean }) {
    const where: any = {};
    if (filters?.category && filters.category !== 'All') {
      where.category = filters.category;
    }
    if (filters?.tag) {
      where.tags = { has: filters.tag };
    }
    if (filters?.is_published !== undefined) {
      where.is_published = filters.is_published;
    }
    if (filters?.is_featured !== undefined) {
      where.is_featured = filters.is_featured;
    }

    return this.prisma.blog_posts.findMany({
      where,
      orderBy: [
        { is_featured: 'desc' },
        { published_at: 'desc' },
      ],
    });
  }

  async getBlogPostBySlug(slug: string) {
    return this.prisma.blog_posts.findUnique({
      where: { slug },
    });
  }

  async getBlogPostById(id: string) {
    return this.prisma.blog_posts.findUnique({
      where: { id },
    });
  }

  async upsertBlogPost(payload: any) {
    if (payload.id) {
      const { id, ...data } = payload;
      return this.prisma.blog_posts.update({
        where: { id },
        data,
      });
    }
    return this.prisma.blog_posts.create({
      data: payload,
    });
  }

  async deleteBlogPost(id: string) {
    return this.prisma.blog_posts.delete({
      where: { id },
    });
  }

  async incrementBlogPostViewCount(id: string) {
    return this.prisma.blog_posts.update({
      where: { id },
      data: { view_count: { increment: 1 } },
    });
  }

  // ── Portfolio Projects ─────────────────────────────────────────────────
  async getPortfolioProjects(filters?: { category?: string; is_published?: boolean; is_featured?: boolean }) {
    const where: any = {};
    if (filters?.category && filters.category !== 'All') {
      where.category = filters.category;
    }
    if (filters?.is_published !== undefined) {
      where.is_published = filters.is_published;
    }
    if (filters?.is_featured !== undefined) {
      where.is_featured = filters.is_featured;
    }

    return this.prisma.portfolio_projects.findMany({
      where,
      orderBy: [
        { is_featured: 'desc' },
        { sort_order: 'asc' },
        { created_at: 'desc' },
      ],
    });
  }

  async getPortfolioProjectById(id: string) {
    return this.prisma.portfolio_projects.findUnique({
      where: { id },
    });
  }

  async upsertPortfolioProject(payload: any) {
    if (payload.id) {
      const { id, ...data } = payload;
      return this.prisma.portfolio_projects.update({
        where: { id },
        data,
      });
    }
    return this.prisma.portfolio_projects.create({
      data: payload,
    });
  }

  async deletePortfolioProject(id: string) {
    return this.prisma.portfolio_projects.delete({
      where: { id },
    });
  }

  async bulkUpdatePortfolioProjects(ids: string[], data: any) {
    return this.prisma.portfolio_projects.updateMany({
      where: { id: { in: ids } },
      data,
    });
  }

  async bulkDeletePortfolioProjects(ids: string[]) {
    return this.prisma.portfolio_projects.deleteMany({
      where: { id: { in: ids } },
    });
  }

  // ── Coupons ────────────────────────────────────────────────────────────
  async getCoupons(filters?: { is_active?: boolean }) {
    const where: any = {};
    if (filters?.is_active !== undefined) {
      where.is_active = filters.is_active;
    }

    return this.prisma.coupons.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
  }

  async getCouponByCode(code: string) {
    return this.prisma.coupons.findUnique({
      where: { code },
    });
  }

  async getCouponById(id: string) {
    return this.prisma.coupons.findUnique({
      where: { id },
    });
  }

  async upsertCoupon(payload: any) {
    if (payload.id) {
      const { id, ...data } = payload;
      return this.prisma.coupons.update({
        where: { id },
        data,
      });
    }
    return this.prisma.coupons.create({
      data: payload,
    });
  }

  async deleteCoupon(id: string) {
    return this.prisma.coupons.delete({
      where: { id },
    });
  }

  // ── Office Locations ───────────────────────────────────────────────────
  async getOfficeLocations() {
    return this.prisma.office_locations.findMany({
      orderBy: [
        { sort_order: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async getOfficeLocationById(id: string) {
    return this.prisma.office_locations.findUnique({
      where: { id },
    });
  }

  async upsertOfficeLocation(payload: any) {
    if (payload.id) {
      const { id, ...data } = payload;
      return this.prisma.office_locations.update({
        where: { id },
        data,
      });
    }
    return this.prisma.office_locations.create({
      data: payload,
    });
  }

  async deleteOfficeLocation(id: string) {
    return this.prisma.office_locations.delete({
      where: { id },
    });
  }

  // ── USA State Pricing ──────────────────────────────────────────────────
  async getUsaStatePricing(filters?: { is_active?: boolean }) {
    const where: any = {};
    if (filters?.is_active !== undefined) {
      where.is_active = filters.is_active;
    }

    return this.prisma.usa_state_pricing.findMany({
      where,
      orderBy: [
        { sort_order: 'asc' },
        { state: 'asc' },
      ],
    });
  }

  async getUsaStatePricingById(id: string) {
    return this.prisma.usa_state_pricing.findUnique({
      where: { id },
    });
  }

  async upsertUsaStatePricing(payload: any) {
    if (payload.id) {
      const { id, ...data } = payload;
      return this.prisma.usa_state_pricing.update({
        where: { id },
        data,
      });
    }
    return this.prisma.usa_state_pricing.create({
      data: payload,
    });
  }

  async deleteUsaStatePricing(id: string) {
    return this.prisma.usa_state_pricing.delete({
      where: { id },
    });
  }

  // ── Country Eligibility ────────────────────────────────────────────────
  async getCountryEligibility(filters?: { is_active?: boolean }) {
    const where: any = {};
    if (filters?.is_active !== undefined) {
      where.is_active = filters.is_active;
    }

    return this.prisma.country_eligibility.findMany({
      where,
      orderBy: [
        { sort_order: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async getCountryEligibilityById(id: string) {
    return this.prisma.country_eligibility.findUnique({
      where: { id },
    });
  }

  async upsertCountryEligibility(payload: any) {
    if (payload.id) {
      const { id, ...data } = payload;
      return this.prisma.country_eligibility.update({
        where: { id },
        data,
      });
    }
    return this.prisma.country_eligibility.create({
      data: payload,
    });
  }

  async deleteCountryEligibility(id: string) {
    return this.prisma.country_eligibility.delete({
      where: { id },
    });
  }

  // ── Service Pricing ───────────────────────────────────────────────────
  async getServicePricing() {
    return this.prisma.service_pricing.findMany({
      orderBy: { service_title: 'asc' },
    });
  }

  async getServicePricingBySlug(service_slug: string) {
    return this.prisma.service_pricing.findUnique({
      where: { service_slug },
    });
  }

  async upsertServicePricing(payload: any) {
    const { service_slug, service_title, is_enabled, tiers, quote_settings } = payload;
    return this.prisma.service_pricing.upsert({
      where: { service_slug },
      update: {
        service_title,
        is_enabled,
        tiers: tiers ?? [],
        quote_settings: quote_settings ?? {},
        updated_at: new Date(),
      },
      create: {
        service_slug,
        service_title,
        is_enabled,
        tiers: tiers ?? [],
        quote_settings: quote_settings ?? {},
      },
    });
  }

  // ── Service Add-ons ───────────────────────────────────────────────────
  async getServiceAddons(service_slug: string) {
    return this.prisma.service_addons.findMany({
      where: { service_slug },
      orderBy: { sort_order: 'asc' },
    });
  }

  async upsertServiceAddons(service_slug: string, payload: any[]) {
    return this.prisma.$transaction(
      payload.map((addon) => {
        const { id, name, description, price_usd, period, is_popular, is_active, sort_order } = addon;
        return this.prisma.service_addons.upsert({
          where: { id },
          update: {
            service_slug,
            name,
            description,
            price_usd,
            period,
            is_popular,
            is_active,
            sort_order,
            updated_at: new Date(),
          },
          create: {
            id,
            service_slug,
            name,
            description,
            price_usd,
            period,
            is_popular,
            is_active,
            sort_order,
          },
        });
      }),
    );
  }

  async deleteServiceAddon(id: string) {
    return this.prisma.service_addons.delete({
      where: { id },
    });
  }

  // ── Job Applications CRUD ──────────────────────────────────────────────
  
  async getJobApplications() {
    return this.prisma.job_applications.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async getJobApplication(id: string) {
    const app = await this.prisma.job_applications.findUnique({
      where: { id },
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async updateJobApplication(id: string, payload: any) {
    const app = await this.prisma.job_applications.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');

    const data: any = {
      updated_at: new Date(),
    };

    if (payload.status !== undefined) data.status = payload.status;
    if (payload.admin_notes !== undefined) data.admin_notes = payload.admin_notes || null;
    if (payload.ats_score !== undefined) data.ats_score = payload.ats_score;
    if (payload.ats_match_level !== undefined) data.ats_match_level = payload.ats_match_level;
    if (payload.ats_summary !== undefined) data.ats_summary = payload.ats_summary || null;

    return this.prisma.job_applications.update({
      where: { id },
      data,
    });
  }

  async deleteJobApplication(id: string) {
    const app = await this.prisma.job_applications.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');

    return this.prisma.job_applications.delete({
      where: { id },
    });
  }

  async scanJobApplication(id: string) {
    return this.atsScan.scanApplication(id);
  }

  async getResumeSignedUrl(id: string) {
    const app = await this.prisma.job_applications.findUnique({
      where: { id },
      select: { resume_url: true, full_name: true },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (!app.resume_url) throw new NotFoundException('Resume not found for this application');

    const signedUrl = await this.minio.presignedGetUrl(
      'job-applications',
      app.resume_url,
      60 * 30, // 30 minutes
    );

    return { signedUrl };
  }

  async syncCatalog(payload: { products?: any[]; services?: any[]; addons?: any[]; usa_state_pricings?: any[]; coupons?: any[]; delete_coupons?: string[] }) {
    if (payload.services) {
      for (const service of payload.services) {
        await this.prisma.service_pricing.upsert({
          where: { service_slug: service.slug },
          update: {
            service_title: service.name,
            is_enabled: service.is_active,
            tiers: service.tiers || [],
            quote_settings: service.quote_settings || {},
            updated_at: new Date(),
          },
          create: {
            service_slug: service.slug,
            service_title: service.name,
            is_enabled: service.is_active,
            tiers: service.tiers || [],
            quote_settings: service.quote_settings || {},
          },
        });
      }
    }

    if (payload.addons) {
      for (const addon of payload.addons) {
        await this.prisma.service_addons.upsert({
          where: { id: addon.id },
          update: {
            service_slug: addon.service_slug,
            name: addon.name,
            description: addon.description,
            price_usd: addon.price_usd,
            period: addon.period,
            is_popular: addon.is_popular,
            is_active: addon.is_active,
            sort_order: addon.sort_order,
            updated_at: new Date(),
          },
          create: {
            id: addon.id,
            service_slug: addon.service_slug,
            name: addon.name,
            description: addon.description,
            price_usd: addon.price_usd,
            period: addon.period,
            is_popular: addon.is_popular,
            is_active: addon.is_active,
            sort_order: addon.sort_order,
          },
        });
      }
    }

    if (payload.products) {
      for (const product of payload.products) {
        await this.prisma.products.upsert({
          where: { id: product.id },
          update: {
            name: product.name,
            slug: product.slug,
            description: product.description,
            price: product.price,
            category: product.category,
            image_url: product.image_url,
            is_active: product.is_active,
            is_featured: product.is_featured,
            sort_order: product.sort_order,
            updated_at: new Date(),
          },
          create: {
            id: product.id,
            name: product.name,
            slug: product.slug,
            description: product.description,
            price: product.price,
            category: product.category,
            image_url: product.image_url,
            is_active: product.is_active,
            is_featured: product.is_featured,
            sort_order: product.sort_order,
          },
        });
      }
    }

    if (payload.usa_state_pricings) {
      for (const statePricing of payload.usa_state_pricings) {
        const existing = await this.prisma.usa_state_pricing.findFirst({
          where: { abbr: statePricing.abbr }
        });
        
        const data = {
          state: statePricing.state,
          abbr: statePricing.abbr,
          llc_formation: statePricing.llc_formation,
          corp_formation: statePricing.corp_formation,
          llc_annual: statePricing.llc_annual,
          llc_annual_label: statePricing.llc_annual_label,
          corp_annual: statePricing.corp_annual,
          corp_annual_label: statePricing.corp_annual_label,
          llc_renewal: statePricing.llc_renewal,
          corp_renewal: statePricing.corp_renewal,
          state_tax_note: statePricing.state_tax_note,
          franchise_tax: statePricing.franchise_tax,
          notes: statePricing.notes,
          sort_order: statePricing.sort_order,
          is_active: statePricing.is_active,
          updated_at: new Date(),
        };

        if (existing) {
          await this.prisma.usa_state_pricing.update({
            where: { id: existing.id },
            data,
          });
        } else {
          await this.prisma.usa_state_pricing.create({
            data,
          });
        }
      }
    }

    if (payload.coupons) {
      for (const coupon of payload.coupons) {
        const existing = await this.prisma.coupons.findFirst({
          where: { code: coupon.code }
        });

        const data = {
          code: coupon.code,
          description: coupon.description,
          discount_type: coupon.type === 'percentage' ? 'percentage' : 'fixed',
          discount_value: coupon.discount,
          min_order_amount: coupon.minimum_spend || 0,
          max_discount_amount: coupon.maximum_spend || null,
          usage_limit: coupon.limit || null,
          expires_at: coupon.expiry_date ? new Date(coupon.expiry_date) : null,
          is_active: coupon.status == 1 || coupon.status === true,
          updated_at: new Date(),
        };

        if (existing) {
          await this.prisma.coupons.update({
            where: { id: existing.id },
            data,
          });
        } else {
          await this.prisma.coupons.create({
            data: {
              ...data,
              usage_count: 0,
              is_milestone: false,
            }
          });
        }
      }
    }

    if (payload.delete_coupons) {
      for (const code of payload.delete_coupons) {
        try {
          await this.prisma.coupons.delete({
            where: { code }
          });
        } catch (e) {
          // Ignore
        }
      }
    }

    return { success: true, message: 'Catalog synced successfully' };
  }
}

