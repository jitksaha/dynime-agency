import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventService } from '../common/event.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/realtime',
})
@Injectable()
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly eventService: EventService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    // Pipe all application events emitted via EventService directly to Socket.IO rooms/broadcasts
    this.eventService.getUpdateStream().subscribe(({ event, data }) => {
      this.logger.log(`Broadcasting event: ${event}`);
      
      // If event relates to a specific order, broadcast to its specific room
      if (data?.orderId) {
        this.server.to(`order:${data.orderId}`).emit(event, data);
      }
      
      // Always broadcast generally to support list views and global updates
      this.server.emit(event, data);
    });
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (token) {
        const decoded = this.jwtService.verify(token);
        client.data.user = decoded;
        this.logger.log(`Authenticated client connected: ${client.id} (User ID: ${decoded.sub})`);
      } else {
        this.logger.log(`Anonymous client connected: ${client.id}`);
      }
    } catch (err) {
      this.logger.warn(`Client connection token verification failed: ${err.message}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_order')
  async handleSubscribeOrder(client: Socket, payload: { orderId: string }) {
    if (!payload?.orderId) {
      return { error: 'Order ID is required' };
    }

    const order = await this.prisma.orders.findUnique({
      where: { id: payload.orderId },
      select: { customer_email: true, user_id: true },
    });

    if (!order) {
      this.logger.warn(`Client ${client.id} tried to subscribe to non-existent order ${payload.orderId}`);
      return { error: 'Order not found' };
    }

    const user = client.data.user;
    const roles = user?.roles || [];
    const isAdmin = roles.some((role: string) =>
      ['super_admin', 'manager', 'editor', 'support', 'hr', 'sales'].includes(role),
    );

    if (isAdmin) {
      client.join(`order:${payload.orderId}`);
      this.logger.log(`Admin ${client.id} (User: ${user?.email}) joined room order:${payload.orderId}`);
      return { status: 'subscribed', room: `order:${payload.orderId}` };
    }

    const isOwner =
      (user?.sub && order.user_id === user.sub) ||
      (user?.email && order.customer_email?.toLowerCase() === user.email.toLowerCase());

    if (isOwner) {
      client.join(`order:${payload.orderId}`);
      this.logger.log(`Customer ${client.id} (User: ${user?.email}) joined room order:${payload.orderId}`);
      return { status: 'subscribed', room: `order:${payload.orderId}` };
    }

    // Allow guest access if order does not have registered user_id (e.g., track order checkout flow)
    if (!order.user_id && !user) {
      client.join(`order:${payload.orderId}`);
      this.logger.log(`Guest client ${client.id} joined room order:${payload.orderId}`);
      return { status: 'subscribed', room: `order:${payload.orderId}` };
    }

    this.logger.warn(
      `Unauthorized subscription attempt by client ${client.id} (User: ${user?.email || 'Guest'}) for order ${payload.orderId}`,
    );
    return { error: 'Unauthorized subscription' };
  }

  @SubscribeMessage('unsubscribe_order')
  handleUnsubscribeOrder(client: Socket, payload: { orderId: string }) {
    if (payload?.orderId) {
      client.leave(`order:${payload.orderId}`);
      this.logger.log(`Client ${client.id} left room order:${payload.orderId}`);
      return { status: 'unsubscribed', room: `order:${payload.orderId}` };
    }
  }
}
