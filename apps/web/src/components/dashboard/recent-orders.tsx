'use client';

import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatRelativeTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Pendiente',  color: 'bg-amber-500/15 text-amber-500' },
  CONFIRMED:  { label: 'Confirmado', color: 'bg-blue-500/15 text-blue-500' },
  PROCESSING: { label: 'En proceso', color: 'bg-nexus-500/15 text-nexus-500' },
  COMPLETED:  { label: 'Completado', color: 'bg-emerald-500/15 text-emerald-500' },
  CANCELLED:  { label: 'Cancelado',  color: 'bg-rose-500/15 text-rose-500' },
};

interface RecentOrdersProps {
  orders?: any[];
  loading?: boolean;
}

export function RecentOrders({ orders: propOrders, loading: propLoading }: RecentOrdersProps = {}) {
  const { data, isLoading: queryLoading } = useQuery({
    queryKey: ['orders-recent'],
    queryFn: () => api.get('/orders', { params: { limit: 7, sort: 'createdAt', order: 'desc' } }).then((r) => r.data.data),
    refetchInterval: 30_000,
    enabled: !propOrders,
  });

  const orders: any[] = propOrders ?? data?.items ?? [];
  const isLoading = propLoading ?? queryLoading;

  return (
    <div className="nexus-card overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-nexus-500" />
          <h3 className="font-semibold text-sm">Órdenes recientes</h3>
        </div>
        <Link href="/orders" className="text-xs text-nexus-500 hover:underline flex items-center gap-1">
          Ver todas <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-muted animate-pulse rounded w-24" />
                <div className="h-2.5 bg-muted animate-pulse rounded w-16" />
              </div>
              <div className="h-3 bg-muted animate-pulse rounded w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {orders.map((order: any, i: number) => {
            const status = STATUS_MAP[order.status] ?? { label: order.status, color: 'bg-muted text-muted-foreground' };
            return (
              <div
                key={order.id}
                className="p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-nexus-500/10 flex items-center justify-center shrink-0">
                  <ShoppingCart className="h-4 w-4 text-nexus-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {order.number ?? order.orderNumber}
                    {order.customer && (
                      <span className="text-muted-foreground font-normal"> · {order.customer.name ?? `${order.customer.firstName} ${order.customer.lastName ?? ''}`.trim()}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(order.createdAt)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums">{formatCurrency(order.total)}</p>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', status.color)}>
                    {status.label}
                  </span>
                </div>
              </div>
            );
          })}

          {orders.length === 0 && (
            <div className="py-10 text-center text-muted-foreground text-sm">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No hay órdenes recientes
            </div>
          )}
        </div>
      )}
    </div>
  );
}
