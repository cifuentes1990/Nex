'use client';

import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  Users, Package, AlertTriangle, Zap, BarChart2,
  RefreshCw, ArrowUpRight, Sparkles, Store, MonitorSmartphone,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/formatters';
import { StatCard } from '@/components/dashboard/stat-card';
import { RevenueChart } from '@/components/charts/revenue-chart';
import { CategoryChart } from '@/components/charts/category-chart';
import { RecentOrders } from '@/components/dashboard/recent-orders';
import { AIInsightsBanner } from '@/components/ai/insights-banner';
import { TopProducts } from '@/components/dashboard/top-products';
import { SalesHeatmap } from '@/components/charts/sales-heatmap';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePermissions } from '@/hooks/use-permissions';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');


export default function DashboardPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/analytics/dashboard').then((r) => r.data.data),
    refetchInterval: 30_000, // Live updates every 30s
  });

  const { data: insights } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: () => api.get('/ai/insights').then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const perms = usePermissions();
  const growth = data?.month?.growth ?? 0;
  const isPositive = growth >= 0;

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {dayjs().format('dddd, D [de] MMMM YYYY')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1.5 text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              En vivo
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2"
              disabled={isFetching}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Accesos rápidos — visible para cajeros y empleados */}
        {perms.canUsePOS && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/pos">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/15 hover:border-emerald-500/40 transition-all cursor-pointer select-none group">
                <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-emerald-700 dark:text-emerald-400">Punto de Venta (POS)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Registra ventas en tienda, cobra y descarga recibo</p>
                </div>
                <ChevronRight className="h-5 w-5 text-emerald-500 group-hover:translate-x-1 transition-transform shrink-0" />
              </div>
            </Link>
            <Link href="/online-orders">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-nexus-500/10 border border-nexus-500/25 hover:bg-nexus-500/15 hover:border-nexus-500/40 transition-all cursor-pointer select-none group">
                <div className="w-12 h-12 rounded-xl bg-nexus-500 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                  <MonitorSmartphone className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-nexus-600 dark:text-nexus-400">Pedidos Online</p>
                  <p className="text-xs text-muted-foreground mt-0.5">WhatsApp, Instagram, web — gestiona el pipeline</p>
                </div>
                <ChevronRight className="h-5 w-5 text-nexus-500 group-hover:translate-x-1 transition-transform shrink-0" />
              </div>
            </Link>
          </div>
        )}

        {/* AI Insights Banner */}
        {insights && insights.length > 0 && (
          <AIInsightsBanner insights={insights} />
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <StatCard
              title="Ventas de Hoy"
              value={formatCurrency(data?.today?.revenue ?? 0)}
              subValue={`${formatNumber(data?.today?.orders ?? 0)} órdenes`}
              icon={<DollarSign className="h-5 w-5" />}
              color="nexus"
              loading={isLoading}
            />
          </div>

          <div>
            <StatCard
              title="Ventas del Mes"
              value={formatCurrency(data?.month?.revenue ?? 0)}
              subValue={
                <span className={cn('flex items-center gap-1', isPositive ? 'text-emerald-500' : 'text-rose-500')}>
                  {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {formatPercent(Math.abs(growth))} vs mes anterior
                </span>
              }
              icon={<BarChart2 className="h-5 w-5" />}
              color="purple"
              loading={isLoading}
              badge={isPositive ? '↑' : '↓'}
              badgeColor={isPositive ? 'success' : 'destructive'}
            />
          </div>

          <div>
            <StatCard
              title="Clientes Activos"
              value={formatNumber(data?.customers?.total ?? 0)}
              subValue={`+${formatNumber(data?.customers?.newThisMonth ?? 0)} nuevos este mes`}
              icon={<Users className="h-5 w-5" />}
              color="blue"
              loading={isLoading}
            />
          </div>

          <div>
            <StatCard
              title="Stock Bajo"
              value={formatNumber(data?.products?.lowStock ?? 0)}
              subValue={`de ${formatNumber(data?.products?.total ?? 0)} productos`}
              icon={<Package className="h-5 w-5" />}
              color={(data?.products?.lowStock ?? 0) > 10 ? 'danger' : 'warning'}
              loading={isLoading}
              alert={(data?.products?.lowStock ?? 0) > 0}
            />
          </div>
        </div>

        {/* Facturas Pendientes Banner */}
        {(data?.invoices?.pendingAmount ?? 0) > 0 && (
          <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Tienes {data?.invoices?.pendingCount} facturas pendientes de cobro
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total adeudado: {formatCurrency(data?.invoices?.pendingAmount ?? 0)}
              </p>
            </div>
            <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-600">
              Ver facturas <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <div>
            <CategoryChart />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RecentOrders orders={data?.recentOrders ?? []} loading={isLoading} />
          </div>
          <div>
            <TopProducts products={data?.topProducts ?? []} loading={isLoading} />
          </div>
        </div>

        {/* Sales Heatmap */}
        <div>
          <SalesHeatmap data={data?.charts?.salesByHour ?? []} />
        </div>

      </div>
    </div>
  );
}
