'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Zap, Plus, X, Edit, Trash2,
  Clock, Bell, Package, ShoppingCart, Mail, Tag,
  ChevronRight, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatRelativeTime } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

// ── Mapeo de triggers ─────────────────────────────────────────────────
// El campo trigger en DB puede ser:
//   • string enum:  "LOW_STOCK"
//   • JSON objeto:  { event: "inventory.low_stock", threshold: 10 }
// Esta función normaliza ambos a una clave string para el mapa.
function getTriggerKey(trigger: unknown): string {
  if (typeof trigger === 'string') return trigger;
  if (trigger && typeof trigger === 'object') {
    const t = trigger as Record<string, unknown>;
    if (typeof t.event === 'string') return t.event;
  }
  return 'UNKNOWN';
}

const TRIGGER_MAP: Record<string, { label: string; icon: any; color: string }> = {
  // Formato enum (creados desde el frontend)
  LOW_STOCK:        { label: 'Stock bajo',           icon: Package,     color: 'text-amber-500' },
  NEW_ORDER:        { label: 'Nueva orden',           icon: ShoppingCart, color: 'text-nexus-500' },
  DAILY_SCHEDULE:   { label: 'Programación diaria',   icon: Clock,       color: 'text-blue-500' },
  INVOICE_OVERDUE:  { label: 'Factura vencida',       icon: Bell,        color: 'text-rose-500' },
  CUSTOMER_BIRTHDAY: { label: 'Cumpleaños cliente',   icon: Tag,         color: 'text-purple-500' },

  // Formato evento (datos del seed / JSON en DB)
  'inventory.low_stock':  { label: 'Stock bajo',           icon: Package,     color: 'text-amber-500' },
  'order.created':        { label: 'Nueva orden',           icon: ShoppingCart, color: 'text-nexus-500' },
  'schedule':             { label: 'Programación diaria',   icon: Clock,       color: 'text-blue-500' },
  'invoice.overdue':      { label: 'Factura vencida',       icon: Bell,        color: 'text-rose-500' },
  'customer.birthday':    { label: 'Cumpleaños cliente',    icon: Tag,         color: 'text-purple-500' },
  'order.completed':      { label: 'Orden completada',       icon: ShoppingCart, color: 'text-emerald-500' },
};

const ACTION_MAP: Record<string, string> = {
  SEND_EMAIL:          'Enviar email',
  send_email:          'Enviar email',
  SEND_WHATSAPP:       'Enviar WhatsApp',
  send_whatsapp:       'Enviar WhatsApp',
  CREATE_TASK:         'Crear tarea',
  create_task:         'Crear tarea',
  SEND_NOTIFICATION:   'Notificación interna',
  send_notification:   'Notificación interna',
  GENERATE_REPORT:     'Generar reporte',
  generate_report:     'Generar reporte',
};

