import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../storage/minio.service';
import { AtsScanService } from './ats-scan.service';
import { UploadedFileLike } from '../storage/storage.service';
import { MailService } from '../mail/mail.service';

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

@Injectable()
export class PublicFormsService {
  private readonly logger = new Logger(PublicFormsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly atsScan: AtsScanService,
    private readonly mail: MailService,
  ) {}

  // ── Site Settings Helper ───────────────────────────────────────────────
  private async getSetting(key: string): Promise<string | null> {
    const row = await this.prisma.site_settings.findUnique({
      where: { key },
    });
    if (!row) return null;
    let v: any = row.value;
    while (typeof v === 'string') {
      try {
        v = JSON.parse(v);
      } catch {
        break;
      }
    }
    return typeof v === 'string' ? v : v == null ? null : JSON.stringify(v);
  }

  // ── Newsletter Subscriptions ──────────────────────────────────────────
  async subscribeNewsletter(email: string, source = 'footer') {
    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed || !EMAIL_RX.test(trimmed) || trimmed.length > 320) {
      throw new BadRequestException('Please enter a valid email address.');
    }

    // 1. Store locally in Database (upsert on email)
    const subscriber = await this.prisma.newsletter_subscribers.upsert({
      where: { email: trimmed },
      update: {
        source,
        status: 'subscribed',
        subscribed_at: new Date(),
        updated_at: new Date(),
      },
      create: {
        email: trimmed,
        source,
        status: 'subscribed',
        subscribed_at: new Date(),
      },
    });

    // 2. Forward to 3rd-party provider
    const provider = (await this.getSetting('newsletter_provider')) || 'builtin';
    this.forwardNewsletterToProvider(trimmed, provider).catch((err) => {
      this.logger.error(`Newsletter forward to provider ${provider} failed: ${err.message}`);
    });

