'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Plus, MapPin, Phone, Mail,
  Users, ShoppingCart, ToggleLeft, ToggleRight, Edit, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { usePermissions } from '@/hooks/use-permissions';

export default function BranchesPage() {
  const perms = usePermissions();
  const qc = useQueryClient();
  const [showModal, setModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches').then((r) => r.data.data),
  });

  const branches: any[] = Array.isArray(data) ? data : (data?.items ?? []);

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/branches/${id}/status`, { isActive }),
    onSuccess: () => {
      toast.success('Sede actualizada');
      qc.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  });

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1200px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sedes</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {branches.length} sede{branches.length !== 1 ? 's' : ''} configurada{branches.length !== 1 ? 's' : ''}
            </p>
          </div>
          {perms.canManageBranches && (
            <Button
              size="sm"
              className="gap-2 bg-nexus-600 hover:bg-nexus-500"
              onClick={() => { setSelected(null); setModal(true); }}
            >
              <Plus className="h-4 w-4" /> Nueva sede
            </Button>
          )}
        </div>

        {/* Branch cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="nexus-card p-6 h-48 animate-pulse bg-muted/50" />
            ))}
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay sedes configuradas</p>
            {perms.canManageBranches && (
              <Button size="sm" className="mt-4 gap-2 bg-nexus-600 hover:bg-nexus-500" onClick={() => setModal(true)}>
                <Plus className="h-4 w-4" /> Crear sede
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((b: any) => (
              <div
                key={b.id}
                className={cn('nexus-card p-5 space-y-4', !b.isActive && 'opacity-60')}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-nexus-500/15 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-nexus-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{b.name}</p>
                        {b.isMain && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-nexus-500/20 text-nexus-400 font-bold">
                            Principal
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{b.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {perms.canManageBranches && (
                      <button
                        onClick={() => { setSelected(b); setModal(true); }}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {perms.canManageBranches && !b.isMain && (
                      <button
                        onClick={() => toggle.mutate({ id: b.id, isActive: !b.isActive })}
                        className={cn(
                          'transition-colors',
                          b.isActive ? 'text-nexus-500 hover:text-nexus-400' : 'text-muted-foreground hover:text-foreground',
                        )}
                        title={b.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {b.isActive
                          ? <ToggleRight className="h-6 w-6" />
                          : <ToggleLeft className="h-6 w-6" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {b.address && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{b.address}{b.city ? `, ${b.city}` : ''}</span>
                    </div>
                  )}
                  {b.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{b.phone}</span>
                    </div>
                  )}
                  {b.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span>{b.email}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{b._count?.users ?? 0} usuarios</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span>{b._count?.orders ?? 0} ventas</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <BranchModal
          branch={selected}
          onClose={() => setModal(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['branches'] });
            setModal(false);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

// ── Modal crear / editar sede ─────────────────────────────────────────
function BranchModal({
  branch,
  onClose,
  onSaved,
}: {
  branch: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!branch;
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name:    branch?.name    ?? '',
      code:    branch?.code    ?? '',
      address: branch?.address ?? '',
      city:    branch?.city    ?? '',
      phone:   branch?.phone   ?? '',
      email:   branch?.email   ?? '',
    },
  });

  const save = useMutation({
    mutationFn: (data: any) =>
      isEdit
        ? api.put(`/branches/${branch.id}`, data)
        : api.post('/branches', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Sede actualizada' : 'Sede creada');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al guardar'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md nexus-card">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-semibold">{isEdit ? 'Editar sede' : 'Nueva sede'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Nombre de la sede *</Label>
              <Input placeholder="Ej: Sucursal Norte" {...register('name', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Código *</Label>
              <Input
                placeholder="SUC-NORTE"
                {...register('code', { required: true })}
                disabled={isEdit}
                className={cn(isEdit && 'opacity-60')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ciudad</Label>
              <Input placeholder="Bogotá" {...register('city')} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Dirección</Label>
              <Input placeholder="Calle 123 # 45-67" {...register('address')} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input placeholder="+57 1 234 5678" {...register('phone')} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="sede@empresa.com" {...register('email')} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-nexus-600 hover:bg-nexus-500" disabled={save.isPending}>
              {isEdit ? 'Guardar cambios' : 'Crear sede'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
