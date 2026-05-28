import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, query: any = {}) {
    const { search } = query;
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 100;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: orgId,
      isActive: true,
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        include: {
          _count: { select: { products: true } },
        },
        orderBy: { name: 'asc' },
        skip: Number(skip),
        take: Number(limit),
      }),
      this.prisma.category.count({ where }),
    ]);

    return { items, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, orgId: string) {
    const cat = await this.prisma.category.findFirst({
      where: { id, organizationId: orgId },
      include: { _count: { select: { products: true } } },
    });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    return cat;
  }

  private toSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
  }

  async create(orgId: string, data: any) {
    const slug = data.slug || `${this.toSlug(data.name)}-${Date.now()}`;
    return this.prisma.category.create({
      data: { ...data, slug, organizationId: orgId },
    });
  }

  async update(id: string, orgId: string, data: any) {
    await this.findOne(id, orgId);
    const updateData = { ...data };
    if (data.name && !data.slug) updateData.slug = `${this.toSlug(data.name)}-${Date.now()}`;
    return this.prisma.category.update({ where: { id }, data: updateData });
  }

  async remove(id: string, orgId: string) {
    await this.findOne(id, orgId);
    return this.prisma.category.update({ where: { id }, data: { isActive: false } });
  }
}
