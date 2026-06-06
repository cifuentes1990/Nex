'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TicketCheck, Plus, X, Search, MessageSquare,
  AlertCircle, Clock, CheckCircle, ChevronRight, User,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatRelativeTime } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/use-debounce';
import { useForm } from 'react-hook-form';

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  OPEN:        { label: 'Abierto',    color: 'bg-nexus-500/15 text-nexus-500',   icon: AlertCircle },
  IN_PROGRESS: { label: 'En proceso', color: 'bg-amber-500/15 text-amber-500',   icon: Clock },
  RESOLVED:    { label: 'Resuelto',   color: 'bg-emerald-500/15 text-emerald-500', icon: CheckCircle },
  CLOSED:      { label: 'Cerrado',    color: 'bg-muted text-muted-foreground',   icon: X },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  LOW:      { label: 'Baja',     color: 'text-muted-foreground' },
  MEDIUM:   { label: 'Media',    color: 'text-amber-500' },
  HIGH:     { label: 'Alta',     color: 'text-rose-500' },
  CRITICAL: { label: 'Crítico',  color: 'text-rose-600 font-bold' },
};

export default function TicketsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 400);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', debouncedSearch, statusFilter, page],
    queryFn: () =>
      api.get('/tickets', {
        params: { search: debouncedSearch || undefined, status: statusFilter || undefined, page, limit: 20 },
      }).then((r) => r.data.data)
      .catch(() => ({ items: [], total: 0, pages: 1 })),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/tickets/${id}`, { status }),
    onSuccess: () => {
      toast.success('Ticket actualizado');
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setSelected(null);
    },
  });

  const tickets: any[] = data?.items ?? [];

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Soporte</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Sistema de tickets de soporte</p>
          </div>
          <Button size="sm" className="gap-2 bg-nexus-600 hover:bg-nexus-500" onClick={() => { setSelected(null); setShowModal(true); }}>
            <Plus className="h-4 w-4" /> Nuevo ticket
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(STATUS_MAP).map(([key, s]) => {
            const Icon = s.icon;
            const count = tickets.filter((t: any) => t.status === key).length;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
                className={cn(
                  'nexus-card p-4 text-left transition-colors hover:border-nexus-500/30',
                  statusFilter === key && 'border-nexus-500/50 bg-nexus-500/5',
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-2xl font-bold">{count}</p>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar tickets..."
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="nexus-card p-5 h-16 animate-pulse bg-muted/50" />
            ))
            : tickets.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <TicketCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No hay tickets</p>
              </div>
            ) : tickets.map((ticket: any, i: number) => {
              const st = STATUS_MAP[ticket.status] ?? STATUS_MAP.OPEN;
              const pr = PRIORITY_MAP[ticket.priority ?? 'MEDIUM'];
              const StIcon = st.icon;
              return (
                <div
                  key={ticket.id}
                  className="nexus-card p-4 flex items-center gap-4 hover:border-nexus-500/30 transition-colors cursor-pointer select-none group"
                  onClick={() => setSelected(ticket)}
                >
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <StIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{ticket.subject ?? ticket.title}</p>
                      <span className={cn('text-[11px] font-medium', pr.color)}>{pr.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {ticket.description}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={cn('text-[10px] px-2 py-1 rounded-full font-medium', st.color)}>
                      {st.label}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-1">{formatRelativeTime(ticket.createdAt)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              );
            })}
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
          <TicketModal
            ticket={selected}
            onClose={() => setShowModal(false)}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['tickets'] });
              setShowModal(false);
              setSelected(null);
            }}
          />
        )}
      </>
    </div>
  );
}

function TicketModal({ ticket, onClose, onSaved }: { ticket: any; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!ticket;
  const { register, handleSubmit } = useForm({
    defaultValues: {
      title: ticket?.title ?? ticket?.subject ?? '',
      description: ticket?.description ?? '',
      priority: ticket?.priority ?? 'MEDIUM',
    },
  });

  const save = useMutation({
    mutationFn: (data: any) =>
      isEdit ? api.patch(`/tickets/${ticket.id}`, data) : api.post('/tickets', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Ticket actualizado' : 'Ticket creado');
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
          <h2 className="font-semibold">{isEdit ? 'Editar ticket' : 'Nuevo ticket'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Asunto *</Label>
            <Input placeholder="Breve descripción del problema" {...register('title', { required: true })} />
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <textarea
              rows={4}
              placeholder="Detalla el problema o solicitud..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-nexus-500/50"
              {...register('description')}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Prioridad</Label>
            <select className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" {...register('priority')}>
              {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-nexus-600 hover:bg-nexus-500" disabled={save.isPending}>
              {isEdit ? 'Guardar' : 'Crear ticket'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
