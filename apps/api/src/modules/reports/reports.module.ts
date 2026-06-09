import { Module } from '@nestjs/common';
import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgId } from '../../common/decorators/current-user.decorator';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import * as XLSX from 'xlsx';

@Injectable()
class ReportsService {
  constructor(private prisma: PrismaService) {}

  private writeExcel(rows: any[], sheetName: string): Buffer {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    if (rows.length) {
      ws['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 18 }));
    }
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  async exportSalesExcel(orgId: string, dateFrom?: string, dateTo?: string): Promise<Buffer> {
    const orders = await this.prisma.order.findMany({
      where: {
        organizationId: orgId,
        status: { not: 'CANCELLED' },
        createdAt: {
          gte: dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 86400000),
          lte: dateTo ? new Date(dateTo) : new Date(),
        },
      },
      include: {
        customer: { select: { firstName: true, lastName: true } },
        createdBy: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = orders.map((o) => ({
      'Número': o.number,
      'Fecha': o.createdAt.toLocaleDateString('es-CO'),
      'Cliente': o.customer ? `${o.customer.firstName}${o.customer.lastName ? ' ' + o.customer.lastName : ''}` : 'Cliente general',
      'Canal': o.channel,
      'Estado': o.status,
      'Items': o._count.items,
      'Subtotal': o.subtotal,
      'Descuento': o.discountAmount,
      'IVA': o.taxAmount,
      'Total': o.total,
      'Vendedor': o.createdBy?.name ?? '',
    }));

    return this.writeExcel(rows, 'Ventas');
  }

  async exportInventoryExcel(orgId: string): Promise<Buffer> {
    const inventory = await this.prisma.inventory.findMany({
      where: { organizationId: orgId },
      include: {
        product: { select: { name: true, sku: true } },
        warehouse: { select: { name: true } },
      },
      orderBy: { quantity: 'asc' },
    });

    const rows = inventory.map((i) => ({
      'Producto': i.product?.name ?? '',
      'SKU': i.product?.sku ?? '',
      'Almacén': i.warehouse?.name ?? '',
      'Stock actual': i.quantity,
      'Stock mínimo': i.minStock,
      'Estado': i.quantity === 0 ? 'Sin stock' : i.quantity <= i.minStock ? 'Stock bajo' : 'OK',
    }));

    return this.writeExcel(rows, 'Inventario');
  }

  async exportCustomersExcel(orgId: string): Promise<Buffer> {
    const customers = await this.prisma.customer.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { totalSpent: 'desc' },
    });

    const rows = customers.map((c) => ({
      'Nombre': `${c.firstName}${c.lastName ? ' ' + c.lastName : ''}`,
      'Email': c.email ?? '',
      'Teléfono': c.phone ?? '',
      'Ciudad': c.city ?? '',
      'Segmento': c.segment ?? '',
      'Total compras': c.totalOrders,
      'Total gastado': c.totalSpent,
      'Puntos lealtad': c.loyaltyPoints,
      'Última compra': c.lastPurchaseAt ? c.lastPurchaseAt.toLocaleDateString('es-CO') : '',
      'Registrado': c.createdAt.toLocaleDateString('es-CO'),
    }));

    return this.writeExcel(rows, 'Clientes');
  }

  async exportProductsExcel(orgId: string): Promise<Buffer> {
    const products = await this.prisma.product.findMany({
      where: { organizationId: orgId, status: { not: 'DISCONTINUED' } },
      include: {
        category: { select: { name: true } },
        inventory: { select: { quantity: true }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });

    const rows = products.map((p) => ({
      'Nombre': p.name,
      'SKU': p.sku,
      'Categoría': p.category?.name ?? '',
      'Estado': p.status,
      'Precio base': p.basePrice,
      'Precio venta': p.salePrice ?? p.basePrice,
      'Costo': p.costPrice ?? '',
      'Margen %': p.margin?.toFixed(2) ?? '',
      'Stock': p.inventory[0]?.quantity ?? 0,
      'Stock mínimo': p.minStockAlert,
      'Barcode': p.barcode ?? '',
    }));

    return this.writeExcel(rows, 'Productos');
  }

  async exportRevenueExcel(orgId: string, dateFrom?: string, dateTo?: string): Promise<Buffer> {
    const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 86400000);
    const to   = dateTo   ? new Date(dateTo)   : new Date();

    // Revenue agrupado por categoría de producto
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: {
          organizationId: orgId,
          status: { not: 'CANCELLED' },
          createdAt: { gte: from, lte: to },
        },
      },
      include: {
        product: { include: { category: { select: { name: true } } } },
        order:   { select: { createdAt: true, channel: true } },
      },
    });

    // Agrupar por categoría
    const grouped: Record<string, { category: string; revenue: number; cost: number; quantity: number }> = {};
    for (const item of items) {
      const cat = item.product?.category?.name ?? 'Sin categoría';
      if (!grouped[cat]) grouped[cat] = { category: cat, revenue: 0, cost: 0, quantity: 0 };
      grouped[cat].revenue  += item.total;
      grouped[cat].cost     += (item.costPrice ?? 0) * item.quantity;
      grouped[cat].quantity += item.quantity;
    }

    const rows = Object.values(grouped)
      .sort((a, b) => b.revenue - a.revenue)
      .map((g) => ({
        'Categoría': g.category,
        'Ingresos ($)': +g.revenue.toFixed(2),
        'Costo ($)': +g.cost.toFixed(2),
        'Margen ($)': +(g.revenue - g.cost).toFixed(2),
        'Margen %': g.revenue > 0 ? +((g.revenue - g.cost) / g.revenue * 100).toFixed(1) : 0,
        'Unidades vendidas': g.quantity,
      }));

    // Fila totales
    const totRevenue = rows.reduce((s, r) => s + r['Ingresos ($)'], 0);
    const totCost    = rows.reduce((s, r) => s + r['Costo ($)'], 0);
    rows.push({
      'Categoría': '── TOTAL ──',
      'Ingresos ($)': +totRevenue.toFixed(2),
      'Costo ($)': +totCost.toFixed(2),
      'Margen ($)': +(totRevenue - totCost).toFixed(2),
      'Margen %': totRevenue > 0 ? +((totRevenue - totCost) / totRevenue * 100).toFixed(1) : 0,
      'Unidades vendidas': rows.reduce((s, r) => s + r['Unidades vendidas'], 0),
    });

    return this.writeExcel(rows, 'Ingresos por categoría');
  }

