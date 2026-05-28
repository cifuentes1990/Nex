'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Download, FileText, TrendingUp, Users,
  Package, DollarSign, Calendar, Loader2, ShoppingCart,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatNumber, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const REPORTS = [
  {
    id: 'sales',
    title: 'Reporte de ventas',
    description: 'Ventas detalladas con productos, clientes y canales',
    icon: ShoppingCart,
    color: 'nexus',
    endpoint: '/reports/sales/excel',
    filename: 'ventas.xlsx',
  },
  {
    id: 'inventory',
    title: 'Inventario completo',
    description: 'Stock actual, movimientos y alertas',
    icon: Package,
    color: 'blue',
    endpoint: '/reports/inventory/excel',
    filename: 'inventario.xlsx',
  },
  {
    id: 'customers',
    title: 'Base de clientes',
    description: 'Clientes con segmentación RFM y métricas',
    icon: Users,
    color: 'purple',
    endpoint: '/reports/customers/excel',
    filename: 'clientes.xlsx',
  },
  {
    id: 'revenue',
    title: 'Análisis de ingresos',
    description: 'Ingresos, márgenes y rentabilidad por categoría',
    icon: TrendingUp,
    color: 'emerald',
    endpoint: '/reports/revenue/excel',
    filename: 'ingresos.xlsx',
  },
  {
    id: 'invoices',
    title: 'Cartera de facturas',
    description: 'Facturas pendientes, pagadas y vencidas',
    icon: FileText,
    color: 'amber',
    endpoint: '/reports/invoices/excel',
    filename: 'facturas.xlsx',
  },
  {
    id: 'products',
    title: 'Catálogo de productos',
    description: 'Productos con precios, costos y márgenes',
    icon: DollarSign,
    color: 'rose',
    endpoint: '/reports/products/excel',
    filename: 'productos.xlsx',
  },
];

const colorMap: Record<string, { bg: string; text: string; hover: string }> = {
  nexus:   { bg: 'bg-nexus-500/10',   text: 'text-nexus-500',   hover: 'hover:bg-nexus-500/20' },
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-500',    hover: 'hover:bg-blue-500/20' },
  purple:  { bg: 'bg-purple-500/10',  text: 'text-purple-500',  hover: 'hover:bg-purple-500/20' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', hover: 'hover:bg-emerald-500/20' },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-500',   hover: 'hover:bg-amber-500/20' },
  rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-500',    hover: 'hover:bg-rose-500/20' },
};

export default function ReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/analytics/dashboard').then((r) => r.data.data),
  });

  const downloadReport = async (report: typeof REPORTS[0]) => {
    setDownloading(report.id);
    try {
      const res = await api.get(report.endpoint, {
        responseType: 'blob',
        params: {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = report.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${report.title} descargado`);
    } catch {
      toast.error('Error al generar el reporte');
    } finally {
      setDownloading(null);
    }
  };

  const summaryCards = [
    { label: 'Ingresos del mes', value: formatCurrency(dashboard?.month?.revenue ?? 0), icon: DollarSign, color: 'nexus' },
    { label: 'Órdenes del mes', value: formatNumber(dashboard?.month?.orders ?? 0), icon: ShoppingCart, color: 'blue' },
    { label: 'Ticket promedio', value: formatCurrency(dashboard?.month?.avgOrder ?? 0), icon: TrendingUp, color: 'purple' },
    { label: 'Clientes activos', value: formatNumber(dashboard?.customers?.total ?? 0), icon: Users, color: 'emerald' },
  ];

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Descarga reportes en Excel con datos actualizados</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((c, i) => {
            const Icon = c.icon;
            const cfg = colorMap[c.color];
            return (
              <div
                key={c.label}
                className="nexus-card p-4 flex items-center gap-4"
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', cfg.bg)}>
                  <Icon className={cn('h-5 w-5', cfg.text)} />
                </div>
                <div>
                  <p className="text-xl font-bold">{c.value}</p>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Date filter */}
        <div className="nexus-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-4 w-4 text-nexus-500" />
            <h3 className="font-medium text-sm">Filtrar por período</h3>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Desde:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 px-3 rounded-lg border border-border bg-background text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Hasta:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 px-3 rounded-lg border border-border bg-background text-sm"
              />
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                Limpiar filtro
              </Button>
            )}
          </div>
        </div>

        {/* Reports grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORTS.map((report, i) => {
            const Icon = report.icon;
            const cfg = colorMap[report.color];
            const isLoading = downloading === report.id;

            return (
              <div
                key={report.id}
                className="nexus-card p-6 group hover:border-nexus-500/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center transition-colors', cfg.bg, cfg.hover)}>
                    <Icon className={cn('h-6 w-6', cfg.text)} />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => downloadReport(report)}
                    disabled={isLoading}
                  >
                    {isLoading
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Download className="h-3.5 w-3.5" />}
                    {isLoading ? 'Generando...' : 'Descargar'}
                  </Button>
                </div>

                <h3 className="font-semibold mb-1">{report.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{report.description}</p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Excel (.xlsx)
                  </span>
                  <Button
                    size="sm"
                    className={cn('gap-2 h-8', cfg.bg, cfg.text, 'hover:opacity-90 border-0')}
                    onClick={() => downloadReport(report)}
                    disabled={isLoading}
                  >
                    {isLoading
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Download className="h-3 w-3" />}
                    {isLoading ? 'Generando...' : 'Descargar'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Saved reports placeholder */}
        <div className="nexus-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-nexus-500" />
            <h3 className="font-semibold text-sm">Reportes programados</h3>
            <span className="text-xs bg-nexus-500/15 text-nexus-500 px-2 py-0.5 rounded-full">Próximamente</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Programa reportes automáticos que se envíen por email cada día, semana o mes.
          </p>
        </div>
      </div>
    </div>
  );
}
