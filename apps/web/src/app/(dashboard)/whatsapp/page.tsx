'use client';

import { useState } from 'react';
import {
  MessageCircle, Phone, QrCode, Link2, Users, ShoppingCart,
  TrendingUp, CheckCircle2, Copy, ExternalLink, Zap, Bot,
  Clock, Package, Settings, ChevronRight, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const FEATURES = [
  {
    icon: Bot,
    title: 'Respuestas automáticas',
    desc: 'Catálogo, precios y disponibilidad al instante — sin intervención humana',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    status: 'soon',
  },
  {
    icon: ShoppingCart,
    title: 'Pedidos por chat',
    desc: 'Los clientes eligen productos y confirman pedidos directamente en WhatsApp',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    status: 'soon',
  },
  {
    icon: Package,
    title: 'Seguimiento de envíos',
    desc: 'Notifica automáticamente cuando el pedido es confirmado, enviado y entregado',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    status: 'soon',
  },
  {
    icon: TrendingUp,
    title: 'Campañas masivas',
    desc: 'Envía promociones, lanzamientos y ofertas a toda tu lista de clientes',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    status: 'soon',
  },
];

const SETUP_STEPS = [
  { step: 1, title: 'Conecta tu número de WhatsApp Business', done: false },
  { step: 2, title: 'Configura el mensaje de bienvenida', done: false },
  { step: 3, title: 'Activa el catálogo automático', done: false },
  { step: 4, title: 'Pon a prueba el flujo de pedidos', done: false },
];

export default function WhatsAppPage() {
  const [phone, setPhone] = useState('');
  const [greeting, setGreeting] = useState('¡Hola! 👋 Bienvenido a nuestra tienda. Escribe *CATÁLOGO* para ver nuestros productos o *PEDIDO* para hacer un pedido.');
  const catalogLink = 'https://nexus.app/catalogo/mi-tienda';

  const copyLink = () => {
    navigator.clipboard.writeText(catalogLink);
    toast.success('Link copiado al portapapeles');
  };

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1000px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-500" />
              <h1 className="text-2xl font-bold">WhatsApp Ventas</h1>
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-500">Próximamente</Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              Convierte conversaciones de WhatsApp en pedidos gestionados desde Nexus
            </p>
          </div>
        </div>

        {/* Stats preview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Pedidos via WA', value: '—', sub: 'este mes', icon: ShoppingCart, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Clientes activos', value: '—', sub: 'en chat', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Tasa de conversión', value: '—', sub: 'chat → pedido', icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
            { label: 'Tiempo de respuesta', value: '—', sub: 'promedio', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          ].map(s => (
            <div key={s.label} className="nexus-card p-4">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', s.bg)}>
                <s.icon className={cn('h-4 w-4', s.color)} />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Funcionalidades */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Funcionalidades
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="nexus-card p-4 flex items-start gap-4">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', f.bg)}>
                  <f.icon className={cn('h-4 w-4', f.color)} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{f.title}</p>
                    <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-500">Soon</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Link de catálogo */}
        <div className="nexus-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="h-4 w-4 text-emerald-500" />
            <h3 className="font-semibold text-sm">Tu link de catálogo</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Comparte este link en tu bio de WhatsApp para que los clientes vean tus productos
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-9 px-3 rounded-md border border-input bg-muted/30 flex items-center text-sm text-muted-foreground truncate">
              {catalogLink}
            </div>
            <Button variant="outline" size="sm" onClick={copyLink} className="gap-2 shrink-0">
              <Copy className="h-3.5 w-3.5" /> Copiar
            </Button>
            <Button variant="outline" size="sm" className="gap-2 shrink-0">
              <QrCode className="h-3.5 w-3.5" /> QR
            </Button>
          </div>
        </div>

        {/* Configuración */}
        <div className="nexus-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-4 w-4 text-nexus-500" />
            <h3 className="font-semibold text-sm">Configuración del canal</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> Número de WhatsApp Business
              </label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+57 300 000 0000"
                className="h-9 max-w-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Mensaje de bienvenida</label>
              <textarea
                value={greeting}
                onChange={e => setGreeting(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-nexus-500/30"
              />
              <p className="text-[10px] text-muted-foreground">
                Usa *texto* para negrita. Variables disponibles: {'{{nombre}}'}, {'{{tienda}}'}
              </p>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              className="gap-2"
              onClick={() => toast.success('Configuración guardada', { description: 'Se aplicará cuando actives la integración' })}
            >
              <CheckCircle2 className="h-4 w-4" /> Guardar configuración
            </Button>
          </div>
        </div>

        {/* Pasos para activar */}
        <div className="nexus-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold text-sm">Pasos para activar WhatsApp Business API</h3>
          </div>
          <div className="space-y-3">
            {SETUP_STEPS.map(s => (
              <div key={s.step} className="flex items-center gap-3">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                  s.done ? 'bg-emerald-500 text-white' : 'border-2 border-border text-muted-foreground',
                )}>
                  {s.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.step}
                </div>
                <p className={cn('text-sm', s.done && 'line-through text-muted-foreground')}>{s.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Info tip */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
          <Star className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-emerald-600 dark:text-emerald-400">¿Por qué WhatsApp para ventas?</p>
            <p className="text-muted-foreground mt-0.5">
              El 95% de los mensajes de WhatsApp se leen en los primeros 3 minutos. Los negocios con catálogo en WhatsApp
              reciben un 40% más de consultas que por correo o redes sociales.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
