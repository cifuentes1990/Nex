'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Globe, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        // Distinguir entre error de credenciales y error de servidor
        if (result.error === 'CredentialsSignin') {
          toast.error('Credenciales incorrectas', {
            description: 'Verifica tu email y contraseña',
          });
        } else {
          toast.error('No se puede conectar al servidor', {
            description: 'La base de datos no está disponible. Intenta en unos minutos.',
          });
        }
      } else {
        toast.success('Bienvenido de vuelta');
        router.push('/dashboard');
      }
    } catch {
      toast.error('Error de conexión', {
        description: 'No se pudo conectar con el servidor. ¿Está la API corriendo?',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-dark relative overflow-hidden flex-col justify-between p-12">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-nexus-500/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
        </div>

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-gradient-nexus flex items-center justify-center shadow-nexus-lg">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white">Nexus ERP</span>
          </div>

          <div
          >
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              El ERP inteligente para tu{' '}
              <span className="gradient-text">negocio moderno</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              Gestión de ventas, inventario, facturación y clientes — todo impulsado por IA.
              Diseñado para escalar con tu empresa.
            </p>
          </div>

          {/* Feature pills */}
          <div
            className="flex flex-wrap gap-2 mt-10"
          >
            {['IA Empresarial', 'POS Táctil', 'Facturación PDF', 'Analytics BI', 'Multiempresa', 'WhatsApp API'].map((f) => (
              <span key={f} className="px-3 py-1.5 rounded-full bg-white/10 text-white/70 text-sm backdrop-blur-sm border border-white/10">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div
          className="relative z-10 grid grid-cols-3 gap-6"
        >
          {[
            { value: '10K+', label: 'Empresas activas' },
            { value: '$50B+', label: 'Procesado en ventas' },
            { value: '99.9%', label: 'Uptime garantizado' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-nexus flex items-center justify-center">
              <Globe className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">Nexus ERP</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">Bienvenido de vuelta</h2>
          <p className="text-muted-foreground mb-8">Inicia sesión en tu cuenta</p>

          {/* Google OAuth */}
          <Button
            variant="outline"
            className="w-full h-11 gap-3 mb-6"
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuar con Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">o continúa con email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@tuempresa.com"
                className={cn('h-11', errors.email && 'border-destructive')}
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link href="/forgot-password" className="text-xs text-nexus-500 hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={cn('h-11 pr-10', errors.password && 'border-destructive')}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-nexus-600 hover:bg-nexus-500 gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Iniciar sesión <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 rounded-xl bg-nexus-500/5 border border-nexus-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-nexus-500" />
              <span className="text-xs font-medium text-nexus-500">Credenciales demo</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Email: <code className="text-foreground">admin@nexuserp.com</code></p>
              <p>Password: <code className="text-foreground">Admin123!</code></p>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-nexus-500 font-medium hover:underline">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
