'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe, Instagram, MessageCircle, ShoppingBag, Settings,
  TrendingUp, Zap, CheckCircle2, Loader2, ToggleLeft, ToggleRight,
  Copy, ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// ── Canales de venta ─────────────────────────────────────────────────
const CHANNELS = [
  {
    key: 'whatsapp',
    name: 'WhatsApp Business',
    icon: MessageCircle,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    description: 'Recibe pedidos por WhatsApp y gestiónalos desde Nexus',
    steps: ['Agrega tu número', 'Comparte tu catálogo', 'Recibe pedidos automáticamente'],
  },
  {
    key: 'instagram',
    name: 'Instagram Shop',
    icon: Instagram,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    description: 'Vende directamente desde tus publicaciones e historias',
    steps: ['Conecta tu cuenta', 'Etiqueta productos', 'Clientes compran sin salir de Instagram'],
  },
  {
    key: 'web',
    name: 'Tienda Web',
    icon: Globe,
    color: 'text-nexus-500',
    bg: 'bg-nexus-500/10',
    border: 'border-nexus-500/20',
    description: 'Tu catálogo online con carrito de compras propio',
    steps: ['Configura tu tienda', 'Publica productos', 'Recibe pagos online'],
  },
  {
    key: 'marketplace',
    name: 'Marketplaces',
    icon: ShoppingBag,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    description: 'Sincroniza con MercadoLibre, Rappi y otros marketplaces',
    steps: ['Conecta tu cuenta', 'Importa listados', 'Órdenes sincronizadas'],
  },
];