    return {
      success: true,
      message: 'Thanks for subscribing!',
      subscriberId: subscriber.id,
    };
  }

  private async forwardNewsletterToProvider(email: string, provider: string) {
    if (provider === 'builtin') return;

    try {
      if (provider === 'mailchimp') {
        const apiKey = (await this.getSetting('mailchimp_api_key')) || process.env.MAILCHIMP_API_KEY;
        const listId = await this.getSetting('mailchimp_list_id');
        if (!apiKey || !listId) {
          throw new Error('Mailchimp not fully configured');
        }
        const dc = apiKey.split('-').pop();
        if (!dc) throw new Error('Invalid Mailchimp API key');
        const url = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members`;
        
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email_address: email, status: 'subscribed' }),
        });
        if (!res.ok && res.status !== 400) {
          throw new Error(`Mailchimp returned status ${res.status}: ${await res.text()}`);
        }
      } else if (provider === 'sendgrid') {
        const apiKey = (await this.getSetting('sendgrid_api_key')) || process.env.SENDGRID_API_KEY;
        const listId = (await this.getSetting('sendgrid_list_id')) || undefined;
        if (!apiKey) throw new Error('SendGrid not configured');
        
        const res = await fetch('https://api.sendgrid.com/v3/marketing/contacts', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            list_ids: listId ? [listId] : [],
            contacts: [{ email }],
          }),
        });
        if (!res.ok) {
          throw new Error(`SendGrid returned status ${res.status}: ${await res.text()}`);
        }
      } else if (provider === 'resend') {
        const apiKey = (await this.getSetting('resend_api_key')) || process.env.RESEND_API_KEY;
        const audienceId = await this.getSetting('resend_audience_id');
        if (!apiKey || !audienceId) {
          throw new Error('Resend not fully configured');
        }
        const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, unsubscribed: false }),
        });
        if (!res.ok && res.status !== 409) {
          throw new Error(`Resend returned status ${res.status}: ${await res.text()}`);
        }
      } else if (provider === 'sender') {
        const apiKey = await this.getSetting('sender_api_key');
        const groupId = (await this.getSetting('sender_group_id')) || undefined;
        if (!apiKey) throw new Error('Sender.net not configured');
        
        const res = await fetch('https://api.sender.net/v2/subscribers', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            email,
            groups: groupId ? [groupId] : undefined,
            trigger_automation: true,
          }),
        });
        if (!res.ok && res.status !== 422) {
          throw new Error(`Sender.net returned status ${res.status}: ${await res.text()}`);
        }
      } else if (provider === 'kit') {
        const apiKey = await this.getSetting('kit_api_key');
        const formId = (await this.getSetting('kit_form_id')) || undefined;
        if (!apiKey) throw new Error('Kit not configured');
        
        const url = formId
          ? `https://api.kit.com/v4/forms/${formId}/subscribers`
          : 'https://api.kit.com/v4/subscribers';
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'X-Kit-Api-Key': apiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ email_address: email }),
        });
        if (!res.ok && res.status !== 409 && res.status !== 422) {
          throw new Error(`Kit returned status ${res.status}: ${await res.text()}`);
        }
      }
    } catch (err) {
      this.logger.error(`Forwarding ${email} to ${provider} failed: ${err.message}`);
    }
  }

  // ── Public Form Submissions (Contact/Leads) ───────────────────────────
  async submitForm(slug: string, data: any, ipAddress?: string) {
    if (!data) {
      throw new BadRequestException('Form data is required');
    }
    const email = (data.email || '').trim().toLowerCase();
    if (!email || !EMAIL_RX.test(email) || email.length > 320) {
      throw new BadRequestException('Please enter a valid email address.');
    }
    const name = (data.name || '').trim();
    if (!name || name.length < 2 || name.length > 100) {
      throw new BadRequestException('Please enter a valid name (2-100 characters).');
    }
    if (data.message && data.message.trim().length > 5000) {
      throw new BadRequestException('Message cannot exceed 5000 characters.');
    }
    if (data.phone && typeof data.phone === 'string' && data.phone.trim().length > 50) {
      throw new BadRequestException('Phone number is too long.');
    }
    if (data.company && typeof data.company === 'string' && data.company.trim().length > 200) {
      throw new BadRequestException('Company name is too long.');
    }
    if (data.website && typeof data.website === 'string' && data.website.trim().length > 0) {
      const webTrim = data.website.trim();
      if (webTrim.length > 300 || !/^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i.test(webTrim)) {
        throw new BadRequestException('Please enter a valid website URL.');
      }
    }
    if (data.country && typeof data.country === 'string' && data.country.trim().length > 100) {
      throw new BadRequestException('Country name is too long.');
    }

    const template = await this.prisma.form_templates.findFirst({
      where: { slug, is_active: true },
    });
    if (!template) {
      throw new NotFoundException(`Form template '${slug}' not found or inactive`);
    }

    // Insert submission
    const submission = await this.prisma.form_submissions.create({
      data: {
        form_id: template.id,
        data,
        status: 'new',
        ip_address: ipAddress || null,
      },
    });

    // Send notifications (async / non-blocking)
    this.sendNotificationEmails({
      formType: slug === 'contact' ? 'contact message' : 'quote request',
      customerName: data.name,
      customerEmail: data.email,
      fields: data,
      source: slug,
    });

    return {
      success: true,
      submissionId: submission.id,
    };
  }

  // ── Investor Lead Submission ──────────────────────────────────────────
  async submitInvestLead(data: any) {
    if (!data) {
      throw new BadRequestException('Lead data is required');
    }
    const email = (data.email || '').trim().toLowerCase();
    if (!email || !EMAIL_RX.test(email) || email.length > 320) {
      throw new BadRequestException('Please enter a valid email address.');
    }
    const fullName = (data.full_name || '').trim();
    if (!fullName || fullName.length < 2 || fullName.length > 100) {
      throw new BadRequestException('Please enter your full name (2-100 characters).');
    }
    if (data.phone && data.phone.trim().length > 50) {
      throw new BadRequestException('Phone number is too long.');
    }
    if (data.message && data.message.trim().length > 2000) {
      throw new BadRequestException('Message is too long.');
    }
    if (data.country && typeof data.country === 'string' && data.country.trim().length > 100) {
      throw new BadRequestException('Country name is too long.');
    }

    // Insert investor lead
    const lead = await this.prisma.invest_leads.create({
      data: {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || null,
        country: data.country || null,
        investment_amount: data.investment_amount ?? null,
        preferred_contact: data.preferred_contact || 'email',
        message: data.message || null,
        plan_slug: data.plan_slug || null,
        target_slug: data.target_slug || null,
      },
    });

    // Send IR notifications (async / non-blocking)
    this.sendNotificationEmails({
      formType: 'Investor interest',
      customerName: data.full_name,
      customerEmail: data.email,
      source: 'invest-lead',
      adminRecipient: 'investors@dynime.com',
      fields: {
        name: data.full_name,
        email: data.email,
        phone: data.phone,
        country: data.country,
        investment_amount: data.investment_amount ? `USD ${data.investment_amount}` : undefined,
        plan_of_interest: data.plan_slug,
        preferred_contact: data.preferred_contact,
        message: data.message,
      },
    });

    return {
      success: true,
      leadId: lead.id,
    };
  }

  // ── Careers Job Application Submission ─────────────────────────────────
  async submitJobApplication(data: any, ipAddress?: string, userAgent?: string) {
    if (!data) {
      throw new BadRequestException('Application data is required');
    }
    const email = (data.email || '').trim().toLowerCase();
    if (!email || !EMAIL_RX.test(email) || email.length > 320) {
      throw new BadRequestException('Please enter a valid email address.');
    }
    const fullName = (data.full_name || '').trim();
    if (!fullName || fullName.length < 2 || fullName.length > 120) {
      throw new BadRequestException('Please enter your full name (2-120 characters).');
    }
    if (data.phone && data.phone.trim().length > 50) {
      throw new BadRequestException('Phone number is too long.');
    }
    if (data.linkedin_url && data.linkedin_url.trim().length > 0) {
      const url = data.linkedin_url.trim();
      if (url.length > 500 || !url.startsWith('http')) {
        throw new BadRequestException('Please enter a valid LinkedIn URL.');
      }
    }
    if (data.portfolio_url && data.portfolio_url.trim().length > 0) {
      const url = data.portfolio_url.trim();
      if (url.length > 500 || !url.startsWith('http')) {
        throw new BadRequestException('Please enter a valid Portfolio URL.');
      }
    }
    if (data.cover_letter && data.cover_letter.trim().length > 5000) {
      throw new BadRequestException('Cover letter cannot exceed 5000 characters.');
    }
    if (data.current_position && data.current_position.trim().length > 160) {
      throw new BadRequestException('Current position is too long.');
    }
    if (data.expected_salary && data.expected_salary.trim().length > 80) {
      throw new BadRequestException('Expected salary is too long.');
    }

    const career = data.career_id
      ? await this.prisma.careers.findUnique({ where: { id: data.career_id } })
      : data.career_slug
      ? await this.prisma.careers.findUnique({ where: { slug: data.career_slug } })
      : null;

    if (!career) {
      throw new NotFoundException('Career role not found');
    }

    const expYears = data.experience_years ? parseInt(data.experience_years, 10) : null;
    const applicationId = crypto.randomUUID();

    const application = await this.prisma.job_applications.create({
      data: {
        id: applicationId,
        career_id: career.id,
        career_slug: career.slug,
        career_title: career.title,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || null,
        country: data.country || null,
        current_position: data.current_position || null,
        experience_years: expYears,
        expected_salary: data.expected_salary || null,
        linkedin_url: data.linkedin_url || null,
        portfolio_url: data.portfolio_url || null,
        cover_letter: data.cover_letter || null,
        resume_url: data.resume_url || null,
        source: 'career-page',
        ip_address: ipAddress || null,
        user_agent: userAgent ? userAgent.slice(0, 500) : null,
      },
    });

    // 1. Send receipt transactional email to applicant
    this.sendTransactionalEmail({
      templateName: 'job-application-received',
      recipientEmail: data.email,
      idempotencyKey: `job-application-${applicationId}-received`,
      templateData: {
        name: data.full_name,
        role: career.title,
        status: 'new',
      },
    });

    // 2. Trigger ATS scanning asynchronously
    this.atsScan.scanApplication(applicationId).catch((err) => {
      this.logger.error(`Async ATS Scan failed for application ${applicationId}: ${err.message}`);
    });

    return {
      success: true,
      applicationId: application.id,
    };
  }

  // ── Public File Upload for Resumes ────────────────────────────────────
  async uploadResumeFile(file: UploadedFileLike, key: string) {
    // Basic file validation
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Resume must be PDF or Word document');
    }
    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxBytes) {
      throw new BadRequestException('Resume file exceeds the 10MB size limit');
    }

    const result = await this.minio.putObject(
      'job-applications',
      key,
      file.buffer,
      file.size,
      file.mimetype,
    );

    return {
      key,
      etag: result.etag,
      bucket: 'job-applications',
    };
  }

  // ── Transctional Email Helper (Proxies to Dynamic SMTP Mailing Service) ─────
  private async sendTransactionalEmail(payload: any) {
    try {
      let subject = 'Notification — Dynime';
      if (payload.templateName === 'job-application-received') {
        subject = `Job Application Received: ${payload.templateData.role} — Dynime`;
      } else if (payload.templateName === 'contact-confirmation') {
        subject = 'We received your message — Dynime';
      } else if (payload.templateName === 'admin-new-submission') {
        subject = `[New Submission] ${payload.templateData.formType} — Dynime`;
      }

      const res = await this.mail.sendTemplateEmail({
        to: payload.recipientEmail,
        subject,
        templateName: payload.templateName,
        templateData: payload.templateData,
        metadata: { idempotencyKey: payload.idempotencyKey }
      });
      return res;
    } catch (err: any) {
      this.logger.error(`Failed to trigger SMTP transactional email: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  private async sendNotificationEmails(opts: {
    formType: string;
    customerName?: string;
    customerEmail: string;
    fields: Record<string, unknown>;
    source?: string;
    adminRecipient?: string;
  }) {
    const HUMAN_LABELS: Record<string, string> = {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      company: 'Company',
      service: 'Service',
      budget: 'Budget',
      timeline: 'Timeline',
      message: 'Message',
      notes: 'Notes',
    };
    const HIDDEN = new Set(['consent', 'source', 'submitted_at']);

    const submission = Object.entries(opts.fields)
      .filter(([k, v]) => !HIDDEN.has(k) && v !== undefined && v !== null && v !== '')
      .map(([k, v]) => ({
        label: HUMAN_LABELS[k] ?? k.replace(/_/g, ' '),
        value: typeof v === 'string' ? v : JSON.stringify(v),
      }));

    const idBase = opts.source ?? 'submission';
    const stamp = `${idBase}-${Date.now()}`;

    // Admin recipient config (default contact@dynime.com)
    const adminEmail = opts.adminRecipient || 'contact@dynime.com';
    const adminPanelUrl = 'https://dynime.com/superadmin/submissions';

    const adminPayload = {
      templateName: 'admin-new-submission',
      recipientEmail: adminEmail,
      idempotencyKey: `admin-${stamp}`,
      templateData: {
        formType: opts.formType,
        customerName: opts.customerName,
        customerEmail: opts.customerEmail,
        submission,
        adminUrl: adminPanelUrl,
      },
    };

    const customerPayload = {
      templateName: 'contact-confirmation',
      recipientEmail: opts.customerEmail,
      idempotencyKey: `cust-${stamp}`,
      templateData: {
        name: opts.customerName,
        formType: opts.formType,
        summary: submission,
      },
    };

    // Send both emails in background
    this.sendTransactionalEmail(adminPayload).catch((e) => this.logger.error(`Admin notification failed: ${e.message}`));
    this.sendTransactionalEmail(customerPayload).catch((e) => this.logger.error(`Customer confirmation failed: ${e.message}`));
  }
}
