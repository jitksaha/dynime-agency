import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    const setting = await this.prisma.notification_settings.findUnique({
      where: { key: 'smtp_config' },
    });

    if (!setting || !setting.value) {
      throw new Error('SMTP configuration not found in database settings');
    }

    const config = setting.value as any;
    if (!config.host || !config.username || !config.password) {
      throw new Error('SMTP configuration is incomplete in database settings');
    }

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: Number(config.port || 587),
      secure: config.port === 465 || !!config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
      }
    });

    return this.transporter;
  }

  /**
   * Send a general email.
   */
  async sendMail(opts: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    from?: string;
    templateName?: string;
    metadata?: any;
  }) {
    let fromEmail = 'notifications@dynime.com';
    let fromName = 'Dynime';

    try {
      const setting = await this.prisma.notification_settings.findUnique({
        where: { key: 'smtp_config' },
      });
      if (setting && setting.value) {
        const config = setting.value as any;
        if (config.from_email) fromEmail = config.from_email;
        if (config.from_name) fromName = config.from_name;
      }
    } catch (err) {
      this.logger.warn(`Could not load default from address from smtp_config: ${err.message}`);
    }

    const fromHeader = opts.from || `"${fromName}" <${fromEmail}>`;
    const messageId = `msg-${crypto.randomUUID()}`;

    try {
      const tx = await this.getTransporter();
      await tx.sendMail({
        from: fromHeader,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
        headers: {
          'X-Message-ID': messageId
        }
      });

      this.logger.log(`Email successfully sent to ${opts.to}. MessageID: ${messageId}`);

      // Log in database
      await this.prisma.email_send_log.create({
        data: {
          message_id: messageId,
          template_name: opts.templateName || 'generic',
          recipient_email: opts.to,
          status: 'sent',
          metadata: opts.metadata || {},
        },
      });

      return { success: true, messageId };
    } catch (err) {
      this.logger.error(`Failed to send email to ${opts.to}: ${err.message}`);

      // Log failed email in database
      await this.prisma.email_send_log.create({
        data: {
          message_id: `msg-failed-${crypto.randomUUID()}`,
          template_name: opts.templateName || 'generic',
          recipient_email: opts.to,
          status: 'failed',
          metadata: { error: err.message, ...(opts.metadata || {}) } as any,
        },
      });

      throw err;
    }
  }

  /**
   * Send templated transactional email wrapped in a clean, modern HTML layout.
   */
  async sendTemplateEmail(opts: {
    to: string;
    subject: string;
    templateName: string;
    templateData: Record<string, any>;
    metadata?: any;
  }) {
    const html = this.buildTemplateHtml(opts.templateName, opts.templateData);
    const text = this.buildTemplateText(opts.templateName, opts.templateData);

    const emailResult = await this.sendMail({
      to: opts.to,
      subject: opts.subject,
      html,
      text,
      templateName: opts.templateName,
      metadata: opts.metadata
    });

    // Fire-and-forget matching WhatsApp notification
    this.sendWhatsAppNotification(opts.to, opts.templateName, opts.templateData, opts.metadata).catch((err) => {
      this.logger.error(`Error sending WhatsApp notification: ${err.message}`);
    });

    return emailResult;
  }

  private buildTemplateHtml(templateName: string, data: Record<string, any>): string {
    const content = this.getTemplateContentHtml(templateName, data);
    return this.wrapInBaseLayout(content, data.preheader || 'Dynime Notification');
  }

  private buildTemplateText(templateName: string, data: Record<string, any>): string {
    switch (templateName) {
      case 'password-reset':
        return `Hello ${data.name || 'User'},\n\nWe received a request to reset your password. Use the following link to choose a new one:\n\n${data.resetUrl}\n\nThis link is valid for 1 hour. If you didn't request a password reset, please ignore this email.\n\nBest regards,\nDynime Team`;
      case 'verification_required':
        return `Hello ${data.name || 'Customer'},\n\nIdentity verification is required for order #${data.invoiceNumber}. Please use the link below to complete your verification:\n\n${data.verificationUrl}\n\nBest regards,\nDynime Team`;
      case 'verification_approved':
        return `Hello,\n\nWe are pleased to inform you that your identity verification has been approved. Your order is now being processed.\n\nBest regards,\nDynime Team`;
      case 'verification_declined':
        return `Hello,\n\nUnfortunately, your identity verification request was declined. Please verify your details and submit again, or contact our support team.\n\nBest regards,\nDynime Team`;
      case 'contact-confirmation':
        return `Hello ${data.name || 'there'},\n\nThanks for reaching out! We have received your ${data.formType || 'submission'} and our team will get back to you shortly.\n\nBest regards,\nDynime Team`;
      case 'job-application-received':
        return `Hello ${data.name || 'Applicant'},\n\nThank you for applying for the ${data.role} position at Dynime! We have received your application and will review it shortly.\n\nBest regards,\nDynime Team`;
      case 'admin-new-submission':
        return `New submission received for ${data.formType}.\n\nName: ${data.customerName}\nEmail: ${data.customerEmail}\n\nView details in Super Admin Dashboard: ${data.adminUrl}`;
      default:
        return `New notification from Dynime. Please log in to check your account.`;
    }
  }

  private getTemplateContentHtml(templateName: string, data: Record<string, any>): string {
    switch (templateName) {
      case 'password-reset':
        return `
          <h2>Password Reset Request</h2>
          <p>Hello ${data.name || 'User'},</p>
          <p>We received a request to reset your password. Click the button below to choose a new one:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resetUrl}" class="button">Reset Password</a>
          </div>
          <p style="color: #64748b; font-size: 12px; line-height: 1.5;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 11px; word-break: break-all;">If the button above doesn't work, copy and paste this URL into your browser:<br/>${data.resetUrl}</p>
        `;
      case 'verification_required':
        return `
          <h2>Action Required: Identity Verification</h2>
          <p>Hello ${data.name || 'Customer'},</p>
          <p>To finalize processing of your order <strong>${data.invoiceNumber}</strong>, we require you to verify your identity. This compliance check is processed securely by our verification partner, Didit.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.verificationUrl}" class="button">Start Verification</a>
          </div>
          <p style="color: #64748b; font-size: 12px;">This verification link is secure. Please complete the steps on your mobile device or computer.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 11px; word-break: break-all;">Direct Link: ${data.verificationUrl}</p>
        `;
      case 'verification_approved':
        return `
          <h2 style="color: #10b981;">Identity Verification Approved</h2>
          <p>Hello,</p>
          <p>Great news! Your identity verification has been successfully approved.</p>
          <p>Your order is now being processed by our operations team. We will notify you as soon as your setup or services are ready.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://dynime.com/account" class="button" style="background: linear-gradient(135deg, #10b981, #059669);">Go to Client Portal</a>
          </div>
        `;
      case 'verification_declined':
        return `
          <h2 style="color: #ef4444;">Verification Attempt Declined</h2>
          <p>Hello,</p>
          <p>Unfortunately, your recent identity verification attempt was declined by our compliance systems.</p>
          <p>Please double-check that your documents are valid, clear, and match your registration name, then request a new link, or reply to this email to contact our support team.</p>
        `;
      case 'contact-confirmation': {
        const rows = (data.summary || []).map((s: any) => `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; width: 120px;"><strong>${s.label}</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${s.value}</td>
          </tr>
        `).join('');
        return `
          <h2>Message Received</h2>
          <p>Hello ${data.name || 'there'},</p>
          <p>Thank you for contacting Dynime! We have received your ${data.formType || 'message'} and our team is already reviewing it. You should hear back from us shortly.</p>
          <h3>Submission Summary</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            ${rows}
          </table>
        `;
      }
      case 'job-application-received':
        return `
          <h2>Job Application Received</h2>
          <p>Hello ${data.name || 'Applicant'},</p>
          <p>Thank you for submitting your application for the <strong>${data.role}</strong> position at Dynime!</p>
          <p>Our HR department will review your details and resume. We will contact you directly to schedule interviews if your background aligns with our requirements.</p>
          <p>We appreciate your interest in joining our team!</p>
        `;
      case 'admin-new-submission': {
        const rows = (data.submission || []).map((s: any) => `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; width: 120px;"><strong>${s.label}</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b;">${s.value}</td>
          </tr>
        `).join('');
        return `
          <h2>New Submission Alert</h2>
          <p>A new form has been submitted on the Dynime website.</p>
          <p><strong>Form Type:</strong> ${data.formType}</p>
          <p><strong>Customer Name:</strong> ${data.customerName || 'N/A'}</p>
          <p><strong>Customer Email:</strong> ${data.customerEmail}</p>
          <h3 style="margin-top: 20px;">Submitted Fields</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 25px;">
            ${rows}
          </table>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.adminUrl}" class="button">View in Admin Panel</a>
          </div>
        `;
      }
      default:
        return `
          <h2>Notification</h2>
          <p>You have a new message from Dynime. Please log in to your account to review the details.</p>
        `;
    }
  }

  private wrapInBaseLayout(body: string, preheader: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dynime</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #090d16;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .wrapper {
            width: 100%;
            background-color: #090d16;
            padding: 40px 0;
          }
          .container {
            max-width: 580px;
            margin: 0 auto;
            background-color: #0f172a;
            border-radius: 16px;
            border: 1px solid #1e293b;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          }
          .header {
            background: linear-gradient(135deg, #4f46e5, #6366f1, #d946ef);
            padding: 30px 40px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            font-size: 26px;
            font-weight: 800;
            margin: 0;
            letter-spacing: -0.5px;
          }
          .content {
            padding: 40px 40px;
            color: #e2e8f0;
            font-size: 15px;
            line-height: 1.6;
          }
          .content h2 {
            color: #ffffff;
            font-size: 20px;
            font-weight: 700;
            margin-top: 0;
            margin-bottom: 20px;
          }
          .content h3 {
            color: #ffffff;
            font-size: 16px;
            font-weight: 600;
            margin-top: 25px;
            margin-bottom: 10px;
            border-bottom: 1px solid #1e293b;
            padding-bottom: 6px;
          }
          .content p {
            margin: 0 0 15px 0;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #4f46e5, #d946ef);
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 28px;
            font-size: 14px;
            font-weight: 700;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
            text-align: center;
          }
          .footer {
            padding: 20px 40px 30px 40px;
            background-color: #0b0f19;
            border-top: 1px solid #1e293b;
            text-align: center;
          }
          .footer p {
            margin: 0;
            color: #64748b;
            font-size: 12px;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <span style="display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0;">${preheader}</span>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1>Dynime</h1>
            </div>
            <div class="content">
              ${body}
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Dynime Tech. All rights reserved.</p>
              <p style="margin-top: 6px; font-size: 10px; color: #475569;">This is an automated system notification.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private async sendWhatsAppNotification(toEmail: string, templateName: string, data: Record<string, any>, metadata?: any) {
    try {
      // 1. Get WhatsApp settings
      const setting = await this.prisma.notification_settings.findUnique({
        where: { key: 'whatsapp_config' },
      });
      if (!setting || !setting.value) return;

      const config = setting.value as any;
      if (!config.enabled || !config.access_token || !config.phone_number_id) return;

      const accountSid = config.phone_number_id; // Twilio Account SID
      const authToken = config.access_token; // Twilio Auth Token
      const fromNumber = config.twilio_from || 'whatsapp:+14155238886'; // Twilio From Number

      // 2. Lookup phone number
      let phoneNum = metadata?.phone || metadata?.phoneNumber || data?.phone || data?.phoneNumber || data?.recipient_phone;
      
      if (!phoneNum && toEmail) {
        // Try looking up in employees
        const employee = await this.prisma.employees.findFirst({
          where: { email: toEmail },
        });
        if (employee?.phone) {
          phoneNum = employee.phone;
        }
      }

      if (!phoneNum && toEmail) {
        // Try looking up in crm_leads
        const lead = await this.prisma.crm_leads.findFirst({
          where: { email: toEmail },
        });
        if (lead?.phone) {
          phoneNum = lead.phone;
        }
      }

      if (!phoneNum && toEmail) {
        // Try looking up in job_applications
        const application = await this.prisma.job_applications.findFirst({
          where: { email: toEmail },
        });
        if (application?.phone) {
          phoneNum = application.phone;
        }
      }

      if (!phoneNum) {
        this.logger.warn(`No phone number found for recipient email ${toEmail}. Skipping WhatsApp dispatch.`);
        return;
      }

      // Clean phone number (keep digits only)
      const cleanPhone = phoneNum.replace(/[^\d]/g, '');
      if (!cleanPhone) return;

      // 3. Compile body text based on templateName
      let bodyText = '';
      switch (templateName) {
        case 'password-reset':
          bodyText = `Hello ${data.name || 'User'},\n\nWe received a request to reset your password. Use the following link to choose a new one:\n\n${data.resetUrl}\n\nThis link is valid for 1 hour.`;
          break;
        case 'verification_required':
          bodyText = `Hello ${data.name || 'Customer'},\n\nIdentity verification is required for order #${data.invoiceNumber || 'Update'}. Please complete your verification using the secure link below:\n\n${data.verificationUrl}`;
          break;
        case 'verification_approved':
          bodyText = `Hello,\n\nWe are pleased to inform you that your identity verification has been approved. Your order is now being processed.`;
          break;
        case 'verification_declined':
          bodyText = `Hello,\n\nUnfortunately, your identity verification request was declined. Please verify your details and submit again, or contact our support team.`;
          break;
        case 'contact-confirmation':
          bodyText = `Hello ${data.name || 'there'},\n\nThanks for reaching out! We have received your ${data.formType || 'submission'} and our team will get back to you shortly.`;
          break;
        case 'job-application-received':
          bodyText = `Hello ${data.name || 'Applicant'},\n\nThank you for applying for the ${data.role} position at Dynime! We have received your application and will review it shortly.`;
          break;
        case 'admin-new-submission':
          bodyText = `New submission received for ${data.formType || 'Form'}.\nName: ${data.customerName || 'N/A'}\nEmail: ${data.customerEmail}\nView details: ${data.adminUrl}`;
          break;
        default:
          return; // Unknown templates not dispatched via automated WhatsApp
      }

      this.logger.log(`Dispatching Twilio WhatsApp alert to +${cleanPhone} for template ${templateName}...`);

      // 4. Dispatch Twilio WhatsApp Message
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: `whatsapp:+${cleanPhone}`,
          From: fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`,
          Body: bodyText,
        }),
      });

      const resJson = await response.json();
      if (response.ok && resJson.sid) {
        this.logger.log(`Twilio WhatsApp alert successfully sent to +${cleanPhone}. SID: ${resJson.sid}`);
        // Log in database send log
        await this.prisma.whatsapp_send_log.create({
          data: {
            message_id: resJson.sid,
            template_name: templateName,
            recipient_phone: cleanPhone,
            status: 'sent',
            error_message: null,
            metadata: resJson as any,
          },
        });
      } else {
        const errorMsg = resJson.message || resJson.error_message || 'Twilio Error';
        this.logger.error(`Twilio WhatsApp send failed: ${errorMsg}`);
        await this.prisma.whatsapp_send_log.create({
          data: {
            message_id: 'wa-failed-' + crypto.randomUUID(),
            template_name: templateName,
            recipient_phone: cleanPhone,
            status: 'failed',
            error_message: errorMsg,
            metadata: resJson as any,
          },
        });
      }
    } catch (err) {
      this.logger.error(`Failed to dispatch Twilio WhatsApp alert: ${err.message}`);
    }
  }
}
