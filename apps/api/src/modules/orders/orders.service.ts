import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  async create(organizationId: string, branchId: string | null, createdById: string, dto: CreateOrderDto) {
    if (!dto.items?.length) throw new BadRequestException('Order must have at least one item');

    const number = await this.generateOrderNumber(organizationId);

    const subtotal = dto.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discountAmount = dto.discountAmount ?? 0;
    const taxBase = subtotal - discountAmount;
    const taxAmount = dto.taxAmount ?? taxBase * 0.19;
    const shippingCost = dto.shippingCost ?? 0;
    const total = taxBase + taxAmount + shippingCost;

    // Canal físico = entrega inmediata; canal online = flujo de estados
    const channel = dto.channel ?? 'POS';
    const isPhysical = channel === 'POS';
    const initialStatus = isPhysical ? 'DELIVERED' : 'PENDING';

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          organizationId,
          branchId: branchId ?? dto.branchId,
          customerId: dto.customerId,
          createdById,
          number,
          status: initialStatus as any,
          channel: channel as any,
          deliveryMethod: (dto.deliveryMethod ?? (isPhysical ? 'PICKUP' : 'HOME_DELIVERY')) as any,
          subtotal,
          discountAmount,
          taxAmount,
          shippingCost,
          total,
          paidAmount: dto.paidAmount ?? (isPhysical ? total : 0),
          changeAmount: dto.paidAmount ? Math.max(0, dto.paidAmount - total) : 0,
          notes: dto.notes,
          customerNote: dto.customerNote,
          internalNote: dto.internalNote,
          source: dto.source,
          shippingAddress: dto.shippingAddress as any,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
          estimatedDelivery: dto.estimatedDelivery ? new Date(dto.estimatedDelivery) : null,
          completedAt: isPhysical ? new Date() : null,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              name: item.name,
              sku: item.sku ?? '',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              costPrice: item.costPrice ?? 0,
              discount: item.discount ?? 0,
              taxRate: item.taxRate ?? 0.19,
              taxAmount: item.taxAmount ?? item.unitPrice * item.quantity * 0.19,
              subtotal: item.unitPrice * item.quantity,
              total: item.unitPrice * item.quantity * (1 + (item.taxRate ?? 0.19)),
            })),
          },
          payments: dto.paymentMethod
            ? {
                create: {
                  method: dto.paymentMethod as any,
                  amount: dto.paidAmount ?? total,
                  currency: 'COP',
                  status: 'COMPLETED',
                  reference: dto.paymentReference,
                },
              }
            : undefined,
        },
        include: {
          items: { include: { product: { select: { name: true, image: true } } } },
          customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
          payments: true,
        },
      });

      // Update inventory
      for (const item of dto.items) {
        await tx.inventory.updateMany({
          where: { organizationId, productId: item.productId },
          data: {
            quantity: { decrement: item.quantity },
            availableQty: { decrement: item.quantity },
          },
        });

        await tx.stockMovement.create({
          data: {
            organizationId,
            productId: item.productId,
            type: 'SALE',
            quantity: -item.quantity,
            previousQty: 0,
            newQty: 0,
            reference: created.number,
            referenceId: created.id,
            createdBy: createdById,
          },
        });
      }

      // Update customer stats
      if (dto.customerId) {
        await tx.customer.update({
          where: { id: dto.customerId },
          data: {
            totalOrders: { increment: 1 },
            totalSpent: { increment: total },
            lastPurchaseAt: new Date(),
            loyaltyPoints: { increment: Math.floor(total / 1000) },
          },
        });
      }

      // Update user stats
      await tx.user.update({
        where: { id: createdById },
        data: { totalSales: { increment: total } },
      });

      return created;
    });

    // Auto-generate invoice
    await this.autoGenerateInvoice(organizationId, order.id, order.number);

    // Check low stock and emit events
    this.events.emit('order.completed', { organizationId, order });
    await this.checkLowStock(organizationId, dto.items.map((i) => i.productId));

    return order;
  }

  async findAll(organizationId: string, query: QueryOrdersDto) {
    const { search, status, customerId, branchId, startDate, endDate, channel } = query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (branchId) where.branchId = branchId;
    if (channel) where.channel = channel;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { firstName: true, lastName: true, email: true } },
          createdBy: { select: { name: true } },
          items: { take: 3, include: { product: { select: { name: true, image: true } } } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const mapped = items.map((o) => ({
      ...o,
      orderNumber: o.number,
      customer: o.customer ? { ...o.customer, name: `${o.customer.firstName}${o.customer.lastName ? ' ' + o.customer.lastName : ''}` } : null,
    }));
    return { items: mapped, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(organizationId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, organizationId },
      include: {
        items: { include: { product: { select: { name: true, image: true, sku: true } } } },
        customer: true,
        createdBy: { select: { name: true, email: true } },
        payments: true,
        invoice: { select: { id: true, number: true, status: true, pdfUrl: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return {
      ...order,
      orderNumber: order.number,
      customer: order.customer ? { ...order.customer, name: `${order.customer.firstName}${order.customer.lastName ? ' ' + order.customer.lastName : ''}` } : null,
    };
  }

  async updateStatus(organizationId: string, id: string, status: string, extra?: {
    trackingNumber?: string;
    courierName?: string;
    internalNote?: string;
  }) {
    const order = await this.findOne(organizationId, id);
    if (['CANCELLED', 'REFUNDED', 'RETURNED'].includes(order.status)) {
      throw new BadRequestException(`No se puede cambiar el estado de una orden ${order.status}`);
    }

    const data: any = { status };
    if (extra?.trackingNumber) data.trackingNumber = extra.trackingNumber;
    if (extra?.courierName) data.courierName = extra.courierName;
    if (extra?.internalNote) data.internalNote = extra.internalNote;

    if (status === 'SHIPPED') data.shippedAt = new Date();
    if (status === 'DELIVERED') {
      data.deliveredAt = new Date();
      data.completedAt = new Date();
    }

    const updated = await this.prisma.order.update({ where: { id }, data });
    this.events.emit('order.status_changed', { organizationId, order: updated, previousStatus: order.status });
    return updated;
  }

  async cancel(organizationId: string, id: string, reason: string) {
    const order = await this.findOne(organizationId, id);
    if (order.status === 'CANCELLED') throw new BadRequestException('Order already cancelled');

    return this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED', notes: `Cancelled: ${reason}` },
      });

      // Restore inventory
      for (const item of order.items) {
        await tx.inventory.updateMany({
          where: { organizationId, productId: item.productId },
          data: {
            quantity: { increment: item.quantity },
            availableQty: { increment: item.quantity },
          },
        });
      }

      return cancelled;
    });
  }

  private async autoGenerateInvoice(organizationId: string, orderId: string, orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, customer: true },
    });
    if (!order) return;

    const invoiceNumber = orderNumber.replace('ORD-', 'INV-');

    await this.prisma.invoice.create({
      data: {
        organizationId,
        orderId,
        customerId: order.customerId,
        number: invoiceNumber,
        status: 'PAID',
        issueDate: new Date(),
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        taxAmount: order.taxAmount,
        total: order.total,
        paidAmount: order.total,
        balance: 0,
        paidAt: new Date(),
        items: {
          create: order.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            subtotal: item.subtotal,
            total: item.total,
          })),
        },
      },
    });
  }

  private async checkLowStock(organizationId: string, productIds: string[]) {
    const lowStock = await this.prisma.inventory.findMany({
      where: {
        organizationId,
        productId: { in: productIds },
        quantity: { lte: 10 },
      },
      include: { product: { select: { name: true, sku: true } } },
    });

    for (const inv of lowStock) {
      this.events.emit('inventory.low_stock', {
        organizationId,
        product: inv.product,
        currentStock: inv.quantity,
        minStock: inv.minStock,
      });
    }
  }

  private async generateOrderNumber(organizationId: string): Promise<string> {
    const now = new Date();
    const prefix = `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await this.prisma.order.count({
      where: { organizationId, number: { startsWith: prefix } },
    });
    return `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }
}
