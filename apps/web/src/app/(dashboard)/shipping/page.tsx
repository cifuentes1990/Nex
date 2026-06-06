'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bike, MapPin, Plus, Clock, Package, Truck,
  CheckCircle2, Edit2, Trash2, DollarSign, Globe, X, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const COURIERS = ['Coordinadora', 'Servientrega', 'Interrapidísimo', 'TCC', 'Domicilio propio', 'Moto mensajero', 'Otro'];

export default function ShippingPage() {
  const [showForm, setShowForm]   = useState(false);
  const [editZone, setEditZone]   = useState<any>(null);
  const [form, setForm]           = useState({ name: '', cities: '', carrier: 'Servientrega', minDays: 1, maxDays: 3, baseRate: 8000, freeFrom: '' });
  const queryClient               = useQueryClient();

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['shipping-zones'],
    queryFn: () => api.get('/online-store/shipping-zones').then(r => r.data.data ?? []),
    staleTime: 60_000,
  });

  const createZone = useMutation({
    mutationFn: (data: any) => api.post('/online-store/shipping-zones', data),
    onSuccess: () => { toast.success('Zona creada'); queryClient.invalidateQueries({ queryKey: ['shipping-zones'] }); setShowForm(false); resetForm(); },
    onError: () => toast.error('Error al crear zona'),
  });

  const updateZone = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/online-store/shipping-zones/${id}`, data),
    onSuccess: () => { toast.success('Zona actualizada'); queryClient.invalidateQueries({ queryKey: ['shipping-zones'] }); setShowForm(false); setEditZone(null); resetForm(); },
    onError: () => toast.error('Error al actualizar zona'),
  });

  const deleteZone = useMutation({
    mutationFn: (id: string) => api.delete(`/online-store/shipping-zones/${id}`),
    onSuccess: () => { toast.success('Zona eliminada'); queryClient.invalidateQueries({ queryKey: ['shipping-zones'] }); },
    onError: () => toast.error('Error al eliminar zona'),
  });

  const toggleZone = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/online-store/shipping-zones/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shipping-zones'] }),
  });

  const resetForm = () => setForm({ name: '', cities: '', carrier: 'Servientrega', minDays: 1, maxDays: 3, baseRate: 8000, freeFrom: '' });

  const handleEdit = (zone: any) => {
    setEditZone(zone);
    setForm({
      name: zone.name, cities: (zone.cities ?? []).join(', '),
      carrier: zone.carrier ?? 'Servientrega', minDays: zone.minDays,
      maxDays: zone.maxDays, baseRate: zone.baseRate, freeFrom: zone.freeFrom ?? '',
    });
    setShowForm(true);
  };

  const handleSave = () => {
    const payload = {
      name: form.name, cities: form.cities.split(',').map((c: string) => c.trim()).filter(Boolean),
      carrier: form.carrier, minDays: Number(form.minDays), maxDays: Number(form.maxDays),
      baseRate: Number(form.baseRate), freeFrom: form.freeFrom ? Number(form.freeFrom) : null,
      isActive: true,
    };
    if (editZone) { updateZone.mutate({ id: editZone.id, data: payload }); }
    else          { createZone.mutate(payload); }
  };

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1000px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Bike className="h-5 w-5 text-nexus-500" />
              <h1 className="text-2xl font-bold">Zonas de Envío</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">Configura tiempos, costos y métodos de entrega por zona</p>
          </div>
          <Button onClick={() => { setEditZone(null); resetForm(); setShowForm(true); }} className="gap-2 bg-nexus-600 hover:bg-nexus-500">
            <Plus className="h-4 w-4" /> Nueva zona
          </Button>
        </div>

        {/* Tipos de entrega */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Recoge en tienda', icon: '🏪', desc: 'El cliente recoge en tu local',  color: 'text-blue-500',    bg: 'bg-blue-500/10' },
            { label: 'Domicilio propio', icon: '🛵', desc: 'Tu mensajero lleva el pedido',   color: 'text-nexus-500',   bg: 'bg-nexus-500/10' },
            { label: 'Mensajería',       icon: '📦', desc: 'Servientrega, Coordinadora...',  color: 'text-purple-500',  bg: 'bg-purple-500/10' },
            { label: 'Digital',          icon: '💻', desc: 'Descarga, código, link',         color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          ].map(m => (
            <div key={m.label} className="nexus-card p-3 border border-border/50">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-lg mb-2', m.bg)}>{m.icon}</div>
              <p className={cn('text-xs font-semibold', m.color)}>{m.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{m.desc}</p>
            </div>
          ))}
        </div>

        {/* Formulario inline */}
        {showForm && (
          <div className="nexus-card p-5 border-2 border-nexus-500/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">{editZone ? 'Editar zona' : 'Nueva zona de envío'}</h3>
              <button onClick={() => { setShowForm(false); setEditZone(null); resetForm(); }}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nombre de la zona *</label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Nacional, Bogotá D.C." className="h-9" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Ciudades (separadas por coma)</label>
                <Input value={form.cities} onChange={e => setForm(p => ({ ...p, cities: e.target.value }))} placeholder="Bogotá, Medellín, Cali" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Transportista</label>
                <select value={form.carrier} onChange={e => setForm(p => ({ ...p, carrier: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                  {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Días mín.</label>
                  <Input type="number" value={form.minDays} onChange={e => setForm(p => ({ ...p, minDays: Number(e.target.value) }))} className="h-9" min={0} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Días máx.</label>
                  <Input type="number" value={form.maxDays} onChange={e => setForm(p => ({ ...p, maxDays: Number(e.target.value) }))} className="h-9" min={0} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Costo de envío (COP)</label>
                <Input type="number" value={form.baseRate} onChange={e => setForm(p => ({ ...p, baseRate: Number(e.target.value) }))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Envío gratis desde (COP)</label>
                <Input type="number" value={form.freeFrom} onChange={e => setForm(p => ({ ...p, freeFrom: e.target.value }))} placeholder="Ej: 100000 — dejar vacío si no aplica" className="h-9" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button onClick={handleSave} disabled={!form.name || createZone.isPending || updateZone.isPending} className="gap-2 bg-nexus-600 hover:bg-nexus-500">
                {(createZone.isPending || updateZone.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {editZone ? 'Guardar cambios' : 'Crear zona'}
              </Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setEditZone(null); resetForm(); }}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Lista de zonas */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Zonas configuradas ({(zones as any[]).filter((z: any) => z.isActive).length} activas)
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="nexus-card p-4 h-24 animate-pulse bg-muted/20" />)}
            </div>
          ) : (zones as any[]).length === 0 ? (
            <div className="nexus-card p-8 text-center text-muted-foreground">
              <Bike className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay zonas de envío configuradas</p>
              <Button size="sm" className="mt-3 gap-2 bg-nexus-600 hover:bg-nexus-500" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" /> Crear primera zona
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {(zones as any[]).map((zone: any) => (
                <div key={zone.id} className={cn('nexus-card p-4 border transition-all', zone.isActive ? 'border-border' : 'border-border/40 opacity-60')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', zone.isActive ? 'bg-nexus-500/10' : 'bg-muted')}>
                        <Bike className={cn('h-4 w-4', zone.isActive ? 'text-nexus-500' : 'text-muted-foreground')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{zone.name}</p>
                          {!zone.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Inactiva</span>}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(zone.cities ?? []).slice(0, 4).map((c: string) => (
                            <span key={c} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{c}</span>
                          ))}
                          {(zone.cities ?? []).length > 4 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">+{zone.cities.length - 4} más</span>}
                        </div>
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                          {zone.carrier && <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> {zone.carrier}</span>}
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {zone.minDays === 0 ? 'Mismo día' : `${zone.minDays}–${zone.maxDays} días`}</span>
                          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {formatCurrency(zone.baseRate)}</span>
                          {zone.freeFrom && <span className="flex items-center gap-1 text-emerald-500"><CheckCircle2 className="h-3 w-3" /> Gratis desde {formatCurrency(zone.freeFrom)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleEdit(zone)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => toggleZone.mutate({ id: zone.id, isActive: !zone.isActive })} className={cn('p-1.5 rounded-lg transition-colors', zone.isActive ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-muted-foreground hover:bg-muted')}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteZone.mutate(zone.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors text-muted-foreground hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-nexus-500/5 border border-nexus-500/20 text-xs">
          <Globe className="h-4 w-4 text-nexus-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-nexus-500">Consejo para envíos nacionales</p>
            <p className="text-muted-foreground mt-0.5">Ofrece envío gratis a partir de cierto monto para aumentar el ticket promedio. Los negocios con envío gratis desde $100.000 ven un aumento del 25% en el ticket promedio.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
