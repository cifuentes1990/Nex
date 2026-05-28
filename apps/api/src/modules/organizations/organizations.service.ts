import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        branches: true,
        subscription: true,
        _count: { select: { users: true, products: true, customers: true, orders: true } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(id: string, dto: any) {
    return this.prisma.organization.update({ where: { id }, data: dto });
  }

  async getBranches(organizationId: string) {
    return this.prisma.branch.findMany({
      where: { organizationId, isActive: true },
      include: { _count: { select: { users: true, orders: true } } },
    });
  }

  async createBranch(organizationId: string, dto: any) {
    return this.prisma.branch.create({
      data: { ...dto, organizationId },
    });
  }
}
