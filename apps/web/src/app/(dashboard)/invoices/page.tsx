'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Search, Download, CheckCircle,
  Clock, AlertCircle, X, Plus, Send, Ban,
  CreditCard, Receipt, FilePlus, TrendingUp,
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
  DRAFT:          { label: 'Borrador',    color: 'bg-muted text-muted-foreground',     icon: FileText },
  PENDING:        { label: 'Pendiente',   color: 'bg-amber-500/15 text-amber-500',     icon: Clock },
  PAID:           { label: 'Pagada',      color: 'bg-emerald-500/15 text-emerald-500', icon: CheckCircle },
  OVERDUE:        { label: 'Vencida',     color: 'bg-rose-500/15 text-rose-500',       icon: AlertCircle },
  CANCELLED:      { label: 'Cancelada',   color: 'bg-muted text-muted-foreground',     icon: X },
  PARTIALLY_PAID: { label: 'Parcial',     color: 'bg-blue-500/15 text-blue-500',       icon: Clock },
  REFUNDED:       { label: 'Nota crédito',color: 'bg-purple-500/15 text-purple-500',   icon: X },
};

const TYPE_MAP: Record<string, string> = {
  INVOICE:  'Factura',
  QUOTE:    'Cotización',
  PROFORMA: 'Proforma',
  RECEIPT:  'Recibo',
  CREDIT_NOTE: 'Nota Crédito',
};

