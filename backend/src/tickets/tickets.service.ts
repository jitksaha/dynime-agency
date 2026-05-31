import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAdmin() {
    return this.prisma.support_tickets.findMany({
      orderBy: { updated_at: 'desc' },
    });
  }

  async listForUser(userId: string, userEmail: string) {
    return this.prisma.support_tickets.findMany({
      where: {
        OR: [
          { user_id: userId },
          { customer_email: { equals: userEmail, mode: 'insensitive' } },
        ],
      },
      orderBy: { updated_at: 'desc' },
    });
  }

  async findOne(id: string, userId?: string, userEmail?: string, isAdmin = false) {
    const ticket = await this.prisma.support_tickets.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!isAdmin) {
      const mine =
        ticket.user_id === userId ||
        ticket.customer_email?.toLowerCase() === userEmail?.toLowerCase();
      if (!mine) throw new ForbiddenException('Access denied');
    }
    return ticket;
  }

  async getMessages(ticketId: string, userId?: string, userEmail?: string, isAdmin = false) {
    const ticket = await this.findOne(ticketId, userId, userEmail, isAdmin);
    const messages = await this.prisma.ticket_messages.findMany({
      where: { ticket_id: ticketId },
      orderBy: { created_at: 'asc' },
    });
    if (!isAdmin) {
      return messages.filter((m) => !m.is_internal);
    }
    return messages;
  }

  async createTicket(dto: CreateTicketDto, userId: string, userEmail: string, userName?: string) {
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const ticket = await this.prisma.support_tickets.create({
      data: {
        ticket_number: ticketNumber,
        user_id: userId,
        customer_email: userEmail,
        customer_name: userName ?? null,
        subject: dto.subject,
        category: dto.category,
        priority: dto.priority,
        status: 'open',
        order_id: dto.order_id ?? null,
        last_reply_at: new Date(),
        last_reply_by: 'customer',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    if (dto.message) {
      await this.prisma.ticket_messages.create({
        data: {
          ticket_id: ticket.id,
          sender_type: 'customer',
          sender_email: userEmail,
          sender_name: userName ?? null,
          message: dto.message,
          attachments: [],
          is_internal: false,
          created_at: new Date(),
        },
      });
    }
    return ticket;
  }

  async addMessage(ticketId: string, dto: CreateMessageDto, userId: string, userEmail: string, userName?: string, isAdmin = false) {
    await this.findOne(ticketId, userId, userEmail, isAdmin);
    const msg = await this.prisma.ticket_messages.create({
      data: {
        ticket_id: ticketId,
        sender_type: isAdmin ? 'admin' : 'customer',
        sender_email: userEmail,
        sender_name: userName ?? null,
        message: dto.message,
        attachments: [],
        is_internal: dto.is_internal ?? false,
        created_at: new Date(),
      },
    });
    await this.prisma.support_tickets.update({
      where: { id: ticketId },
      data: {
        last_reply_at: new Date(),
        last_reply_by: isAdmin ? 'admin' : 'customer',
        updated_at: new Date(),
      },
    });
    return msg;
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.support_tickets.update({
      where: { id },
      data: { status, updated_at: new Date() },
    });
  }
}
