-- ================================================================
-- NEXUS ERP — SQL SEED DATA
-- Run this in Supabase SQL Editor
-- ================================================================

-- ----------------------------------------------------------------
-- ORGANIZATION
-- ----------------------------------------------------------------
INSERT INTO organizations (id, name, slug, email, phone, address, city, country, timezone, currency, "currencySymbol", language, "businessType", "taxId", "taxRate", "isActive", settings, theme, "createdAt", "updatedAt") VALUES
('org_demo_001', 'Nexus Demo Store', 'nexus-demo', 'demo@nexuserp.com', '+57 310 555 0100', 'Calle 93 #13-24, Bogotá', 'Bogotá', 'CO', 'America/Bogota', 'COP', '$', 'es', 'RETAIL', '900123456-7', 0.19, true, '{}', '{}', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------
-- SUBSCRIPTION
-- ----------------------------------------------------------------
INSERT INTO subscriptions (id, "organizationId", plan, status, seats, price, "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt") VALUES
('sub_demo_001', 'org_demo_001', 'PROFESSIONAL', 'ACTIVE', 10, 149000, NOW(), NOW() + INTERVAL '30 days', NOW(), NOW())
ON CONFLICT ("organizationId") DO NOTHING;

-- ----------------------------------------------------------------
-- BRANCHES
-- ----------------------------------------------------------------
INSERT INTO branches (id, "organizationId", name, code, address, city, phone, "isMain", "isActive", settings, "createdAt", "updatedAt") VALUES
('br_main_001', 'org_demo_001', 'Sede Principal — Bogotá', 'BOG-001', 'Calle 93 #13-24', 'Bogotá', '+57 310 555 0100', true,  true, '{}', NOW(), NOW()),
('br_med_001',  'org_demo_001', 'Sucursal Medellín',       'MED-001', 'Av. El Poblado #43-50', 'Medellín', '+57 320 555 0200', false, true, '{}', NOW(), NOW())
ON CONFLICT ("organizationId", code) DO NOTHING;

-- ----------------------------------------------------------------
-- USERS  (password = Admin123!)
-- ----------------------------------------------------------------
INSERT INTO users (id, "organizationId", "branchId", email, name, "passwordHash", role, status, "emailVerified", "salesGoal", "commissionRate", permissions, preferences, "createdAt", "updatedAt") VALUES
('usr_admin_001', 'org_demo_001', 'br_main_001', 'admin@nexuserp.com',   'Carlos Rodríguez', '$2a$12$VNmci7vvahkHpavhUTfSiuJRmEf8LPDsTDcUimpH3fm5/vKxlmY/a', 'ADMIN',   'ACTIVE', NOW(), 50000000, 0.05, '[]', '{}', NOW(), NOW()),
('usr_mgr_001',  'org_demo_001', 'br_main_001', 'manager@nexuserp.com', 'María García',     '$2a$12$VNmci7vvahkHpavhUTfSiuJRmEf8LPDsTDcUimpH3fm5/vKxlmY/a', 'MANAGER', 'ACTIVE', NOW(), 30000000, 0.04, '[]', '{}', NOW(), NOW()),
('usr_caj_001',  'org_demo_001', 'br_main_001', 'cajero@nexuserp.com',  'Juan Martínez',    '$2a$12$VNmci7vvahkHpavhUTfSiuJRmEf8LPDsTDcUimpH3fm5/vKxlmY/a', 'CASHIER', 'ACTIVE', NOW(), 10000000, 0.02, '[]', '{}', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- ----------------------------------------------------------------
-- WAREHOUSE
-- ----------------------------------------------------------------
INSERT INTO warehouses (id, "organizationId", "branchId", name, code, address, "isDefault", "isActive", "createdAt", "updatedAt") VALUES
('wh_main_001', 'org_demo_001', 'br_main_001', 'Bodega Principal', 'WH-001', 'Zona Industrial Bogotá', true, true, NOW(), NOW())
ON CONFLICT ("organizationId", code) DO NOTHING;

-- ----------------------------------------------------------------
-- CATEGORIES
-- ----------------------------------------------------------------
INSERT INTO categories (id, "organizationId", name, slug, color, icon, "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
('cat_001', 'org_demo_001', 'Electrónica',  'electronica',  '#6366f1', 'Zap',         1, true, NOW(), NOW()),
('cat_002', 'org_demo_001', 'Ropa y Moda',  'ropa-y-moda',  '#ec4899', 'Shirt',       2, true, NOW(), NOW()),
('cat_003', 'org_demo_001', 'Alimentos',    'alimentos',    '#22c55e', 'ShoppingBag', 3, true, NOW(), NOW()),
('cat_004', 'org_demo_001', 'Hogar',        'hogar',        '#f59e0b', 'Home',        4, true, NOW(), NOW()),
('cat_005', 'org_demo_001', 'Deportes',     'deportes',     '#14b8a6', 'Dumbbell',    5, true, NOW(), NOW()),
('cat_006', 'org_demo_001', 'Belleza',      'belleza',      '#d946ef', 'Sparkles',    6, true, NOW(), NOW()),
('cat_007', 'org_demo_001', 'Libros',       'libros',       '#3b82f6', 'Book',        7, true, NOW(), NOW()),
('cat_008', 'org_demo_001', 'Juguetes',     'juguetes',     '#f97316', 'Gamepad2',    8, true, NOW(), NOW())
ON CONFLICT ("organizationId", slug) DO NOTHING;

-- ----------------------------------------------------------------
-- SUPPLIER
-- ----------------------------------------------------------------
INSERT INTO suppliers (id, "organizationId", name, email, phone, "contactName", "paymentTerms", currency, rating, "isActive", metadata, "createdAt", "updatedAt") VALUES
('sup-001', 'org_demo_001', 'TechDistribuidor S.A.S', 'ventas@techdist.co', '+57 1 234 5678', 'Pedro Ángel', 30, 'COP', 4.8, true, '{}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- PRODUCTS
-- ----------------------------------------------------------------
INSERT INTO products (id, "organizationId", "categoryId", "supplierId", name, slug, sku, barcode, image, status, "basePrice", "costPrice", margin, "taxRate", "taxIncluded", "trackInventory", "minStockAlert", tags, attributes, metadata, "totalSold", "totalRevenue", "isFeatured", "createdAt", "updatedAt") VALUES
('prd_001', 'org_demo_001', 'cat_001', 'sup-001', 'iPhone 15 Pro Max 256GB',    'iphone-15-pro-max-256gb',    'APPL-IP15PM-256', '0194253922063', 'https://images.unsplash.com/photo-1697304447569-8f1e2a9a2a17?w=400&q=80', 'ACTIVE', 5499000, 4200000, 23.62, 0.19, false, true, 10, ARRAY['apple','smartphone','premium'], '{}', '{}', 234,  1286766000, false, NOW(), NOW()),
('prd_002', 'org_demo_001', 'cat_001', 'sup-001', 'Samsung Galaxy S24 Ultra',   'samsung-galaxy-s24-ultra',   'SAMS-S24U-256',   '8806095154627', 'https://images.unsplash.com/photo-1707727052979-8e53db3fe58b?w=400&q=80', 'ACTIVE', 4899000, 3700000, 24.49, 0.19, false, true, 10, ARRAY['samsung','smartphone'], '{}', '{}', 187,  916113000,  false, NOW(), NOW()),
('prd_003', 'org_demo_001', 'cat_001', 'sup-001', 'MacBook Pro M3 14"',         'macbook-pro-m3-14',          'APPL-MBP-M3-14',  '0194253934691', 'https://images.unsplash.com/photo-1611186871525-4e0fe46f37a9?w=400&q=80', 'ACTIVE', 9499000, 7500000, 21.05, 0.19, false, true, 10, ARRAY['apple','laptop','premium'], '{}', '{}', 98,   930902000,  true,  NOW(), NOW()),
('prd_004', 'org_demo_001', 'cat_001', 'sup-001', 'AirPods Pro 2da Gen',        'airpods-pro-2da-gen',        'APPL-APP-2G',     '0194253936213', 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&q=80', 'ACTIVE',  999000,  720000, 27.93, 0.19, false, true, 10, ARRAY['apple','audio'], '{}', '{}', 456,  455544000,  true,  NOW(), NOW()),
('prd_005', 'org_demo_001', 'cat_002', 'sup-001', 'Camiseta Nike Dri-FIT',      'camiseta-nike-dri-fit',      'NIKE-DRI-M-BLK',  '0195867129302', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80', 'ACTIVE',   89000,   45000, 49.44, 0.19, false, true, 10, ARRAY['nike','deportivo'], '{}', '{}', 891,  79299000,   true,  NOW(), NOW()),
('prd_006', 'org_demo_001', 'cat_002', 'sup-001', 'Jeans Levi''s 501 Original', 'jeans-levis-501-original',   'LEVI-501-32-BLU', '0501000400101', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80', 'ACTIVE',  189000,   95000, 49.74, 0.19, false, true, 10, ARRAY['levis','jeans'], '{}', '{}', 432,  81648000,   true,  NOW(), NOW()),
('prd_007', 'org_demo_001', 'cat_003', 'sup-001', 'Café Juan Valdez Premium 500g','cafe-juan-valdez-premium-500g','JV-PREM-500G', '7702127000120', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80', 'ACTIVE',   35000,   18000, 48.57, 0.19, false, true, 10, ARRAY['cafe','premium','colombia'], '{}', '{}', 1234, 43190000,   true,  NOW(), NOW()),
('prd_008', 'org_demo_001', 'cat_001', 'sup-001', 'Smart TV Samsung 65" 4K QLED','smart-tv-samsung-65-4k-qled','SAMS-TV65-QLED','8806094859232', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&q=80', 'ACTIVE', 3299000, 2500000, 24.22, 0.19, false, true, 10, ARRAY['samsung','tv','smart'], '{}', '{}', 67,   221033000,  false, NOW(), NOW()),
('prd_009', 'org_demo_001', 'cat_005', 'sup-001', 'Tenis Adidas Ultraboost 22', 'tenis-adidas-ultraboost-22', 'ADID-UB22-42-WHT','4064044507204','https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', 'ACTIVE',  459000,  220000, 52.07, 0.19, false, true, 10, ARRAY['adidas','running'], '{}', '{}', 678,  311202000,  true,  NOW(), NOW()),
('prd_010', 'org_demo_001', 'cat_006', 'sup-001', 'Crema Hidratante Neutrogena','crema-hidratante-neutrogena','NEUT-HID-200ML', '0070501101740', 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?w=400&q=80', 'ACTIVE',   45000,   22000, 51.11, 0.19, false, true, 10, ARRAY['neutrogena','skincare'], '{}', '{}', 2341, 105345000,  true,  NOW(), NOW()),
('prd_011', 'org_demo_001', 'cat_001', 'sup-001', 'Sony WH-1000XM5 Audífonos', 'sony-wh-1000xm5-audifonos', 'SONY-WH1K-XM5',  '4548736132436', 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80', 'ACTIVE', 1299000,  950000, 26.87, 0.19, false, true, 10, ARRAY['sony','audio','premium'], '{}', '{}', 145,  188355000,  false, NOW(), NOW()),
('prd_012', 'org_demo_001', 'cat_004', 'sup-001', 'Silla Gamer DXRacer Formula','silla-gamer-dxracer-formula','DXR-FORM-BLK',  '6942174307261', 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=400&q=80', 'ACTIVE',  899000,  550000, 38.82, 0.19, false, true, 10, ARRAY['gaming','silla','ergonomica'], '{}', '{}', 89,   80011000,   false, NOW(), NOW())
ON CONFLICT ("organizationId", sku) DO NOTHING;

-- ----------------------------------------------------------------
-- INVENTORY
-- ----------------------------------------------------------------
INSERT INTO inventory (id, "organizationId", "branchId", "warehouseId", "productId", quantity, "reservedQty", "availableQty", "minStock", "reorderPoint", "reorderQty", "updatedAt") VALUES
('inv_001', 'org_demo_001', 'br_main_001', 'wh_main_001', 'prd_001', 42, 0, 42, 10, 15, 50, NOW()),
('inv_002', 'org_demo_001', 'br_main_001', 'wh_main_001', 'prd_002', 35, 0, 35, 10, 15, 50, NOW()),
('inv_003', 'org_demo_001', 'br_main_001', 'wh_main_001', 'prd_003', 18, 0, 18, 10, 15, 50, NOW()),
('inv_004', 'org_demo_001', 'br_main_001', 'wh_main_001', 'prd_004',  4, 0,  4, 10, 15, 50, NOW()),
('inv_005', 'org_demo_001', 'br_main_001', 'wh_main_001', 'prd_005', 67, 0, 67, 10, 15, 50, NOW()),
('inv_006', 'org_demo_001', 'br_main_001', 'wh_main_001', 'prd_006', 53, 0, 53, 10, 15, 50, NOW()),
('inv_007', 'org_demo_001', 'br_main_001', 'wh_main_001', 'prd_007',  3, 0,  3, 10, 15, 50, NOW()),
('inv_008', 'org_demo_001', 'br_main_001', 'wh_main_001', 'prd_008', 22, 0, 22, 10, 15, 50, NOW()),
('inv_009', 'org_demo_001', 'br_main_001', 'wh_main_001', 'prd_009', 71, 0, 71, 10, 15, 50, NOW()),
('inv_010', 'org_demo_001', 'br_main_001', 'wh_main_001', 'prd_010',  7, 0,  7, 10, 15, 50, NOW()),
('inv_011', 'org_demo_001', 'br_main_001', 'wh_main_001', 'prd_011', 29, 0, 29, 10, 15, 50, NOW()),
('inv_012', 'org_demo_001', 'br_main_001', 'wh_main_001', 'prd_012', 14, 0, 14, 10, 15, 50, NOW())
ON CONFLICT ("organizationId", "productId", "variantId", "warehouseId") DO NOTHING;

-- ----------------------------------------------------------------
-- CUSTOMERS
-- ----------------------------------------------------------------
INSERT INTO customers (id, "organizationId", "firstName", "lastName", email, phone, "totalSpent", "totalOrders", "averageOrderValue", "loyaltyPoints", "lastPurchaseAt", segment, "isActive", source, metadata, "createdAt", "updatedAt") VALUES
('cust_001', 'org_demo_001', 'Andrés',    'Hernández', 'andres.h@gmail.com',    '+57 310 234 5678', 12450000, 23,  541304, 12450, NOW() - INTERVAL '5 days',  'LOYAL',   true, 'STORE',    '{}', NOW(), NOW()),
('cust_002', 'org_demo_001', 'Laura',     'Jiménez',   'laura.j@hotmail.com',   '+57 315 345 6789',  8900000, 15,  593333,  8900, NOW() - INTERVAL '10 days', 'LOYAL',   true, 'ONLINE',   '{}', NOW(), NOW()),
('cust_003', 'org_demo_001', 'Miguel',    'Torres',    'miguel.t@yahoo.com',    '+57 320 456 7890',  5670000,  9,  630000,  5670, NOW() - INTERVAL '20 days', 'REGULAR', true, 'STORE',    '{}', NOW(), NOW()),
('cust_004', 'org_demo_001', 'Valentina', 'Díaz',      'valen.d@gmail.com',     '+57 311 567 8901', 34500000, 67,  514925, 34500, NOW() - INTERVAL '2 days',  'VIP',     true, 'REFERRAL', '{}', NOW(), NOW()),
('cust_005', 'org_demo_001', 'Sebastián', 'Ruiz',      'seba.r@outlook.com',    '+57 316 678 9012',  2300000,  4,  575000,  2300, NOW() - INTERVAL '25 days', 'REGULAR', true, 'SOCIAL',   '{}', NOW(), NOW()),
('cust_006', 'org_demo_001', 'Daniela',   'López',     'dani.l@gmail.com',      '+57 321 789 0123', 18900000, 34,  555882, 18900, NOW() - INTERVAL '7 days',  'LOYAL',   true, 'STORE',    '{}', NOW(), NOW()),
('cust_007', 'org_demo_001', 'Santiago',  'Gómez',     'santi.g@proton.me',     '+57 312 890 1234',  7800000, 12,  650000,  7800, NOW() - INTERVAL '15 days', 'LOYAL',   true, 'ONLINE',   '{}', NOW(), NOW()),
('cust_008', 'org_demo_001', 'Isabella',  'Vargas',    'isa.v@gmail.com',       '+57 317 901 2345', 56700000, 112, 506250, 56700, NOW() - INTERVAL '1 day',   'VIP',     true, 'STORE',    '{}', NOW(), NOW()),
('cust_009', 'org_demo_001', 'Mateo',     'Castro',    'mateo.c@gmail.com',     '+57 322 012 3456',  3400000,  6,  566666,  3400, NOW() - INTERVAL '18 days', 'REGULAR', true, 'SOCIAL',   '{}', NOW(), NOW()),
('cust_010', 'org_demo_001', 'Sofía',     'Moreno',    'sofia.m@icloud.com',    '+57 313 123 4567', 22300000, 41,  543902, 22300, NOW() - INTERVAL '4 days',  'VIP',     true, 'ONLINE',   '{}', NOW(), NOW());

-- ----------------------------------------------------------------
-- ORDERS + ORDER ITEMS + PAYMENTS  (60 days of history via PL/pgSQL)
-- ----------------------------------------------------------------
DO $$
DECLARE
  v_day         INT;
  v_order_date  TIMESTAMPTZ;
  v_orders_per_day INT;
  v_order_idx   INT;
  v_order_id    TEXT;
  v_order_num   TEXT;
  v_order_count INT := 0;
  v_cust_ids    TEXT[] := ARRAY['cust_001','cust_002','cust_003','cust_004','cust_005',
                                 'cust_006','cust_007','cust_008','cust_009','cust_010'];
  v_user_ids    TEXT[] := ARRAY['usr_admin_001','usr_mgr_001','usr_caj_001'];
  v_prod_ids    TEXT[] := ARRAY['prd_001','prd_002','prd_003','prd_004','prd_005',
                                 'prd_006','prd_007','prd_008','prd_009','prd_010','prd_011','prd_012'];
  v_prod_prices FLOAT[] := ARRAY[5499000,4899000,9499000,999000,89000,
                                   189000,35000,3299000,459000,45000,1299000,899000];
  v_prod_costs  FLOAT[] := ARRAY[4200000,3700000,7500000,720000,45000,
                                   95000,18000,2500000,220000,22000,950000,550000];
  v_prod_names  TEXT[]  := ARRAY['iPhone 15 Pro Max 256GB','Samsung Galaxy S24 Ultra',
                                   'MacBook Pro M3 14"','AirPods Pro 2da Gen',
                                   'Camiseta Nike Dri-FIT','Jeans Levi''s 501',
                                   'Café Juan Valdez 500g','Smart TV Samsung 65"',
                                   'Tenis Adidas Ultraboost','Crema Neutrogena',
                                   'Sony WH-1000XM5','Silla Gamer DXRacer'];
  v_prod_skus   TEXT[]  := ARRAY['APPL-IP15PM-256','SAMS-S24U-256','APPL-MBP-M3-14',
                                   'APPL-APP-2G','NIKE-DRI-M-BLK','LEVI-501-32-BLU',
                                   'JV-PREM-500G','SAMS-TV65-QLED','ADID-UB22-42-WHT',
                                   'NEUT-HID-200ML','SONY-WH1K-XM5','DXR-FORM-BLK'];
  v_methods     TEXT[]  := ARRAY['CASH','CREDIT_CARD','DEBIT_CARD','OTHER'];
  -- item picks
  v_p1 INT; v_p2 INT;
  v_q1 INT; v_q2 INT;
  v_subtotal FLOAT; v_tax FLOAT; v_total FLOAT;
  v_cust_id TEXT;
  v_user_id TEXT;
  v_method  TEXT;
  v_item_id TEXT;
  v_pay_id  TEXT;
  v_month_str TEXT;
  v_hour    INT;
BEGIN
  FOR v_day IN REVERSE 60..0 LOOP
    v_order_date    := NOW() - (v_day || ' days')::INTERVAL;
    v_orders_per_day := 5 + (random() * 12)::INT;   -- 5‒17 orders/day

    FOR v_order_idx IN 1..v_orders_per_day LOOP
      v_order_count := v_order_count + 1;

      -- Build order number: ORD-YYYYMM-NNNNN
      v_month_str := TO_CHAR(v_order_date, 'YYYYMM');
      v_order_num := 'ORD-' || v_month_str || '-' || LPAD(v_order_count::TEXT, 5, '0');
      v_order_id  := 'ord_' || v_order_count::TEXT;

      -- Random hour 8–19
      v_hour := 8 + (random() * 11)::INT;
      v_order_date := DATE_TRUNC('day', v_order_date)
                      + (v_hour || ' hours')::INTERVAL
                      + ((random() * 59)::INT || ' minutes')::INTERVAL;

      -- Pick 1‒2 random products (simple: just 2 picks, sometimes same → dedup)
      v_p1 := 1 + (random() * 11)::INT;
      v_p2 := 1 + (random() * 11)::INT;

      v_q1 := 1 + (random() * 2)::INT;
      v_q2 := 1 + (random() * 2)::INT;

      -- Subtotal (two items, or one if same index)
      IF v_p1 = v_p2 THEN
        v_subtotal := v_prod_prices[v_p1] * (v_q1 + v_q2);
      ELSE
        v_subtotal := v_prod_prices[v_p1] * v_q1 + v_prod_prices[v_p2] * v_q2;
      END IF;
      v_tax   := v_subtotal * 0.19;
      v_total := v_subtotal + v_tax;

      -- Random customer (30% anonymous)
      IF random() > 0.3 THEN
        v_cust_id := v_cust_ids[ 1 + (random() * 9)::INT ];
      ELSE
        v_cust_id := NULL;
      END IF;

      v_user_id := v_user_ids[ 1 + (random() * 2)::INT ];
      v_method  := v_methods[  1 + (random() * 3)::INT ];

      -- Insert Order
      INSERT INTO orders (id, "organizationId", "branchId", "customerId", "createdById",
        number, status, channel, subtotal, "taxAmount", total, "paidAmount",
        "completedAt", "createdAt", "updatedAt", metadata)
      VALUES (
        v_order_id, 'org_demo_001', 'br_main_001', v_cust_id, v_user_id,
        v_order_num, 'DELIVERED',
        CASE WHEN random() > 0.2 THEN 'POS' ELSE 'ONLINE' END,
        v_subtotal, v_tax, v_total, v_total,
        v_order_date, v_order_date, v_order_date, '{}'
      );

      -- Insert Order Items
      v_item_id := 'itm_' || v_order_count::TEXT || '_1';
      INSERT INTO order_items (id, "orderId", "productId", name, sku, quantity,
        "unitPrice", "costPrice", "taxRate", "taxAmount", subtotal, total, metadata, "createdAt")
      VALUES (
        v_item_id, v_order_id, v_prod_ids[v_p1],
        v_prod_names[v_p1], v_prod_skus[v_p1], v_q1,
        v_prod_prices[v_p1], v_prod_costs[v_p1],
        0.19, v_prod_prices[v_p1] * v_q1 * 0.19,
        v_prod_prices[v_p1] * v_q1,
        v_prod_prices[v_p1] * v_q1 * 1.19,
        '{}', v_order_date
      );

      IF v_p1 <> v_p2 THEN
        v_item_id := 'itm_' || v_order_count::TEXT || '_2';
        INSERT INTO order_items (id, "orderId", "productId", name, sku, quantity,
          "unitPrice", "costPrice", "taxRate", "taxAmount", subtotal, total, metadata, "createdAt")
        VALUES (
          v_item_id, v_order_id, v_prod_ids[v_p2],
          v_prod_names[v_p2], v_prod_skus[v_p2], v_q2,
          v_prod_prices[v_p2], v_prod_costs[v_p2],
          0.19, v_prod_prices[v_p2] * v_q2 * 0.19,
          v_prod_prices[v_p2] * v_q2,
          v_prod_prices[v_p2] * v_q2 * 1.19,
          '{}', v_order_date
        );
      END IF;

      -- Insert Payment
      v_pay_id := 'pay_' || v_order_count::TEXT;
      INSERT INTO payments (id, "orderId", method, amount, currency, status,
        "processedAt", "createdAt")
      VALUES (
        v_pay_id, v_order_id, v_method::"PaymentMethod",
        v_total, 'COP', 'COMPLETED',
        v_order_date, v_order_date
      );

    END LOOP;
  END LOOP;

  RAISE NOTICE 'Inserted % orders', v_order_count;
END $$;

-- ----------------------------------------------------------------
-- AI INSIGHTS
-- ----------------------------------------------------------------
INSERT INTO ai_insights (id, "organizationId", type, title, description, score, action, "expiresAt", "createdAt") VALUES
('ai_001', 'org_demo_001', 'opportunity', 'Oportunidad: iPhone 15 tiene demanda creciente',
 'Las ventas de iPhone 15 Pro Max aumentaron 34% en los últimos 7 días. Considera aumentar el stock.',
 9, 'Hacer pedido de 20 unidades al proveedor esta semana',
 NOW() + INTERVAL '7 days', NOW()),
('ai_002', 'org_demo_001', 'warning', 'Stock crítico: 3 productos por agotarse',
 'AirPods Pro, Crema Neutrogena y Café Juan Valdez tienen menos de 5 unidades disponibles.',
 8, 'Emitir órdenes de compra para estos productos hoy',
 NOW() + INTERVAL '3 days', NOW()),
('ai_003', 'org_demo_001', 'trend', 'Tendencia: Pico de ventas los viernes 6-8pm',
 'Tus ventas muestran un patrón consistente: 40% más altas los viernes por la tarde.',
 7, 'Asigna más personal de caja los viernes de 5pm a 9pm',
 NOW() + INTERVAL '14 days', NOW()),
('ai_004', 'org_demo_001', 'alert', 'Margen bajo detectado: Silla Gamer DXRacer',
 'Este producto tiene un margen del 38%, por debajo de tu promedio del 45%.',
 6, 'Revisar precio de compra o aumentar precio de venta en 8%',
 NOW() + INTERVAL '30 days', NOW());

-- ----------------------------------------------------------------
-- AUTOMATIONS
-- ----------------------------------------------------------------
INSERT INTO automations (id, "organizationId", name, description, trigger, conditions, actions, "isActive", "createdAt", "updatedAt") VALUES
('auto_001', 'org_demo_001', 'Alerta de stock bajo',
 'Enviar email al admin cuando un producto tenga menos de 10 unidades',
 '{"event":"inventory.low_stock","threshold":10}',
 '[{"field":"quantity","operator":"less_than","value":10}]',
 '[{"type":"send_email","to":"admin@nexuserp.com","template":"low_stock_alert"}]',
 true, NOW(), NOW()),
('auto_002', 'org_demo_001', 'Reporte diario de ventas',
 'Enviar resumen de ventas cada día a las 8pm',
 '{"event":"schedule","cron":"0 20 * * *"}',
 '[]',
 '[{"type":"send_email","to":"admin@nexuserp.com","template":"daily_sales_report"}]',
 true, NOW(), NOW()),
('auto_003', 'org_demo_001', 'Fidelización VIP',
 'Enviar cupón de descuento a clientes que acumulen 50+ órdenes',
 '{"event":"order.completed"}',
 '[{"field":"customer.totalOrders","operator":"equals","value":50}]',
 '[{"type":"send_whatsapp","template":"vip_discount_coupon","discount":15}]',
 true, NOW(), NOW());

-- ================================================================
-- Done! Credentials:
--   Admin:   admin@nexuserp.com  / Admin123!
--   Manager: manager@nexuserp.com / Admin123!
--   Cajero:  cajero@nexuserp.com  / Admin123!
-- ================================================================
