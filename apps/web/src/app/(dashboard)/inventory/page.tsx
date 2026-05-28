'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Boxes, Search, AlertTriangle, X, TrendingDown,
  TrendingUp, Plus, Minus, RotateCcw, Package,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/use-debounce';
import { useForm } from 'react-hook-form';

export default function InventoryPage() {
  const [search, setSearch]           = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage]               = useState(1);
  const [adjustProduct, setAdjustProduct] = useState<any>(null);

  const debouncedSearch = useDebounce(search, 400);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', debouncedSearch, lowStockOnly, page],
    queryFn: () =>
      api.get('/inventory', {
        params: {
          search:   debouncedSearch || undefined,
          lowStock: lowStockOnly || undefined,
          page,
          limit: 25,
        },
      }).then(r => r.data.data),
  });

  const { data: alerts } = useQuery({
    queryKey: ['inventory-alerts'],
    queryFn: () => api.get('/inventory/low-stock-alerts').then(r => r.data.data),
    refetchInterval: 60_000,
  });

  const alertCount     = alerts?.length ?? 0;
  const totalSku       = data?.total ?? 0;
  const lowStockCount  = data?.items?.filter((i: any) => i.isLowStock).length ?? 0;
  const outOfStockCount = data?.items?.filter((i: any) => i.stock === 0).length ?? 0;

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Control de stock — {formatNumber(totalSku)} SKUs</p>
          </div>
        </div>

        {/* Alert banner */}
        {alertCount > 0 && (
          <div className="nexus-card border-amber-500/30 p-4 flex items-center gap-3 bg-amber-500/5">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {alertCount} producto{alertCount !== 1 ? 's' : ''} con stock bajo
              </p>
              <p className="text-xs text-muted-foreground">Revisa y reabastece a tiempo</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 shrink-0"
              onClick={() => setLowStockOnly(true)}
            >
              Ver alertas
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total SKUs',  value: formatNumber(totalSku),                       color: 'nexus',   icon: Boxes },
            { label: 'Con stock',   value: formatNumber(totalSku - outOfStockCount),      color: 'emerald', icon: TrendingUp },
            { label: 'Stock bajo',  value: formatNumber(lowStockCount),                   color: 'amber',   icon: AlertTriangle },
            { label: 'Sin stock',   value: formatNumber(outOfStockCount),                 color: 'rose',    icon: TrendingDown },
          ].map(s => {
            const Icon = s.icon;
            const colorMap: Record<string, { bg: string; text: string }> = {
              nexus:   { bg: 'bg-nexus-500/10',   text: 'text-nexus-500' },
              emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
              amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-500' },
              rose:    { bg: 'bg-rose-500/10',     text: 'text-rose-500' },
            };
            return (
              <div key={s.label} className="nexus-card p-4 flex items-center gap-4">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colorMap[s.color].bg)}>
                  <Icon className={cn('h-5 w-5', colorMap[s.color].text)} />
                </div>
                <div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por nombre, SKU..."
              className="pl-9 h-9"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1); }}
            className={cn(
              'h-9 px-4 rounded-lg text-sm font-medium border transition-colors',
              lowStockOnly ? 'bg-amber-500 text-white border-amber-500' : 'border-border hover:bg-muted',
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5 inline mr-1.5" />
            Solo stock bajo
          </button>
          {lowStockOnly && (
            <button
              onClick={() => { setLowStockOnly(false); setSearch(''); setPage(1); }}
              className="h-9 px-3 rounded-lg text-sm border border-border hover:bg-muted flex items-center gap-1.5 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" /> Limpiar filtros
            </button>
          )}
        </div>

        {/* Table */}
        <div className="nexus-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-medium text-muted-foreground">Producto</th>
                <th className="text-left p-4 font-medium text-muted-foreground">SKU</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Ubicación</th>
                <th className="text-right p-4 font-medium text-muted-foreground">Stock</th>
                <th className="text-right p-4 font-medium text-muted-foreground">Mínimo</th>
                <th className="text-center p-4 font-medium text-muted-foreground">Estado</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="p-4">
                        <div className="h-4 bg-muted animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
                : data?.items?.map((item: any) => {
                  const stock  = item.stock ?? item.quantity ?? 0;
                  const isOut  = stock === 0;
                  const isLow  = !isOut && item.isLowStock;
                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        'border-b border-border hover:bg-muted/30 transition-colors',
                        isOut && 'bg-rose-500/5',
                        isLow && 'bg-amber-500/5',
                      )}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-muted overflow-hidden shrink-0">
                            {item.product?.image
                              ? <img src={item.product.image} alt="" className="w-full h-full object-cover" />
                              : <Package className="h-4 w-4 m-2 text-muted-foreground" />
                            }
                          </div>
                          <span className="font-medium line-clamp-1">{item.product?.name ?? '—'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground font-mono text-xs">{item.product?.sku ?? '—'}</td>
                      <td className="p-4 text-muted-foreground text-xs">{item.warehouse?.name ?? 'Principal'}</td>
                      <td className="p-4 text-right">
                        <span className={cn(
                          'font-bold text-base tabular-nums',
                          isOut ? 'text-rose-500' : isLow ? 'text-amber-500' : 'text-foreground',
                        )}>
                          {formatNumber(stock)}
                        </span>
                      </td>
                      <td className="p-4 text-right text-muted-foreground tabular-nums">
                        {formatNumber(item.minStock ?? 5)}
                      </td>
                      <td className="p-4 text-center">
                        {isOut ? (
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-rose-500/15 text-rose-500">
                            Sin stock
                          </span>
                        ) : isLow ? (
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-amber-500/15 text-amber-500">
                            <AlertTriangle className="h-2.5 w-2.5 inline mr-1" />Bajo
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-emerald-500/15 text-emerald-500">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setAdjustProduct(item)}
                        >
                          Ajustar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {!isLoading && (!data?.items || data.items.length === 0) && (
            <div className="text-center py-16 text-muted-foreground">
              <Boxes className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hay productos en inventario</p>
              <p className="text-xs mt-1 opacity-60">
                {lowStockOnly ? 'No hay productos con stock bajo' : 'Crea productos desde la sección Productos'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">Página {page} de {data.pages}</span>
            <Button variant="outline" size="sm" disabled={page === data.pages} onClick={() => setPage(p => p + 1)}>
              Siguiente
            </Button>
          </div>
        )}
      </div>

      {/* Modal de ajuste */}
      {adjustProduct && (
        <StockAdjustModal
          item={adjustProduct}
          onClose={() => setAdjustProduct(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
            setAdjustProduct(null);
          }}
        />
      )}
    </div>
  );
}

// ── Modal de ajuste de stock ─────────────────────────────────────────
function StockAdjustModal({ item, onClose, onSaved }: {
  item: any; onClose: () => void; onSaved: () => void;
}) {
  const { register, handleSubmit, watch } = useForm({
    defaultValues: { type: 'ADD', quantity: 1, reason: '' },
  });
  const type = watch('type');

  const adjust = useMutation({
    mutationFn: (data: any) =>
      api.post(`/inventory/${item.productId ?? item.product?.id ?? item.id}/adjust`, {
        type:     data.type,
        quantity: Number(data.quantity),
        reason:   data.reason,
      }),
    onSuccess: () => {
      toast.success('Stock ajustado correctamente');
      onSaved();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Error al ajustar stock';
      toast.error(msg);
    },
  });

  const currentStock = item.stock ?? item.quantity ?? 0;

  const typeConfig = {
    ADD:    { label: 'Añadir',  icon: Plus,      activeBg: 'bg-emerald-500/10 border-emerald-500', activeText: 'text-emerald-500' },
    REMOVE: { label: 'Quitar',  icon: Minus,     activeBg: 'bg-rose-500/10 border-rose-500',       activeText: 'text-rose-500' },
    SET:    { label: 'Fijar',   icon: RotateCcw, activeBg: 'bg-nexus-500/10 border-nexus-500',     activeText: 'text-nexus-500' },
  } as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-sm nexus-card overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="font-semibold">Ajustar stock</h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[220px]">
              {item.product?.name ?? item.productName ?? 'Producto'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => adjust.mutate(d))} className="p-6 space-y-4">

          {/* Stock actual */}
          <div className="rounded-xl bg-muted/50 border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Stock actual</p>
            <p className="text-4xl font-bold tabular-nums">{formatNumber(currentStock)}</p>
            <p className="text-xs text-muted-foreground mt-1">unidades</p>
          </div>

          {/* Tipo de ajuste */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Tipo de ajuste</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(typeConfig) as [string, typeof typeConfig[keyof typeof typeConfig]][]).map(([value, cfg]) => {
                const Icon = cfg.icon;
                const isActive = type === value;
                return (
                  <label
                    key={value}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all',
                      isActive ? cfg.activeBg : 'border-border hover:bg-muted',
                    )}
                  >
                    <input type="radio" value={value} className="sr-only" {...register('type')} />
                    <Icon className={cn('h-4 w-4', isActive ? cfg.activeText : 'text-muted-foreground')} />
                    <span className={cn('text-xs font-medium', isActive ? cfg.activeText : 'text-muted-foreground')}>
                      {cfg.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Cantidad */}
          <div className="space-y-1.5">
            <Label>Cantidad</Label>
            <Input
              type="number"
              min="0"
              className="h-10 text-base font-bold text-center tabular-nums"
              {...register('quantity', { required: true, min: 0 })}
            />
          </div>

          {/* Motivo */}
          <div className="space-y-1.5">
            <Label>Motivo <span className="text-muted-foreground">(opcional)</span></Label>
            <Input
              placeholder="Ej: recepción mercancía, devolución cliente..."
              {...register('reason')}
            />
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={adjust.isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={adjust.isPending}
              className="bg-nexus-600 hover:bg-nexus-500 gap-2"
            >
              {adjust.isPending
                ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Aplicando...</>
                : 'Aplicar ajuste'
              }
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
