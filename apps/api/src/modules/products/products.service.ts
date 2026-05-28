import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  async create(organizationId: string, dto: CreateProductDto) {
    const { stock: initialStock, ...productData } = dto;
    const product = await this.prisma.product.create({
      data: {
        costPrice: 0,          // default — overridden if provided in dto
        ...productData,
        organizationId,
        slug: this.slugify(dto.name),
      } as any,
      include: { category: true, supplier: true },
    });

    // Auto-create inventory record
    if (product.trackInventory) {
      await this.prisma.inventory.create({
        data: {
          organizationId,
          productId: product.id,
          quantity: initialStock ?? 0,
          availableQty: initialStock ?? 0,
          reservedQty: 0,
          minStock: dto.minStockAlert ?? 5,
        },
      });
    }

    this.events.emit('product.created', { organizationId, product });
    return product;
  }

  async findAll(organizationId: string, query: QueryProductsDto) {
    const {
      search, categoryId, status, supplierId,
      minPrice, maxPrice, lowStock, sellsInStore, sellsOnline,
      sortBy = 'createdAt', sortOrder = 'desc',
    } = query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (search) {
      // Búsqueda accent-insensitive vía unaccent() de Postgres
      try {
        const term = `%${search}%`;
        const searchResults = await this.prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM products
          WHERE "organizationId" = ${organizationId}
          AND (
            unaccent(name) ILIKE unaccent(${term})
            OR sku ILIKE ${term}
            OR barcode ILIKE ${term}
            OR unaccent(COALESCE(description,'')) ILIKE unaccent(${term})
          )
        `;
        const matchIds = searchResults.map((r) => r.id);
        where.id = { in: matchIds };
      } catch {
        // Fallback ILIKE normal si unaccent no disponible
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }
    }
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (minPrice !== undefined) where.basePrice = { ...where.basePrice, gte: minPrice };
    if (maxPrice !== undefined) where.basePrice = { ...where.basePrice, lte: maxPrice };

    if (lowStock) {
      where.inventory = { some: { quantity: { lte: 10 } } };
    }
    if (sellsInStore !== undefined) where.sellsInStore = sellsInStore;
    if (sellsOnline !== undefined) where.sellsOnline = sellsOnline;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: { select: { id: true, name: true, color: true } },
          supplier: { select: { id: true, name: true } },
          inventory: {
            select: { quantity: true, availableQty: true, reservedQty: true, minStock: true },
            take: 1,
          },
          _count: { select: { variants: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: items.map((p) => ({
        ...p,
        stock: p.inventory[0]?.quantity ?? 0,
        availableStock: p.inventory[0]?.availableQty ?? 0,
        isLowStock: (p.inventory[0]?.quantity ?? 0) <= (p.inventory[0]?.minStock ?? p.minStockAlert),
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async findOne(organizationId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId },
      include: {
        category: true,
        supplier: true,
        variants: true,
        inventory: { include: { warehouse: true } },
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findBySku(organizationId: string, sku: string) {
    const product = await this.prisma.product.findFirst({
      where: { organizationId, OR: [{ sku }, { barcode: sku }] },
      include: {
        category: { select: { name: true } },
        inventory: { select: { quantity: true, availableQty: true }, take: 1 },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return {
      ...product,
      stock: product.inventory[0]?.quantity ?? 0,
    };
  }

  async update(organizationId: string, id: string, dto: UpdateProductDto) {
    await this.findOne(organizationId, id);
    const { stock, ...productData } = dto;

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        ...(dto.name && { slug: this.slugify(dto.name) }),
      },
      include: { category: true, supplier: true },
    });

    this.events.emit('product.updated', { organizationId, product: updated });
    return updated;
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.product.update({
      where: { id },
      data: { status: 'DISCONTINUED' },
    });
  }

  async getTopWinners(organizationId: string, limit: any = 10) {
    const products = await this.prisma.product.findMany({
      where: { organizationId, status: 'ACTIVE' },
      orderBy: [{ totalRevenue: 'desc' }, { totalSold: 'desc' }],
      take: parseInt(String(limit), 10) || 10,
      include: {
        category: { select: { name: true } },
        inventory: { select: { quantity: true }, take: 1 },
      },
    });

    return products.map((p) => ({
      ...p,
      stock: p.inventory[0]?.quantity ?? 0,
      score: this.calculateWinnerScore(p),
    }));
  }

  async getDeadProducts(organizationId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const soldProductIds = await this.prisma.orderItem.findMany({
      where: {
        order: { organizationId, createdAt: { gte: thirtyDaysAgo } },
      },
      select: { productId: true },
      distinct: ['productId'],
    });

    const soldIds = soldProductIds.map((p) => p.productId);

    return this.prisma.product.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        id: { notIn: soldIds },
      },
      include: {
        category: { select: { name: true } },
        inventory: { select: { quantity: true }, take: 1 },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
  }

  async bulkImport(organizationId: string, products: CreateProductDto[]) {
    const results = { created: 0, updated: 0, errors: 0 };

    for (const pd of products) {
      try {
        await this.prisma.product.upsert({
          where: { organizationId_sku: { organizationId, sku: pd.sku } },
          update: { ...pd },
          create: { ...pd, organizationId, slug: this.slugify(pd.name) } as any,
        });
        results.created++;
      } catch {
        results.errors++;
      }
    }

    return results;
  }

  private calculateWinnerScore(product: any): number {
    const revenueScore = Math.min((product.totalRevenue / 10_000_000) * 40, 40);
    const soldScore = Math.min((product.totalSold / 500) * 30, 30);
    const marginScore = Math.min((product.margin ?? 0) * 0.3, 30);
    return Math.round(revenueScore + soldScore + marginScore);
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100);
  }
}