export default function AutomationsPage() {
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: () => api.get('/automations').then((r) => r.data.data),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/automations/${id}`, { isActive }),
    onSuccess: () => {
      toast.success('Automatización actualizada');
      queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
  });

  const deleteAuto = useMutation({
    mutationFn: (id: string) => api.delete(`/automations/${id}`),
    onSuccess: () => {
      toast.success('Automatización eliminada');
      queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
  });

  const automations: any[] = data?.items ?? (Array.isArray(data) ? data : []);
  const activeCount = automations.filter((a) => a.isActive).length;

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1200px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Automatizaciones</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Reglas automáticas para tu negocio — {activeCount} activas
            </p>
          </div>
          <Button
            size="sm"
            className="gap-2 bg-nexus-600 hover:bg-nexus-500"
            onClick={() => { setSelected(null); setShowModal(true); }}
          >
            <Plus className="h-4 w-4" /> Nueva automatización
          </Button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total',         value: automations.length,     color: 'nexus' },
            { label: 'Activas',       value: activeCount,            color: 'emerald' },
            { label: 'Inactivas',     value: automations.length - activeCount, color: 'rose' },
          ].map((s) => {
            const colorCls: Record<string, string> = {
              nexus:   'text-nexus-500',
              emerald: 'text-emerald-500',
              rose:    'text-rose-500',
            };
            return (
              <div key={s.label} className="nexus-card p-4">
                <p className={cn('text-3xl font-bold', colorCls[s.color])}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="nexus-card p-5 h-20 animate-pulse bg-muted/50" />
            ))}
          </div>
        ) : automations.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay automatizaciones</p>
            <p className="text-sm mt-1">Crea tu primera regla automática</p>
            <Button
              size="sm"
              className="mt-4 gap-2 bg-nexus-600 hover:bg-nexus-500"
              onClick={() => setShowModal(true)}
            >
              <Plus className="h-4 w-4" /> Crear automatización
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {automations.map((auto: any) => {
              const triggerKey = getTriggerKey(auto.trigger);
              const triggerInfo = TRIGGER_MAP[triggerKey] ?? {
                label: triggerKey,
                icon: Zap,
                color: 'text-muted-foreground',
              };
              const TriggerIcon = triggerInfo.icon;
              // action puede ser string o primer elemento del array actions
              const actionKey = typeof auto.action === 'string'
                ? auto.action
                : (Array.isArray(auto.actions) ? auto.actions[0]?.type : '') ?? '';
              const actionLabel = ACTION_MAP[actionKey] ?? actionKey ?? '—';

              return (
                <div
                  key={auto.id}
                  className={cn(
                    'nexus-card p-5 flex items-center gap-4 transition-colors',
                    !auto.isActive && 'opacity-60',
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <TriggerIcon className={cn('h-5 w-5', triggerInfo.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-sm">{auto.name}</p>
                      {!auto.isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          Pausada
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{triggerInfo.label}</span>
                      <ChevronRight className="h-3 w-3" />
                      <span>{actionLabel}</span>
                      {auto.lastRunAt && (
                        <>
                          <span>·</span>
                          <span>Última ejecución: {formatRelativeTime(auto.lastRunAt)}</span>
                        </>
                      )}
                    </div>
                    {auto.description && (
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate max-w-[500px]">
                        {auto.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggle.mutate({ id: auto.id, isActive: !auto.isActive })}
                      className={cn(
                        'transition-colors',
                        auto.isActive
                          ? 'text-nexus-500 hover:text-nexus-400'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      title={auto.isActive ? 'Pausar' : 'Activar'}
                    >
                      {auto.isActive
                        ? <ToggleRight className="h-6 w-6" />
                        : <ToggleLeft className="h-6 w-6" />}
                    </button>
                    <button
                      onClick={() => { setSelected(auto); setShowModal(true); }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteAuto.mutate(auto.id)}
                      className="text-muted-foreground hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <AutomationModal
          automation={selected}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['automations'] });
            setShowModal(false);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

// ── Modal crear / editar ───────────────────────────────────────────────
function AutomationModal({
  automation,
  onClose,
  onSaved,
}: {
  automation: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!automation;

  // Extraer trigger key para el formulario
  const triggerDefault = typeof automation?.trigger === 'string'
    ? automation.trigger
    : (automation?.trigger as any)?.event ?? 'LOW_STOCK';

  // Extraer action para el formulario
  const actionDefault = typeof automation?.action === 'string'
    ? automation.action
    : (Array.isArray(automation?.actions) ? automation.actions[0]?.type : 'SEND_NOTIFICATION') ?? 'SEND_NOTIFICATION';

  const { register, handleSubmit } = useForm({
    defaultValues: {
      name:     automation?.name ?? '',
      trigger:  triggerDefault,
      action:   actionDefault,
      isActive: automation?.isActive ?? true,
    },
  });

  const save = useMutation({
    mutationFn: (data: any) =>
      isEdit
        ? api.put(`/automations/${automation.id}`, data)
        : api.post('/automations', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Automatización actualizada' : 'Automatización creada');
      onSaved();
    },
    onError: () => toast.error('Error al guardar'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md nexus-card">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-semibold">
            {isEdit ? 'Editar automatización' : 'Nueva automatización'}
          </h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input
              placeholder="Ej: Alerta stock crítico"
              {...register('name', { required: true })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Disparador (Cuando...)</Label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
              {...register('trigger')}
            >
              <option value="LOW_STOCK">Stock bajo</option>
              <option value="NEW_ORDER">Nueva orden</option>
              <option value="DAILY_SCHEDULE">Programación diaria</option>
              <option value="INVOICE_OVERDUE">Factura vencida</option>
              <option value="CUSTOMER_BIRTHDAY">Cumpleaños cliente</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Acción (Entonces...)</Label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
              {...register('action')}
            >
              <option value="SEND_EMAIL">Enviar email</option>
              <option value="SEND_WHATSAPP">Enviar WhatsApp</option>
              <option value="CREATE_TASK">Crear tarea</option>
              <option value="SEND_NOTIFICATION">Notificación interna</option>
              <option value="GENERATE_REPORT">Generar reporte</option>
            </select>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-nexus-500"
              {...register('isActive')}
            />
            <span className="text-sm">Activar inmediatamente</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-nexus-600 hover:bg-nexus-500"
              disabled={save.isPending}
            >
              {isEdit ? 'Guardar' : 'Crear automatización'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
