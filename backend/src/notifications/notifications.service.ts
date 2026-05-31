import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFormSubmissions(unreadOnly = false) {
    const where = unreadOnly ? { status: { not: 'read' } } : {};
    return this.prisma.form_submissions.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }

  async markSubmissionsRead(ids: string[]) {
    await this.prisma.form_submissions.updateMany({
      where: { id: { in: ids } },
      data: { status: 'read' },
    });
    return { ok: true };
  }

  async getChatMessages(unreadOnly = false) {
    const where = unreadOnly ? { is_read: false } : {};
    return this.prisma.chat_messages.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }

  async markChatsRead(ids: string[]) {
    await this.prisma.chat_messages.updateMany({
      where: { id: { in: ids } },
      data: { is_read: true },
    });
    return { ok: true };
  }

  async getEmailLog(limit = 100) {
    return this.prisma.email_send_log.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  async getSettings() {
    const rows = await this.prisma.notification_settings.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }
}
