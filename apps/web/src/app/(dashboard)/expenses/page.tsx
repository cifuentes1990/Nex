'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tag, Plus, X, Search, Download, Trash2, Edit,
  ShoppingBag, Truck, Zap, Wifi, Building, Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber, formatDate, formatRelativeTime } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/use-debounce';
import { useForm } from 'react-hook-form';

const CATEGORY_MAP: Record<string, { label: string; icon: any; color: string }> = {
  SUPPLIES:   { label: 'Suministros',  icon: ShoppingBag, color: 'text-nexus-500' },
  LOGISTICS:  { label: 'Logística',    icon: Truck,       color: 'text-blue-500' },
  UTILITIES:  { label: 'Servicios',    icon: Zap,         color: 'text-amber-500' },
  TECHNOLOGY: { label: 'Tecnología',   icon: Wifi,        color: 'text-purple-500' },
  RENT:       { label: 'Arriendo',     icon: Building,    color: 'text-rose-500' },
  SALARIES:   { label: 'Nómina',       icon: Users,       color: 'text-emerald-500' },
  OTHER:      { label: 'Otros',        icon: Tag,         color: 'text-muted-foreground' },
};

export default function ExpensesPage() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 400);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', debouncedSearch, page],
    queryFn: () =>
      api.get('/expenses', {
        params: { search: debouncedSearch || undefined, page, limit: 20 },
      }).then((r) => r.data.data)
      .catch(() => ({ items: [], total: 0, pages: 1 })),
  });

  const deleteExpense = useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      toast.success('Gasto eliminado');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  const expenses: any[] = data?.items ?? [];
  const totalMonth = expenses.reduce((s: number, e: any) => s + (e.amount ?? 0), 0);

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1200px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gastos</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Control de egresos del negocio</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Exportar
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-nexus-600 hover:bg-nexus-500"
              onClick={() => { setSelected(null); setShowModal(true); }}
            >
              <Plus className="h-4 w-4" /> Registrar gasto
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total registrado', value: formatCurrency(totalMonth), color: 'nexus' },
            { label: 'Este mes', value: formatNumber(expenses.length), color: 'blue' },
            { label: 'Mayor gasto', value: formatCurrency(Math.max(...expenses.map((e: any) => e.amount ?? 0), 0)), color: 'amber' },
            { label: 'Categorías', value: formatNumber(new Set(expenses.map((e: any) => e.category)).size), color: 'purple' },
          ].map((s) => {
            const colorCls: Record<string, string> = { nexus: 'text-nexus-500', blue: 'text-blue-500', amber: 'text-amber-500', purple: 'text-purple-500' };
            return (
              <div key={s.label} className="nexus-card p-4">
                <p className={cn('text-2xl font-bold', colorCls[s.color])}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar gastos..."
            className="pl-9 h-9"
          />
        </div>

        {/* Table */}
        <div className="nexus-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-medium text-muted-foreground">Descripción</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Categoría</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Fecha</th>
                <th className="text-right p-4 font-medium text-muted-foreground">Monto</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="p-4"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                    ))}
                  </tr>
                ))
                : expenses.map((expense: any, i: number) => {
                  const cat = CATEGORY_MAP[expense.category] ?? CATEGORY_MAP.OTHER;
                  const CatIcon = cat.icon;
                  return (
                    <tr
                      key={expense.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4 font-medium">{expense.description}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <CatIcon className={cn('h-3.5 w-3.5', cat.color)} />
                          <span className="text-muted-foreground text-xs">{cat.label}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">{formatDate(expense.date ?? expense.createdAt)}</td>
                      <td className="p-4 text-right font-semibold tabular-nums text-rose-500">
                        -{formatCurrency(expense.amount)}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => { setSelected(expense); setShowModal(true); }}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:text-rose-400"
                            onClick={() => deleteExpense.mutate(expense.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {!isLoading && expenses.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No hay gastos registrados</p>
              <Button size="sm" className="mt-3 gap-2 bg-nexus-600 hover:bg-nexus-500" onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4" /> Registrar primer gasto
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

      <>
        {showModal && (
          <ExpenseModal
            expense={selected}
            onClose={() => setShowModal(false)}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['expenses'] });
              setShowModal(false);
              setSelected(null);
            }}
          />
        )}
      </>
    </div>
  );
}

function ExpenseModal({ expense, onClose, onSaved }: { expense: any; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!expense;
  const { register, handleSubmit } = useForm({
    defaultValues: {
      description: expense?.description ?? '',
      amount: expense?.amount ?? '',
      category: expense?.category ?? 'OTHER',
      date: expense?.date ? expense.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes: expense?.notes ?? '',
    },
  });

  const save = useMutation({
    mutationFn: (data: any) =>
      isEdit ? api.patch(`/expenses/${expense.id}`, data) : api.post('/expenses', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Gasto actualizado' : 'Gasto registrado');
      onSaved();
    },
    onError: () => toast.error('Error al guardar'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md nexus-card">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-semibold">{isEdit ? 'Editar gasto' : 'Registrar gasto'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Descripción *</Label>
            <Input placeholder="Ej: Factura de internet" {...register('description', { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Monto *</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" {...register('amount', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" {...register('date')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <select className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" {...register('category')}>
              {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Notas (opcional)</Label>
            <Input placeholder="Detalles adicionales..." {...register('notes')} />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-nexus-600 hover:bg-nexus-500" disabled={save.isPending}>
              {isEdit ? 'Guardar' : 'Registrar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
