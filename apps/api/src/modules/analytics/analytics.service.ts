import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import * as dayjs from 'dayjs';
import * as XLSX from 'xlsx';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(organizationId: string, branchId?: string) {
    const now = dayjs();
    const startOfDay = now.startOf('day').toDate();
    const startOfMonth = now.startOf('month').toDate();
    const startOfLastMonth = now.subtract(1, 'month').startOf('month').toDate();
    const endOfLastMonth = now.subtract(1, 'month').endOf('month').toDate();
    const startOfYear = now.startOf('year').toDate();

    const baseWhere = { organizationId, ...(branchId && { branchId }) };
    const orderWhere = { ...baseWhere, status: { not: 'CANCELLED' } } as any;

    const [
      todaySales,
      monthSales,
      lastMonthSales,
      yearSales,
      totalCustomers,
      newCustomersMonth,
      totalProducts,
      lowStockCount,
      pendingInvoices,
      topProducts,
      recentOrders,
      salesByDay,
      salesByHour,
      paymentMethods,
    ] = await Promise.all([
      // Today sales
      this.prisma.order.aggregate({
        where: { ...orderWhere, createdAt: { gte: startOfDay } },
        _sum: { total: true },
        _count: { id: true },
      }),

      // Month sales
      this.prisma.order.aggregate({
        where: { ...orderWhere, createdAt: { gte: startOfMonth } },
        _sum: { total: true, discountAmount: true },
        _count: { id: true },
      }),

      // Last month sales
      this.prisma.order.aggregate({
        where: { ...orderWhere, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { total: true },
        _count: { id: true },
      }),

      // Year sales
      this.prisma.order.aggregate({
        where: { ...orderWhere, createdAt: { gte: startOfYear } },
        _sum: { total: true },
        _count: { id: true },
      }),

      // Total customers
      this.prisma.customer.count({ where: { organizationId, isActive: true } }),

      // New customers this month
      this.prisma.customer.count({
        where: { organizationId, createdAt: { gte: startOfMonth } },
      }),

      // Active products
      this.prisma.product.count({ where: { organizationId, status: 'ACTIVE' } }),

      // Low stock
      this.prisma.inventory.findMany({
        where: { organizationId },
        select: { quantity: true, minStock: true },
      }).then((items) => items.filter((i) => i.quantity <= i.minStock).length).catch(() => 0),

      // Pending invoices
      this.prisma.invoice.aggregate({
        where: { organizationId, status: { in: ['PENDING', 'OVERDUE'] } },
        _sum: { balance: true },
        _count: { id: true },
      }).catch(() => ({ _sum: { balance: 0 }, _count: { id: 0 } })),

      // Top products by revenue
      (this.prisma.orderItem.groupBy as any)({
        by: ['productId'],
        where: {
          order: {
            organizationId,
            status: { not: 'CANCELLED' },
            createdAt: { gte: startOfMonth },
          },
        },
        _sum: { total: true, quantity: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10,
      }).catch(() => []),

      // Recent orders
      this.prisma.order.findMany({
        where: orderWhere,
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          customer: { select: { firstName: true, lastName: true, email: true } },
          createdBy: { select: { name: true } },
          items: { take: 1, include: { product: { select: { name: true, image: true } } } },
        },
      }),

      // Sales by day (last 30 days)
      this.getSalesByDay(organizationId, branchId, 30),

      // Sales by hour (today)
      this.getSalesByHour(organizationId, branchId),

      // Payment methods distribution
      (this.prisma.payment.groupBy as any)({
        by: ['method'],
        where: {
          organizationId,
          processedAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
        _count: { id: true },
      }).catch(() => []),
    ]);

    // Enrich top products with names
    const productIds = topProducts.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, image: true, sku: true, basePrice: true },
    });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    const monthGrowth = lastMonthSales._sum.total
      ? (((monthSales._sum.total ?? 0) - (lastMonthSales._sum.total ?? 0)) /
          (lastMonthSales._sum.total ?? 1)) *
        100
      : 0;

    return {
      today: {
        revenue: todaySales._sum.total ?? 0,
        orders: todaySales._count.id ?? 0,
        avgOrder: todaySales._count.id
          ? (todaySales._sum.total ?? 0) / todaySales._count.id
          : 0,
      },
      month: {
        revenue: monthSales._sum.total ?? 0,
        orders: monthSales._count.id ?? 0,
        discounts: monthSales._sum.discountAmount ?? 0,
        growth: Math.round(monthGrowth * 100) / 100,
        avgOrder: monthSales._count.id
          ? (monthSales._sum.total ?? 0) / monthSales._count.id
          : 0,
      },
      year: {
        revenue: yearSales._sum.total ?? 0,
        orders: yearSales._count.id ?? 0,
      },
      customers: {
        total: totalCustomers,
        newThisMonth: newCustomersMonth,
      },
      products: {
        total: totalProducts,
        lowStock: lowStockCount,
      },
      invoices: {
        pendingAmount: pendingInvoices._sum.balance ?? 0,
        pendingCount: pendingInvoices._count.id ?? 0,
      },
      topProducts: topProducts.map((p) => ({
        product: productMap[p.productId],
        revenue: p._sum.total ?? 0,
        quantity: p._sum.quantity ?? 0,
      })),
      recentOrders,
      charts: {
        salesByDay,
        salesByHour,
        paymentMethods: paymentMethods.map((p) => ({
          method: p.method,
          amount: p._sum.amount ?? 0,
          count: p._count.id,
        })),
      },
    };
  }

  async getSalesByDay(organizationId: string, branchId?: string, days = 30) {
    const startDate = dayjs().subtract(days, 'day').startOf('day').toDate();
    const orders = await this.prisma.order.findMany({
      where: {
        organizationId,
        ...(branchId && { branchId }),
        status: { not: 'CANCELLED' },
        createdAt: { gte: startDate },
      },
      select: { total: true, createdAt: true },
    });

    const grouped: Record<string, { date: string; revenue: number; orders: number }> = {};
    for (let i = 0; i < days; i++) {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      grouped[date] = { date, revenue: 0, orders: 0 };
    }

    orders.forEach((o) => {
      const date = dayjs(o.createdAt).format('YYYY-MM-DD');
      if (grouped[date]) {
        grouped[date].revenue += o.total;
        grouped[date].orders += 1;
      }
    });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getSalesByHour(organizationId: string, branchId?: string) {
    const startOfDay = dayjs().startOf('day').toDate();
    const orders = await this.prisma.order.findMany({
      where: {
        organizationId,
        ...(branchId && { branchId }),
        status: { not: 'CANCELLED' },
        createdAt: { gte: startOfDay },
      },
      select: { total: true, createdAt: true },
    });

    const hours: Record<number, { hour: number; revenue: number; orders: number }> = {};
    for (let h = 0; h < 24; h++) {
      hours[h] = { hour: h, revenue: 0, orders: 0 };
    }

    orders.forEach((o) => {
      const hour = dayjs(o.createdAt).hour();
      hours[hour].revenue += o.total;
      hours[hour].orders += 1;
    });

    return Object.values(hours);
  }

  async getRevenueByCategory(organizationId: string, period: 'week' | 'month' | 'year' = 'month') {
    const startDate = dayjs()
      .subtract(1, period)
      .startOf(period === 'week' ? 'week' : period === 'month' ? 'month' : 'year')
      .toDate();

    const items = await this.prisma.orderItem.findMany({
      where: {
        order: { organizationId, status: { not: 'CANCELLED' }, createdAt: { gte: startDate } },
      },
      include: {
        product: { include: { category: { select: { id: true, name: true, color: true } } } },
      },
    });

    const categoryMap: Record<string, { id: string; name: string; color: string | null; revenue: number; quantity: number }> = {};

    items.forEach((item) => {
      const cat = item.product?.category;
      if (!cat) return;
      if (!categoryMap[cat.id]) {
        categoryMap[cat.id] = { id: cat.id, name: cat.name, color: cat.color, revenue: 0, quantity: 0 };
      }
      categoryMap[cat.id].revenue += item.total;
      categoryMap[cat.id].quantity += item.quantity;
    });

    return Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue);
  }

  async getCustomerSegments(organizationId: string) {
    const customers = await this.prisma.customer.findMany({
      where: { organizationId, isActive: true },
      select: { totalSpent: true, totalOrders: true, lastPurchaseAt: true, createdAt: true },
    });

    const now = dayjs();
    const segments = { vip: 0, loyal: 0, regular: 0, atRisk: 0, lost: 0, new: 0 };

    customers.forEach((c) => {
      const daysSinceLastPurchase = c.lastPurchaseAt
        ? now.diff(dayjs(c.lastPurchaseAt), 'day')
        : 9999;
      const daysSinceCreated = now.diff(dayjs(c.createdAt), 'day');

      if (daysSinceCreated <= 30) {
        segments.new++;
      } else if (daysSinceLastPurchase > 180) {
        segments.lost++;
      } else if (daysSinceLastPurchase > 90) {
        segments.atRisk++;
      } else if (c.totalSpent >= 5000000) {
        segments.vip++;
      } else if (c.totalOrders >= 10) {
        segments.loyal++;
      } else {
        segments.regular++;
      }
    });

    return segments;
  }

  async getProfitAnalysis(organizationId: string, startDate: Date, endDate: Date) {
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: {
          organizationId,
          status: { not: 'CANCELLED' },
          createdAt: { gte: startDate, lte: endDate },
        },
      },
      select: {
        quantity: true,
        unitPrice: true,
        costPrice: true,
        total: true,
        taxAmount: true,
        discount: true,
        product: { select: { name: true, sku: true, categoryId: true } },
      },
    });

    let totalRevenue = 0;
    let totalCost = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    items.forEach((item) => {
      totalRevenue += item.total;
      totalCost += item.costPrice * item.quantity;
      totalTax += item.taxAmount;
      totalDiscount += item.discount;
    });

    const grossProfit = totalRevenue - totalCost;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      revenue: totalRevenue,
      cost: totalCost,
      grossProfit,
      grossMargin: Math.round(grossMargin * 100) / 100,
      tax: totalTax,
      discount: totalDiscount,
      netRevenue: totalRevenue - totalDiscount,
      itemsSold: items.reduce((acc, i) => acc + i.quantity, 0),
    };
  }

  async getSalesForecasting(organizationId: string, daysAhead = 30) {
    const historicalDays = 90;
    const startDate = dayjs().subtract(historicalDays, 'day').startOf('day').toDate();

    const dailySales = await this.getSalesByDay(organizationId, undefined, historicalDays);
    const revenues = dailySales.map((d) => d.revenue);

    // Simple moving average forecast
    const windowSize = 7;
    const forecasted: Array<{ date: string; revenue: number; lower: number; upper: number }> = [];

    for (let i = 0; i < daysAhead; i++) {
      const date = dayjs().add(i + 1, 'day').format('YYYY-MM-DD');
      const window = revenues.slice(Math.max(0, revenues.length - windowSize + i));
      const avg = window.reduce((a, b) => a + b, 0) / window.length;
      const std = Math.sqrt(window.reduce((a, b) => a + (b - avg) ** 2, 0) / window.length);

      forecasted.push({
        date,
        revenue: Math.max(0, avg),
        lower: Math.max(0, avg - std * 1.5),
        upper: avg + std * 1.5,
      });

      revenues.push(avg);
    }

    return { historical: dailySales, forecast: forecasted };
  }

  async getSalesByChannel(organizationId: string, days = 30) {
    const startDate = dayjs().subtract(days, 'day').startOf('day').toDate();

    const orders = await this.prisma.order.findMany({
      where: {
        organizationId,
        status: { notIn: ['CANCELLED', 'REFUNDED'] as any },
        createdAt: { gte: startDate },
      },
      select: { channel: true, total: true, shippingCost: true, createdAt: true },
    });

    const channels: Record<string, { channel: string; revenue: number; orders: number; shipping: number }> = {};

    orders.forEach((o) => {
      const ch = o.channel ?? 'POS';
      if (!channels[ch]) channels[ch] = { channel: ch, revenue: 0, orders: 0, shipping: 0 };
      channels[ch].revenue += o.total;
      channels[ch].orders += 1;
      channels[ch].shipping += (o as any).shippingCost ?? 0;
    });

    const totalRevenue = Object.values(channels).reduce((s, c) => s + c.revenue, 0);

    return Object.values(channels).map((c) => ({
      ...c,
      percentage: totalRevenue > 0 ? Math.round((c.revenue / totalRevenue) * 100) : 0,
      avgOrder: c.orders > 0 ? c.revenue / c.orders : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }

  async getPendingOnlineOrders(organizationId: string) {
    return this.prisma.order.findMany({
      where: {
        organizationId,
        channel: { in: ['ONLINE', 'WHATSAPP', 'PHONE', 'MARKETPLACE', 'INSTAGRAM'] as any },
        status: { notIn: ['DELIVERED', 'CANCELLED', 'REFUNDED', 'RETURNED'] as any },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { firstName: true, lastName: true, phone: true, email: true } },
        items: {
          take: 3,
          include: { product: { select: { name: true, image: true } } },
        },
        _count: { select: { items: true } },
      },
    });
  }

  async getTopPerformingProducts(organizationId: string, limit = 20, period = 30) {
    const startDate = dayjs().subtract(period, 'day').toDate();

    const items = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          organizationId,
          status: { not: 'CANCELLED' },
          createdAt: { gte: startDate },
        },
      },
      _sum: { total: true, quantity: true },
      _avg: { unitPrice: true },
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true, name: true, sku: true, image: true,
        costPrice: true, basePrice: true,
        category: { select: { name: true } },
      },
    });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    return items.map((item) => {
      const product = productMap[item.productId];
      const revenue = item._sum.total ?? 0;
      const quantity = item._sum.quantity ?? 0;
      const cost = (product?.costPrice ?? 0) * quantity;
      const profit = revenue - cost;

      return {
        product,
        revenue,
        quantity,
        profit,
        margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        avgPrice: item._avg.unitPrice ?? 0,
      };
    });
  }

  // ── Exportar a Excel ────────────────────────────────────────────────────
  async exportToExcel(
    organizationId: string,
    type: 'orders' | 'products' | 'customers' | 'inventory',
    days = 30,
  ): Promise<Buffer> {
    const since = dayjs().subtract(days, 'day').startOf('day').toDate();
    const wb    = XLSX.utils.book_new();

    if (type === 'orders') {
      const orders = await this.prisma.order.findMany({
        where: { organizationId, createdAt: { gte: since } },
        include: {
          customer: { select: { firstName: true, lastName: true, phone: true, email: true } },
          items:    { include: { product: { select: { name: true, sku: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      });

      const rows = orders.flatMap((o) =>
        o.items.map((i) => ({
          'Número':       o.number,
          'Fecha':        dayjs(o.createdAt).format('YYYY-MM-DD HH:mm'),
          'Estado':       o.status,
          'Canal':        o.channel,
          'Cliente':      o.customer ? `${o.customer.firstName} ${o.customer.lastName ?? ''}`.trim() : 'General',
          'Teléfono':     o.customer?.phone ?? '',
          'Producto':     i.product?.name ?? i.name,
          'SKU':          i.product?.sku ?? '',
          'Cantidad':     i.quantity,
          'Precio unit.': i.unitPrice,
          'Total ítem':   i.total,
          'Subtotal':     o.subtotal,
          'Descuento':    o.discountAmount,
          'IVA':          o.taxAmount,
          'Total':        o.total,
          'Envío':        o.shippingCost,
        })),
      );

      const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'Sin datos': 'No hay órdenes en el período' }]);
      XLSX.utils.book_append_sheet(wb, ws, 'Ventas');

    } else if (type === 'products') {
      const products = await this.prisma.product.findMany({
        where: { organizationId },
        include: {
          category:  { select: { name: true } },
          supplier:  { select: { name: true } },
          inventory: { select: { quantity: true, minStock: true }, take: 1 },
        },
        orderBy: { totalRevenue: 'desc' },
        take: 5000,
      });

      const rows = products.map((p) => ({
        'Nombre':        p.name,
        'SKU':           p.sku,
        'Código barras': p.barcode ?? '',
        'Categoría':     p.category?.name ?? '',
        'Proveedor':     p.supplier?.name ?? '',
        'Estado':        p.status,
        'Precio costo':  p.costPrice,
        'Precio base':   p.basePrice,
        'Precio venta':  p.salePrice ?? p.basePrice,
        'Stock actual':  p.inventory[0]?.quantity ?? 0,
        'Stock mínimo':  p.inventory[0]?.minStock ?? 0,
        'Stock bajo':    (p.inventory[0]?.quantity ?? 0) <= (p.inventory[0]?.minStock ?? 0) ? 'Sí' : 'No',
        'Total vendido': p.totalSold,
        'Revenue total': p.totalRevenue,
        'Creado':        dayjs(p.createdAt).format('YYYY-MM-DD'),
      }));

      const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'Sin datos': 'No hay productos' }]);
      XLSX.utils.book_append_sheet(wb, ws, 'Productos');

    } else if (type === 'customers') {
      const customers = await this.prisma.customer.findMany({
        where: { organizationId },
        orderBy: { totalSpent: 'desc' },
        take: 5000,
      });

      const rows = customers.map((c) => ({
        'Nombre':          `${c.firstName} ${c.lastName ?? ''}`.trim(),
        'Email':           c.email ?? '',
        'Teléfono':        c.phone ?? '',
        'Ciudad':          (c as any).city ?? '',
        'Total compras':   c.totalOrders,
        'Total gastado':   c.totalSpent,
        'Ticket promedio': c.totalOrders > 0 ? c.totalSpent / c.totalOrders : 0,
        'Puntos':          c.loyaltyPoints,
        'Activo':          c.isActive ? 'Sí' : 'No',
        'Creado':          dayjs(c.createdAt).format('YYYY-MM-DD'),
        'Última compra':   c.lastPurchaseAt ? dayjs(c.lastPurchaseAt).format('YYYY-MM-DD') : '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'Sin datos': 'No hay clientes' }]);
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

    } else if (type === 'inventory') {
      const inventory = await this.prisma.inventory.findMany({
        where: { organizationId },
        include: {
          product:   { select: { name: true, sku: true, basePrice: true, costPrice: true, status: true } },
          warehouse: { select: { name: true } },
        },
        orderBy: { quantity: 'asc' },
        take: 5000,
      });

      const rows = inventory.map((i) => ({
        'Producto':      i.product?.name ?? '',
        'SKU':           i.product?.sku ?? '',
        'Bodega':        i.warehouse?.name ?? 'Principal',
        'Stock':         i.quantity,
        'Disponible':    i.availableQty,
        'Reservado':     i.reservedQty,
        'Stock mínimo':  i.minStock,
        'Alerta stock':  i.quantity <= i.minStock ? '⚠️ BAJO' : 'OK',
        'Valor costo':   (i.product?.costPrice ?? 0) * i.quantity,
        'Valor venta':   (i.product?.basePrice ?? 0) * i.quantity,
        'Estado prod.':  i.product?.status ?? '',
        'Actualizado':   dayjs(i.updatedAt).format('YYYY-MM-DD HH:mm'),
      }));

      const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'Sin datos': 'No hay inventario' }]);
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    }

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
