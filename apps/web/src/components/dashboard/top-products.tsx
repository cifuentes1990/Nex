'use client';

import { useQuery } from '@tanstack/react-query';
import { Trophy, ArrowRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const MEDAL = ['🥇', '🥈', '🥉'];

interface TopProductsProps {
  products?: any[];
  loading?: boolean;
}

export function TopProducts({ products: propProducts, loading: propLoading }: TopProductsProps = {}) {
  const { data, isLoading: queryLoading } = useQuery({
    queryKey: ['top-products-widget'],
    queryFn: () => api.get('/products/winners', { params: { limit: 5 } }).then((r) => r.data.data),
    refetchInterval: 60_000,
    enabled: !propProducts,
  });

  const raw: any[] = propProducts ?? (data?.items ?? data ?? []);
  const products = raw.map((p: any) => ({
    id: p.id ?? p.product?.id,
    name: p.name ?? p.product?.name,
    totalRevenue: p.totalRevenue ?? p.revenue ?? 0,
    totalSold: p.totalSold ?? p.quantity ?? 0,
  }));
  const isLoading = propLoading ?? queryLoading;

  return (
    <div className="nexus-card overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h3 className="font-semibold text-sm">Top productos</h3>
        </div>
        <Link href="/products" className="text-xs text-nexus-500 hover:underline flex items-center gap-1">
          Ver catálogo <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-muted animate-pulse rounded w-28" />
                <div className="h-2.5 bg-muted animate-pulse rounded w-16" />
              </div>
              <div className="h-3 bg-muted animate-pulse rounded w-12" />
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 space-y-2">
          {products.slice(0, 5).map((product: any, i: number) => {
            const maxRevenue = products[0]?.totalRevenue ?? 1;
            const pct = ((product.totalRevenue ?? 0) / maxRevenue) * 100;

            return (
              <div key={product.id}>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-base w-6 text-center shrink-0">{MEDAL[i] ?? `${i + 1}`}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-2.5 w-2.5" />
                      {formatNumber(product.totalSold ?? 0)} unidades
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums shrink-0">
                    {formatCurrency(product.totalRevenue ?? 0)}
                  </span>
                </div>
                <div className="ml-9 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    style={{ width: `${pct}%` }}
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      i === 0 ? 'bg-amber-400' :
                      i === 1 ? 'bg-slate-400' :
                      i === 2 ? 'bg-orange-400' : 'bg-nexus-500',
                    )}
                  />
                </div>
              </div>
            );
          })}

          {products.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Sin datos aún
            </div>
          )}
        </div>
      )}
    </div>
  );
}
