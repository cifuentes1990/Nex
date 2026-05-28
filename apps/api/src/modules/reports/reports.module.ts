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
    const buf = await this.s.exportSalesExcel(o, df, dt);
    this.send(res, buf, `ingresos-${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}

@Module({ controllers: [ReportsController], providers: [ReportsService] })
export class ReportsModule {}
