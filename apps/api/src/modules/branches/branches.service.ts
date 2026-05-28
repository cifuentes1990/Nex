import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.branch.findMany({
      where: { organizationId },
      include: {
        _count: { select: { users: true, orders: true } },
      },
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(organizationId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, organizationId },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true, status: true, avatar: true },
        },
        _count: { select: { orders: true, inventory: true } },
      },
    });
    if (!branch) throw new NotFoundException('Sede no encontrada');
    return branch;
  }

  async create(organizationId: string, dto: any) {
    const existing = await this.prisma.branch.findFirst({
      where: { organizationId, code: dto.code },
    });
    if (existing) throw new ConflictException(`Ya existe una sede con el código ${dto.code}`);

    return this.prisma.branch.create({
      data: { ...dto, organizationId },
    });
  }

  async update(organizationId: string, id: string, dto: any) {
    await this.findOne(organizationId, id);
    return this.prisma.branch.update({
      where: { id },
      data: dto,
    });
  }

  async setActive(organizationId: string, id: string, isActive: boolean) {
    await this.findOne(organizationId, id);
    return this.prisma.branch.update({
      where: { id },
      data: { isActive },
      select: { id: true, name: true, isActive: true },
    });
  }

  async getSummary(organizationId: string, id: string) {
    await this.findOne(organizationId, id);

    const [totalOrders, totalRevenue, activeUsers, lowStock] = await Promise.all([
      this.prisma.order.count({ where: { branchId: id } }),
      this.prisma.order.aggregate({
        where: { branchId: id, status: { in: ['DELIVERED', 'CONFIRMED'] as any } },
        _sum: { total: true },
      }),
      this.prisma.user.count({ where: { branchId: id, status: 'ACTIVE' } }),
      this.prisma.inventory.count({
        where: {
          branchId: id,
          quantity: { lte: 10 },
        },
      }),
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenue._sum.total ?? 0,
      activeUsers,
      lowStockItems: lowStock,
    };
  }
}
