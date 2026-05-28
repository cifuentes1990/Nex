'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe, Instagram, MessageCircle, ShoppingBag, Settings,
  TrendingUp, Package, Users, Eye, ToggleLeft, ToggleRight,
  ExternalLink, Copy, Palette, Smartphone, Zap, CheckCircle2,
  MapPin, CreditCard, RefreshCw, AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useQuery as useChannelsQuery } from '@tanstack/react-query';

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

// ── Resumen de ventas por canal ──────────────────────────────────────
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
        <p className="text-sm text-muted-foreground text-center py-6">Sin datos aún. Las estadísticas aparecerán cuando tengas ventas.</p>
      ) : (
        <div className="space-y-3">
          {channels.map((ch: any) => (
            <div key={ch.channel} className="flex items-center gap-3">
              <p className="text-sm w-40 shrink-0">{CHANNEL_LABEL[ch.channel] ?? ch.channel}</p>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-nexus-500 rounded-full"
                  style={{ width: `${ch.percentage}%` }}
                />
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
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [storeName, setStoreName] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    toast.success('Configuración guardada', {
      description: 'Los cambios se aplicarán en tus canales de venta',
    });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-5 w-5 text-nexus-500" />
            <h1 className="text-2xl font-bold">Tienda Online & Canales</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Gestiona todos tus canales de venta digitales desde un solo lugar
          </p>
        </div>

        {/* Estadísticas por canal */}
        <ChannelStats />

        {/* Canales disponibles */}
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

        {/* Configuración rápida */}
        <div className="nexus-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-4 w-4 text-nexus-500" />
            <h3 className="font-semibold text-sm">Configuración básica</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nombre de tu tienda</label>
              <Input
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                placeholder="Ej: Mi Tienda Online"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <MessageCircle className="h-3 w-3 text-emerald-500" /> WhatsApp de ventas
              </label>
              <Input
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="+57 300 000 0000"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Instagram className="h-3 w-3 text-pink-500" /> Instagram
              </label>
              <Input
                value={instagram}
                onChange={e => setInstagram(e.target.value)}
                placeholder="@mitienda"
                className="h-9"
              />
            </div>
          </div>

          {/* Métodos de pago */}
          <div className="mt-5">
            <p className="text-xs font-medium text-muted-foreground mb-3">Métodos de pago aceptados</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Efectivo contra entrega', icon: '💵', active: true },
                { label: 'Transferencia bancaria', icon: '🏦', active: true },
                { label: 'Nequi / Daviplata', icon: '📱', active: true },
                { label: 'PSE', icon: '💳', active: false },
                { label: 'Tarjeta crédito', icon: '💳', active: false },
              ].map(pm => (
                <div
                  key={pm.label}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border cursor-pointer transition-all',
                    pm.active
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                      : 'border-border text-muted-foreground bg-muted/30',
                  )}
                >
                  <span>{pm.icon}</span>
                  {pm.label}
                  {pm.active && <CheckCircle2 className="h-3 w-3 ml-1" />}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button
              onClick={handleSave}
              className={cn('gap-2', saved && 'bg-emerald-500 hover:bg-emerald-600')}
            >
              {saved ? <CheckCircle2 className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
              {saved ? 'Guardado' : 'Guardar configuración'}
            </Button>
          </div>
        </div>

        {/* Checklist de lanzamiento */}
        <div className="nexus-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold text-sm">Checklist para vender online</h3>
          </div>
          <div className="space-y-3">
            {[
              { done: true,  label: 'Crea tu catálogo de productos',              desc: 'Agrega fotos, precios y descripción a todos tus productos' },
              { done: true,  label: 'Configura tus métodos de pago',              desc: 'Define cómo quieres recibir los pagos de pedidos online' },
              { done: false, label: 'Crea tus zonas de envío',                    desc: 'Define ciudades, tiempos de entrega y costo de domicilio' },
              { done: false, label: 'Activa productos para venta online',          desc: 'Marca qué productos quieres mostrar en tus canales digitales' },
              { done: false, label: 'Comparte tu catálogo en WhatsApp/Instagram', desc: 'Usa el link o QR de tu tienda para capturar clientes' },
              { done: false, label: 'Recibe y gestiona tu primer pedido online',   desc: 'Procesa el pedido desde la sección "Pedidos Online"' },
            ].map((item, i) => (
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