export default function InvoicesPage() {
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [page, setPage]         = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const debouncedSearch         = useDebounce(search, 400);
  const queryClient             = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', debouncedSearch, status, page],
    queryFn: () =>
      api.get('/invoices', {
        params: { search: debouncedSearch || undefined, status: status || undefined, page, limit: 20 },
      }).then((r) => r.data.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: () => api.get('/invoices/stats').then(r => r.data.data),
    staleTime: 30_000,
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => api.patch(`/invoices/${id}/pay`, { amount: undefined }),
    onSuccess: () => { toast.success('Factura marcada como pagada'); queryClient.invalidateQueries({ queryKey: ['invoices'] }); },
  });

  const sendInvoice = useMutation({
    mutationFn: (id: string) => api.post(`/invoices/${id}/send`),
    onSuccess: () => { toast.success('Factura enviada'); queryClient.invalidateQueries({ queryKey: ['invoices'] }); },
  });

  const cancelInvoice = useMutation({
    mutationFn: (id: string) => api.patch(`/invoices/${id}/cancel`),
    onSuccess: () => { toast.success('Factura cancelada'); queryClient.invalidateQueries({ queryKey: ['invoices'] }); },
  });

  const downloadPDF = async (id: string, number: string) => {
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `factura-${number}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Error al descargar PDF'); }
  };

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Facturación</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{formatNumber(data?.total ?? 0)} documentos en total</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowCreate(true)}>
              <FilePlus className="h-4 w-4" /> Nueva cotización
            </Button>
            <Button size="sm" className="gap-2 bg-nexus-600 hover:bg-nexus-500" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> Nueva factura
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total cobrado',  value: formatCurrency(stats?.totalCollected ?? 0),                color: 'text-emerald-500', icon: CheckCircle },
            { label: 'Por cobrar',     value: formatCurrency(stats?.totalBalance ?? 0),                  color: 'text-amber-500',   icon: Clock },
            { label: 'Este mes',       value: formatCurrency(stats?.thisMonth?.revenue ?? 0),            color: 'text-nexus-500',   icon: TrendingUp },
            { label: 'Total facturas', value: formatNumber(stats?.total ?? data?.total ?? 0),            color: 'text-blue-500',    icon: FileText },
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
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por número, cliente..." className="pl-9 h-9" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-9 px-3 rounded-lg border border-border bg-background text-sm">
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
                <th className="text-left p-4 font-medium text-muted-foreground">Tipo</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Emisión</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Vencimiento</th>
                <th className="text-right p-4 font-medium text-muted-foreground">Total</th>
                <th className="text-center p-4 font-medium text-muted-foreground">Estado</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 8 }).map((_, j) => <td key={j} className="p-4"><div className="h-4 bg-muted animate-pulse rounded" /></td>)}
                    </tr>
                  ))
                : data?.items?.map((inv: any) => {
                    const st  = STATUS_MAP[inv.status] ?? STATUS_MAP.PENDING;
                    const Icon = st.icon;
                    const type = TYPE_MAP[(inv.metadata as any)?.type ?? 'INVOICE'] ?? 'Factura';
                    const isOverdue = inv.status === 'OVERDUE';
                    return (
                      <tr key={inv.id} className={cn('border-b border-border hover:bg-muted/30 transition-colors', isOverdue && 'bg-rose-500/5')}>
                        <td className="p-4 font-mono text-xs font-medium">{inv.invoiceNumber ?? inv.number}</td>
                        <td className="p-4 text-xs text-muted-foreground">{type}</td>
                        <td className="p-4">
                          <p className="font-medium">{inv.customer?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{inv.customer?.email ?? ''}</p>
                        </td>
                        <td className="p-4 text-muted-foreground text-xs">{formatDate(inv.issueDate ?? inv.createdAt)}</td>
                        <td className="p-4 text-xs">
                          {inv.dueDate ? <span className={cn(isOverdue && 'text-rose-500 font-medium')}>{formatDate(inv.dueDate)}</span> : '—'}
                        </td>
                        <td className="p-4 text-right font-semibold tabular-nums">{formatCurrency(inv.total)}</td>
                        <td className="p-4 text-center">
                          <span className={cn('text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1', st.color)}>
                            <Icon className="h-3 w-3" />{st.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadPDF(inv.id, inv.invoiceNumber ?? inv.number)} title="Descargar PDF">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            {inv.status === 'DRAFT' && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-400" onClick={() => sendInvoice.mutate(inv.id)} title="Enviar">
                                <Send className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {['PENDING', 'OVERDUE', 'PARTIALLY_PAID'].includes(inv.status) && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500 hover:text-emerald-400" onClick={() => markPaid.mutate(inv.id)} title="Marcar pagada">
                                <CreditCard className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {['DRAFT', 'PENDING'].includes(inv.status) && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:text-rose-400" onClick={() => cancelInvoice.mutate(inv.id)} title="Cancelar">
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
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No se encontraron facturas</p>
              <Button size="sm" className="mt-3 gap-2 bg-nexus-600 hover:bg-nexus-500" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" /> Crear primera factura
              </Button>
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

      {showCreate && (
        <CreateInvoiceModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

// ── Modal de creación de factura / cotización ─────────────────────────
function CreateInvoiceModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { register, handleSubmit, watch, control, setValue } = useForm({
    defaultValues: {
      type: 'INVOICE',
      status: 'PENDING',
      customerName: '',
      notes: '',
      dueDate: '',
      taxRate: 0.19,
      items: [{ name: '', quantity: 1, unitPrice: 0, taxRate: 0.19 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items    = watch('items');
  const taxRate  = Number(watch('taxRate'));
  const type     = watch('type');

  const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
  const tax      = subtotal * taxRate;
  const total    = subtotal + tax;

  const save = useMutation({
    mutationFn: (data: any) => api.post('/invoices', {
      ...data,
      taxRate: Number(data.taxRate),
      status: data.type === 'QUOTE' ? 'DRAFT' : data.status,
      items: data.items.map((i: any) => ({
        name: i.name,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        taxRate: Number(data.taxRate),
      })),
    }),
    onSuccess: () => { toast.success('Documento creado exitosamente'); onSaved(); },
    onError: () => toast.error('Error al crear el documento'),
  });

  const typeOptions = [
    { value: 'INVOICE',  label: '🧾 Factura' },
    { value: 'QUOTE',    label: '📋 Cotización' },
    { value: 'PROFORMA', label: '📄 Proforma' },
    { value: 'RECEIPT',  label: '🧾 Recibo de caja' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl nexus-card my-8">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="font-semibold text-lg">Nuevo documento de facturación</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Crea una factura, cotización o recibo</p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="p-6 space-y-5">
          {/* Tipo de documento */}
          <div className="grid grid-cols-4 gap-2">
            {typeOptions.map(opt => (
              <button
                key={opt.value} type="button"
                onClick={() => setValue('type', opt.value)}
                className={cn(
                  'px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center',
                  type === opt.value
                    ? 'bg-nexus-500/10 border-nexus-500/50 text-nexus-400'
                    : 'border-border text-muted-foreground hover:border-nexus-500/30',
                )}
              >{opt.label}</button>
            ))}
          </div>

          {/* Cliente y fecha */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cliente (nombre / empresa)</Label>
              <Input placeholder="Ej: Juan García o ACME S.A.S." {...register('customerName')} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de vencimiento</Label>
              <Input type="date" {...register('dueDate')} />
            </div>
          </div>

          {/* Líneas de items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Productos / Servicios</Label>
              <button
                type="button"
                onClick={() => append({ name: '', quantity: 1, unitPrice: 0, taxRate })}
                className="text-xs text-nexus-400 hover:text-nexus-300 flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Agregar línea
              </button>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 font-medium text-muted-foreground text-xs">Descripción</th>
                    <th className="text-center p-2 font-medium text-muted-foreground text-xs w-16">Cant.</th>
                    <th className="text-right p-2 font-medium text-muted-foreground text-xs w-28">Precio unit.</th>
                    <th className="text-right p-2 font-medium text-muted-foreground text-xs w-24">Subtotal</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    const sub = Number(items[index]?.quantity ?? 0) * Number(items[index]?.unitPrice ?? 0);
                    return (
                      <tr key={field.id} className="border-t border-border">
                        <td className="p-1">
                          <Input className="h-8 text-xs border-0 focus-visible:ring-0" placeholder="Producto o servicio" {...register(`items.${index}.name`, { required: true })} />
                        </td>
                        <td className="p-1">
                          <Input className="h-8 text-xs border-0 focus-visible:ring-0 text-center" type="number" min="1" {...register(`items.${index}.quantity`)} />
                        </td>
                        <td className="p-1">
                          <Input className="h-8 text-xs border-0 focus-visible:ring-0 text-right" type="number" min="0" step="100" {...register(`items.${index}.unitPrice`)} />
                        </td>
                        <td className="p-2 text-right text-xs text-muted-foreground tabular-nums">{formatCurrency(sub)}</td>
                        <td className="p-1 text-center">
                          {fields.length > 1 && (
                            <button type="button" onClick={() => remove(index)} className="text-rose-500 hover:text-rose-400">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* IVA + totales */}
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1.5 w-40">
              <Label>IVA (%)</Label>
              <select className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm" {...register('taxRate')}>
                <option value={0}>0% — Sin IVA</option>
                <option value={0.05}>5% — Reducido</option>
                <option value={0.19}>19% — General</option>
              </select>
            </div>
            <div className="text-right space-y-1 text-sm">
              <div className="flex justify-between gap-12 text-muted-foreground">
                <span>Subtotal:</span><span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between gap-12 text-muted-foreground">
                <span>IVA ({Math.round(taxRate * 100)}%):</span><span className="tabular-nums">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between gap-12 font-bold text-base pt-1 border-t border-border">
                <span>Total:</span><span className="tabular-nums text-nexus-400">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label>Notas / Términos (opcional)</Label>
            <Input placeholder="Condiciones de pago, observaciones..." {...register('notes')} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-nexus-600 hover:bg-nexus-500 gap-2" disabled={save.isPending}>
              <Receipt className="h-4 w-4" />
              {save.isPending ? 'Creando...' : `Crear ${TYPE_MAP[type] ?? 'Factura'}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
