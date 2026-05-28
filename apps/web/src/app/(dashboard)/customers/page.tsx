'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Search, Plus, X, Star, Crown,
  Phone, Mail, MapPin, ShoppingBag, TrendingUp,
  Edit, Trash2, User,
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

const SEGMENT_MAP: Record<string, { label: string; color: string; icon: any }> = {
  VIP:     { label: 'VIP',      color: 'bg-amber-500/15 text-amber-500',    icon: Crown },
  LOYAL:   { label: 'Leal',     color: 'bg-nexus-500/15 text-nexus-500',    icon: Star },
  REGULAR: { label: 'Regular',  color: 'bg-blue-500/15 text-blue-500',      icon: User },
  AT_RISK: { label: 'En riesgo', color: 'bg-orange-500/15 text-orange-500', icon: TrendingUp },
  LOST:    { label: 'Perdido',  color: 'bg-rose-500/15 text-rose-500',      icon: X },
  NEW:     { label: 'Nuevo',    color: 'bg-emerald-500/15 text-emerald-500', icon: Plus },
};

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const debouncedSearch = useDebounce(search, 400);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['customers', debouncedSearch, segment, page],
    queryFn: () =>
      api.get('/customers', {
        params: {
          search: debouncedSearch || undefined,
          segment: segment || undefined,
          page,
          limit: 20,
        },
      }).then((r) => r.data.data),
  });

  const deleteCustomer = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      toast.success('Cliente eliminado');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setSelected(null);
    },
  });

  const stats = [
    { label: 'Total clientes', value: formatNumber(data?.total ?? 0), color: 'nexus' },
    { label: 'VIP', value: formatNumber(data?.items?.filter((c: any) => c.segment === 'VIP').length ?? 0), color: 'amber' },
    { label: 'En riesgo', value: formatNumber(data?.items?.filter((c: any) => c.segment === 'AT_RISK').length ?? 0), color: 'orange' },
    { label: 'Nuevos (30d)', value: formatNumber(data?.items?.filter((c: any) => c.segment === 'NEW').length ?? 0), color: 'emerald' },
  ];

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground text-sm mt-0.5">CRM — {formatNumber(data?.total ?? 0)} clientes</p>
          </div>
          <Button
            size="sm"
            className="gap-2 bg-nexus-600 hover:bg-nexus-500"
            onClick={() => { setSelected(null); setShowModal(true); }}
          >
            <Plus className="h-4 w-4" /> Nuevo cliente
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => {
            const colorCls: Record<string, string> = {
              nexus: 'text-nexus-500', amber: 'text-amber-500', orange: 'text-orange-500', emerald: 'text-emerald-500',
            };
            return (
              <div key={s.label} className="nexus-card p-4">
                <p className={cn('text-2xl font-bold', colorCls[s.color])}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por nombre, email, teléfono..."
              className="pl-9 h-9"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <select
            value={segment}
            onChange={(e) => { setSegment(e.target.value); setPage(1); }}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm"
          >
            <option value="">Todos los segmentos</option>
            {Object.entries(SEGMENT_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="nexus-card p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-muted animate-pulse rounded w-24" />
                    <div className="h-2.5 bg-muted animate-pulse rounded w-16" />
                  </div>
                </div>
                <div className="h-8 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <>
              {data?.items?.map((customer: any, i: number) => {
                const seg = SEGMENT_MAP[customer.segment] ?? SEGMENT_MAP.REGULAR;
                const SegIcon = seg.icon;
                return (
                  <div
                    key={customer.id}
                    className="nexus-card p-5 group hover:border-nexus-500/30 transition-colors cursor-pointer"
                    onClick={() => setSelected(customer)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-nexus flex items-center justify-center text-white font-bold text-sm">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{customer.name}</p>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', seg.color)}>
                            {seg.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelected(customer); setShowModal(true); }}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {customer.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {customer.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span>{customer.city}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Compras</p>
                        <p className="text-sm font-semibold tabular-nums">{formatNumber(customer.totalOrders ?? 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total gastado</p>
                        <p className="text-sm font-semibold tabular-nums">{formatCurrency(customer.totalSpent ?? 0)}</p>
                      </div>
                    </div>

                    {customer.lastPurchaseAt && (
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Última compra: {formatRelativeTime(customer.lastPurchaseAt)}
                      </p>
                    )}
                  </div>
                );
              })}
            </>
          </div>
        )}

        {!isLoading && data?.items?.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No se encontraron clientes</p>
          </div>
        )}

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <span className="text-sm text-muted-foreground">Página {page} de {data.pages}</span>
            <Button variant="outline" size="sm" disabled={page === data.pages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
          </div>
        )}
      </div>

      {/* Customer detail panel */}
      <>
        {selected && !showModal && (
          <>
            <div
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
              onClick={() => setSelected(null)}
            />
            <div
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-background border-l border-border z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h3 className="font-semibold">Perfil del cliente</h3>
                <button onClick={() => setSelected(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-5">
                {/* Avatar */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-nexus flex items-center justify-center text-white text-2xl font-bold mb-3">
                    {selected.name.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="font-bold text-lg">{selected.name}</h4>
                  {selected.segment && (
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium mt-1', SEGMENT_MAP[selected.segment]?.color)}>
                      {SEGMENT_MAP[selected.segment]?.label}
                    </span>
                  )}
                </div>

                {/* Contact */}
                <div className="nexus-card p-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contacto</p>
                  {selected.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selected.email}</span>
                    </div>
                  )}
                  {selected.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selected.phone}</span>
                    </div>
                  )}
                  {selected.city && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selected.city}{selected.country ? `, ${selected.country}` : ''}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="nexus-card p-4 text-center">
                    <p className="text-2xl font-bold text-nexus-500">{formatNumber(selected.totalOrders ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">Compras</p>
                  </div>
                  <div className="nexus-card p-4 text-center">
                    <p className="text-lg font-bold text-emerald-500">{formatCurrency(selected.totalSpent ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">Total gastado</p>
                  </div>
                </div>

                {/* Points */}
                {selected.loyaltyPoints !== undefined && (
                  <div className="nexus-card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">Puntos de lealtad</span>
                    </div>
                    <span className="font-bold text-amber-500">{formatNumber(selected.loyaltyPoints)}</span>
                  </div>
                )}

                {selected.notes && (
                  <div className="nexus-card p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Notas</p>
                    <p className="text-sm text-muted-foreground">{selected.notes}</p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-border flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowModal(true); }}>
                  <Edit className="h-4 w-4 mr-2" /> Editar
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => deleteCustomer.mutate(selected.id)}
                  disabled={deleteCustomer.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </>

      {/* Customer Modal */}
      <>
        {showModal && (
          <CustomerModal
            customer={selected}
            onClose={() => { setShowModal(false); }}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['customers'] });
              setShowModal(false);
              setSelected(null);
            }}
          />
        )}
      </>
    </div>
  );
}

function CustomerModal({ customer, onClose, onSaved }: { customer: any; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!customer;
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: customer?.name ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
      city: customer?.city ?? '',
      country: customer?.country ?? '',
      notes: customer?.notes ?? '',
    },
  });

  const save = useMutation({
    mutationFn: (data: any) =>
      isEdit ? api.patch(`/customers/${customer.id}`, data) : api.post('/customers', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Cliente actualizado' : 'Cliente creado');
      onSaved();
    },
    onError: () => toast.error('Error al guardar'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md nexus-card overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-semibold">{isEdit ? 'Editar cliente' : 'Nuevo cliente'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input placeholder="Juan García" {...register('name', { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="email@ejemplo.com" {...register('email')} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input placeholder="+57 300 000 0000" {...register('phone')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Ciudad</Label>
              <Input placeholder="Bogotá" {...register('city')} />
            </div>
            <div className="space-y-1.5">
              <Label>País</Label>
              <Input placeholder="Colombia" {...register('country')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notas</Label>
            <textarea
              rows={3}
              placeholder="Notas sobre el cliente..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-nexus-500/50"
              {...register('notes')}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-nexus-600 hover:bg-nexus-500" disabled={save.isPending}>
              {isEdit ? 'Guardar cambios' : 'Crear cliente'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
