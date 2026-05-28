'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

interface HeatmapProps {
  data: Array<{ hour: number; revenue: number; orders: number }>;
}

export function SalesHeatmap({ data }: HeatmapProps) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  const getIntensity = (revenue: number) => {
    const ratio = revenue / maxRevenue;
    if (ratio === 0) return 'bg-muted/30';
    if (ratio < 0.2) return 'bg-nexus-500/20';
    if (ratio < 0.4) return 'bg-nexus-500/40';
    if (ratio < 0.6) return 'bg-nexus-500/60';
    if (ratio < 0.8) return 'bg-nexus-500/80';
    return 'bg-nexus-500';
  };

  return (
    <div className="nexus-card p-6">
      <div className="mb-4">
        <h3 className="font-semibold">Mapa de Calor — Ventas por Hora (Hoy)</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Intensidad de ventas durante el día</p>
      </div>

      <div className="flex gap-2 items-end flex-wrap">
        {Array.from({ length: 24 }, (_, h) => {
          const entry = data.find((d) => d.hour === h) ?? { hour: h, revenue: 0, orders: 0 };
          return (
            <div key={h} className="flex flex-col items-center gap-1 group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-lg p-2 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-lg">
                <p className="font-medium">{h}:00 — {h + 1}:00</p>
                <p className="text-muted-foreground">{formatCurrency(entry.revenue)}</p>
                <p className="text-muted-foreground">{entry.orders} órdenes</p>
              </div>

              <div
                className={cn(
                  'w-8 rounded-md transition-all duration-300 cursor-pointer hover:ring-2 ring-nexus-500',
                  getIntensity(entry.revenue),
                )}
                style={{
                  height: `${Math.max(12, (entry.revenue / maxRevenue) * 80)}px`,
                }}
              />
              <span className="text-[9px] text-muted-foreground tabular-nums">{h}h</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4">
        <span className="text-xs text-muted-foreground">Menor</span>
        {[0.1, 0.3, 0.5, 0.7, 0.9, 1].map((r) => (
          <div
            key={r}
            className="w-5 h-3 rounded-sm"
            style={{ background: `rgba(99,102,241,${r})` }}
          />
        ))}
        <span className="text-xs text-muted-foreground">Mayor</span>
      </div>
    </div>
  );
}
