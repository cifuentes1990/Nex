import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  private withName<T extends { firstName: string; lastName?: string | null }>(c: T) {
    return { ...c, name: `${c.firstName}${c.lastName ? ' ' + c.lastName : ''}` };
  }

  private parseName(dto: any) {
    if (dto.name && !dto.firstName) {
      const [firstName, ...rest] = (dto.name as string).trim().split(/\s+/);
      const { name, ...rest2 } = dto;
      return { ...rest2, firstName, lastName: rest.join(' ') || undefined };
    }
    return dto;
  }

  async create(organizationId: string, dto: any) {
    return this.prisma.customer.create({
      data: { ...this.parseName(dto), organizationId },
    });
  }

  async findAll(organizationId: string, query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const { search, segment, tags } = query;
    const skip = (page - 1) * limit;

    const where: any = { organizationId, isActive: true };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { documentNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (segment) where.segment = segment;
    if (tags?.length) where.tags = { hasSome: tags };

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where, skip, take: limit,
        orderBy: { totalSpent: 'desc' },
        include: {
          _count: { select: { orders: true, invoices: true } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items: items.map((c) => this.withName(c)), total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(organizationId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { items: { take: 2, include: { product: { select: { name: true, image: true } } } } },
        },
        invoices: {
          orderBy: { issueDate: 'desc' },
          take: 5,
          select: { id: true, number: true, total: true, status: true, issueDate: true },
        },
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return this.withName(customer);
  }

  async update(organizationId: string, id: string, dto: any) {
    await this.findOne(organizationId, id);
    return this.prisma.customer.update({ where: { id }, data: this.parseName(dto) });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.customer.update({ where: { id }, data: { isActive: false } });
  }

  async addInteraction(organizationId: string, customerId: string, dto: any) {
    await this.findOne(organizationId, customerId);
    return this.prisma.customerInteraction.create({
      data: { customerId, ...dto },
    });
  }

  async getSegmentStats(organizationId: string) {
    const segments = await this.prisma.customer.groupBy({
      by: ['segment'],
      where: { organizationId, isActive: true },
      _count: true,
      _sum: { totalSpent: true },
      _avg: { totalSpent: true, totalOrders: true },
    });

    return segments.map((s) => ({
      segment: s.segment ?? 'UNKNOWN',
      count: s._count,
      totalRevenue: s._sum.totalSpent ?? 0,
      avgSpend: s._avg.totalSpent ?? 0,
      avgOrders: s._avg.totalOrders ?? 0,
    }));
  }

  async getTopCustomers(organizationId: string, limit: any = 10) {
    const items = await this.prisma.customer.findMany({
      where: { organizationId, isActive: true },
      orderBy: { totalSpent: 'desc' },
      take: parseInt(String(limit), 10) || 10,
      select: {
        id: true, firstName: true, lastName: true, email: true,
        avatar: true, totalSpent: true, totalOrders: true,
        loyaltyPoints: true, segment: true, lastPurchaseAt: true,
      },
    });
    return items.map((c) => this.withName(c));
  }
}