// ── Estadísticas por canal ───────────────────────────────────────────
function ChannelStats() {
  const { data: channels = [] } = useQuery({
    queryKey: ['sales-by-channel'],
    queryFn: () => api.get('/analytics/channels', { params: { days: 30 } }).then(r => r.data.data ?? []),
    staleTime: 5 * 60_000,
  });

  const CHANNEL_LABEL: Record<string, string> = {
    POS: '🏪 Tienda Física',
    ONLINE: '🌐 Web',
    WHATSAPP: '💬 WhatsApp',
    INSTAGRAM: '📸 Instagram',
    PHONE: '📞 Teléfono',
    MARKETPLACE: '🛒 Marketplace',
  };

  return (
    <div className="nexus-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-nexus-500" />
        <h3 className="font-semibold text-sm">Ventas por canal — últimos 30 días</h3>
      </div>
      {channels.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Sin datos aún. Las estadísticas aparecerán cuando tengas ventas.
        </p>
      ) : (
        <div className="space-y-3">
          {channels.map((ch: any) => (
            <div key={ch.channel} className="flex items-center gap-3">
              <p className="text-sm w-40 shrink-0">{CHANNEL_LABEL[ch.channel] ?? ch.channel}</p>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-nexus-500 rounded-full" style={{ width: `${ch.percentage}%` }} />
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold tabular-nums">{formatCurrency(ch.revenue)}</p>
                <p className="text-[10px] text-muted-foreground">{ch.orders} órdenes · {ch.percentage}%</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────
export default function OnlineStorePage() {
  const queryClient = useQueryClient();

  // ── Fetch tienda desde API ────────────────────────────────────────
  const { data: store, isLoading: loadingStore } = useQuery({
    queryKey: ['online-store'],
    queryFn: () => api.get('/online-store').then(r => r.data.data),
    staleTime: 30_000,
  });

  // ── Fetch zonas de envío (para checklist) ────────────────────────
  const { data: zones = [] } = useQuery({
    queryKey: ['shipping-zones'],
    queryFn: () => api.get('/online-store/shipping-zones').then(r => r.data.data ?? []),
    staleTime: 60_000,
  });

  // ── Fetch productos (para checklist) ─────────────────────────────
  const { data: productsData } = useQuery({
    queryKey: ['products-count'],
    queryFn: () => api.get('/products', { params: { limit: 1 } }).then(r => r.data.data),
    staleTime: 60_000,
  });

  // ── Estado local del formulario ───────────────────────────────────
  const [form, setForm] = useState({
    name: '',
    whatsapp: '',
    instagram: '',
    acceptsCOD: true,
    acceptsTransfer: true,
    acceptsOnline: false,
    isActive: false,
  });

  // Sincronizar cuando llega la data de la API
  useEffect(() => {
    if (store) {
      setForm({
        name:            store.name            ?? '',
        whatsapp:        store.whatsappNumber  ?? '',
        instagram:       store.instagramHandle ?? '',
        acceptsCOD:      store.acceptsCOD      ?? true,
        acceptsTransfer: store.acceptsTransfer ?? true,
        acceptsOnline:   store.acceptsOnline   ?? false,
        isActive:        store.isActive        ?? false,
      });
    }
  }, [store]);

  // ── Mutation guardar ──────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => api.patch('/online-store', {
      name:            form.name            || undefined,
      whatsappNumber:  form.whatsapp        || undefined,
      instagramHandle: form.instagram       || undefined,
      acceptsCOD:      form.acceptsCOD,
      acceptsTransfer: form.acceptsTransfer,
      acceptsOnline:   form.acceptsOnline,
    }),
    onSuccess: () => {
      toast.success('Configuración guardada', { description: 'Los cambios se aplicaron en tu tienda' });
      queryClient.invalidateQueries({ queryKey: ['online-store'] });
    },
    onError: () => toast.error('Error al guardar la configuración'),
  });

  // ── Mutation toggle isActive ──────────────────────────────────────
  const toggleActive = useMutation({
    mutationFn: (active: boolean) => api.patch('/online-store', { isActive: active }),
    onSuccess: (_, active) => {
      toast.success(active ? 'Tienda activada' : 'Tienda pausada');
      queryClient.invalidateQueries({ queryKey: ['online-store'] });
    },
    onError: () => toast.error('Error al cambiar estado'),
  });

  // ── Checklist dinámica ────────────────────────────────────────────
  const hasProducts  = (productsData?.total ?? productsData?.items?.length ?? 0) > 0;
  const hasZones     = (zones as any[]).length > 0;
  const hasWhatsapp  = !!(store?.whatsappNumber);
  const storeActive  = store?.isActive ?? false;

  const checklist = [
    { done: hasProducts,  label: 'Crea tu catálogo de productos',              desc: 'Agrega fotos, precios y descripción a tus productos' },
    { done: !!(form.acceptsCOD || form.acceptsTransfer || form.acceptsOnline), label: 'Configura tus métodos de pago', desc: 'Define cómo quieres recibir los pagos de pedidos online' },
    { done: hasZones,     label: 'Crea tus zonas de envío',                    desc: 'Define ciudades, tiempos de entrega y costo de domicilio' },
    { done: hasWhatsapp,  label: 'Agrega tu número de WhatsApp',               desc: 'Tus clientes podrán escribirte directamente para pedir' },
    { done: storeActive,  label: 'Activa tu tienda online',                    desc: 'Marca tu tienda como activa para empezar a recibir pedidos' },
  ];

  const doneCount = checklist.filter(c => c.done).length;

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-5 w-5 text-nexus-500" />
              <h1 className="text-2xl font-bold">Tienda Online & Canales</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Gestiona todos tus canales de venta digitales desde un solo lugar
            </p>
          </div>
          {!loadingStore && (
            <button
              onClick={() => {
                const next = !form.isActive;
                setForm(p => ({ ...p, isActive: next }));
                toggleActive.mutate(next);
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                form.isActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                  : 'bg-muted border-border text-muted-foreground',
              )}
            >
              {form.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
              {form.isActive ? 'Tienda activa' : 'Tienda inactiva'}
            </button>
          )}
        </div>

        {/* URL pública de la tienda */}
        {store?.storeUrl && (
          <div className="nexus-card p-4 flex items-center gap-4">
            <Globe className="h-4 w-4 text-nexus-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">URL de tu tienda online</p>
              <p className="text-sm font-mono font-medium truncate">
                {typeof window !== 'undefined' ? window.location.origin : ''}/tienda/{store.storeUrl}
              </p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/tienda/${store.storeUrl}`); toast.success('URL copiada'); }}
              className="shrink-0 p-2 rounded-lg hover:bg-muted transition-colors"
              title="Copiar URL"
            >
              <Copy className="h-4 w-4 text-muted-foreground" />
            </button>
            <a
              href={`/tienda/${store.storeUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 p-2 rounded-lg hover:bg-muted transition-colors"
              title="Abrir tienda"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
        )}

        {/* Estadísticas */}
        <ChannelStats />

        {/* Canales */}
        <div>
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Canales de venta</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CHANNELS.map(channel => {
              const Icon = channel.icon;
              return (
                <div key={channel.key} className={cn('nexus-card p-5 border', channel.border)}>
                  <div className="flex items-start gap-4">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', channel.bg)}>
                      <Icon className={cn('h-5 w-5', channel.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">{channel.name}</h3>
                        <Badge variant="outline" className="text-[10px]">Próximamente</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{channel.description}</p>
                      <div className="mt-3 space-y-1">
                        {channel.steps.map((step, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={cn('w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0', channel.bg, channel.color)}>
                              {i + 1}
                            </span>
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Configuración conectada a la API */}
        <div className="nexus-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-4 w-4 text-nexus-500" />
            <h3 className="font-semibold text-sm">Configuración de la tienda</h3>
          </div>

          {loadingStore ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Cargando configuración...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Nombre de tu tienda</label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ej: Mi Tienda Online"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <MessageCircle className="h-3 w-3 text-emerald-500" /> WhatsApp de ventas
                  </label>
                  <Input
                    value={form.whatsapp}
                    onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))}
                    placeholder="+57 300 000 0000"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Instagram className="h-3 w-3 text-pink-500" /> Instagram
                  </label>
                  <Input
                    value={form.instagram}
                    onChange={e => setForm(p => ({ ...p, instagram: e.target.value }))}
                    placeholder="@mitienda"
                    className="h-9"
                  />
                </div>
              </div>

              {/* Métodos de pago — conectados a store.acceptsCOD / acceptsTransfer / acceptsOnline */}
              <div className="mt-5">
                <p className="text-xs font-medium text-muted-foreground mb-3">Métodos de pago aceptados</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'acceptsCOD',      label: 'Efectivo contra entrega', icon: '💵' },
                    { key: 'acceptsTransfer', label: 'Transferencia / Nequi',    icon: '🏦' },
                    { key: 'acceptsOnline',   label: 'Pago online (PSE / tarjeta)', icon: '💳' },
                  ].map(pm => {
                    const active = form[pm.key as keyof typeof form] as boolean;
                    return (
                      <button
                        key={pm.key}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, [pm.key]: !active }))}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border cursor-pointer transition-all',
                          active
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                            : 'border-border text-muted-foreground bg-muted/30',
                        )}
                      >
                        <span>{pm.icon}</span>
                        {pm.label}
                        {active && <CheckCircle2 className="h-3 w-3 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end mt-5">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="gap-2 bg-nexus-600 hover:bg-nexus-500"
                >
                  {saveMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Settings className="h-4 w-4" />}
                  {saveMutation.isPending ? 'Guardando...' : 'Guardar configuración'}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Checklist dinámica */}
        <div className="nexus-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <h3 className="font-semibold text-sm">Checklist para vender online</h3>
            </div>
            <span className="text-xs text-muted-foreground">{doneCount}/{checklist.length} completados</span>
          </div>

          {/* Barra de progreso */}
          <div className="w-full h-1.5 bg-muted rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-nexus-500 rounded-full transition-all duration-500"
              style={{ width: `${(doneCount / checklist.length) * 100}%` }}
            />
          </div>

          <div className="space-y-3">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                  item.done ? 'bg-emerald-500' : 'border-2 border-border',
                )}>
                  {item.done && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <div>
                  <p className={cn('text-sm font-medium', item.done && 'line-through text-muted-foreground')}>
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
