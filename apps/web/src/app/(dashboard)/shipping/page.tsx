'use client';

import { useState } from 'react';
import {
  Bike, MapPin, Plus, Clock, Package, Truck,
  CheckCircle2, Edit2, Trash2, DollarSign, Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const COURIERS = ['Coordinadora', 'Servientrega', 'Interrapidísimo', 'TCC', 'Domicilio propio', 'Moto mensajero', 'Otro'];

const DEFAULT_ZONES = [
  { id: '1', name: 'Ciudad local', cities: ['Ciudad principal'], carrier: 'Domicilio propio', minDays: 0, maxDays: 1, baseRate: 5000, freeFrom: 80000, isActive: true },
  { id: '2', name: 'Nacional', cities: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena'], carrier: 'Servientrega', minDays: 2, maxDays: 5, baseRate: 12000, freeFrom: 150000, isActive: true },
  { id: '3', name: 'Zonas especiales', cities: ['Otras ciudades'], carrier: 'Coordinadora', minDays: 3, maxDays: 8, baseRate: 18000, freeFrom: null, isActive: false },
];

function ZoneCard({ zone, onEdit, onToggle, onDelete }: { zone: any; onEdit: (z: any) => void; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className={cn('nexus-card p-4 border transition-all', zone.isActive ? 'border-border' : 'border-border/40 opacity-60')}>
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
              {zone.cities.slice(0, 3).map((c: string) => (
                <span key={c} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{c}</span>
              ))}
              {zone.cities.length > 3 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">+{zone.cities.length - 3} más</span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> {zone.carrier}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {zone.minDays === 0 ? 'Mismo día' : `${zone.minDays}–${zone.maxDays} días`}</span>
              <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {formatCurrency(zone.baseRate)}</span>
              {zone.freeFrom && <span className="flex items-center gap-1 text-emerald-500"><CheckCircle2 className="h-3 w-3" /> Gratis desde {formatCurrency(zone.freeFrom)}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(zone)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onToggle(zone.id)} className={cn('p-1.5 rounded-lg transition-colors', zone.isActive ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-muted-foreground hover:bg-muted')}>
            <CheckCircle2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(zone.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors text-muted-foreground hover:text-rose-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ShippingPage() {
  const [zones, setZones] = useState(DEFAULT_ZONES);
  const [showForm, setShowForm] = useState(false);
  const [editZone, setEditZone] = useState<any>(null);
  const [form, setForm] = useState({ name: '', cities: '', carrier: 'Servientrega', minDays: 1, maxDays: 3, baseRate: 8000, freeFrom: '' });

  const handleToggle = (id: string) => {
    setZones(prev => prev.map(z => z.id === id ? { ...z, isActive: !z.isActive } : z));
    toast.success('Zona actualizada');
  };

  const handleDelete = (id: string) => {
    setZones(prev => prev.filter(z => z.id !== id));
    toast.success('Zona eliminada');
  };

  const handleEdit = (zone: any) => {
    setEditZone(zone);
    setForm({
      name: zone.name,
      cities: zone.cities.join(', '),
      carrier: zone.carrier,
      minDays: zone.minDays,
      maxDays: zone.maxDays,
      baseRate: zone.baseRate,
      freeFrom: zone.freeFrom ?? '',
    });
    setShowForm(true);
  };

  const handleSave = () => {
    const newZone = {
      id: editZone?.id ?? Date.now().toString(),
      name: form.name,
      cities: form.cities.split(',').map(c => c.trim()).filter(Boolean),
      carrier: form.carrier,
      minDays: Number(form.minDays),
      maxDays: Number(form.maxDays),
      baseRate: Number(form.baseRate),
      freeFrom: form.freeFrom ? Number(form.freeFrom) : null,
      isActive: true,
    };
    if (editZone) {
      setZones(prev => prev.map(z => z.id === editZone.id ? newZone : z));
    } else {
      setZones(prev => [...prev, newZone]);
    }
    setShowForm(false);
    setEditZone(null);
    setForm({ name: '', cities: '', carrier: 'Servientrega', minDays: 1, maxDays: 3, baseRate: 8000, freeFrom: '' });
    toast.success(editZone ? 'Zona actualizada' : 'Zona creada');
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
            <p className="text-muted-foreground text-sm mt-0.5">
              Configura tiempos, costos y métodos de entrega por zona geográfica
            </p>
          </div>
          <Button onClick={() => { setEditZone(null); setShowForm(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nueva zona
          </Button>
        </div>

        {/* Métodos de entrega */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Recoge en tienda', icon: '🏪', desc: 'El cliente recoge en tu local', color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Domicilio propio', icon: '🛵', desc: 'Tu mensajero lleva el pedido',  color: 'text-nexus-500',bg: 'bg-nexus-500/10' },
            { label: 'Mensajería',       icon: '📦', desc: 'Servientrega, Coordinadora...',  color: 'text-purple-500',bg: 'bg-purple-500/10' },
            { label: 'Digital',          icon: '💻', desc: 'Descarga, código, link',          color: 'text-emerald-500',bg: 'bg-emerald-500/10' },
          ].map(m => (
            <div key={m.label} className={cn('nexus-card p-3 border border-border/50')}>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-lg mb-2', m.bg)}>{m.icon}</div>
              <p className={cn('text-xs font-semibold', m.color)}>{m.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{m.desc}</p>
            </div>
          ))}
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="nexus-card p-5 border-2 border-nexus-500/30">
            <h3 className="font-semibold text-sm mb-4">{editZone ? 'Editar zona' : 'Nueva zona de envío'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nombre de la zona *</label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Nacional, Bogotá, Eje cafetero" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Ciudades cubiertas</label>
                <Input value={form.cities} onChange={e => setForm(p => ({ ...p, cities: e.target.value }))} placeholder="Bogotá, Medellín, Cali (separadas por coma)" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Mensajería / Carrier</label>
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
                <label className="text-xs font-medium text-muted-foreground">Envío gratis desde (COP) — opcional</label>
                <Input type="number" value={form.freeFrom} onChange={e => setForm(p => ({ ...p, freeFrom: e.target.value }))} placeholder="Ej: 100000" className="h-9" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button onClick={handleSave} disabled={!form.name} className="gap-2">
                <CheckCircle2 className="h-4 w-4" /> {editZone ? 'Guardar cambios' : 'Crear zona'}
              </Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setEditZone(null); }}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Lista de zonas */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Zonas configuradas ({zones.filter(z => z.isActive).length} activas)
          </h2>
          <div className="space-y-3">
            {zones.map(zone => (
              <ZoneCard key={zone.id} zone={zone} onEdit={handleEdit} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </div>
        </div>

        {/* Tip */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-nexus-500/5 border border-nexus-500/20 text-xs">
          <Globe className="h-4 w-4 text-nexus-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-nexus-500">Consejo para envíos nacionales</p>
            <p className="text-muted-foreground mt-0.5">
              Ofrece envío gratis a partir de cierto monto para aumentar el valor promedio del pedido.
              Los negocios con envío gratis desde $100.000 ven un aumento del 25% en el ticket promedio.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
