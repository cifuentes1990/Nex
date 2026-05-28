'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Globe, ArrowRight, Building, User, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { signIn } from 'next-auth/react';

const schema = z.object({
  organizationName: z.string().min(2, 'Mínimo 2 caracteres'),
  userName: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

const STEPS = [
  { label: 'Tu empresa', icon: Building },
  { label: 'Tu cuenta', icon: User },
  { label: 'Seguridad', icon: Lock },
];

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const nextStep = async () => {
    const fields: Record<number, (keyof FormData)[]> = {
      0: ['organizationName'],
      1: ['userName', 'email'],
    };
    const valid = await trigger(fields[step]);
    if (valid) setStep((s) => s + 1);
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await api.post('/auth/register', {
        organizationName: data.organizationName,
        name: data.userName,
        email: data.email,
        password: data.password,
      });

      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Cuenta creada. Inicia sesión manualmente.');
        router.push('/login');
      } else {
        toast.success('¡Bienvenido a Nexus ERP!');
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al crear la cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-dark relative overflow-hidden flex-col justify-center p-12">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-nexus-500/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-purple-500/15 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        </div>
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-gradient-nexus flex items-center justify-center shadow-nexus-lg">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white">Nexus ERP</span>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Empieza gratis,{' '}
              <span className="gradient-text">escala sin límites</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed mb-8">
              Configura tu ERP en menos de 2 minutos. Sin tarjeta de crédito, sin contratos.
            </p>
            <ul className="space-y-3">
              {[
                '14 días de prueba gratuita',
                'Todos los módulos incluidos',
                'Soporte por WhatsApp',
                'Migración de datos gratuita',
              ].map((f) => (
                <li key={f} className="flex items-center gap-3 text-white/70 text-sm">
                  <div className="w-5 h-5 rounded-full bg-nexus-500/30 flex items-center justify-center shrink-0">
                    <ArrowRight className="h-3 w-3 text-nexus-400" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div
          className="w-full max-w-md"
        >
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-nexus flex items-center justify-center">
              <Globe className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">Nexus ERP</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">Crea tu cuenta</h2>
          <p className="text-muted-foreground mb-6">Gratis por 14 días, sin tarjeta de crédito</p>

          {/* Steps indicator */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="flex items-center gap-2">
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                    i < step ? 'bg-nexus-500 text-white' :
                    i === step ? 'bg-nexus-500/20 text-nexus-500 ring-2 ring-nexus-500' :
                    'bg-muted text-muted-foreground',
                  )}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={cn(
                    'text-xs hidden sm:block',
                    i === step ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )}>
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div className={cn('flex-1 h-0.5 w-8', i < step ? 'bg-nexus-500' : 'bg-border')} />
                  )}
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Step 0 — Organization */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="organizationName">Nombre de tu empresa *</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="organizationName"
                      placeholder="Mi Empresa S.A.S."
                      className={cn('h-11 pl-10', errors.organizationName && 'border-destructive')}
                      {...register('organizationName')}
                    />
                  </div>
                  {errors.organizationName && <p className="text-xs text-destructive">{errors.organizationName.message}</p>}
                </div>
                <Button type="button" onClick={nextStep} className="w-full h-11 bg-nexus-600 hover:bg-nexus-500 gap-2">
                  Continuar <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 1 — Personal info */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="userName">Tu nombre *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="userName"
                      placeholder="Juan García"
                      className={cn('h-11 pl-10', errors.userName && 'border-destructive')}
                      {...register('userName')}
                    />
                  </div>
                  {errors.userName && <p className="text-xs text-destructive">{errors.userName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="juan@empresa.com"
                      className={cn('h-11 pl-10', errors.email && 'border-destructive')}
                      {...register('email')}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(0)} className="flex-1 h-11">
                    Atrás
                  </Button>
                  <Button type="button" onClick={nextStep} className="flex-1 h-11 bg-nexus-600 hover:bg-nexus-500 gap-2">
                    Continuar <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2 — Password */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Contraseña *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      className={cn('h-11 pl-10 pr-10', errors.password && 'border-destructive')}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirmar contraseña *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repite tu contraseña"
                      className={cn('h-11 pl-10', errors.confirmPassword && 'border-destructive')}
                      {...register('confirmPassword')}
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 h-11">
                    Atrás
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-11 bg-nexus-600 hover:bg-nexus-500 gap-2"
                    disabled={isLoading}
                  >
                    {isLoading
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <>Crear cuenta <ArrowRight className="h-4 w-4" /></>}
                  </Button>
                </div>
              </div>
            )}
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-nexus-500 font-medium hover:underline">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
