'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MonitorSmartphone, Package, Truck, CheckCircle2,
  Clock, AlertCircle, MapPin, Phone, User, ChevronRight,
  RefreshCw, Search, Filter, Instagram, MessageCircle,
  Globe, ShoppingCart, Copy, ExternalLink, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatRelativeTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import dayjs from 'dayjs';

// ── Configuración de estados ─────────────────────────────────────────
const STATUS_PIPELINE = [
  { key: 'PENDING',          label: 'Pendiente',       icon: Clock,         color: 'text-amber-500',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30' },
  { key: 'CONFIRMED',        label: 'Confirmado',      icon: CheckCircle2,  color: 'text-blue-500',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30' },
  { key: 'PROCESSING',       label: 'Preparando',      icon: Package,       color: 'text-purple-500',  bg: 'bg-purple-500/10',  border: 'border-purple-500/30' },
  { key: 'READY_FOR_PICKUP', label: 'Listo p/recoger', icon: MapPin,        color: 'text-indigo-500',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/30' },
  { key: 'SHIPPED',          label: 'Enviado',         icon: Truck,         color: 'text-nexus-500',   bg: 'bg-nexus-500/10',   border: 'border-nexus-500/30' },
  { key: 'OUT_FOR_DELIVERY', label: 'En camino',       icon: Truck,         color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  { key: 'DELIVERED',        label: 'Entregado',       icon: CheckCircle2,  color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  { key: 'CANCELLED',        label: 'Cancelado',       icon: X,             color: 'text-rose-500',    bg: 'bg-rose-500/10',    border: 'border-rose-500/30' },
];

const CHANNEL_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  ONLINE:      { label: 'Web',        icon: Globe,              color: 'text-nexus-500',  bg: 'bg-nexus-500/10' },
  WHATSAPP:    { label: 'WhatsApp',   icon: MessageCircle,      color: 'text-emerald-500',bg: 'bg-emerald-500/10' },
  INSTAGRAM:   { label: 'Instagram',  icon: Instagram,          color: 'text-pink-500',   bg: 'bg-pink-500/10' },
  PHONE:       { label: 'Teléfono',   icon: Phone,              color: 'text-blue-500',   bg: 'bg-blue-500/10' },
  MARKETPLACE: { label: 'Marketplace',icon: ShoppingCart,       color: 'text-amber-500',  bg: 'bg-amber-500/10' },
};

const DELIVERY_LABELS: Record<string, string> = {
  PICKUP:        '🏪 Recoge en tienda',
  HOME_DELIVERY: '🛵 Domicilio propio',
  COURIER:       '📦 Mensajería',
  DIGITAL:       '💻 Entrega digital',
};

const NEXT_STATUS: Record<string, string> = {
  PENDING:          'CONFIRMED',
  CONFIRMED:        'PROCESSING',
  PROCESSING:       'SHIPPED',
  SHIPPED:          'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
  READY_FOR_PICKUP: 'DELIVERED',
};

function getStatusCfg(status: string) {
  return STATUS_PIPELINE.find(s => s.key === status) ?? STATUS_PIPELINE[0];
}

// ── Tarjeta de pedido ────────────────────────────────────────────────
function OrderCard({ order, onAdvance, onCancel }: {
  order: any;
  onAdvance: (id: string, status: string, extra?: any) => void;
  onCancel: (id: string) => void;
}) {
  const [showTracking, setShowTracking] = useState(false);
  const [tracking, setTracking] = useState('');
  const [courier, setCourier] = useState('');

  const cfg = getStatusCfg(order.status);
  const channelCfg = CHANNEL_CONFIG[order.channel] ?? CHANNEL_CONFIG.ONLINE;
  const ChannelIcon = channelCfg.icon;
  const StatusIcon = cfg.icon;
  const nextStatus = NEXT_STATUS[order.status];
  const nextCfg = nextStatus ? getStatusCfg(nextStatus) : null;
  const addr = order.shippingAddress as any;
  const isDone = ['DELIVERED', 'CANCELLED', 'REFUNDED', 'RETURNED'].includes(order.status);

  const handleAdvance = () => {
    if (!nextStatus) return;
    if (nextStatus === 'SHIPPED' || nextStatus === 'OUT_FOR_DELIVERY') {
      setShowTracking(true);
    } else {
      onAdvance(order.id, nextStatus);
    }
  };

  const confirmShipping = () => {
    onAdvance(order.id, nextStatus!, { trackingNumber: tracking, courierName: courier });
    setShowTracking(false);
  };

  return (
    <div className={cn('nexus-card border rounded-xl overflow-hidden', cfg.border)}>
      {/* Header */}
      <div className={cn('flex items-center justify-between px-4 py-2.5', cfg.bg)}>
        <div className="flex items-center gap-2">
          <StatusIcon className={cn('h-3.5 w-3.5', cfg.color)} />
          <span className={cn('text-xs font-semibold', cfg.color)}>{cfg.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium', channelCfg.bg, channelCfg.color)}>
            <ChannelIcon className="h-2.5 w-2.5" />
            {channelCfg.label}
          </div>
          <span className="text-[10px] text-muted-foreground">{formatRelativeTime(order.createdAt)}</span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Número y total */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-sm">{order.number}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {order._count?.items ?? order.items?.length ?? 0} producto(s)
            </p>
          </div>
          <p className="text-base font-bold text-nexus-500">{formatCurrency(order.total)}</p>
        </div>

        {/* Cliente */}
        {order.customer && (
          <div className="flex items-center gap-2 text-xs bg-muted/40 rounded-lg px-3 py-2">
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="font-medium truncate">
                {order.customer.firstName} {order.customer.lastName ?? ''}
              </p>
              {order.customer.phone && (
                <p className="text-muted-foreground">{order.customer.phone}</p>
              )}
            </div>
            {order.customer.phone && (
              <a
                href={`https://wa.me/${order.customer.phone?.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-emerald-500 hover:text-emerald-600 shrink-0"
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}

        {/* Dirección de envío */}
        {addr && (
          <div className="flex items-start gap-2 text-xs bg-muted/40 rounded-lg px-3 py-2">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-medium">{DELIVERY_LABELS[order.deliveryMethod] ?? order.deliveryMethod}</p>
              {addr.street && <p className="text-muted-foreground truncate">{addr.street}, {addr.city}</p>}
              {addr.instructions && <p className="text-muted-foreground italic truncate">"{addr.instructions}"</p>}
            </div>
          </div>
        )}

        {/* Tracking activo */}
        {order.trackingNumber && (
          <div className="flex items-center gap-2 text-xs bg-nexus-500/5 rounded-lg px-3 py-2 border border-nexus-500/20">
            <Truck className="h-3.5 w-3.5 text-nexus-500 shrink-0" />
            <div>
              <p className="text-muted-foreground">{order.courierName ?? 'Mensajería'}</p>
              <p className="font-mono font-medium">{order.trackingNumber}</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(order.trackingNumber); toast.success('Copiado'); }}
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Productos preview */}
        {order.items && order.items.length > 0 && (
          <div className="space-y-1">
            {order.items.slice(0, 2).map((item: any) => (
              <div key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-4 h-4 rounded bg-muted flex items-center justify-center text-[9px] font-bold shrink-0">
                  {item.quantity}
                </span>
                <span className="truncate">{item.name ?? item.product?.name}</span>
                <span className="ml-auto font-medium tabular-nums shrink-0">{formatCurrency(item.total)}</span>
              </div>
            ))}
            {(order._count?.items ?? order.items?.length) > 2 && (
              <p className="text-[10px] text-muted-foreground text-right">
                +{(order._count?.items ?? order.items?.length) - 2} más
              </p>
            )}
          </div>
        )}

        {/* Form de tracking */}
        {showTracking && (
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
            <p className="text-xs font-medium">Información de envío</p>
            <Input
              placeholder="Mensajería (ej: Servientrega)"
              value={courier}
              onChange={e => setCourier(e.target.value)}
              className="h-8 text-xs"
            />
            <Input
              placeholder="Número de guía / tracking"
              value={tracking}
              onChange={e => setTracking(e.target.value)}
              className="h-8 text-xs font-mono"
            />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-7 text-xs bg-nexus-500 hover:bg-nexus-600" onClick={confirmShipping}>
                Confirmar envío
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowTracking(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Acciones */}
        {!isDone && !showTracking && (
          <div className="flex gap-2 pt-1">
            {nextCfg && (
              <Button
                size="sm"
                className={cn('flex-1 h-8 text-xs gap-1', nextCfg.bg, nextCfg.color, 'border', nextCfg.border, 'hover:opacity-90')}
                variant="outline"
                onClick={handleAdvance}
              >
                {nextCfg.label} <ChevronRight className="h-3 w-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 px-2"
              onClick={() => onCancel(order.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────
export default function OnlineOrdersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');

  const { data: orders = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['online-orders'],
    queryFn: () =>
      api.get('/orders', {
        params: {
          limit: 100,
          channel: channelFilter !== 'ALL' ? channelFilter : undefined,
        },
      }).then(r => {
        const all = r.data.data?.items ?? [];
        return all.filter((o: any) => o.channel !== 'POS');
      }),
    refetchInterval: 30_000,
  });

  const advance = useMutation({
    mutationFn: ({ id, status, extra }: { id: string; status: string; extra?: any }) =>
      api.patch(`/orders/${id}/status`, { status, ...extra }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-orders'] });
      toast.success('Estado actualizado');
    },
    onError: () => toast.error('Error al actualizar el estado'),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api.delete(`/orders/${id}/cancel`, { data: { reason: 'Cancelado manualmente' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-orders'] });
      toast.success('Pedido cancelado');
    },
  });

  // Filtros
  const filtered = orders.filter((o: any) => {
    const matchSearch = !search || [o.number, o.customer?.firstName, o.customer?.phone, o.customer?.email]
      .filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase()));
    const matchChannel = channelFilter === 'ALL' || o.channel === channelFilter;
    return matchSearch && matchChannel;
  });

  // Agrupar por estado para vista pipeline
  const pipeline = STATUS_PIPELINE.filter(s => !['DELIVERED', 'CANCELLED'].includes(s.key));
  const byStatus = (status: string) => filtered.filter((o: any) => o.status === status);

  // Totales
  const pending = filtered.filter((o: any) => !['DELIVERED', 'CANCELLED', 'REFUNDED', 'RETURNED'].includes(o.status));
  const todayDelivered = filtered.filter((o: any) =>
    o.status === 'DELIVERED' && dayjs(o.deliveredAt ?? o.updatedAt).isAfter(dayjs().startOf('day'))
  );

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-5 max-w-[1800px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MonitorSmartphone className="h-5 w-5 text-nexus-500" />
              <h1 className="text-2xl font-bold">Pedidos Online</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              Gestiona pedidos de todos tus canales digitales
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
              Actualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(v => v === 'pipeline' ? 'list' : 'pipeline')}
              className="gap-2"
            >
              {viewMode === 'pipeline' ? <Filter className="h-3.5 w-3.5" /> : <MonitorSmartphone className="h-3.5 w-3.5" />}
              {viewMode === 'pipeline' ? 'Vista lista' : 'Vista pipeline'}
            </Button>
          </div>
        </div>

        {/* KPIs rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Pedidos activos', value: pending.length, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Entregados hoy', value: todayDelivered.length, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Canales activos', value: [...new Set(filtered.map((o: any) => o.channel))].length, color: 'text-nexus-500', bg: 'bg-nexus-500/10' },
            { label: 'Ingresos totales', value: formatCurrency(filtered.reduce((s: number, o: any) => s + o.total, 0)), color: 'text-purple-500', bg: 'bg-purple-500/10', wide: true },
          ].map((kpi, i) => (
            <div key={i} className="nexus-card p-4 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', kpi.bg)}>
                <span className={cn('text-base font-bold tabular-nums', kpi.color)}>{kpi.value}</span>
              </div>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar pedido, cliente..."
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-1.5">
            {['ALL', 'ONLINE', 'WHATSAPP', 'INSTAGRAM', 'PHONE', 'MARKETPLACE'].map(ch => {
              const cfg = ch === 'ALL' ? null : CHANNEL_CONFIG[ch];
              const Icon = cfg?.icon;
              return (
                <button
                  key={ch}
                  onClick={() => setChannelFilter(ch)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    channelFilter === ch
                      ? 'bg-nexus-500 text-white border-nexus-500'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  {ch === 'ALL' ? 'Todos' : cfg?.label ?? ch}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenido */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="nexus-card p-4 space-y-3 animate-pulse">
                <div className="h-3 bg-muted rounded w-24" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : viewMode === 'pipeline' ? (
          /* ── Vista Kanban/Pipeline ─────────────────────────── */
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {pipeline.map(stage => {
                const stageOrders = byStatus(stage.key);
                return (
                  <div key={stage.key} className="w-72 shrink-0">
                    {/* Columna header */}
                    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl mb-3', stage.bg)}>
                      <stage.icon className={cn('h-3.5 w-3.5', stage.color)} />
                      <span className={cn('text-xs font-semibold', stage.color)}>{stage.label}</span>
                      <span className={cn('ml-auto text-xs font-bold tabular-nums px-1.5 py-0.5 rounded-full', stage.bg, stage.color)}>
                        {stageOrders.length}
                      </span>
                    </div>
                    {/* Tarjetas */}
                    <div className="space-y-3">
                      {stageOrders.map((order: any) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          onAdvance={(id, status, extra) => advance.mutate({ id, status, extra })}
                          onCancel={id => cancel.mutate(id)}
                        />
                      ))}
                      {stageOrders.length === 0 && (
                        <div className="border border-dashed border-border rounded-xl p-6 text-center text-muted-foreground text-xs">
                          Sin pedidos
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── Vista Lista ──────────────────────────────────── */
          <div className="nexus-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  {['Pedido', 'Canal', 'Cliente', 'Entrega', 'Estado', 'Total', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((order: any) => {
                  const cfg = getStatusCfg(order.status);
                  const chCfg = CHANNEL_CONFIG[order.channel] ?? CHANNEL_CONFIG.ONLINE;
                  const ChIcon = chCfg.icon;
                  const nextSt = NEXT_STATUS[order.status];
                  const isDone = ['DELIVERED', 'CANCELLED', 'REFUNDED', 'RETURNED'].includes(order.status);
                  const addr = order.shippingAddress as any;
                  return (
                    <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{order.number}</p>
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(order.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className={cn('flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs font-medium', chCfg.bg, chCfg.color)}>
                          <ChIcon className="h-2.5 w-2.5" />
                          {chCfg.label}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {order.customer ? (
                          <div>
                            <p className="font-medium">{order.customer.firstName} {order.customer.lastName ?? ''}</p>
                            <p className="text-xs text-muted-foreground">{order.customer.phone ?? order.customer.email}</p>
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p>{DELIVERY_LABELS[order.deliveryMethod] ?? order.deliveryMethod}</p>
                        {addr?.city && <p className="text-muted-foreground">{addr.city}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs font-medium', cfg.bg, cfg.color)}>
                          <cfg.icon className="h-2.5 w-2.5" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums">{formatCurrency(order.total)}</td>
                      <td className="px-4 py-3">
                        {!isDone && nextSt && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => advance.mutate({ id: order.id, status: nextSt })}
                          >
                            {getStatusCfg(nextSt).label} <ChevronRight className="h-3 w-3" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">
                <MonitorSmartphone className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No hay pedidos online</p>
                <p className="text-xs mt-1">Los pedidos de WhatsApp, web e Instagram aparecerán aquí</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
