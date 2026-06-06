'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Search, Filter, ChevronLeft, ChevronRight, User, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { useRouter } from 'next/navigation';

const ACTION_COLORS: Record<string, string> = {
  CREATE:        'bg-emerald-500/15 text-emerald-400',
  UPDATE:        'bg-blue-500/15 text-blue-400',
  DELETE:        'bg-rose-500/15 text-rose-400',
  LOGIN:         'bg-nexus-500/15 text-nexus-400',
  STATUS_CHANGE: 'bg-amber-500/15 text-amber-400',
  ADJUST:        'bg-purple-500/15 text-purple-400',
};

const ACTION_LABELS: Record<string, string> = {
  CREATE:        'Crear',
  UPDATE:        'Actualizar',
  DELETE:        'Eliminar',
  LOGIN:         'Login',
  STATUS_CHANGE: 'Estado',
  ADJUST:        'Ajuste',
};

export default function AuditPage() {
  const perms = usePermissions();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [entity, setEntity]   = useState('');
  const [action, setAction]   = useState('');
  const [from, setFrom]       = useState('');
  const [to, setTo]           = useState('');
  const [page, setPage]       = useState(1);

  // Redirect if not authorized
  if (!perms.canViewAuditLog) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
          <p className="font-medium">Acceso restringido</p>
          <p className="text-sm text-muted-foreground">Solo administradores pueden ver el registro de auditoría</p>
          <Button variant="outline" size="sm" onClick={() => router.back()}>Volver</Button>
        </div>
      </div>
    );
  }

  return <AuditContent
    search={search} setSearch={setSearch}
    entity={entity} setEntity={setEntity}
    action={action} setAction={setAction}
    from={from} setFrom={setFrom}
    to={to} setTo={setTo}
    page={page} setPage={setPage}
  />;
}

function AuditContent({
  search, setSearch,
  entity, setEntity,
  action, setAction,
  from, setFrom,
  to, setTo,
  page, setPage,
}: any) {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', entity, action, from, to, page],
    queryFn: () =>
      api.get('/audit-logs', {
        params: {
          entity:   entity   || undefined,
          action:   action   || undefined,
          from:     from     || undefined,
          to:       to       || undefined,
          page,
          limit: 30,
        },
      }).then((r) => r.data.data),
    placeholderData: (prev) => prev,
  });

  const logs: any[]   = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const pages: number = data?.pages ?? 1;

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1200px] mx-auto">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auditoría</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Registro de todas las acciones importantes del sistema
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm"
            value={entity}
            onChange={(e) => { setEntity(e.target.value); setPage(1); }}
          >
            <option value="">Todas las entidades</option>
            <option value="User">Usuarios</option>
            <option value="Product">Productos</option>
            <option value="Inventory">Inventario</option>
            <option value="Order">Órdenes</option>
            <option value="Auth">Autenticación</option>
          </select>
          <select
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm"
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
          >
            <option value="">Todas las acciones</option>
            <option value="CREATE">Crear</option>
            <option value="UPDATE">Actualizar</option>
            <option value="DELETE">Eliminar</option>
            <option value="LOGIN">Login</option>
            <option value="STATUS_CHANGE">Cambio de estado</option>
          </select>
          <Input
            type="date"
            className="h-10 w-auto"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            placeholder="Desde"
          />
          <Input
            type="date"
            className="h-10 w-auto"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            placeholder="Hasta"
          />
          {(entity || action || from || to) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setEntity(''); setAction(''); setFrom(''); setTo(''); setPage(1); }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Stats */}
        <p className="text-sm text-muted-foreground">{total} registro{total !== 1 ? 's' : ''}</p>

        {/* Log list */}
        <div className="nexus-card overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando registros...</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-muted-foreground">No hay registros de auditoría</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Action badge */}
                    <span className={cn(
                      'text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 mt-0.5 select-none cursor-default',
                      ACTION_COLORS[log.action] ?? 'bg-muted text-muted-foreground',
                    )}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{log.entity}</span>
                        {log.entityId && (
                          <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {log.entityId.substring(0, 8)}...
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {log.user && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {log.user.name} ({log.user.role})
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(log.createdAt).toLocaleString('es-CO', {
                            dateStyle: 'short', timeStyle: 'short',
                          })}
                        </span>
                        {log.ipAddress && (
                          <span className="font-mono">{log.ipAddress}</span>
                        )}
                      </div>

                      {/* Changed values */}
                      {(log.oldValues || log.newValues) && (
                        <div className="mt-2 flex gap-3 select-none">
                          {log.oldValues && (
                            <div className="text-[11px] bg-rose-500/10 rounded-lg px-2.5 py-1.5">
                              <p className="text-rose-400 font-semibold mb-0.5">Antes</p>
                              <pre className="text-muted-foreground overflow-auto max-w-[200px] max-h-[80px] cursor-default">
                                {JSON.stringify(log.oldValues, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.newValues && (
                            <div className="text-[11px] bg-emerald-500/10 rounded-lg px-2.5 py-1.5">
                              <p className="text-emerald-400 font-semibold mb-0.5">Después</p>
                              <pre className="text-muted-foreground overflow-auto max-w-[200px] max-h-[80px] cursor-default">
                                {JSON.stringify(log.newValues, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Página {page} de {pages}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p: number) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p: number) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