  async exportInvoicesExcel(orgId: string, dateFrom?: string, dateTo?: string): Promise<Buffer> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        createdAt: {
          gte: dateFrom ? new Date(dateFrom) : new Date(Date.now() - 90 * 86400000),
          lte: dateTo ? new Date(dateTo) : new Date(),
        },
      },
      include: { customer: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const rows = invoices.map((i) => ({
      'Número': i.number,
      'Cliente': i.customer ? `${i.customer.firstName}${i.customer.lastName ? ' ' + i.customer.lastName : ''}` : '',
      'Email': i.customer?.email ?? '',
      'Estado': i.status,
      'Fecha emisión': i.issueDate ? new Date(i.issueDate).toLocaleDateString('es-CO') : '',
      'Fecha vencimiento': i.dueDate ? new Date(i.dueDate).toLocaleDateString('es-CO') : '',
      'Subtotal': i.subtotal,
      'IVA': i.taxAmount,
      'Total': i.total,
      'Pagado': i.paidAmount,
      'Pendiente': i.total - i.paidAmount,
    }));

    return this.writeExcel(rows, 'Facturas');
  }
}

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
class ReportsController {
  constructor(private s: ReportsService) {}

  private send(res: Response, buffer: Buffer, filename: string) {
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  @Get('sales/excel')
  async exportSales(@OrgId() o: string, @Query('dateFrom') df: string, @Query('dateTo') dt: string, @Res() res: Response) {
    const buf = await this.s.exportSalesExcel(o, df, dt);
    this.send(res, buf, `ventas-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  @Get('inventory/excel')
  async exportInventory(@OrgId() o: string, @Res() res: Response) {
    const buf = await this.s.exportInventoryExcel(o);
    this.send(res, buf, `inventario-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  @Get('customers/excel')
  async exportCustomers(@OrgId() o: string, @Res() res: Response) {
    const buf = await this.s.exportCustomersExcel(o);
    this.send(res, buf, `clientes-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  @Get('products/excel')
  async exportProducts(@OrgId() o: string, @Res() res: Response) {
    const buf = await this.s.exportProductsExcel(o);
    this.send(res, buf, `productos-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  @Get('invoices/excel')
  async exportInvoices(@OrgId() o: string, @Query('dateFrom') df: string, @Query('dateTo') dt: string, @Res() res: Response) {
    const buf = await this.s.exportInvoicesExcel(o, df, dt);
    this.send(res, buf, `facturas-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  @Get('revenue/excel')
  async exportRevenue(@OrgId() o: string, @Query('dateFrom') df: string, @Query('dateTo') dt: string, @Res() res: Response) {
    const buf = await this.s.exportRevenueExcel(o, df, dt);
    this.send(res, buf, `ingresos-${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}

@Module({ controllers: [ReportsController], providers: [ReportsService] })
export class ReportsModule {}
