import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class OnlineStoreService {
  constructor(private prisma: PrismaService) {}

  // ── Tienda Online ────────────────────────────────────────────────────

  async getStore(organizationId: string) {
    let store = await this.prisma.onlineStore.findUnique({ where: { organizationId } });

    if (!store) {
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true, email: true, phone: true },
      });
      store = await this.prisma.onlineStore.create({
        data: {
          organizationId,
          storeName: org?.name ?? 'Mi Tienda',
          isActive: false,
        },
      });
    }

    return store;
  }

  async updateStore(organizationId: string, dto: any) {
    const allowed: any = {};
    const fields = [
      'isActive', 'storeName', 'storeUrl', 'logoUrl', 'bannerUrl',
      'primaryColor', 'description', 'whatsappNumber', 'instagramHandle',
      'facebookUrl', 'minOrderAmount', 'acceptsCOD', 'acceptsTransfer',
      'acceptsOnline', 'policies', 'seoTitle', 'seoDescription',
    ];
    for (const f of fields) {
      if (dto[f] !== undefined) allowed[f] = dto[f];
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

  // Calcula costo de envío para una ciudad/pedido dado
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
