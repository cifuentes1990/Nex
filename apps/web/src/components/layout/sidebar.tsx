'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Package, BarChart3,
  Users, FileText, Brain, Settings, ChevronLeft,
  ChevronRight, Zap, Store, Truck, Tag,
  CreditCard, Boxes, ClipboardList, TicketCheck,
  Globe, LogOut, Moon, Sun, Bike,
  MonitorSmartphone, Instagram, MessageCircle,
  Building2, Banknote, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { signOut, useSession } from 'next-auth/react';
import { usePermissions } from '@/hooks/use-permissions';

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  SUPERVISOR: 'Supervisor',
  CASHIER: 'Cajero',
  EMPLOYEE: 'Empleado',
  VIEWER: 'Visualizador',
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const perms = usePermissions();

  useEffect(() => setMounted(true), []);

  const NAV_GROUPS = [
    {
      label: 'Principal',
      items: [
        { href: '/dashboard',    label: 'Dashboard',       icon: LayoutDashboard, show: true },
        { href: '/pos',          label: 'Registrar Venta', icon: Store,           badge: 'POS', show: perms.canUsePOS },
        { href: '/orders',       label: 'Historial ventas',icon: ShoppingCart,    show: true },
        { href: '/online-orders',label: 'Pedidos Online',  icon: MonitorSmartphone, badge: 'NEW', show: true },
        { href: '/invoices',     label: 'Facturación',     icon: FileText,        show: perms.canViewInvoices },
      ].filter(i => i.show),
    },
    {
      label: 'Catálogo',
      items: [
        { href: '/products',   label: 'Productos',    icon: Package, show: true },
        { href: '/inventory',  label: 'Inventario',   icon: Boxes,   show: true },
        { href: '/categories', label: 'Categorías',   icon: Tag,     show: perms.canManageCatalog },
        { href: '/suppliers',       label: 'Proveedores',     icon: Truck,         show: perms.canManageCatalog },
        { href: '/purchase-orders', label: 'Órdenes de Compra', icon: ShoppingCart,  show: perms.canManageCatalog },
      ].filter(i => i.show),
    },
    {
      label: 'Canales de Venta',
      items: [
        { href: '/online-store', label: 'Tienda Online',  icon: Globe,           show: perms.canManageCatalog },
        { href: '/shipping',     label: 'Envíos',          icon: Bike,            show: perms.canViewInvoices },
        { href: '/whatsapp',     label: 'WhatsApp Ventas', icon: MessageCircle,   show: perms.canViewAnalytics },
        { href: '/instagram',    label: 'Instagram Shop',  icon: Instagram,       show: perms.canViewAnalytics },
      ].filter(i => i.show),
    },
    {
      label: 'Comercial',
      items: [
        { href: '/customers',  label: 'Clientes (CRM)', icon: Users,        show: true },
        { href: '/analytics',  label: 'Analíticas',     icon: BarChart3,    show: perms.canViewAnalytics },
        { href: '/reports',    label: 'Reportes',        icon: ClipboardList,show: perms.canViewAnalytics },
      ].filter(i => i.show),
    },
    {
      label: 'Inteligencia',
      items: [
        { href: '/ai',          label: 'Asistente IA',     icon: Brain, badge: 'IA',  show: perms.canUseAI },
        { href: '/automations', label: 'Automatizaciones', icon: Zap,                 show: perms.canManageCatalog },
      ].filter(i => i.show),
    },
    {
      label: 'Gestión',
      items: [
        { href: '/payments',       label: 'Pagos',         icon: CreditCard,    show: perms.canViewInvoices },
        { href: '/expenses',       label: 'Gastos',        icon: Tag,           show: perms.canViewAnalytics },
        { href: '/cash-register',  label: 'Caja',          icon: Banknote,  show: perms.canViewCashRegister },
        { href: '/tickets',        label: 'Soporte',       icon: TicketCheck,   show: true },
      ].filter(i => i.show),
    },
    {
      label: 'Administración',
      items: [
        { href: '/users',    label: 'Usuarios', icon: Users,       show: perms.canViewUsers },
        { href: '/branches', label: 'Sedes',    icon: Building2,   show: perms.canViewBranches },
        { href: '/audit',    label: 'Auditoría',icon: ShieldCheck, show: perms.canViewAuditLog },
      ].filter(i => i.show),
    },
  ].filter(g => g.items.length > 0);

  const isDark = mounted && theme === 'dark';

  return (
    <aside
      style={{ width: collapsed ? 64 : 260 }}
      className="h-screen bg-card border-r border-border flex flex-col overflow-hidden shrink-0 relative z-30 transition-all duration-300 ease-in-out"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-nexus flex items-center justify-center shrink-0 shadow-nexus">
            <Globe className="h-4 w-4 text-white" />
          </div>
          <div
            className={cn(
              'overflow-hidden transition-all duration-300',
              collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
            )}
          >
            <p className="font-bold text-sm gradient-text leading-none whitespace-nowrap">Nexus ERP</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">Enterprise Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll py-3 px-2 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div
              className={cn(
                'overflow-hidden transition-all duration-200',
                collapsed ? 'h-0 opacity-0 mb-0' : 'h-auto opacity-100 mb-1.5',
              )}
            >
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-2">
                {group.label}
              </p>
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        'sidebar-item active:scale-95 transition-all duration-150',
                        isActive && 'active',
                        collapsed && 'justify-center px-2',
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-nexus-500')} />
                      <span
                        className={cn(
                          'flex-1 truncate transition-all duration-200',
                          collapsed ? 'w-0 opacity-0 overflow-hidden' : 'opacity-100',
                        )}
                      >
                        {item.label}
                      </span>
                      {!collapsed && (item as any).badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-nexus-500/20 text-nexus-500 font-bold">
                          {(item as any).badge}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-3 space-y-1 shrink-0">
        <Link href="/settings">
          <div className={cn('sidebar-item', collapsed && 'justify-center px-2')}>
            <Settings className="h-4 w-4 shrink-0" />
            <span className={cn('transition-all duration-200', collapsed ? 'w-0 opacity-0 overflow-hidden' : 'opacity-100')}>
              Configuración
            </span>
          </div>
        </Link>

        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className={cn('sidebar-item w-full', collapsed && 'justify-center px-2')}
          suppressHydrationWarning
        >
          {isDark
            ? <Sun className="h-4 w-4 shrink-0" />
            : <Moon className="h-4 w-4 shrink-0" />
          }
          <span
            suppressHydrationWarning
            className={cn('transition-all duration-200', collapsed ? 'w-0 opacity-0 overflow-hidden' : 'opacity-100')}
          >
            {isDark ? 'Modo claro' : 'Modo oscuro'}
          </span>
        </button>

        {/* User */}
        <div className={cn(
          'flex items-center gap-3 p-2 rounded-lg mt-2',
          collapsed && 'justify-center',
        )}>
          <div className="w-7 h-7 rounded-full bg-nexus-500/20 flex items-center justify-center shrink-0 ring-1 ring-nexus-500/30">
            <span className="text-[11px] font-bold text-nexus-500">
              {session?.user?.name?.[0] ?? 'N'}
            </span>
          </div>
          <div className={cn(
            'flex-1 min-w-0 transition-all duration-200',
            collapsed ? 'w-0 opacity-0 overflow-hidden' : 'opacity-100',
          )}>
            <p className="text-xs font-medium truncate">{session?.user?.name ?? 'Usuario'}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {perms.role ? ROLE_LABEL[perms.role] ?? perms.role : session?.user?.email}
            </p>
          </div>
          {!collapsed && (
            <button
              onClick={() => signOut()}
              className="text-muted-foreground hover:text-rose-500 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-nexus-500 hover:border-nexus-500 hover:text-white transition-all z-40 shadow-sm"
      >
        {collapsed
          ? <ChevronRight className="h-3 w-3" />
          : <ChevronLeft className="h-3 w-3" />
        }
      </button>
    </aside>
  );
}
