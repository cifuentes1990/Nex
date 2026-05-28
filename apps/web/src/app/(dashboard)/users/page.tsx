'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Filter, MoreVertical,
  UserCheck, UserX, Trash2, Edit, Shield,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { usePermissions } from '@/hooks/use-permissions';

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  ADMIN:       'bg-rose-500/15 text-rose-400 border-rose-500/30',
  MANAGER:     'bg-amber-500/15 text-amber-400 border-amber-500/30',
  SUPERVISOR:  'bg-blue-500/15 text-blue-400 border-blue-500/30',
  CASHIER:     'bg-nexus-500/15 text-nexus-400 border-nexus-500/30',
  EMPLOYEE:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  VIEWER:      'bg-muted text-muted-foreground border-border',
};
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', MANAGER: 'Gerente',
  SUPERVISOR: 'Supervisor',   CASHIER: 'Cajero', EMPLOYEE: 'Empleado', VIEWER: 'Visor',
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    'bg-emerald-500/15 text-emerald-400',
  INACTIVE:  'bg-muted text-muted-foreground',
  SUSPENDED: 'bg-rose-500/15 text-rose-400',
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo', INACTIVE: 'Inactivo', SUSPENDED: 'Suspendido',
};

export default function UsersPage() {
  const perms = usePermissions();
  const qc = useQueryClient();

  const [search, setSearch]     = useState('');
  const [roleFilter, setRole]   = useState('');
  const [statusFilter, setSt]   = useState('');
  const [page, setPage]         = useState(1);
  const [showModal, setModal]   = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter, statusFilter, page],
    queryFn: () =>
      api.get('/users', {
        params: { search: search || undefined, role: roleFilter || undefined, status: statusFilter || undefined, page, limit: 20 },
      }).then((r) => r.data.data),
    placeholderData: (prev) => prev,
  });

  const users: any[] = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const pages: number = data?.pages ?? 1;

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/users/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Estado actualizado');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      toast.success('Usuario eliminado');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  });

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1200px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {total} usuario{total !== 1 ? 's' : ''} en tu organización
            </p>
          </div>
          {perms.canInviteUser && (
            <Button
              size="sm"
              className="gap-2 bg-nexus-600 hover:bg-nexus-500"
              onClick={() => { setSelected(null); setModal(true); }}
            >
              <Plus className="h-4 w-4" /> Nuevo usuario
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm"
            value={roleFilter}
            onChange={(e) => { setRole(e.target.value); setPage(1); }}
          >
            <option value="">Todos los roles</option>
            {Object.entries(ROLE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm"
            value={statusFilter}
            onChange={(e) => { setSt(e.target.value); setPage(1); }}
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
            <option value="SUSPENDED">Suspendidos</option>
          </select>
        </div>

        {/* Table */}
        <div className="nexus-card overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando usuarios...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-muted-foreground">No se encontraron usuarios</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="text-left p-4 font-medium">Usuario</th>
                  <th className="text-left p-4 font-medium">Rol</th>
                  <th className="text-left p-4 font-medium hidden md:table-cell">Sede</th>
                  <th className="text-left p-4 font-medium">Estado</th>
                  <th className="text-left p-4 font-medium hidden lg:table-cell">Último acceso</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-nexus-500/20 flex items-center justify-center shrink-0 ring-1 ring-nexus-500/30">
                          <span className="text-xs font-bold text-nexus-500">
                            {u.name?.[0]?.toUpperCase() ?? '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        'text-[11px] px-2 py-0.5 rounded-full border font-medium',
                        ROLE_COLORS[u.role] ?? ROLE_COLORS.VIEWER,
                      )}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="text-muted-foreground text-xs">
                        {u.branch?.name ?? '—'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        'text-[11px] px-2 py-0.5 rounded-full font-medium',
                        STATUS_COLORS[u.status] ?? '',
                      )}>
                        {STATUS_LABELS[u.status] ?? u.status}
                      </span>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <span className="text-muted-foreground text-xs">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleDateString('es-CO')
                          : 'Nunca'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 justify-end">
                        {perms.canEditUser && (
                          <button
                            onClick={() => { setSelected(u); setModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Editar"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {perms.canInviteUser && u.status !== 'ACTIVE' && (
                          <button
                            onClick={() => setStatus.mutate({ id: u.id, status: 'ACTIVE' })}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-emerald-500 transition-colors"
                            title="Activar"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {perms.canInviteUser && u.status === 'ACTIVE' && (
                          <button
                            onClick={() => setStatus.mutate({ id: u.id, status: 'SUSPENDED' })}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-amber-500 transition-colors"
                            title="Suspender"
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {perms.canInviteUser && (
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar a ${u.name}? Quedará inactivo.`)) {
                                deleteUser.mutate(u.id);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-rose-500 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Página {page} de {pages} — {total} usuarios
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <UserModal
          user={selected}
          onClose={() => setModal(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['users'] });
            setModal(false);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

// ── Modal crear / editar usuario ──────────────────────────────────────
function UserModal({
  user,
  onClose,
  onSaved,
}: {
  user: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!user;
  const { data: branchesData } = useQuery({
    queryKey: ['branches-list'],
    queryFn: () => api.get('/branches').then((r) => r.data.data),
  });
  const branches: any[] = Array.isArray(branchesData) ? branchesData : (branchesData?.items ?? []);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name:     user?.name     ?? '',
      email:    user?.email    ?? '',
      password: '',
      role:     user?.role     ?? 'CASHIER',
      branchId: user?.branchId ?? '',
      phone:    user?.phone    ?? '',
    },
  });

  const save = useMutation({
    mutationFn: (data: any) => {
      const payload = { ...data };
      if (!payload.password) delete payload.password;
      if (!payload.branchId) delete payload.branchId;
      return isEdit
        ? api.put(`/users/${user.id}`, payload)
        : api.post('/users', payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Usuario actualizado' : 'Usuario creado');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al guardar'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md nexus-card max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-semibold">
            {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Nombre completo *</Label>
              <Input placeholder="Juan Pérez" {...register('name', { required: true })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="juan@empresa.com"
                {...register('email', { required: true })}
                disabled={isEdit}
              />
            </div>
            {!isEdit && (
              <div className="col-span-2 space-y-1.5">
                <Label>Contraseña temporal *</Label>
                <Input
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  {...register('password', { required: !isEdit, minLength: 8 })}
                />
                {errors.password && (
                  <p className="text-xs text-rose-400">Mínimo 8 caracteres</p>
                )}
              </div>
            )}
            {isEdit && (
              <div className="col-span-2 space-y-1.5">
                <Label>Nueva contraseña <span className="text-muted-foreground">(opcional)</span></Label>
                <Input
                  type="password"
                  placeholder="Dejar vacío para no cambiar"
                  {...register('password')}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Rol *</Label>
              <select className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" {...register('role')}>
                <option value="VIEWER">Visor</option>
                <option value="EMPLOYEE">Empleado</option>
                <option value="CASHIER">Cajero</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="MANAGER">Gerente</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Sede</Label>
              <select className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" {...register('branchId')}>
                <option value="">Sin sede</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Teléfono</Label>
              <Input placeholder="+57 300 000 0000" {...register('phone')} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-nexus-600 hover:bg-nexus-500" disabled={save.isPending}>
              {isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
