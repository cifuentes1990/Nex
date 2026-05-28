'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck, Search, Plus, X, Phone, Mail,
  Globe, Edit, Trash2, Package,
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

export default function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 400);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', debouncedSearch, page],
    queryFn: () =>
      api.get('/suppliers', {
        params: { search: debouncedSearch || undefined, page, limit: 20 },
      }).then((r) => r.data.data),
  });

  const deleteSupplier = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => {
      toast.success('Proveedor eliminado');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setSelected(null);
    },
  });

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Proveedores</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{formatNumber(data?.total ?? 0)} proveedores registrados</p>
          </div>
          <Button
            size="sm"
            className="gap-2 bg-nexus-600 hover:bg-nexus-500"
            onClick={() => { setSelected(null); setShowModal(true); }}
          >
            <Plus className="h-4 w-4" /> Nuevo proveedor
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar proveedor..."
            className="pl-9 h-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="nexus-card p-5 space-y-3">
                <div className="h-4 bg-muted animate-pulse rounded w-32" />
                <div className="h-3 bg-muted animate-pulse rounded w-24" />
                <div className="h-3 bg-muted animate-pulse rounded w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <>
              {data?.items?.map((supplier: any, i: number) => (
                <div
                  key={supplier.id}
                  className="nexus-card p-5 group hover:border-nexus-500/30 transition-colors cursor-pointer"
                  onClick={() => setSelected(supplier)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-nexus-500/10 flex items-center justify-center">
                        <Truck className="h-5 w-5 text-nexus-500" />
                      </div>
                      <div>
                        <p className="font-semibold">{supplier.name}</p>
                        {supplier.code && (
                          <p className="text-xs text-muted-foreground font-mono">{supplier.code}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelected(supplier); setShowModal(true); }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {supplier.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{supplier.email}</span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span>{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3" />
                        <span className="truncate">{supplier.website}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-border flex gap-4 text-center">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Productos</p>
                      <p className="text-sm font-bold text-nexus-500">{supplier._count?.products ?? 0}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Órdenes</p>
                      <p className="text-sm font-bold">{supplier._count?.purchaseOrders ?? 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          </div>
        )}

        {!isLoading && data?.items?.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No se encontraron proveedores</p>
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

      {/* Modal */}
      <>
        {showModal && (
          <SupplierModal
            supplier={selected}
            onClose={() => setShowModal(false)}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['suppliers'] });
              setShowModal(false);
              setSelected(null);
            }}
          />
        )}
      </>
    </div>
  );
}

function SupplierModal({ supplier, onClose, onSaved }: { supplier: any; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!supplier;
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: supplier?.name ?? '',
      code: supplier?.code ?? '',
      email: supplier?.email ?? '',
      phone: supplier?.phone ?? '',
      website: supplier?.website ?? '',
      address: supplier?.address ?? '',
      city: supplier?.city ?? '',
      country: supplier?.country ?? '',
      contactName: supplier?.contactName ?? '',
      notes: supplier?.notes ?? '',
    },
  });

  const save = useMutation({
    mutationFn: (data: any) =>
      isEdit ? api.patch(`/suppliers/${supplier.id}`, data) : api.post('/suppliers', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Proveedor actualizado' : 'Proveedor creado');
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
        className="relative w-full max-w-lg nexus-card overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-semibold">{isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="p-6 space-y-4 overflow-y-auto custom-scroll">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <Label>Nombre *</Label>
              <Input placeholder="Distribuidora XYZ" {...register('name', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Código</Label>
              <Input placeholder="PROV-001" {...register('code')} />
            </div>
            <div className="space-y-1.5">
              <Label>Contacto</Label>
              <Input placeholder="Juan García" {...register('contactName')} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="proveedor@email.com" {...register('email')} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input placeholder="+57 300 000 0000" {...register('phone')} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Sitio web</Label>
              <Input placeholder="https://proveedor.com" {...register('website')} />
            </div>
            <div className="space-y-1.5">
              <Label>Ciudad</Label>
              <Input placeholder="Bogotá" {...register('city')} />
            </div>
            <div className="space-y-1.5">
              <Label>País</Label>
              <Input placeholder="Colombia" {...register('country')} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-nexus-600 hover:bg-nexus-500" disabled={save.isPending}>
              {isEdit ? 'Guardar cambios' : 'Crear proveedor'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
