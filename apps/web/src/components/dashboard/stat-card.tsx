'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  subValue?: ReactNode;
  icon: ReactNode;
  color: 'nexus' | 'purple' | 'blue' | 'emerald' | 'warning' | 'danger';
  loading?: boolean;
  badge?: string;
  badgeColor?: 'success' | 'destructive' | 'warning';
  alert?: boolean;
}

const colorMap = {
  nexus:   { bg: 'bg-nexus-500/10',   icon: 'text-nexus-500',   border: 'border-nexus-500/20' },
  purple:  { bg: 'bg-purple-500/10',  icon: 'text-purple-500',  border: 'border-purple-500/20' },
  blue:    { bg: 'bg-blue-500/10',    icon: 'text-blue-500',    border: 'border-blue-500/20' },
  emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-500', border: 'border-emerald-500/20' },
  warning: { bg: 'bg-amber-500/10',   icon: 'text-amber-500',   border: 'border-amber-500/20' },
  danger:  { bg: 'bg-rose-500/10',    icon: 'text-rose-500',    border: 'border-rose-500/20' },
};

export function StatCard({ title, value, subValue, icon, color, loading, badge, badgeColor, alert }: StatCardProps) {
  const colors = colorMap[color];

  if (loading) {
    return (
      <div className="nexus-card p-6 space-y-3">
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-3 w-20 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'nexus-card p-6 relative overflow-hidden cursor-default transition-transform duration-150 hover:-translate-y-0.5 hover:scale-[1.01]',
        alert && 'border-rose-500/30',
      )}
    >
      {/* Background glow */}
      <div className={cn('absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 -translate-y-6 translate-x-6', colors.bg)} />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className={cn('p-2 rounded-lg', colors.bg, colors.border, 'border')}>
            <span className={colors.icon}>{icon}</span>
          </div>
        </div>

        <p className="text-2xl font-bold tracking-tight">{value}</p>

        {subValue && (
          <div className="mt-2 text-xs text-muted-foreground">{subValue}</div>
        )}

        {badge && (
          <span className={cn(
            'absolute top-4 right-14 text-xs font-bold px-1.5 py-0.5 rounded-full',
            badgeColor === 'success' && 'bg-emerald-500/15 text-emerald-500',
            badgeColor === 'destructive' && 'bg-rose-500/15 text-rose-500',
            badgeColor === 'warning' && 'bg-amber-500/15 text-amber-500',
          )}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
