'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Search, Download, Eye, CheckCircle,
  Clock, AlertCircle, X, ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber, formatDate, formatRelativeTime } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/use-debounce';

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT:           { label: 'Borrador',   color: 'bg-muted text-muted-foreground',       icon: FileText },
  PENDING:         { label: 'Pendiente',  color: 'bg-amber-500/15 text-amber-500',       icon: Clock },
  PAID:            { label: 'Pagada',     color: 'bg-emerald-500/15 text-emerald-500',   icon: CheckCircle },
  OVERDUE:         { label: 'Vencida',    color: 'bg-rose-500/15 text-rose-500',         icon: AlertCircle },
  CANCELLED:       { label: 'Cancelada',  color: 'bg-muted text-muted-foreground',       icon: X },
  PARTIALLY_PAID:  { label: 'Parcial',    color: 'bg-blue-500/15 text-blue-500',         icon: Clock },
  REFUNDED:        { label: 'Reembolsada', color: 'bg-purple-500/15 text-purple-500',    icon: X },
};

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', debouncedSearch, status, page],
    queryFn: () =>
      api.get('/invoices', {
        params: {
          search: debouncedSearch || undefined,
          status: status || undefined,
          page,
          limit: 20,
        },
      }).then((r) => r.data.data),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => api.patch(`/invoices/${id}/pay`, { amount: undefined }),
    onSuccess: () => {
      toast.success('Factura marcada como pagada');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const downloadPDF = async (id: string, number: string) => {
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al descargar PDF');
    }
  };

  const totalRevenue = data?.items?.reduce((s: number, i: any) => i.status === 'PAID' ? s + i.total : s, 0) ?? 0;
  const totalPending = data?.items?.reduce((s: number, i: any) => i.status === 'PENDING' ? s + i.total : s, 0) ?? 0;
  const totalOverdue = data?.items?.reduce((s: number, i: any) => i.status === 'OVERDUE' ? s + i.total : s, 0) ?? 0;

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Facturas</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{formatNumber(data?.total ?? 0)} facturas en total</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="nexus-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Cobrado</span>
            </div>
            <p className="text-2xl font-bold text-emerald-500">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="nexus-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="text-sm text-muted-foreground">Por cobrar</span>
            </div>
            <p className="text-2xl font-bold text-amber-500">{formatCurrency(totalPending)}</p>
          </div>
          <div className="nexus-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              <span className="text-sm text-muted-foreground">Vencido</span>
            </div>
            <p className="text-2xl font-bold text-rose-500">{formatCurrency(totalOverdue)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
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
        </div>

        {/* Table */}
        <div className="nexus-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-medium text-muted-foreground">Número</th>
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
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="p-4"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                    ))}
                  </tr>
                ))
                : data?.items?.map((inv: any, i: number) => {
                  const st = STATUS_MAP[inv.status] ?? STATUS_MAP.PENDING;
                  const Icon = st.icon;
                  const isOverdue = inv.status === 'OVERDUE';
                  return (
                    <tr
                      key={inv.id}
                      className={cn(
                        'border-b border-border hover:bg-muted/30 transition-colors',
                        isOverdue && 'bg-rose-500/5',
                      )}
                    >
                      <td className="p-4 font-mono text-xs font-medium">{inv.invoiceNumber}</td>
                      <td className="p-4">
                        <p className="font-medium">{inv.customer?.name ?? inv.customerName ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{inv.customer?.email ?? ''}</p>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">{formatDate(inv.issueDate ?? inv.createdAt)}</td>
                      <td className="p-4 text-xs">
                        {inv.dueDate ? (
                          <span className={cn(isOverdue && 'text-rose-500 font-medium')}>{formatDate(inv.dueDate)}</span>
                        ) : '—'}
                      </td>
                      <td className="p-4 text-right font-semibold tabular-nums">{formatCurrency(inv.total)}</td>
                      <td className="p-4 text-center">
                        <span className={cn('text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1', st.color)}>
                          <Icon className="h-3 w-3" />
                          {st.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => downloadPDF(inv.id, inv.invoiceNumber)}
                            title="Descargar PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          {(inv.status === 'PENDING' || inv.status === 'OVERDUE' || inv.status === 'PARTIALLY_PAID') && (
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-emerald-500 hover:text-emerald-400"
                              onClick={() => markPaid.mutate(inv.id)}
                              title="Marcar como pagada"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
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
    </div>
  );
}
