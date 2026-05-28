import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Nexus ERP database...');

  // ================================================================
  // ORGANIZATION
  // ================================================================
  const org = await prisma.organization.upsert({
    where: { slug: 'nexus-demo' },
    update: {},
    create: {
      name: 'Nexus Demo Store',
      slug: 'nexus-demo',
      email: 'demo@nexuserp.com',
      phone: '+57 310 555 0100',
      address: 'Calle 93 #13-24, Bogotá',
      city: 'Bogotá',
      country: 'CO',
      timezone: 'America/Bogota',
      currency: 'COP',
      currencySymbol: '$',
      language: 'es',
      businessType: 'RETAIL',
      taxId: '900123456-7',
      taxRate: 0.19,
      isActive: true,
      subscription: {
        create: {
          plan: 'PROFESSIONAL',
          status: 'ACTIVE',
          seats: 10,
          price: 149000,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  console.log(`✅ Organization: ${org.name}`);

  // ================================================================
  // BRANCHES
  // ================================================================
  const mainBranch = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'BOG-001' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Sede Principal — Bogotá',
      code: 'BOG-001',
      address: 'Calle 93 #13-24',
      city: 'Bogotá',
      phone: '+57 310 555 0100',
      isMain: true,
      isActive: true,
    },
  });

  const branch2 = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'MED-001' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Sucursal Medellín',
      code: 'MED-001',
      address: 'Av. El Poblado #43-50',
      city: 'Medellín',
      phone: '+57 320 555 0200',
      isMain: false,
      isActive: true,
    },
  });

  console.log(`✅ Branches: ${mainBranch.name}, ${branch2.name}`);

  // ================================================================
  // USERS
  // ================================================================
  const passwordHash = await bcrypt.hash('Admin123!', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@nexuserp.com' },
    update: {},
    create: {
      organizationId: org.id,
      branchId: mainBranch.id,
      email: 'admin@nexuserp.com',
      name: 'Carlos Rodríguez',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: new Date(),
      salesGoal: 50000000,
      commissionRate: 0.05,
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@nexuserp.com' },
    update: {},
    create: {
      organizationId: org.id,
      branchId: mainBranch.id,
      email: 'manager@nexuserp.com',
      name: 'María García',
      passwordHash,
      role: 'MANAGER',
      status: 'ACTIVE',
      emailVerified: new Date(),
      salesGoal: 30000000,
      commissionRate: 0.04,
    },
  });

  const cashierUser = await prisma.user.upsert({
    where: { email: 'cajero@nexuserp.com' },
    update: {},
    create: {
      organizationId: org.id,
      branchId: mainBranch.id,
      email: 'cajero@nexuserp.com',
      name: 'Juan Martínez',
      passwordHash,
      role: 'CASHIER',
      status: 'ACTIVE',
      emailVerified: new Date(),
      salesGoal: 10000000,
      commissionRate: 0.02,
    },
  });

  console.log(`✅ Users: admin, manager, cashier`);

  // ================================================================
  // WAREHOUSE
  // ================================================================
  const warehouse = await prisma.warehouse.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'WH-001' } },
    update: {},
    create: {
      organizationId: org.id,
      branchId: mainBranch.id,
      name: 'Bodega Principal',
      code: 'WH-001',
      address: 'Zona Industrial Bogotá',
      isDefault: true,
      isActive: true,
    },
  });

  // ================================================================
  // CATEGORIES
  // ================================================================
  const categoryData = [
    { name: 'Electrónica', color: '#6366f1', icon: 'Zap' },
    { name: 'Ropa y Moda', color: '#ec4899', icon: 'Shirt' },
    { name: 'Alimentos', color: '#22c55e', icon: 'ShoppingBag' },
    { name: 'Hogar', color: '#f59e0b', icon: 'Home' },
    { name: 'Deportes', color: '#14b8a6', icon: 'Dumbbell' },
    { name: 'Belleza', color: '#d946ef', icon: 'Sparkles' },
    { name: 'Libros', color: '#3b82f6', icon: 'Book' },
    { name: 'Juguetes', color: '#f97316', icon: 'Gamepad2' },
  ];

  const categories: any[] = [];
  for (const cat of categoryData) {
    const created = await prisma.category.upsert({
      where: { organizationId_slug: { organizationId: org.id, slug: cat.name.toLowerCase().replace(/\s+/g, '-') } },
      update: {},
      create: {
        organizationId: org.id,
        name: cat.name,
        slug: cat.name.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[̀-ͯ]/g, ''),
        color: cat.color,
        icon: cat.icon,
        isActive: true,
      },
    });
    categories.push(created);
  }

  console.log(`✅ Categories: ${categories.length}`);

  // ================================================================
  // SUPPLIERS
  // ================================================================
  const supplier1 = await prisma.supplier.upsert({
    where: { id: 'sup-001' },
    update: {},
    create: {
      id: 'sup-001',
      organizationId: org.id,
      name: 'TechDistribuidor S.A.S',
      email: 'ventas@techdist.co',
      phone: '+57 1 234 5678',
      contactName: 'Pedro Ángel',
      paymentTerms: 30,
      currency: 'COP',
      rating: 4.8,
      isActive: true,
    },
  });

  // ================================================================
  // PRODUCTS
  // ================================================================
  const productData = [
    {
      name: 'iPhone 15 Pro Max 256GB',
      sku: 'APPL-IP15PM-256',
      barcode: '0194253922063',
      basePrice: 5499000,
      costPrice: 4200000,
      categoryIndex: 0,
      image: 'https://images.unsplash.com/photo-1697304447569-8f1e2a9a2a17?w=400&q=80',
      tags: ['apple', 'smartphone', 'premium'],
      totalSold: 234,
    },
    {
      name: 'Samsung Galaxy S24 Ultra',
      sku: 'SAMS-S24U-256',
      barcode: '8806095154627',
      basePrice: 4899000,
      costPrice: 3700000,
      categoryIndex: 0,
      image: 'https://images.unsplash.com/photo-1707727052979-8e53db3fe58b?w=400&q=80',
      tags: ['samsung', 'smartphone'],
      totalSold: 187,
    },
    {
      name: 'MacBook Pro M3 14"',
      sku: 'APPL-MBP-M3-14',
      barcode: '0194253934691',
      basePrice: 9499000,
      costPrice: 7500000,
      categoryIndex: 0,
      image: 'https://images.unsplash.com/photo-1611186871525-4e0fe46f37a9?w=400&q=80',
      tags: ['apple', 'laptop', 'premium'],
      totalSold: 98,
    },
    {
      name: 'AirPods Pro 2da Gen',
      sku: 'APPL-APP-2G',
      barcode: '0194253936213',
      basePrice: 999000,
      costPrice: 720000,
      categoryIndex: 0,
      image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&q=80',
      tags: ['apple', 'audio'],
      totalSold: 456,
    },
    {
      name: 'Camiseta Nike Dri-FIT',
      sku: 'NIKE-DRI-M-BLK',
      barcode: '0195867129302',
      basePrice: 89000,
      costPrice: 45000,
      categoryIndex: 1,
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80',
      tags: ['nike', 'deportivo'],
      totalSold: 891,
    },
    {
      name: 'Jeans Levi\'s 501 Original',
      sku: 'LEVI-501-32-BLU',
      barcode: '0501000400101',
      basePrice: 189000,
      costPrice: 95000,
      categoryIndex: 1,
      image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80',
      tags: ['levis', 'jeans'],
      totalSold: 432,
    },
    {
      name: 'Café Juan Valdez Premium 500g',
      sku: 'JV-PREM-500G',
      barcode: '7702127000120',
      basePrice: 35000,
      costPrice: 18000,
      categoryIndex: 2,
      image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80',
      tags: ['cafe', 'premium', 'colombia'],
      totalSold: 1234,
    },
    {
      name: 'Smart TV Samsung 65" 4K QLED',
      sku: 'SAMS-TV65-QLED',
      barcode: '8806094859232',
      basePrice: 3299000,
      costPrice: 2500000,
      categoryIndex: 0,
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&q=80',
      tags: ['samsung', 'tv', 'smart'],
      totalSold: 67,
    },
    {
      name: 'Tenis Adidas Ultraboost 22',
      sku: 'ADID-UB22-42-WHT',
      barcode: '4064044507204',
      basePrice: 459000,
      costPrice: 220000,
      categoryIndex: 4,
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
      tags: ['adidas', 'running'],
      totalSold: 678,
    },
    {
      name: 'Crema Hidratante Neutrogena',
      sku: 'NEUT-HID-200ML',
      barcode: '0070501101740',
      basePrice: 45000,
      costPrice: 22000,
      categoryIndex: 5,
      image: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?w=400&q=80',
      tags: ['neutrogena', 'skincare'],
      totalSold: 2341,
    },
    {
      name: 'Sony WH-1000XM5 Audífonos',
      sku: 'SONY-WH1K-XM5',
      barcode: '4548736132436',
      basePrice: 1299000,
      costPrice: 950000,
      categoryIndex: 0,
      image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80',
      tags: ['sony', 'audio', 'premium'],
      totalSold: 145,
    },
    {
      name: 'Silla Gamer DXRacer Formula',
      sku: 'DXR-FORM-BLK',
      barcode: '6942174307261',
      basePrice: 899000,
      costPrice: 550000,
      categoryIndex: 3,
      image: 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=400&q=80',
      tags: ['gaming', 'silla', 'ergonomica'],
      totalSold: 89,
    },
  ];

  const products: any[] = [];
  for (const pd of productData) {
    const margin = ((pd.basePrice - pd.costPrice) / pd.basePrice) * 100;
    const product = await prisma.product.upsert({
      where: { organizationId_sku: { organizationId: org.id, sku: pd.sku } },
      update: { totalSold: pd.totalSold },
      create: {
        organizationId: org.id,
        categoryId: categories[pd.categoryIndex]?.id,
        supplierId: supplier1.id,
        name: pd.name,
        slug: pd.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-'),
        sku: pd.sku,
        barcode: pd.barcode,
        image: pd.image,
        status: 'ACTIVE',
        basePrice: pd.basePrice,
        costPrice: pd.costPrice,
        margin,
        taxRate: 0.19,
        taxIncluded: false,
        trackInventory: true,
        minStockAlert: 10,
        tags: pd.tags,
        totalSold: pd.totalSold,
        totalRevenue: pd.basePrice * pd.totalSold,
        isFeatured: pd.totalSold > 300,
      },
    });
    products.push(product);

    // Inventory for warehouse
    await prisma.inventory.upsert({
      where: {
        organizationId_productId_variantId_warehouseId: {
          organizationId: org.id,
          productId: product.id,
          variantId: null as unknown as string,
          warehouseId: warehouse.id,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        branchId: mainBranch.id,
        warehouseId: warehouse.id,
        productId: product.id,
        quantity: Math.floor(Math.random() * 80) + 5,
        reservedQty: 0,
        availableQty: Math.floor(Math.random() * 80) + 5,
        minStock: 10,
        reorderPoint: 15,
        reorderQty: 50,
      },
    });
  }

  console.log(`✅ Products: ${products.length}`);

  // ================================================================
  // CUSTOMERS
  // ================================================================
  const customerData = [
    { firstName: 'Andrés', lastName: 'Hernández', email: 'andres.h@gmail.com', phone: '+57 310 234 5678', totalSpent: 12450000, totalOrders: 23 },
    { firstName: 'Laura', lastName: 'Jiménez', email: 'laura.j@hotmail.com', phone: '+57 315 345 6789', totalSpent: 8900000, totalOrders: 15 },
    { firstName: 'Miguel', lastName: 'Torres', email: 'miguel.t@yahoo.com', phone: '+57 320 456 7890', totalSpent: 5670000, totalOrders: 9 },
    { firstName: 'Valentina', lastName: 'Díaz', email: 'valen.d@gmail.com', phone: '+57 311 567 8901', totalSpent: 34500000, totalOrders: 67 },
    { firstName: 'Sebastián', lastName: 'Ruiz', email: 'seba.r@outlook.com', phone: '+57 316 678 9012', totalSpent: 2300000, totalOrders: 4 },
    { firstName: 'Daniela', lastName: 'López', email: 'dani.l@gmail.com', phone: '+57 321 789 0123', totalSpent: 18900000, totalOrders: 34 },
    { firstName: 'Santiago', lastName: 'Gómez', email: 'santi.g@proton.me', phone: '+57 312 890 1234', totalSpent: 7800000, totalOrders: 12 },
    { firstName: 'Isabella', lastName: 'Vargas', email: 'isa.v@gmail.com', phone: '+57 317 901 2345', totalSpent: 56700000, totalOrders: 112 },
    { firstName: 'Mateo', lastName: 'Castro', email: 'mateo.c@gmail.com', phone: '+57 322 012 3456', totalSpent: 3400000, totalOrders: 6 },
    { firstName: 'Sofía', lastName: 'Moreno', email: 'sofia.m@icloud.com', phone: '+57 313 123 4567', totalSpent: 22300000, totalOrders: 41 },
  ];

  const customers: any[] = [];
  for (const cd of customerData) {
    const customer = await prisma.customer.create({
      data: {
        organizationId: org.id,
        firstName: cd.firstName,
        lastName: cd.lastName,
        email: cd.email,
        phone: cd.phone,
        totalSpent: cd.totalSpent,
        totalOrders: cd.totalOrders,
        averageOrderValue: cd.totalOrders > 0 ? cd.totalSpent / cd.totalOrders : 0,
        loyaltyPoints: Math.floor(cd.totalSpent / 1000),
        lastPurchaseAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        segment: cd.totalSpent > 20000000 ? 'VIP' : cd.totalOrders > 10 ? 'LOYAL' : 'REGULAR',
        isActive: true,
        source: ['STORE', 'ONLINE', 'REFERRAL', 'SOCIAL'][Math.floor(Math.random() * 4)],
      },
    });
    customers.push(customer);
  }

  console.log(`✅ Customers: ${customers.length}`);

  // ================================================================
  // ORDERS (60 days of history)
  // ================================================================
  console.log('⏳ Generating order history...');
  let orderCount = 0;

  for (let daysAgo = 60; daysAgo >= 0; daysAgo--) {
    const ordersPerDay = Math.floor(Math.random() * 15) + 3;
    const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    for (let i = 0; i < ordersPerDay; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const itemCount = Math.floor(Math.random() * 4) + 1;
      const orderHour = Math.floor(Math.random() * 12) + 8;
      const orderTime = new Date(orderDate);
      orderTime.setHours(orderHour, Math.floor(Math.random() * 60));

      const selectedProducts: Array<{ product: any; qty: number }> = [];
      const usedIds = new Set<string>();

      for (let j = 0; j < itemCount; j++) {
        let p: any;
        do { p = products[Math.floor(Math.random() * products.length)]; }
        while (usedIds.has(p.id));
        usedIds.add(p.id);
        selectedProducts.push({ product: p, qty: Math.floor(Math.random() * 3) + 1 });
      }

      const subtotal = selectedProducts.reduce((sum, { product, qty }) => sum + product.basePrice * qty, 0);
      const taxAmount = subtotal * 0.19;
      const total = subtotal + taxAmount;
      const orderNumber = `ORD-${orderDate.getFullYear()}${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(++orderCount).padStart(5, '0')}`;

      const paymentMethods = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'OTHER'];
      const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)] as any;

      await prisma.order.create({
        data: {
          organizationId: org.id,
          branchId: mainBranch.id,
          customerId: Math.random() > 0.3 ? customer.id : null,
          createdById: [adminUser.id, managerUser.id, cashierUser.id][Math.floor(Math.random() * 3)],
          number: orderNumber,
          status: 'DELIVERED',
          channel: Math.random() > 0.2 ? 'POS' : 'ONLINE',
          subtotal,
          taxAmount,
          total,
          paidAmount: total,
          completedAt: orderTime,
          createdAt: orderTime,
          updatedAt: orderTime,
          items: {
            create: selectedProducts.map(({ product, qty }) => ({
              productId: product.id,
              name: product.name,
              sku: product.sku,
              quantity: qty,
              unitPrice: product.basePrice,
              costPrice: product.costPrice,
              taxRate: 0.19,
              taxAmount: product.basePrice * qty * 0.19,
              subtotal: product.basePrice * qty,
              total: product.basePrice * qty * 1.19,
            })),
          },
          payments: {
            create: {
              method,
              amount: total,
              currency: 'COP',
              status: 'COMPLETED',
              processedAt: orderTime,
              createdAt: orderTime,
            },
          },
        },
      });
    }
  }

  console.log(`✅ Orders: ${orderCount}`);

  // ================================================================
  // AI INSIGHTS (initial)
  // ================================================================
  await prisma.aIInsight.createMany({
    data: [
      {
        organizationId: org.id,
        type: 'opportunity',
        title: 'Oportunidad: iPhone 15 tiene demanda creciente',
        description: 'Las ventas de iPhone 15 Pro Max aumentaron 34% en los últimos 7 días. Considera aumentar el stock.',
        score: 9,
        action: 'Hacer pedido de 20 unidades al proveedor esta semana',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: org.id,
        type: 'warning',
        title: 'Stock crítico: 3 productos por agotarse',
        description: 'AirPods Pro, Crema Neutrogena y Café Juan Valdez tienen menos de 5 unidades disponibles.',
        score: 8,
        action: 'Emitir órdenes de compra para estos productos hoy',
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: org.id,
        type: 'trend',
        title: 'Tendencia: Pico de ventas los viernes 6-8pm',
        description: 'Tus ventas muestran un patrón consistente: 40% más altas los viernes por la tarde.',
        score: 7,
        action: 'Asigna más personal de caja los viernes de 5pm a 9pm',
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: org.id,
        type: 'alert',
        title: 'Margen bajo detectado: Silla Gamer DXRacer',
        description: 'Este producto tiene un margen del 38%, por debajo de tu promedio del 45%.',
        score: 6,
        action: 'Revisar precio de compra o aumentar precio de venta en 8%',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // ================================================================
  // AUTOMATIONS
  // ================================================================
  await prisma.automation.createMany({
    data: [
      {
        organizationId: org.id,
        name: 'Alerta de stock bajo',
        description: 'Enviar email al admin cuando un producto tenga menos de 10 unidades',
        trigger: { event: 'inventory.low_stock', threshold: 10 },
        conditions: [{ field: 'quantity', operator: 'less_than', value: 10 }],
        actions: [{ type: 'send_email', to: 'admin@nexuserp.com', template: 'low_stock_alert' }],
        isActive: true,
      },
      {
        organizationId: org.id,
        name: 'Reporte diario de ventas',
        description: 'Enviar resumen de ventas cada día a las 8pm',
        trigger: { event: 'schedule', cron: '0 20 * * *' },
        conditions: [],
        actions: [{ type: 'send_email', to: 'admin@nexuserp.com', template: 'daily_sales_report' }],
        isActive: true,
      },
      {
        organizationId: org.id,
        name: 'Fidelización VIP',
        description: 'Enviar cupón de descuento a clientes que acumulen 50+ órdenes',
        trigger: { event: 'order.completed' },
        conditions: [{ field: 'customer.totalOrders', operator: 'equals', value: 50 }],
        actions: [{ type: 'send_whatsapp', template: 'vip_discount_coupon', discount: 15 }],
        isActive: true,
      },
    ],
  });

  console.log('✅ Automations & AI Insights seeded');
  console.log('\n🎉 Database seeded successfully!');
  console.log('\nCredentials:');
  console.log('  Admin:   admin@nexuserp.com / Admin123!');
  console.log('  Manager: manager@nexuserp.com / Admin123!');
  console.log('  Cajero:  cajero@nexuserp.com / Admin123!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
