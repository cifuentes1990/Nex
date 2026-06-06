import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  async findAll(organizationId: string, query: any = {}) {
    const { status, supplierId, search, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { organizationId };
    if (status)     where.status     = status;
    if (supplierId) where.supplierId = supplierId;
    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, name: true, email: true, phone: true } },
          items: {
            take: 3,
            include: { product: { select: { name: true, sku: true } } },
          },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return { items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  async findOne(organizationId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
      include: {
        supplier: true,
        items: {
          include: { product: { select: { id: true, name: true, sku: true, image: true, basePrice: true } } },
        },
      },
    });
    if (!po) throw new NotFoundException('Orden de compra no encontrada');
    return po;
  }

  async create(organizationId: string, actorId: string, dto: any) {
    if (!dto.items?.length) throw new BadRequestException('Debe incluir al menos un producto');

    const number = await this.generateNumber(organizationId);

    const subtotal = dto.items.reduce(
      (sum: number, i: any) => sum + Number(i.unitCost) * Number(i.quantity),
      0,
    );
    const taxAmount = Number(dto.taxAmount ?? subtotal * 0.19);
    const total = subtotal + taxAmount;

    return this.prisma.purchaseOrder.create({
      data: {
        organizationId,
        supplierId:   dto.supplierId,
        number,
        status:       'DRAFT',
        orderDate:    dto.orderDate ? new Date(dto.orderDate) : new Date(),
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        subtotal,
        taxAmount,
        total,
        notes:        dto.notes,
        createdBy:    actorId,
        items: {
          create: dto.items.map((item: any) => ({
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity:  Number(item.quantity),
            unitCost:  Number(item.unitCost),
            totalCost: Number(item.unitCost) * Number(item.quantity),
          })),
        },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { product: { select: { name: true, sku: true } } } },
      },
    });
  }

  async update(organizationId: string, id: string, dto: any) {
    const po = await this.findOne(organizationId, id);
    if (['RECEIVED', 'CANCELLED'].includes(po.status)) {
      throw new BadRequestException('No se puede editar una orden recibida o cancelada');
    }

    const data: any = {};
    if (dto.supplierId    !== undefined) data.supplierId    = dto.supplierId;
    if (dto.expectedDate  !== undefined) data.expectedDate  = dto.expectedDate ? new Date(dto.expectedDate) : null;
    if (dto.notes         !== undefined) data.notes         = dto.notes;
    if (dto.status        !== undefined) data.status        = dto.status;

    return this.prisma.purchaseOrder.update({ where: { id }, data });
  }

  async sendToSupplier(organizationId: string, id: string) {
    const po = await this.findOne(organizationId, id);
    if (po.status !== 'DRAFT') throw new BadRequestException('Solo se pueden enviar órdenes en borrador');

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'SENT' },
    });
  }

  // Marcar como recibida — actualiza inventario
  async receive(organizationId: string, id: string, dto: { items?: { productId: string; receivedQty: number }[]; notes?: string }) {
    const po = await this.findOne(organizationId, id);
    if (!['SENT', 'CONFIRMED', 'PARTIAL'].includes(po.status)) {
      throw new BadRequestException('Solo se pueden recibir órdenes enviadas o confirmadas');
    }

    return this.prisma.$transaction(async (tx) => {
      // Actualizar cantidades recibidas por ítem
      let allReceived = true;
      let anyReceived = false;

      for (const poItem of po.items as any[]) {
        const received = dto.items?.find(i => i.productId === poItem.productId);
        const receivedQty = received ? Number(received.receivedQty) : poItem.quantity;

        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { receivedQty },
        });

        if (receivedQty < poItem.quantity) allReceived = false;
        if (receivedQty > 0) anyReceived = true;

        // Actualizar inventario
        if (receivedQty > 0) {
          const inv = await tx.inventory.findFirst({
            where: { organizationId, productId: poItem.productId, variantId: null },
          });

          if (inv) {
            await tx.inventory.update({
              where: { id: inv.id },
              data: {
                quantity:     { increment: receivedQty },
                availableQty: { increment: receivedQty },
              },
            });
          } else {
            await tx.inventory.create({
              data: {
                organizationId,
                productId:    poItem.productId,
                quantity:     receivedQty,
                availableQty: receivedQty,
                reservedQty:  0,
                minStock:     5,
              },
            });
          }

          // Movimiento de stock
          await tx.stockMovement.create({
            data: {
              organizationId,
              productId: poItem.productId,
              type:       'PURCHASE',
              quantity:   receivedQty,
              previousQty: inv?.quantity ?? 0,
              newQty:     (inv?.quantity ?? 0) + receivedQty,
              unitCost:   poItem.unitCost,
              totalCost:  poItem.unitCost * receivedQty,
              reference:  po.number,
              referenceId: po.id,
              notes:      dto.notes,
            },
          });
        }
      }

      const newStatus = allReceived ? 'RECEIVED' : anyReceived ? 'PARTIAL' : po.status;

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          status:       newStatus,
          receivedDate: allReceived ? new Date() : null,
          notes:        dto.notes ?? po.notes,
        },
      });
    });
  }

  async cancel(organizationId: string, id: string, reason?: string) {
    const po = await this.findOne(organizationId, id);
    if (po.status === 'RECEIVED') throw new BadRequestException('No se puede cancelar una orden ya recibida');

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED', notes: reason ? `Cancelada: ${reason}` : po.notes },
    });
  }

  async getStats(organizationId: string) {
    const [total, byStatus, topSuppliers] = await Promise.all([
      this.prisma.purchaseOrder.aggregate({
        where: { organizationId },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.purchaseOrder.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
        _sum: { total: true },
      }),
      this.prisma.purchaseOrder.groupBy({
        by: ['supplierId'],
        where: { organizationId },
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      totalOrders: total._count,
      totalAmount: total._sum.total ?? 0,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count, total: s._sum.total ?? 0 })),
      topSupplierIds: topSuppliers.map(s => s.supplierId),
    };
  }

  private async generateNumber(organizationId: string): Promise<string> {
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `OC-${ym}`;
    const count = await this.prisma.purchaseOrder.count({
      where: { organizationId, number: { startsWith: prefix } },
    });
    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }
}
