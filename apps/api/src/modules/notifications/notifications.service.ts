import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';
import { AppGateway } from '../../gateways/app.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: AppGateway,
  ) {}

  async create(organizationId: string, dto: {
    userId?: string;
    type?: any;
    title: string;
    message: string;
    data?: any;
    link?: string;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        organizationId,
        userId: dto.userId,
        type: dto.type ?? 'INFO',
        title: dto.title,
        message: dto.message,
        data: dto.data ?? {},
        link: dto.link,
      },
    });

    // Emit via WebSocket
    if (dto.userId) {
      this.gateway.broadcastNotification(dto.userId, notification);
    } else {
      this.gateway.emitToOrg(organizationId, 'notification:new', notification);
    }

    return notification;
  }

  async findAll(organizationId: string, userId: string, query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const { unread } = query;
    const skip = (page - 1) * limit;

    const where: any = { organizationId, OR: [{ userId }, { userId: null }] };
    if (unread === 'true') where.isRead = false;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(organizationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { organizationId, OR: [{ userId }, { userId: null }], isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // ── EVENT LISTENERS ─────────────────────────────────────────

  @OnEvent('inventory.low_stock')
  async onLowStock(payload: { organizationId: string; product: any; currentStock: number }) {
    await this.create(payload.organizationId, {
      type: 'WARNING',
      title: 'Stock bajo',
      message: `${payload.product.name} tiene solo ${payload.currentStock} unidades disponibles`,
      data: { productId: payload.product.id, stock: payload.currentStock },
      link: `/inventory`,
    });
  }

  @OnEvent('order.completed')
  async onOrderCompleted(payload: { organizationId: string; order: any }) {
    this.gateway.broadcastNewOrder(payload.organizationId, payload.order);
  }

  @OnEvent('invoice.paid')
  async onInvoicePaid(payload: { organizationId: string; invoiceId: string }) {
    await this.create(payload.organizationId, {
      type: 'SUCCESS',
      title: 'Pago recibido',
      message: `La factura ha sido marcada como pagada`,
      link: `/invoices/${payload.invoiceId}`,
    });
  }
}
