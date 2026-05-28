'use client';

import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';

const COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e'];

export function CategoryChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['revenue-by-category'],
    queryFn: () => api.get('/analytics/revenue-by-category').then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="nexus-card p-6 h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-nexus-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="nexus-card p-6 h-full">
      <div className="mb-4">
        <h3 className="font-semibold">Por Categoría</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Distribución de ingresos</p>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data?.slice(0, 8) ?? []}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={3}
            dataKey="revenue"
            nameKey="name"
          >
            {(data ?? []).map((_: any, index: number) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: any) => [formatCurrency(v), 'Ingresos']}
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '12px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="space-y-2 mt-2">
        {(data ?? []).slice(0, 6).map((cat: any, i: number) => (
          <div key={cat.id} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-muted-foreground truncate max-w-[120px]">{cat.name}</span>
            </div>
            <span className="font-medium tabular-nums">{formatCurrency(cat.revenue)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
