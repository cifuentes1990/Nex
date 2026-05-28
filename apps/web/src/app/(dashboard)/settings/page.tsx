'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings, Building, Users, Bell, Shield, Palette,
  Save, ChevronRight, Globe, Key, Webhook, Database,
  Moon, Sun, Monitor, Check,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

const SECTIONS = [
  { id: 'organization', label: 'Organización', icon: Building },
  { id: 'profile', label: 'Mi perfil', icon: Users },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'appearance', label: 'Apariencia', icon: Palette },
  { id: 'security', label: 'Seguridad', icon: Shield },
  { id: 'api', label: 'API Keys', icon: Key },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('organization');
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  const { data: org } = useQuery({
    queryKey: ['organization'],
    queryFn: () => api.get('/organizations/me').then((r) => r.data.data),
  });

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gestiona tu cuenta y preferencias</p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar nav */}
          <nav className="w-52 shrink-0">
            <ul className="space-y-1">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setActiveSection(s.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
                        activeSection === s.id
                          ? 'bg-nexus-500/15 text-nexus-500 font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div
              key={activeSection}
            >
              {activeSection === 'organization' && <OrganizationSection org={org} />}
              {activeSection === 'profile' && <ProfileSection session={session} />}
              {activeSection === 'notifications' && <NotificationsSection />}
              {activeSection === 'appearance' && <AppearanceSection theme={theme} setTheme={setTheme} />}
              {activeSection === 'security' && <SecuritySection />}
              {activeSection === 'api' && <APIKeysSection />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function OrganizationSection({ org }: { org: any }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit } = useForm({
    values: {
      name: org?.name ?? '',
      email: org?.email ?? '',
      phone: org?.phone ?? '',
      website: org?.website ?? '',
      address: org?.address ?? '',
      city: org?.city ?? '',
      country: org?.country ?? '',
      currency: org?.currency ?? 'COP',
      timezone: org?.timezone ?? 'America/Bogota',
    },
  });

  const save = useMutation({
    mutationFn: (data: any) => api.patch('/organizations/me', data),
    onSuccess: () => {
      toast.success('Organización actualizada');
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
  });

  return (
    <div>
      <SectionHeader title="Organización" description="Información de tu empresa" />
      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="nexus-card p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nombre de la empresa</Label>
            <Input {...register('name')} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" {...register('email')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Teléfono</Label>
            <Input {...register('phone')} />
          </div>
          <div className="space-y-1.5">
            <Label>Sitio web</Label>
            <Input {...register('website')} placeholder="https://..." />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Dirección</Label>
          <Input {...register('address')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Ciudad</Label>
            <Input {...register('city')} />
          </div>
          <div className="space-y-1.5">
            <Label>País</Label>
            <Input {...register('country')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <select className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" {...register('currency')}>
              <option value="COP">COP — Peso colombiano</option>
              <option value="USD">USD — Dólar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="MXN">MXN — Peso mexicano</option>
              <option value="PEN">PEN — Sol peruano</option>
              <option value="CLP">CLP — Peso chileno</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Zona horaria</Label>
            <select className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm" {...register('timezone')}>
              <option value="America/Bogota">America/Bogota (UTC-5)</option>
              <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
              <option value="America/Lima">America/Lima (UTC-5)</option>
              <option value="America/Santiago">America/Santiago (UTC-3/-4)</option>
              <option value="America/Buenos_Aires">America/Buenos_Aires (UTC-3)</option>
              <option value="America/New_York">America/New_York (UTC-4/-5)</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" className="bg-nexus-600 hover:bg-nexus-500 gap-2" disabled={save.isPending}>
            <Save className="h-4 w-4" /> Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  );
}

function ProfileSection({ session }: { session: any }) {
  const { register, handleSubmit } = useForm({
    values: {
      name: session?.user?.name ?? '',
      email: session?.user?.email ?? '',
      currentPassword: '',
      newPassword: '',
    },
  });

  const save = useMutation({
    mutationFn: (data: any) => api.patch('/users/me', data),
    onSuccess: () => toast.success('Perfil actualizado'),
  });

  return (
    <div>
      <SectionHeader title="Mi perfil" description="Tu información personal y contraseña" />
      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="nexus-card p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-nexus flex items-center justify-center text-white text-2xl font-bold">
            {session?.user?.name?.charAt(0) ?? 'U'}
          </div>
          <div>
            <p className="font-medium">{session?.user?.name}</p>
            <p className="text-sm text-muted-foreground">{session?.user?.role}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input {...register('name')} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" {...register('email')} />
          </div>
        </div>
        <div className="border-t border-border pt-5">
          <p className="text-sm font-medium mb-4">Cambiar contraseña</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Contraseña actual</Label>
              <Input type="password" {...register('currentPassword')} />
            </div>
            <div className="space-y-1.5">
              <Label>Nueva contraseña</Label>
              <Input type="password" {...register('newPassword')} />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" className="bg-nexus-600 hover:bg-nexus-500 gap-2" disabled={save.isPending}>
            <Save className="h-4 w-4" /> Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  );
}

function NotificationsSection() {
  const notifications = [
    { id: 'low_stock', label: 'Stock bajo', description: 'Cuando un producto llega al mínimo' },
    { id: 'new_order', label: 'Nuevas órdenes', description: 'Al recibir una venta nueva' },
    { id: 'invoice_paid', label: 'Factura pagada', description: 'Al confirmar un pago' },
    { id: 'daily_summary', label: 'Resumen diario', description: 'Reporte de ventas al final del día' },
    { id: 'ai_insights', label: 'Insights de IA', description: 'Oportunidades detectadas por IA' },
  ];

  return (
    <div>
      <SectionHeader title="Notificaciones" description="Configura cuándo y cómo te avisamos" />
      <div className="nexus-card divide-y divide-border overflow-hidden">
        {notifications.map((n) => (
          <div key={n.id} className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium">{n.label}</p>
              <p className="text-xs text-muted-foreground">{n.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-10 h-5 bg-muted peer-checked:bg-nexus-500 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppearanceSection({ theme, setTheme }: { theme: string | undefined; setTheme: (t: string) => void }) {
  const themes = [
    { id: 'light', label: 'Claro', icon: Sun },
    { id: 'dark', label: 'Oscuro', icon: Moon },
    { id: 'system', label: 'Sistema', icon: Monitor },
  ];

  return (
    <div>
      <SectionHeader title="Apariencia" description="Personaliza el aspecto visual" />
      <div className="nexus-card p-6 space-y-6">
        <div>
          <p className="text-sm font-medium mb-3">Tema</p>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((t) => {
              const Icon = t.icon;
              const isActive = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors',
                    isActive ? 'border-nexus-500 bg-nexus-500/10' : 'border-border hover:bg-muted',
                  )}
                >
                  <Icon className={cn('h-5 w-5', isActive ? 'text-nexus-500' : 'text-muted-foreground')} />
                  <span className={cn('text-sm font-medium', isActive ? 'text-nexus-500' : 'text-muted-foreground')}>
                    {t.label}
                  </span>
                  {isActive && <Check className="h-3.5 w-3.5 text-nexus-500" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SecuritySection() {
  return (
    <div>
      <SectionHeader title="Seguridad" description="Opciones de autenticación y sesiones" />
      <div className="space-y-4">
        <div className="nexus-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Autenticación de dos factores</p>
              <p className="text-xs text-muted-foreground">Añade una capa extra de seguridad</p>
            </div>
            <Button variant="outline" size="sm">Configurar</Button>
          </div>
        </div>
        <div className="nexus-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Sesiones activas</p>
              <p className="text-xs text-muted-foreground">Dispositivos donde tienes sesión iniciada</p>
            </div>
            <Button variant="outline" size="sm">Ver sesiones</Button>
          </div>
        </div>
        <div className="nexus-card p-5 border-rose-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-rose-500">Cerrar todas las sesiones</p>
              <p className="text-xs text-muted-foreground">Cierra sesión en todos los dispositivos</p>
            </div>
            <Button variant="destructive" size="sm">Cerrar todo</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function APIKeysSection() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get('/api-keys').then((r) => r.data.data).catch(() => ({ items: [] })),
  });

  const create = useMutation({
    mutationFn: (name: string) => api.post('/api-keys', { name }),
    onSuccess: () => {
      toast.success('API Key creada');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/api-keys/${id}`),
    onSuccess: () => {
      toast.success('API Key revocada');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  return (
    <div>
      <SectionHeader title="API Keys" description="Claves para integrar Nexus ERP con sistemas externos" />
      <div className="space-y-4">
        <div className="nexus-card divide-y divide-border overflow-hidden">
          {(data?.items ?? []).length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Key className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay API keys creadas</p>
            </div>
          ) : (
            (data?.items ?? []).map((key: any) => (
              <div key={key.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{key.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{key.keyPrefix}••••••••</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                  onClick={() => revoke.mutate(key.id)}
                  disabled={revoke.isPending}
                >
                  Revocar
                </Button>
              </div>
            ))
          )}
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            const name = prompt('Nombre para la API key:');
            if (name) create.mutate(name);
          }}
        >
          <Key className="h-4 w-4" /> Crear nueva API key
        </Button>
      </div>
    </div>
  );
}
