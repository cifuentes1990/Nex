'use client';

import { useQuery } from '@tanstack/react-query';
import {
  CreditCard, Banknote, QrCode, Wallet, TrendingUp,
  ArrowUpRight, ArrowDownRight, ExternalLink, Plus,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber, formatRelativeTime } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const METHOD_MAP: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  CASH:          { label: 'Efectivo',      icon: Banknote,     color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  CREDIT_CARD:   { label: 'Tarjeta Créd.', icon: CreditCard,   color: 'text-nexus-500',   bg: 'bg-nexus-500/10' },
  DEBIT_CARD:    { label: 'Tarjeta Déb.',  icon: CreditCard,   color: 'text-blue-400',    bg: 'bg-blue-400/10' },
  BANK_TRANSFER: { label: 'Transferencia', icon: ArrowUpRight, color: 'text-blue-500',    bg: 'bg-blue-500/10' },
  STRIPE:        { label: 'Stripe',        icon: CreditCard,   color: 'text-purple-500',  bg: 'bg-purple-500/10' },
  MERCADOPAGO:   { label: 'MercadoPago',   icon: Wallet,       color: 'text-amber-500',   bg: 'bg-amber-500/10' },
  PAYPAL:        { label: 'PayPal',        icon: Wallet,       color: 'text-blue-600',    bg: 'bg-blue-600/10' },
  OTHER:         { label: 'Otro',          icon: QrCode,       color: 'text-muted-foreground', bg: 'bg-muted' },
};

export default function PaymentsPage() {
  const { data: summary } = useQuery({
    queryKey: ['payments-summary'],
    queryFn: () => api.get('/payments/summary').then((r) => r.data.data),
  });

  const { data: history } = useQuery({
    queryKey: ['payments-history'],
    queryFn: () => api.get('/payments/history', { params: { limit: 20 } }).then((r) => r.data.data),
  });

  const byMethod: any[] = summary?.byMethod ?? [];
  const recentPayments: any[] = history?.items ?? [];

  return (
    <div className="flex-1 overflow-auto custom-scroll">
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pagos</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Gestión de métodos de pago y transacciones</p>
          </div>
          <Button size="sm" className="gap-2 bg-nexus-600 hover:bg-nexus-500" onClick={() => window.open('https://dashboard.stripe.com', '_blank')}>
            <ExternalLink className="h-4 w-4" /> Stripe Dashboard
          </Button>
        </div>

        {/* Summary by method */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {byMethod.length > 0
            ? byMethod.map((m: any, i: number) => {
              const cfg = METHOD_MAP[m.method] ?? { label: m.method, icon: CreditCard, color: 'text-muted-foreground', bg: 'bg-muted' };
              const Icon = cfg.icon;
              return (
                <div
                  key={m.method}
                  className="nexus-card p-4"
                >
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', cfg.bg)}>
                    <Icon className={cn('h-4 w-4', cfg.color)} />
                  </div>
                  <p className="text-sm font-bold tabular-nums">{formatCurrency(m.total ?? 0)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cfg.label}</p>
                  <p className="text-[11px] text-muted-foreground">{formatNumber(m.count ?? 0)} trans.</p>
                </div>
              );
            })
            : Object.entries(METHOD_MAP).map(([key, cfg], i) => {
              const Icon = cfg.icon;
              return (
                <div
                  key={key}
                  className="nexus-card p-4"
                >
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', cfg.bg)}>
                    <Icon className={cn('h-4 w-4', cfg.color)} />
                  </div>
                  <p className="text-sm font-bold">—</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cfg.label}</p>
                </div>
              );
            })}
        </div>

        {/* Stripe integration card */}
        <div className="nexus-card p-6 flex items-center gap-5 bg-gradient-to-r from-nexus-500/5 to-purple-500/5 border-nexus-500/20">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-md shrink-0">
            <svg viewBox="0 0 28 28" className="w-7 h-7" fill="none">
              <path d="M14 0C6.268 0 0 6.268 0 14s6.268 14 14 14 14-6.268 14-14S21.732 0 14 0z" fill="#6772E5"/>
              <path d="M13.5 9.5c0-.828.672-1.5 1.5-1.5.828 0 1.5.672 1.5 1.5v9c0 .828-.672 1.5-1.5 1.5-.828 0-1.5-.672-1.5-1.5v-9z" fill="#fff"/>
              <path d="M10 12c0-.828.672-1.5 1.5-1.5.828 0 1.5.672 1.5 1.5v6.5c0 .828-.672 1.5-1.5 1.5-.828 0-1.5-.672-1.5-1.5V12z" fill="#fff" opacity=".7"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold">Stripe integrado</p>
            <p className="text-sm text-muted-foreground">Acepta pagos con tarjeta, transferencia, OXXO, PSE y más. Gestiona desde el dashboard de Stripe.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => window.open('https://dashboard.stripe.com', '_blank')}>
            Abrir Stripe <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Recent payments */}
        <div className="nexus-card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold text-sm">Pagos recientes</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-medium text-muted-foreground">Concepto</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Método</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Fecha</th>
                <th className="text-right p-4 font-medium text-muted-foreground">Monto</th>
                <th className="text-center p-4 font-medium text-muted-foreground">Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-muted-foreground">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay pagos recientes</p>
                  </td>
                </tr>
              ) : recentPayments.map((p: any, i: number) => {
                const cfg = METHOD_MAP[p.method] ?? { label: p.method, icon: CreditCard, color: 'text-muted-foreground', bg: '' };
                const Icon = cfg.icon;
                return (
                  <tr
                    key={p.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <p className="font-medium">{p.reference ?? p.invoice?.invoiceNumber ?? 'Pago directo'}</p>
                      {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
                        <span className="text-muted-foreground">{cfg.label}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground text-xs">{formatRelativeTime(p.createdAt)}</td>
                    <td className="p-4 text-right font-semibold tabular-nums">{formatCurrency(p.amount)}</td>
                    <td className="p-4 text-center">
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full font-medium',
                        p.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-500' :
                        p.status === 'PENDING' ? 'bg-amber-500/15 text-amber-500' :
                        'bg-rose-500/15 text-rose-500',
                      )}>
                        {p.status === 'COMPLETED' ? 'Completado' : p.status === 'PENDING' ? 'Pendiente' : 'Fallido'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
