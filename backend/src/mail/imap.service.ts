import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

@Injectable()
export class ImapService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImapService.name);
  private pollInterval: NodeJS.Timeout | null = null;
  private isPolling = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.logger.log('Starting IMAP Polling Service (every 2 minutes)...');
    // Run initial poll after 10 seconds, then every 2 minutes
    setTimeout(() => this.pollEmails(), 10000);
    this.pollInterval = setInterval(() => this.pollEmails(), 120000);
  }

  onModuleDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  async pollEmails() {
    if (this.isPolling) return;
    this.isPolling = true;

    let client: ImapFlow | null = null;
    try {
      // 1. Fetch SMTP config to reuse user/password for IMAP
      const setting = await this.prisma.notification_settings.findUnique({
        where: { key: 'smtp_config' },
      });

      if (!setting || !setting.value) {
        this.logger.warn('SMTP configuration not found. Skipping IMAP poll.');
        this.isPolling = false;
        return;
      }

      const config = setting.value as any;
      if (!config.username || !config.password) {
        this.logger.warn('SMTP credentials missing. Skipping IMAP poll.');
        this.isPolling = false;
        return;
      }

      const imapHost = config.host ? config.host.replace('smtp.', 'imap.') : 'imap.hostinger.com';

      client = new ImapFlow({
        host: imapHost,
        port: 993,
        secure: true,
        auth: {
          user: config.username,
          pass: config.password,
        },
        logger: false,
        tls: {
          rejectUnauthorized: false
        }
      });

      client.on('error', (err) => {
        this.logger.error('ImapFlow Client Error:', err.message || err);
      });

      await client.connect();

      // Get lock for INBOX
      const lock = await client.getMailboxLock('INBOX');
      try {
        // Fetch last parsed UID from DB state
        let lastUid = 0n;
        const state = await this.prisma.imap_poll_state.findUnique({
          where: { id: 1 },
        });
        if (state) {
          lastUid = BigInt(state.last_uid);
        } else {
          // Initialize state
          await this.prisma.imap_poll_state.create({
            data: { id: 1, folder: 'INBOX', last_uid: 0, last_status: 'initialized' },
          });
        }

        // Fetch messages with UID > lastUid
        const searchRange = `${Number(lastUid) + 1}:*`;
        const messages = client.fetch(searchRange, {
          source: true,
          uid: true,
          flags: true,
        });

        let highestUid = lastUid;

        for await (const message of messages) {
          const uid = BigInt(message.uid);
          if (uid <= lastUid) continue; // safety check
          if (!message.source) continue; // safety check

          if (uid > highestUid) {
            highestUid = uid;
          }

          try {
            const parsed: any = await simpleParser(message.source);
            
            const fromEmail = parsed.from?.value?.[0]?.address || 'unknown@dynime.com';
            const fromName = parsed.from?.value?.[0]?.name || null;
            const toEmail = parsed.to ? (Array.isArray(parsed.to) ? parsed.to[0]?.value?.[0]?.address : parsed.to.value?.[0]?.address) : null;
            const subject = parsed.subject || 'No Subject';
            const bodyHtml = parsed.html || null;
            const bodyText = parsed.text || null;

            this.logger.log(`Processing inbound email from: ${fromEmail}, Subject: "${subject}"`);

            // Extract ticket ID if present in subject (e.g. TKT-KJFHSY)
            const ticketMatch = subject.match(/TKT-([A-Z0-9]+)/i);
            let ticketId: string | null = null;

            if (ticketMatch) {
              const ticketNumber = ticketMatch[0].toUpperCase();
              const ticket = await this.prisma.support_tickets.findFirst({
                where: { ticket_number: ticketNumber },
              });
              if (ticket) {
                ticketId = ticket.id;

                // Add message to ticket
                await this.prisma.ticket_messages.create({
                  data: {
                    ticket_id: ticket.id,
                    sender_type: 'customer',
                    sender_email: fromEmail,
                    sender_name: fromName,
                    message: bodyText || bodyHtml || '(No content)',
                    attachments: [],
                    is_internal: false,
                  },
                });

                // Update ticket last reply
                await this.prisma.support_tickets.update({
                  where: { id: ticket.id },
                  data: {
                    last_reply_at: new Date(),
                    last_reply_by: 'customer',
                    updated_at: new Date(),
                  },
                });
              }
            }

            // If no matching ticket, create a new support ticket
            if (!ticketId) {
              const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
              
              // Lookup user by email to associate
              const user = await this.prisma.users.findFirst({
                where: { email: { equals: fromEmail, mode: 'insensitive' } },
              });

              const ticket = await this.prisma.support_tickets.create({
                data: {
                  ticket_number: ticketNumber,
                  user_id: user?.id || null,
                  customer_email: fromEmail,
                  customer_name: fromName,
                  subject,
                  category: 'general',
                  priority: 'medium',
                  status: 'open',
                  last_reply_at: new Date(),
                  last_reply_by: 'customer',
                  metadata: {},
                },
              });

              ticketId = ticket.id;

              await this.prisma.ticket_messages.create({
                data: {
                  ticket_id: ticket.id,
                  sender_type: 'customer',
                  sender_email: fromEmail,
                  sender_name: fromName,
                  message: bodyText || bodyHtml || '(No content)',
                  attachments: [],
                  is_internal: false,
                },
              });
            }

            // Save inbound email record
            await this.prisma.inbound_emails.create({
              data: {
                from_email: fromEmail,
                to_email: toEmail || null,
                subject,
                body_text: bodyText,
                body_html: bodyHtml,
                ticket_id: ticketId,
                is_read: false,
              },
            });

          } catch (msgErr) {
            this.logger.error(`Error parsing message UID ${message.uid}:`, msgErr);
          }
        }

        // Update parsed state in DB
        if (highestUid > lastUid) {
          await this.prisma.imap_poll_state.update({
            where: { id: 1 },
            data: {
              last_uid: Number(highestUid),
              last_run_at: new Date(),
              last_status: 'success',
              last_error: null,
            },
          });
        } else {
          await this.prisma.imap_poll_state.update({
            where: { id: 1 },
            data: {
              last_run_at: new Date(),
              last_status: 'idle',
              last_error: null,
            },
          });
        }

      } finally {
        lock.release();
      }

      await client.logout();

    } catch (err: any) {
      this.logger.error('IMAP Polling Error:', err.message || err);
      try {
        await this.prisma.imap_poll_state.update({
          where: { id: 1 },
          data: {
            last_run_at: new Date(),
            last_status: 'error',
            last_error: err.message || String(err),
          },
        });
      } catch (dbErr) {
        this.logger.error('Failed to log IMAP error state:', dbErr);
      }
      if (client) {
        try {
          await client.logout();
        } catch {}
      }
    } finally {
      this.isPolling = false;
    }
  }
}
