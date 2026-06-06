'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart, Search, Plus, Download, Eye,
  X, ChevronDown, Package, User, Calendar,
  CreditCard, Banknote, QrCode, Printer,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber, formatDateTime, formatRelativeTime } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/use-debounce';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Pendiente',  color: 'bg-amber-500/15 text-amber-500' },
  CONFIRMED:  { label: 'Confirmado', color: 'bg-blue-500/15 text-blue-500' },
  PROCESSING: { label: 'En proceso', color: 'bg-nexus-500/15 text-nexus-500' },
  COMPLETED:  { label: 'Completado', color: 'bg-emerald-500/15 text-emerald-500' },
  CANCELLED:  { label: 'Cancelado',  color: 'bg-rose-500/15 text-rose-500' },
  REFUNDED:   { label: 'Reembolsado', color: 'bg-purple-500/15 text-purple-500' },
};

const CHANNEL_MAP: Record<string, string> = {
  POS: 'POS',
  ONLINE: 'Online',
  PHONE: 'Teléfono',
  WHATSAPP: 'WhatsApp',
};

const PAYMENT_ICON: Record<string, any> = {
  CASH: Banknote,
  CARD: CreditCard,
  QR: QrCode,
  TRANSFER: Banknote,
};

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const debouncedSearch = useDebounce(search, 400);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['orders', debouncedSearch, status, channel, page],
    queryFn: () =>
      api.get('/orders', {
        params: {
          search: debouncedSearch || undefined,
          status: status || undefined,
          channel: channel || undefined,
          page,
          limit: 20,
          sort: 'createdAt',
          order: 'desc',
        },
      }).then((r) => r.data.data),
  });

  const cancelOrder = useMutation({
    mutationFn: (id: string) => api.delete(`/orders/${id}/cancel`),
    onSuccess: () => {
      toast.success('Orden cancelada');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelectedOrder(null);
    },
  });

  const stats = [
    { label: 'Total órdenes', value: formatNumber(data?.total ?? 0), color: 'nexus' },
    { label: 'Completadas', value: formatNumber(data?.items?.filter((o: any) => o.status === 'COMPLETED').length ?? 0), color: 'emerald' },
    { label: 'Pendientes', value: formatNumber(data?.items?.filter((o: any) => o.status === 'PENDING').length ?? 0), color: 'amber' },
    { label: 'Canceladas', value: formatNumber(data?.items?.filter((o: any) => o.status === 'CANCELLED').length ?? 0), color: 'rose' },
  ];

  const colorMap: Record<string, string> = {
    nexus: 'text-nexus-500 bg-nexus-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10',
    amber: 'text-amber-500 bg-amber-500/10',
    rose: 'text-rose-500 bg-rose-500/10',
  };

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Órdenes</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Gestión de ventas — {formatNumber(data?.total ?? 0)} órdenes
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Exportar
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="nexus-card p-4">
              <p className={cn('text-2xl font-bold', colorMap[s.color].split(' ')[0])}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por número, cliente..."
              className="pl-9 h-9"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm"
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <select
            value={channel}
            onChange={(e) => { setChannel(e.target.value); setPage(1); }}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm"
          >
            <option value="">Todos los canales</option>
            {Object.entries(CHANNEL_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="nexus-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-medium text-muted-foreground">Orden</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Canal</th>
                <th className="text-right p-4 font-medium text-muted-foreground">Items</th>
                <th className="text-right p-4 font-medium text-muted-foreground">Total</th>
                <th className="text-center p-4 font-medium text-muted-foreground">Estado</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Fecha</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="p-4">
                        <div className="h-4 bg-muted animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
                : data?.items?.map((order: any, i: number) => {
                  const st = STATUS_MAP[order.status] ?? { label: order.status, color: 'bg-muted text-muted-foreground' };
                  const PayIcon = PAYMENT_ICON[order.paymentMethod] ?? Banknote;
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer select-none"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="p-4">
                        <p className="font-mono text-xs font-medium">{order.orderNumber}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-nexus-500/15 flex items-center justify-center shrink-0">
                            <User className="h-3.5 w-3.5 text-nexus-500" />
                          </div>
                          <span className="text-sm">{order.customer?.name ?? 'Cliente genérico'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">{CHANNEL_MAP[order.channel] ?? order.channel}</td>
                      <td className="p-4 text-right text-muted-foreground">{order.items?.length ?? order._count?.items ?? '—'}</td>
                      <td className="p-4 text-right font-semibold tabular-nums">{formatCurrency(order.total)}</td>
                      <td className="p-4 text-center">
                        <span className={cn('text-xs px-2 py-1 rounded-full font-medium', st.color)}>
                          {st.label}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">{formatRelativeTime(order.createdAt)}</td>
                      <td className="p-4">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {!isLoading && data?.items?.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No se encontraron órdenes</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <span className="text-sm text-muted-foreground">Página {page} de {data.pages}</span>
            <Button variant="outline" size="sm" disabled={page === data.pages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
          </div>
        )}
      </div>

      {/* Order detail panel */}
      <>
        {selectedOrder && (
          <>
            <div
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
              onClick={() => setSelectedOrder(null)}
            />
            <div
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h3 className="font-semibold">{selectedOrder.orderNumber}</h3>
                  <p className="text-xs text-muted-foreground">{formatDateTime(selectedOrder.createdAt)}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)}>
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-5">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estado</span>
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium', STATUS_MAP[selectedOrder.status]?.color)}>
                    {STATUS_MAP[selectedOrder.status]?.label}
                  </span>
                </div>

                {/* Customer */}
                {selectedOrder.customer && (
                  <div className="nexus-card p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-nexus-500/15 flex items-center justify-center">
                      <User className="h-4 w-4 text-nexus-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{selectedOrder.customer.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedOrder.customer.email}</p>
                    </div>
                  </div>
                )}

                {/* Items */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Productos</p>
                  <div className="space-y-2">
                    {(selectedOrder.items ?? []).map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-muted flex items-center justify-center">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{item.product?.name ?? item.productName}</p>
                            <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                          </div>
                        </div>
                        <span className="text-sm font-medium tabular-nums">{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="nexus-card p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="tabular-nums">{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Descuento</span>
                      <span className="text-rose-500 tabular-nums">-{formatCurrency(selectedOrder.discount)}</span>
                    </div>
                  )}
                  {selectedOrder.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA</span>
                      <span className="tabular-nums">{formatCurrency(selectedOrder.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t border-border pt-2">
                    <span>Total</span>
                    <span className="tabular-nums">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'COMPLETED' && (
                <div className="p-6 border-t border-border">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => cancelOrder.mutate(selectedOrder.id)}
                    disabled={cancelOrder.isPending}
                  >
                    Cancelar orden
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </>
    </div>
  );
}
