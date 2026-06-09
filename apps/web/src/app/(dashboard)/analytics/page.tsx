'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, TrendingUp, TrendingDown, Users, ShoppingCart,
  DollarSign, Target, Zap, ArrowUpRight, ArrowDownRight, Download, Loader2,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber, formatCompact } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const PERIODS = [
  { label: '7 días', value: 7 },
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
];

// ── Exportar a Excel ─────────────────────────────────────────────────────
const EXPORT_TYPES = [
  { key: 'orders',    label: 'Ventas' },
  { key: 'products',  label: 'Productos' },
  { key: 'customers', label: 'Clientes' },
  { key: 'inventory', label: 'Inventario' },
] as const;

function ExportButton({ period }: { period: number }) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (type: string) => {
    setLoading(type);
    try {
      const token = document.cookie.split('; ').find(r => r.startsWith('next-auth.session-token='))?.split('=')[1]
                 ?? localStorage.getItem('accessToken')
                 ?? '';

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/analytics/export?type=${type}&days=${period}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.ok) throw new Error('Error al exportar');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `nexus-${type}-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Error al exportar. Intenta de nuevo.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="relative group">
      <Button variant="outline" size="sm" className="gap-2" disabled={!!loading}>
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Exportar Excel
      </Button>
      <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-20 hidden group-hover:block">
        {EXPORT_TYPES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleExport(key)}
            disabled={!!loading}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            {label}
            {loading === key && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState(30);

  const { data: dashboard } = useQuery({
    queryKey: ['analytics-dashboard', period],
    queryFn: () => api.get('/analytics/dashboard', { params: { period } }).then((r) => r.data.data),
    refetchInterval: 60_000,
  });

  const { data: salesByDay } = useQuery({
    queryKey: ['sales-by-day', period],
    queryFn: () => api.get('/analytics/sales-by-day', { params: { days: period } }).then((r) => r.data.data),
  });

  const { data: byCategory } = useQuery({
    queryKey: ['revenue-by-category', period],
    queryFn: () => api.get('/analytics/revenue-by-category', { params: { days: period } }).then((r) => r.data.data),
  });

  const { data: salesByHour } = useQuery({
    queryKey: ['sales-by-hour'],
    queryFn: () => api.get('/analytics/sales-by-hour').then((r) => r.data.data),
  });

  const { data: profit } = useQuery({
    queryKey: ['profit', period],
    queryFn: () => api.get('/analytics/profit', { params: { days: period } }).then((r) => r.data.data),
  });

  const { data: forecast } = useQuery({
    queryKey: ['forecast'],
    queryFn: () => api.get('/analytics/forecast').then((r) => r.data.data),
  });

  const { data: segments } = useQuery({
    queryKey: ['customer-segments'],
    queryFn: () => api.get('/analytics/customer-segments').then((r) => r.data.data),
  });

  const kpis = [
    {
      label: 'Ingresos',
      value: formatCurrency(dashboard?.month?.revenue ?? 0),
      change: dashboard?.month?.growth ?? 0,
      icon: DollarSign,
      color: 'nexus',
    },
    {
      label: 'Órdenes',
      value: formatNumber(dashboard?.month?.orders ?? 0),
      change: 0,
      icon: ShoppingCart,
      color: 'blue',
    },
    {
      label: 'Ticket promedio',
      value: formatCurrency(dashboard?.month?.avgOrder ?? 0),
      change: 0,
      icon: Target,
      color: 'purple',
    },
    {
      label: 'Clientes activos',
      value: formatNumber(dashboard?.customers?.total ?? 0),
      change: 0,
      icon: Users,
      color: 'emerald',
    },
    {
      label: 'Margen bruto',
      value: `${(profit?.grossMargin ?? 0).toFixed(1)}%`,
      change: 0,
      icon: TrendingUp,
      color: 'amber',
    },
    {
      label: 'Ventas hoy',
      value: formatCurrency(dashboard?.today?.revenue ?? 0),
      change: 0,
      icon: Zap,
      color: 'rose',
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    nexus:   { bg: 'bg-nexus-500/10',   text: 'text-nexus-500',   border: 'border-nexus-500/20' },
    blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-500',    border: 'border-blue-500/20' },
    purple:  { bg: 'bg-purple-500/10',  text: 'text-purple-500',  border: 'border-purple-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
    amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-500',   border: 'border-amber-500/20' },
    rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-500',    border: 'border-rose-500/20' },
  };

  const segmentData = Object.entries(segments ?? {}).map(([key, val]: any) => ({
    name: key === 'vip' ? 'VIP' : key === 'loyal' ? 'Leales' : key === 'regular' ? 'Regulares' :
          key === 'atRisk' ? 'En riesgo' : key === 'lost' ? 'Perdidos' : 'Nuevos',
    value: val,
  }));

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Inteligencia de negocio en tiempo real</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Selector de período */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={cn(
                    'px-4 py-2 text-sm transition-colors',
                    period === p.value ? 'bg-nexus-500 text-white' : 'hover:bg-muted',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {/* Exportar a Excel */}
            <ExportButton period={period} />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            const cfg = colorMap[kpi.color];
            const isPositive = kpi.change >= 0;
            return (
              <div
                key={kpi.label}
                className="nexus-card p-4"
              >
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', cfg.bg)}>
                  <Icon className={cn('h-4 w-4', cfg.text)} />
                </div>
                <p className="text-xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
                {kpi.change !== 0 && (
                  <div className={cn(
                    'flex items-center gap-1 mt-2 text-xs font-medium',
                    isPositive ? 'text-emerald-500' : 'text-rose-500',
                  )}>
                    {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(kpi.change).toFixed(1)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Revenue + Profit */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="nexus-card p-5 lg:col-span-2">
            <h3 className="font-semibold text-sm mb-4">Ventas por día</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={salesByDay ?? []} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v)} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: any) => [formatCurrency(v), 'Ventas']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="nexus-card p-5">
            <h3 className="font-semibold text-sm mb-4">Segmentos de clientes</h3>
            {segmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={segmentData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                    {segmentData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Sin datos</div>
            )}
          </div>
        </div>

        {/* Hourly + Category */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="nexus-card p-5">
            <h3 className="font-semibold text-sm mb-4">Ventas por hora del día</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={salesByHour ?? []} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(h) => `${h}h`} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v)} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(v: any) => [formatCurrency(v), 'Ventas']} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="nexus-card p-5">
            <h3 className="font-semibold text-sm mb-4">Ingresos por categoría</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byCategory ?? []} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(v: any) => [formatCurrency(v), 'Ingresos']} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {(byCategory ?? []).map((_: any, idx: number) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Forecast */}
        {forecast?.forecast?.length > 0 && (
          <div className="nexus-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-nexus-500" />
              <h3 className="font-semibold text-sm">Pronóstico IA — próximos 30 días</h3>
              <span className="text-xs bg-nexus-500/15 text-nexus-500 px-2 py-0.5 rounded-full">GPT-4</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={forecast.forecast} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v)} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(v: any) => [formatCurrency(v), 'Pronóstico']} />
                <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 3" fill="url(#forecastGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
