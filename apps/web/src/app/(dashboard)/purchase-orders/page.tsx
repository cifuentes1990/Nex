'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart, Plus, Search, X, Package, Truck, Check,
  ClipboardList, Clock, CheckCircle, Ban, Send, Eye,
  Loader2, ArrowDown, DollarSign,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber, formatDate } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/use-debounce';
import { useForm, useFieldArray } from 'react-hook-form';

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT:      { label: 'Borrador',   color: 'bg-muted text-muted-foreground',       icon: ClipboardList },
  SENT:       { label: 'Enviada',    color: 'bg-blue-500/15 text-blue-500',          icon: Send },
  CONFIRMED:  { label: 'Confirmada', color: 'bg-amber-500/15 text-amber-500',        icon: Clock },
  PARTIAL:    { label: 'Parcial',    color: 'bg-purple-500/15 text-purple-500',      icon: Package },
  RECEIVED:   { label: 'Recibida',   color: 'bg-emerald-500/15 text-emerald-500',    icon: CheckCircle },
  CANCELLED:  { label: 'Cancelada',  color: 'bg-rose-500/15 text-rose-500',          icon: Ban },
};

export default function PurchaseOrdersPage() {
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [page, setPage]       = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const debouncedSearch       = useDebounce(search, 400);
  const queryClient           = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', debouncedSearch, status, page],
    queryFn: () =>
      api.get('/purchase-orders', {
        params: { search: debouncedSearch || undefined, status: status || undefined, page, limit: 20 },
      }).then(r => r.data.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['purchase-order-stats'],
    queryFn: () => api.get('/purchase-orders/stats').then(r => r.data.data),
    staleTime: 30_000,
  });

  const sendOrder = useMutation({
    mutationFn: (id: string) => api.post(`/purchase-orders/${id}/send`),
    onSuccess: () => { toast.success('Orden enviada al proveedor'); queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }); },
    onError: () => toast.error('Error al enviar la orden'),
  });

  const receiveOrder = useMutation({
    mutationFn: (id: string) => api.post(`/purchase-orders/${id}/receive`, {}),
    onSuccess: () => { toast.success('Recepción registrada — inventario actualizado'); queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }); },
    onError: () => toast.error('Error al registrar recepción'),
  });

  const cancelOrder = useMutation({
    mutationFn: (id: string) => api.delete(`/purchase-orders/${id}/cancel`),
    onSuccess: () => { toast.success('Orden cancelada'); queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }); },
    onError: () => toast.error('Error al cancelar'),
  });

  const pending   = (stats?.byStatus ?? []).filter((s: any) => ['DRAFT', 'SENT', 'CONFIRMED'].includes(s.status)).reduce((a: number, s: any) => a + s.total, 0);
  const received  = (stats?.byStatus ?? []).find((s: any) => s.status === 'RECEIVED');

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Órdenes de Compra</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Gestión de compras a proveedores</p>
          </div>
          <Button size="sm" className="gap-2 bg-nexus-600 hover:bg-nexus-500" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Nueva orden de compra
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total órdenes', value: formatNumber(stats?.totalOrders ?? 0),     color: 'text-nexus-500',   icon: ClipboardList },
            { label: 'Total invertido', value: formatCurrency(stats?.totalAmount ?? 0), color: 'text-amber-500',   icon: DollarSign },
            { label: 'Por recibir',   value: formatCurrency(pending),                   color: 'text-blue-500',    icon: Truck },
            { label: 'Órdenes recibidas', value: formatNumber(received?.count ?? 0),    color: 'text-emerald-500', icon: CheckCircle },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="nexus-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn('h-4 w-4', s.color)} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className={cn('text-xl font-bold tabular-nums', s.color)}>{s.value}</p>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por número o proveedor..." className="pl-9 h-9" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
          </div>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="h-9 px-3 rounded-lg border border-border bg-background text-sm">
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="nexus-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-medium text-muted-foreground">Número</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Proveedor</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Fecha</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Esperado</th>
                <th className="text-center p-4 font-medium text-muted-foreground">Ítems</th>
                <th className="text-right p-4 font-medium text-muted-foreground">Total</th>
                <th className="text-center p-4 font-medium text-muted-foreground">Estado</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 8 }).map((_, j) => <td key={j} className="p-4"><div className="h-4 bg-muted animate-pulse rounded" /></td>)}
                    </tr>
                  ))
                : data?.items?.map((po: any) => {
                    const st   = STATUS_MAP[po.status] ?? STATUS_MAP.DRAFT;
                    const Icon = st.icon;
                    return (
                      <tr key={po.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-mono text-xs font-medium">{po.number}</td>
                        <td className="p-4">
                          <p className="font-medium">{po.supplier?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{po.supplier?.email ?? ''}</p>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">{formatDate(po.orderDate ?? po.createdAt)}</td>
                        <td className="p-4 text-xs text-muted-foreground">{po.expectedDate ? formatDate(po.expectedDate) : '—'}</td>
                        <td className="p-4 text-center text-xs">{po._count?.items ?? po.items?.length ?? 0} productos</td>
                        <td className="p-4 text-right font-semibold tabular-nums">{formatCurrency(po.total)}</td>
                        <td className="p-4 text-center">
                          <span className={cn('text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1', st.color)}>
                            <Icon className="h-3 w-3" />{st.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1 justify-end">
                            {po.status === 'DRAFT' && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500" onClick={() => sendOrder.mutate(po.id)} title="Enviar al proveedor">
                                <Send className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {['SENT', 'CONFIRMED', 'PARTIAL'].includes(po.status) && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500" onClick={() => receiveOrder.mutate(po.id)} title="Marcar como recibida">
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {['DRAFT', 'SENT'].includes(po.status) && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => cancelOrder.mutate(po.id)} title="Cancelar">
                                <Ban className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!isLoading && data?.items?.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No hay órdenes de compra</p>
              <Button size="sm" className="mt-3 gap-2 bg-nexus-600 hover:bg-nexus-500" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" /> Crear primera orden
              </Button>
            </div>
          )}
        </div>

        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <span className="text-sm text-muted-foreground">Página {page} de {data.pages}</span>
            <Button variant="outline" size="sm" disabled={page === data.pages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
          </div>
        )}
      </div>

      {showCreate && (
        <CreatePurchaseOrderModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            queryClient.invalidateQueries({ queryKey: ['purchase-order-stats'] });
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

// ── Modal de creación de orden de compra ──────────────────────────────
function CreatePurchaseOrderModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { register, handleSubmit, watch, control } = useForm({
    defaultValues: {
      supplierId: '',
      expectedDate: '',
      notes: '',
      items: [{ productId: '', name: '', quantity: 1, unitCost: 0 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items   = watch('items');
  const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitCost), 0);
  const tax      = subtotal * 0.19;
  const total    = subtotal + tax;

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-select'],
    queryFn: () => api.get('/suppliers', { params: { limit: 100 } }).then(r => r.data.data?.items ?? []),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-select'],
    queryFn: () => api.get('/products', { params: { limit: 200 } }).then(r => r.data.data?.items ?? []),
  });

  const save = useMutation({
    mutationFn: (data: any) => api.post('/purchase-orders', {
      supplierId: data.supplierId || undefined,
      expectedDate: data.expectedDate || undefined,
      notes: data.notes || undefined,
      items: data.items.map((i: any) => ({
        productId: i.productId || undefined,
        name: i.name,
        quantity: Number(i.quantity),
        unitCost: Number(i.unitCost),
      })),
    }),
    onSuccess: () => { toast.success('Orden de compra creada'); onSaved(); },
    onError: () => toast.error('Error al crear la orden'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl nexus-card my-8">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="font-semibold text-lg">Nueva Orden de Compra</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Solicita productos a tus proveedores</p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit(d => save.mutate(d))} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Proveedor</Label>
              <select className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm" {...register('supplierId')}>
                <option value="">Seleccionar proveedor...</option>
                {(suppliersData ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha esperada de entrega</Label>
              <Input type="date" {...register('expectedDate')} />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Productos a comprar</Label>
              <button type="button" onClick={() => append({ productId: '', name: '', quantity: 1, unitCost: 0 })}
                className="text-xs text-nexus-400 hover:text-nexus-300 flex items-center gap-1">
                <Plus className="h-3 w-3" /> Agregar producto
              </button>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 text-xs text-muted-foreground font-medium">Producto</th>
                    <th className="text-center p-2 text-xs text-muted-foreground font-medium w-16">Cant.</th>
                    <th className="text-right p-2 text-xs text-muted-foreground font-medium w-28">Costo unit.</th>
                    <th className="text-right p-2 text-xs text-muted-foreground font-medium w-24">Subtotal</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    const sub = Number(items[index]?.quantity ?? 0) * Number(items[index]?.unitCost ?? 0);
                    return (
                      <tr key={field.id} className="border-t border-border">
                        <td className="p-1">
                          <Input className="h-8 text-xs border-0 focus-visible:ring-0" placeholder="Nombre del producto" {...register(`items.${index}.name`, { required: true })} />
                        </td>
                        <td className="p-1">
                          <Input className="h-8 text-xs border-0 focus-visible:ring-0 text-center" type="number" min="1" {...register(`items.${index}.quantity`)} />
                        </td>
                        <td className="p-1">
                          <Input className="h-8 text-xs border-0 focus-visible:ring-0 text-right" type="number" min="0" step="100" {...register(`items.${index}.unitCost`)} />
                        </td>
                        <td className="p-2 text-right text-xs text-muted-foreground tabular-nums">{formatCurrency(sub)}</td>
                        <td className="p-1 text-center">
                          {fields.length > 1 && <button type="button" onClick={() => remove(index)} className="text-rose-500"><X className="h-3.5 w-3.5" /></button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totales */}
          <div className="flex justify-end text-sm space-y-1">
            <div className="text-right space-y-1">
              <div className="flex justify-between gap-12 text-muted-foreground"><span>Subtotal:</span><span className="tabular-nums">{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between gap-12 text-muted-foreground"><span>IVA (19%):</span><span className="tabular-nums">{formatCurrency(tax)}</span></div>
              <div className="flex justify-between gap-12 font-bold text-base pt-1 border-t border-border"><span>Total:</span><span className="tabular-nums text-nexus-400">{formatCurrency(total)}</span></div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notas (opcional)</Label>
            <Input placeholder="Instrucciones para el proveedor..." {...register('notes')} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-nexus-600 hover:bg-nexus-500 gap-2" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              {save.isPending ? 'Creando...' : 'Crear orden de compra'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
