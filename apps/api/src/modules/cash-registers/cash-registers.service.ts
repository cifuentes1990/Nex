import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class CashRegistersService {
  constructor(private prisma: PrismaService) {}

  private async findRegister(organizationId: string, id: string) {
    const reg = await this.prisma.cashRegister.findFirst({
      where: { id, organizationId },
      include: {
        branch: { select: { id: true, name: true } },
        user:   { select: { id: true, name: true, email: true } },
      },
    });
    if (!reg) throw new NotFoundException('Caja no encontrada');
    return reg;
  }

  // ── Listar cajas ────────────────────────────────────────────────────
  async findAll(organizationId: string, branchId?: string, userId?: string) {
    return this.prisma.cashRegister.findMany({
      where: {
        organizationId,
        ...(branchId && { branchId }),
        ...(userId  && { userId }),
      },
      include: {
        branch: { select: { id: true, name: true } },
        user:   { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    return this.findRegister(organizationId, id);
  }

  // ── Estado de la caja activa del usuario ────────────────────────────
  async getMyRegister(organizationId: string, userId: string, branchId?: string) {
    return this.prisma.cashRegister.findFirst({
      where: {
        organizationId,
        userId,
        ...(branchId && { branchId }),
        isOpen: true,
      },
      include: {
        branch: { select: { id: true, name: true } },
        user:   { select: { id: true, name: true } },
      },
    });
  }

  // ── Crear caja (sólo ADMIN/SUPER_ADMIN) ─────────────────────────────
  async create(organizationId: string, dto: any) {
    return this.prisma.cashRegister.create({
      data: { ...dto, organizationId },
    });
  }

  // ── Abrir caja ───────────────────────────────────────────────────────
  async open(organizationId: string, id: string, userId: string, openingBalance: number) {
    const reg = await this.findRegister(organizationId, id);
    if (reg.isOpen) throw new ConflictException('Esta caja ya está abierta');

    return this.prisma.cashRegister.update({
      where: { id },
      data: {
        isOpen: true,
        userId,
        openingBalance,
        closingBalance: null,
        expectedBalance: null,
        difference: null,
        openedAt: new Date(),
        closedAt: null,
      },
      include: {
        branch: { select: { id: true, name: true } },
        user:   { select: { id: true, name: true } },
      },
    });
  }

  // ── Cerrar caja ──────────────────────────────────────────────────────
  async close(
    organizationId: string,
    id: string,
    closingBalance: number,
    notes?: string,
  ) {
    const reg = await this.findRegister(organizationId, id);
    if (!reg.isOpen) throw new BadRequestException('La caja ya está cerrada');

    // Calcular ventas del turno
    const salesTotal = await this.prisma.order.aggregate({
      where: {
        branchId: reg.branchId ?? undefined,
        createdById: reg.userId ?? undefined,
        createdAt: { gte: reg.openedAt ?? new Date(0) },
        status: { in: ['DELIVERED', 'CONFIRMED'] as any },
      },
      _sum: { total: true },
    });

    const expectedBalance =
      (reg.openingBalance ?? 0) + (salesTotal._sum.total ?? 0);
    const difference = closingBalance - expectedBalance;

    return this.prisma.cashRegister.update({
      where: { id },
      data: {
        isOpen: false,
        closingBalance,
        expectedBalance,
        difference,
        closedAt: new Date(),
        notes,
      },
      include: {
        branch: { select: { id: true, name: true } },
        user:   { select: { id: true, name: true } },
      },
    });
  }

  // ── Resumen del turno ────────────────────────────────────────────────
  async getSummary(organizationId: string, id: string) {
    const reg = await this.findRegister(organizationId, id);
    const since = reg.openedAt ?? new Date(0);

    const orderWhere = {
      branchId:    reg.branchId   ?? undefined,
      createdById: reg.userId     ?? undefined,
      createdAt:   { gte: since },
      status:      { in: ['DELIVERED', 'CONFIRMED'] as any },
    };

    const [orders, totalAgg] = await Promise.all([
      this.prisma.order.findMany({
        where: orderWhere,
        select: {
          id: true, total: true, createdAt: true, number: true,
          customer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.order.aggregate({
        where: orderWhere,
        _sum:   { total: true },
        _count: true,
      }),
    ]);

    const totalSales  = totalAgg._sum.total ?? 0;
    const orderCount  = totalAgg._count;

    return {
      register: reg,
      totalSales,
      orderCount,
      expectedBalance: (reg.openingBalance ?? 0) + totalSales,
      orders,
    };
  }
}
