import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class OnlineStoreService {
  constructor(private prisma: PrismaService) {}

  // ── Tienda Online ────────────────────────────────────────────────────

  private toSlug(text: string): string {
    // Remove diacritics (accents) then keep only alphanumeric + hyphens
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/̀-ͯ/g, '')
      .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60);
  }

  async getStore(organizationId: string) {
    let store = await this.prisma.onlineStore.findUnique({ where: { organizationId } });

    if (!store) {
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true, email: true, phone: true },
      });
      const name = org?.name ?? 'Mi Tienda';
      store = await this.prisma.onlineStore.create({
        data: {
          organizationId,
          storeName: name,
          storeUrl: this.toSlug(name),
          isActive: false,
        },
      });
    } else if (!store.storeUrl && store.storeName) {
      store = await this.prisma.onlineStore.update({
        where: { organizationId },
        data: { storeUrl: this.toSlug(store.storeName) },
      });
    }

    return store;
  }

  async updateStore(organizationId: string, dto: any) {
    const allowed: any = {};
    // Accept 'name' as alias for 'storeName'
    if (dto.name !== undefined && dto.storeName === undefined) dto.storeName = dto.name;

    const fields = [
      'isActive', 'storeName', 'storeUrl', 'logoUrl', 'bannerUrl',
      'primaryColor', 'description', 'whatsappNumber', 'instagramHandle',
      'facebookUrl', 'minOrderAmount', 'acceptsCOD', 'acceptsTransfer',
      'acceptsOnline', 'policies', 'seoTitle', 'seoDescription',
    ];
    for (const f of fields) {
      if (dto[f] !== undefined) allowed[f] = dto[f];
    }

    // Auto-generate storeUrl from storeName if not explicitly set
    if (allowed.storeName && !allowed.storeUrl) {
      const existing = await this.prisma.onlineStore.findUnique({ where: { organizationId }, select: { storeUrl: true } });
      if (!existing?.storeUrl) {
        allowed.storeUrl = this.toSlug(allowed.storeName);
      }
    }

    return this.prisma.onlineStore.upsert({
      where: { organizationId },
      update: allowed,
      create: { organizationId, ...allowed },
    });
  }

  // ── Zonas de Envío ───────────────────────────────────────────────────

  async getShippingZones(organizationId: string) {
    return this.prisma.shippingZone.findMany({
      where: { organizationId } as any,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createShippingZone(organizationId: string, dto: any) {
    return this.prisma.shippingZone.create({
      data: {
        organizationId,
        name:       dto.name,
        cities:     dto.cities     ?? [],
        departments: dto.departments ?? [],
        countries:  dto.countries  ?? ['CO'],
        carrier:    dto.carrier,
        minDays:    Number(dto.minDays   ?? 1),
        maxDays:    Number(dto.maxDays   ?? 3),
        baseRate:   Number(dto.baseRate  ?? 0),
        freeFrom:   dto.freeFrom ? Number(dto.freeFrom) : null,
        isActive:   dto.isActive  ?? true,
        sortOrder:  Number(dto.sortOrder ?? 0),
      },
    } as any);
  }

  async updateShippingZone(organizationId: string, id: string, dto: any) {
    const zone = await this.prisma.shippingZone.findFirst({
      where: { id, organizationId } as any,
    });
    if (!zone) throw new NotFoundException('Zona de envío no encontrada');

    const data: any = {};
    const fields = ['name', 'cities', 'departments', 'countries', 'carrier',
      'minDays', 'maxDays', 'baseRate', 'freeFrom', 'isActive', 'sortOrder'];
    for (const f of fields) {
      if (dto[f] !== undefined) data[f] = dto[f];
    }

    return this.prisma.shippingZone.update({ where: { id }, data });
  }

  async deleteShippingZone(organizationId: string, id: string) {
    const zone = await this.prisma.shippingZone.findFirst({
      where: { id, organizationId } as any,
    });
    if (!zone) throw new NotFoundException('Zona de envío no encontrada');
    return this.prisma.shippingZone.delete({ where: { id } });
  }

  // ── Storefront público (sin JWT) ─────────────────────────────────────

  private async resolveSlug(slug: string) {
    const store = await this.prisma.onlineStore.findFirst({
      where: { storeUrl: slug },
      include: { organization: { select: { name: true, email: true, phone: true } } },
    });
    if (!store) throw new NotFoundException('Tienda no encontrada');
    return store;
  }

  async getPublicStore(slug: string) {
    const store = await this.resolveSlug(slug);
    if (!store.isActive) throw new NotFoundException('Tienda no disponible');
    return {
      id: store.id,
      storeName: store.storeName,
      storeUrl: store.storeUrl,
      logoUrl: store.logoUrl,
      bannerUrl: store.bannerUrl,
      primaryColor: store.primaryColor,
      description: store.description,
      whatsappNumber: store.whatsappNumber,
      instagramHandle: store.instagramHandle,
      facebookUrl: store.facebookUrl,
      minOrderAmount: store.minOrderAmount,
      acceptsCOD: store.acceptsCOD,
      acceptsTransfer: store.acceptsTransfer,
      acceptsOnline: store.acceptsOnline,
      seoTitle: store.seoTitle,
      seoDescription: store.seoDescription,
    };
  }

  async getPublicProducts(slug: string, query: any = {}) {
    const store = await this.resolveSlug(slug);
    if (!store.isActive) throw new NotFoundException('Tienda no disponible');

    const { category, search, page = 1, limit = 24 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { organizationId: store.organizationId, status: 'ACTIVE' };
    if (category) where.categoryId = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku:  { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
        select: {
          id: true, name: true, sku: true, image: true,
          basePrice: true, salePrice: true, description: true,
          category: { select: { id: true, name: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, pages: Math.ceil(total / Number(limit)), page: Number(page) };
  }

  async getPublicCategories(slug: string) {
    const store = await this.resolveSlug(slug);
    return this.prisma.category.findMany({
      where: {
        organizationId: store.organizationId,
        products: { some: { status: 'ACTIVE' } },
      },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
  }

  async createGuestOrder(slug: string, dto: any) {
    const store = await this.resolveSlug(slug);
    if (!store.isActive) throw new BadRequestException('Tienda no disponible');

    if (dto.total < (store.minOrderAmount ?? 0)) {
      throw new BadRequestException(`Monto mínimo de pedido: $${store.minOrderAmount}`);
    }

    const orgId = store.organizationId;

    // Find or create guest customer
    let customerId: string | undefined;
    if (dto.email || dto.phone) {
      let customer = await this.prisma.customer.findFirst({
        where: {
          organizationId: orgId,
          ...(dto.email ? { email: dto.email.toLowerCase() } : { phone: dto.phone }),
        },
      });
      if (!customer) {
        const parts = (dto.name ?? 'Invitado').split(' ');
        customer = await this.prisma.customer.create({
          data: {
            organizationId: orgId,
            firstName: parts[0],
            lastName: parts.slice(1).join(' ') || null,
            email: dto.email?.toLowerCase() || null,
            phone: dto.phone || null,
          },
        });
      }
      customerId = customer.id;
    }

    // Order number
    const now = new Date();
    const prefix = `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await this.prisma.order.count({
      where: { organizationId: orgId, number: { startsWith: prefix } },
    });
    const number = `${prefix}-${String(count + 1).padStart(5, '0')}`;

    const subtotal    = dto.subtotal ?? dto.total;
    const taxAmount   = dto.taxAmount ?? 0;
    const shippingCost = dto.shippingCost ?? 0;
    const total       = dto.total;

    const order = await this.prisma.order.create({
      data: {
        organizationId: orgId,
        number,
        channel:        'ONLINE',
        deliveryMethod: dto.deliveryMethod ?? 'HOME_DELIVERY',
        customerId,
        paymentMethod:  dto.paymentMethod ?? 'BANK_TRANSFER',
        subtotal,
        taxAmount,
        shippingCost,
        total,
        status:         'PENDING',
        notes:          dto.notes,
        customerNote:   dto.customerNote,
        shippingAddress: dto.city ? {
          street:       dto.address,
          city:         dto.city,
          instructions: dto.instructions,
          name:         dto.name,
          phone:        dto.phone,
        } : undefined,
        items: {
          create: (dto.items ?? []).map((i: any) => ({
            productId: i.productId,
            name:      i.name,
            sku:       i.sku ?? '',
            quantity:  Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            subtotal:  Number(i.quantity) * Number(i.unitPrice),
            total:     Number(i.quantity) * Number(i.unitPrice),
          })),
        },
      },
      include: { items: true, customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
    });

    return order;
  }

  async getPublicShipping(slug: string, city: string, orderTotal: number) {
    const store = await this.resolveSlug(slug);
    return this.calculateShipping(store.organizationId, city, orderTotal);
  }

  // ── Calcula costo de envío para una ciudad/pedido dado
  async calculateShipping(organizationId: string, city: string, orderTotal: number) {
    const zones = await this.prisma.shippingZone.findMany({
      where: { organizationId, isActive: true } as any,
      orderBy: { sortOrder: 'asc' },
    });

    const matching = (zones as any[]).filter((z: any) =>
      z.cities?.some((c: string) => c.toLowerCase() === city.toLowerCase()) ||
      z.cities?.includes('*'),
    );

    if (!matching.length) {
      return { available: false, message: 'No hay envío disponible para esta ciudad' };
    }

    return matching.map((z: any) => ({
      zoneId:    z.id,
      zoneName:  z.name,
      carrier:   z.carrier,
      minDays:   z.minDays,
      maxDays:   z.maxDays,
      cost:      z.freeFrom && orderTotal >= z.freeFrom ? 0 : z.baseRate,
      freeFrom:  z.freeFrom,
      isFree:    z.freeFrom ? orderTotal >= z.freeFrom : false,
    }));
  }
}
