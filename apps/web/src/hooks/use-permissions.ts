'use client';

import { useSession } from 'next-auth/react';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'SUPERVISOR'
  | 'CASHIER'
  | 'EMPLOYEE'
  | 'VIEWER';

const ROLE_LEVEL: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  ADMIN:        90,
  MANAGER:      70,
  SUPERVISOR:   60,
  CASHIER:      40,
  EMPLOYEE:     30,
  VIEWER:       10,
};

function level(role: string | undefined): number {
  return ROLE_LEVEL[(role as UserRole) ?? 'VIEWER'] ?? 10;
}

export function usePermissions() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as UserRole | undefined;
  const userLevel = level(role);

  const can = (minRole: UserRole) => userLevel >= level(minRole);

  return {
    role,
    userLevel,
    can,

    // ── Órdenes ──────────────────────────────────────────────
    canCreateOrder:   can('CASHIER'),
    canCancelOrder:   can('SUPERVISOR'),
    canViewOrders:    true,

    // ── Productos ─────────────────────────────────────────────
    canViewProducts:  true,
    canEditProduct:   can('MANAGER'),
    canDeleteProduct: can('MANAGER'),
    canBulkImport:    can('ADMIN'),

    // ── Inventario ────────────────────────────────────────────
    canViewInventory: true,
    canAdjustStock:   can('MANAGER'),

    // ── Clientes / CRM ────────────────────────────────────────
    canViewCustomers:   true,
    canCreateCustomer:  can('CASHIER'),
    canEditCustomer:    can('CASHIER'),
    canDeleteCustomer:  can('MANAGER'),

    // ── Facturas ─────────────────────────────────────────────
    canViewInvoices:  can('SUPERVISOR'),
    canPayInvoice:    can('SUPERVISOR'),

    // ── Catálogo (categorías & proveedores) ───────────────────
    canManageCatalog: can('MANAGER'),
    canDeleteCatalog: can('ADMIN'),

    // ── Analíticas & Reportes ─────────────────────────────────
    canViewAnalytics: can('SUPERVISOR'),

    // ── IA ────────────────────────────────────────────────────
    canUseAI: can('SUPERVISOR'),

    // ── Usuarios ──────────────────────────────────────────────
    canViewUsers:   can('MANAGER'),
    canEditUser:    can('MANAGER'),
    canInviteUser:  can('ADMIN'),

    // ── Organización / Configuración ──────────────────────────
    canManageOrg:  can('ADMIN'),
    canSuperAdmin: can('SUPER_ADMIN'),

    // ── POS ───────────────────────────────────────────────────
    canUsePOS: can('CASHIER'),

    // ── Sedes ─────────────────────────────────────────────────
    canViewBranches:   can('MANAGER'),
    canManageBranches: can('ADMIN'),

    // ── Caja ──────────────────────────────────────────────────
    canViewCashRegister: can('CASHIER'),
    canManageCashRegisters: can('ADMIN'),

    // ── Auditoría ─────────────────────────────────────────────
    canViewAuditLog: can('ADMIN'),
  };
}
