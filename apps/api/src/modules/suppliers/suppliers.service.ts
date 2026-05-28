import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, query: any = {}) {
    const { search } = query;
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;
    const where: any = {
      organizationId: orgId,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        include: { _count: { select: { products: true, purchaseOrders: true } } },
        orderBy: { name: 'asc' },
        skip: Number(skip),
        take: Number(limit),
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return { items, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, orgId: string) {
    const s = await this.prisma.supplier.findFirst({
      where: { id, organizationId: orgId },
      include: { _count: { select: { products: true, purchaseOrders: true } } },
    });
    if (!s) throw new NotFoundException('Proveedor no encontrado');
    return s;
  }

  async create(orgId: string, data: any) {
    return this.prisma.supplier.create({ data: { ...data, organizationId: orgId } });
  }

  async update(id: string, orgId: string, data: any) {
    await this.findOne(id, orgId);
    return this.prisma.supplier.update({ where: { id }, data });
  }

  async remove(id: string, orgId: string) {
    await this.findOne(id, orgId);
    return this.prisma.supplier.update({ where: { id }, data: { isActive: false } });
  }
}
