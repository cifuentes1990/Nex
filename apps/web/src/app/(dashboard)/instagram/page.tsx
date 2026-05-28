'use client';

import { useState } from 'react';
import {
  Instagram, Image, ShoppingBag, TrendingUp, Users,
  Heart, MessageCircle, Eye, Link2, Copy, CheckCircle2,
  Zap, Star, Settings, Tag, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const FEATURES = [
  {
    icon: Tag,
    title: 'Etiqueta productos en publicaciones',
    desc: 'Tus seguidores compran directamente desde la foto sin salir de Instagram',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
  {
    icon: ShoppingBag,
    title: 'Instagram Shopping activado',
    desc: 'Pestaña de tienda en tu perfil con todo tu catálogo sincronizado',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: MessageCircle,
    title: 'Pedidos por DM automáticos',
    desc: 'Responde consultas y confirma pedidos con respuestas automáticas en Direct',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: BarChart3,
    title: 'Analytics de publicaciones',
    desc: 'Descubre qué productos generan más ventas desde tus posts e historias',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
];

const TOP_POSTS = [
  { id: 1, emoji: '👟', label: 'Tenis New Balance', likes: 342, comments: 28, orders: 12 },
  { id: 2, emoji: '👜', label: 'Bolso cuero café', likes: 289, comments: 41, orders: 9 },
  { id: 3, emoji: '🧢', label: 'Gorra bordada', likes: 198, comments: 15, orders: 6 },
];

export default function InstagramPage() {
  const [handle, setHandle] = useState('');
  const bioLink = 'https://nexus.app/catalogo/mi-tienda';

  const copyLink = () => {
    navigator.clipboard.writeText(bioLink);
    toast.success('Link copiado al portapapeles');
  };

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1000px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Instagram className="h-5 w-5 text-pink-500" />
              <h1 className="text-2xl font-bold">Instagram Shop</h1>
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-500">Próximamente</Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              Vende directamente desde tus publicaciones e historias de Instagram
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Pedidos via IG', value: '—', sub: 'este mes', icon: ShoppingBag, color: 'text-pink-500', bg: 'bg-pink-500/10' },
            { label: 'Seguidores', value: '—', sub: 'perfil conectado', icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
            { label: 'Alcance', value: '—', sub: 'publicaciones', icon: Eye, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Me gustas → ventas', value: '—', sub: 'conversión', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10' },
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

        {/* Link de bio */}
        <div className="nexus-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="h-4 w-4 text-pink-500" />
            <h3 className="font-semibold text-sm">Link de bio</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Pon este link en tu bio de Instagram. Tus seguidores verán todo tu catálogo con un solo tap.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-9 px-3 rounded-md border border-input bg-muted/30 flex items-center text-sm text-muted-foreground truncate">
              {bioLink}
            </div>
            <Button variant="outline" size="sm" onClick={copyLink} className="gap-2 shrink-0">
              <Copy className="h-3.5 w-3.5" /> Copiar
            </Button>
          </div>
        </div>

        {/* Top publicaciones */}
        <div className="nexus-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-pink-500" />
            <h3 className="font-semibold text-sm">Publicaciones con más ventas</h3>
            <Badge variant="outline" className="text-[9px] ml-auto">Demo</Badge>
          </div>
          <div className="space-y-3">
            {TOP_POSTS.map((post, i) => (
              <div key={post.id} className="flex items-center gap-3">
                <span className="w-6 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center text-xl">
                  {post.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{post.label}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {post.likes}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {post.comments}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-pink-500">{post.orders}</p>
                  <p className="text-[10px] text-muted-foreground">pedidos</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuración */}
        <div className="nexus-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-4 w-4 text-nexus-500" />
            <h3 className="font-semibold text-sm">Configuración</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Instagram className="h-3 w-3 text-pink-500" /> Usuario de Instagram
              </label>
              <Input
                value={handle}
                onChange={e => setHandle(e.target.value)}
                placeholder="@mitienda"
                className="h-9 max-w-sm"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              className="gap-2"
              onClick={() => toast.success('Configuración guardada', { description: 'Lista para cuando actives la integración' })}
            >
              <CheckCircle2 className="h-4 w-4" /> Guardar
            </Button>
          </div>
        </div>

        {/* Tip */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-pink-500/5 border border-pink-500/20 text-xs">
          <Star className="h-4 w-4 text-pink-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-pink-600 dark:text-pink-400">Tip: Usa Instagram Reels para más alcance</p>
            <p className="text-muted-foreground mt-0.5">
              Los Reels tienen 3× más alcance que las fotos normales. Etiqueta tus productos en cada Reel
              y activa el checkout para que los clientes compren sin salir de la app.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
