import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
    private audit: AuditLogsService,
  ) {}

  async findAll(organizationId: string, query: any) {
    const { warehouseId, lowStock, search, page = 1, limit = 50 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { organizationId };
    if (warehouseId) where.warehouseId = warehouseId;
    const isLowStock = lowStock === true || lowStock === 'true' || lowStock === '1' || lowStock === 1;
    if (isLowStock) where.quantity = { lte: 10 };

    // Búsqueda accent-insensitive vía unaccent() de Postgres
    if (search) {
      // Si no hay unaccent, fallback a ILIKE normal
      try {
        const term = `%${search}%`;
        const searchResults = await this.prisma.$queryRaw<{ id: string }[]>`
          SELECT inv.id FROM inventory inv
          JOIN products p ON p.id = inv."productId"
          WHERE inv."organizationId" = ${organizationId}
          AND (
            unaccent(p.name) ILIKE unaccent(${term})
            OR p.sku ILIKE ${term}
          )
        `;
        const matchIds = searchResults.map((r) => r.id);
        where.id = { in: matchIds };
      } catch {
        // Fallback si unaccent no está disponible
        where.product = {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku:  { contains: search, mode: 'insensitive' } },
          ],
        };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where, skip, take: Number(limit),
        include: {
          product: {
            select: { id: true, name: true, sku: true, image: true, basePrice: true, status: true },
          },
          warehouse: { select: { name: true } },
        },
        orderBy: { quantity: 'asc' },
      }),
      this.prisma.inventory.count({ where }),
    ]);

    return {
      items: items.map((i) => ({
        ...i,
        stock: i.quantity,
        isLowStock: i.quantity <= i.minStock,
        isCritical: i.quantity === 0,
      })),
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    };
  }

  async adjustStock(organizationId: string, productId: string, dto: {
    quantity: number; type: 'ADD' | 'REMOVE' | 'SET';
    warehouseId?: string; notes?: string; reason?: string;
  }, userId?: string) {
    // Buscar registro existente — si no se especifica bodega, tomar el primero disponible
    // (no usar upsert con nullable unique — falla en Prisma v5 con variantId/warehouseId null)
    const inv = await this.prisma.inventory.findFirst({
      where: {
        organizationId,
        productId,
        variantId: null,
        ...(dto.warehouseId ? { warehouseId: dto.warehouseId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });

    const previousQty = inv?.quantity ?? 0;
    let newQty = previousQty;

    if (dto.type === 'ADD')    newQty = previousQty + Number(dto.quantity);
    else if (dto.type === 'REMOVE') newQty = Math.max(0, previousQty - Number(dto.quantity));
    else                       newQty = Number(dto.quantity);

    // Update o create según exista el registro
    let updated: any;
    if (inv) {
      updated = await this.prisma.inventory.update({
        where: { id: inv.id },
        data: { quantity: newQty, availableQty: Math.max(0, newQty - (inv.reservedQty ?? 0)) },
      });
    } else {
      updated = await this.prisma.inventory.create({
        data: {
          organizationId,
          productId,
          warehouseId: dto.warehouseId ?? null,
          quantity: newQty,
          availableQty: newQty,
          reservedQty: 0,
          minStock: 5,
        },
      });
    }

    // Registrar movimiento
    await this.prisma.stockMovement.create({
      data: {
        organizationId,
        productId,
        warehouseId: dto.warehouseId ?? null,
        type: 'ADJUSTMENT',
        quantity: newQty - previousQty,
        previousQty,
        newQty,
        notes: dto.notes ?? dto.reason ?? null,
      },
    });

    // Auditoría — ajuste de inventario
    this.audit.log({
      organizationId,
      userId,
      action: 'INVENTORY_ADJUSTMENT',
      entity: 'Inventory',
      entityId: productId,
      oldValues: { quantity: previousQty },
      newValues: { quantity: newQty, type: dto.type },
      metadata: { notes: dto.notes, reason: dto.reason, warehouseId: dto.warehouseId },
    }).catch(() => {});

    // Emitir alerta si stock bajo
    if (newQty <= (inv?.minStock ?? 5)) {
      const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { name: true, sku: true } });
      this.events.emit('inventory.low_stock', { organizationId, product, currentStock: newQty });
    }

    return updated;
  }

  async getStockMovements(organizationId: string, productId?: string, limit = 50) {
    return this.prisma.stockMovement.findMany({
      where: { organizationId, ...(productId && { productId }) },
      include: {
        product: { select: { name: true, sku: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getLowStockAlerts(organizationId: string) {
    return this.prisma.inventory.findMany({
      where: { organizationId, quantity: { lte: 10 } },
      include: {
        product: { select: { id: true, name: true, sku: true, image: true, basePrice: true } },
      },
      orderBy: { quantity: 'asc' },
    });
  }
}
