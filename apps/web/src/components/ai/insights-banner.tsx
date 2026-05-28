'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, X, TrendingUp, AlertTriangle, Lightbulb, Target, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  OPPORTUNITY:    { icon: TrendingUp,     color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  WARNING:        { icon: AlertTriangle,  color: 'text-amber-500',   bg: 'bg-amber-500/10' },
  INSIGHT:        { icon: Lightbulb,      color: 'text-nexus-500',   bg: 'bg-nexus-500/10' },
  RECOMMENDATION: { icon: Target,         color: 'text-purple-500',  bg: 'bg-purple-500/10' },
};

interface AIInsightsBannerProps {
  insights?: any[];
}

export function AIInsightsBanner({ insights: propInsights }: AIInsightsBannerProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['ai-insights-banner'],
    queryFn: () => api.get('/ai/insights').then((r) => r.data.data),
    refetchInterval: 5 * 60_000,
    enabled: !propInsights,
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => api.delete(`/ai/insights/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights-banner'] });
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
    },
  });

  const allInsights: any[] = propInsights ?? (data?.items ?? data ?? []);
  const insights = allInsights.filter((i: any) => !i.isDismissed).slice(0, 3);

  if (!insights.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-3.5 w-3.5 text-nexus-500" />
        <span className="text-xs font-medium text-nexus-500">IA — Insights del negocio</span>
      </div>
      <div className="space-y-2">
        {insights.map((insight) => {
          const cfg = TYPE_CONFIG[insight.type] ?? TYPE_CONFIG.INSIGHT;
          const Icon = cfg.icon;
          return (
            <div
              key={insight.id}
              className="nexus-card p-4 flex items-start gap-3 border border-border/50"
            >
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', cfg.bg)}>
                <Icon className={cn('h-4 w-4', cfg.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{insight.description}</p>
                {insight.action && (
                  <button
                    onClick={() => router.push('/ai')}
                    className={cn('text-xs font-medium mt-1.5 flex items-center gap-1 hover:underline', cfg.color)}
                  >
                    {insight.action} <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>
              {insight.score !== undefined && (
                <span className={cn('text-xs font-bold tabular-nums shrink-0', cfg.color)}>
                  {Math.round((insight.score ?? 0) * 100)}%
                </span>
              )}
              <button
                onClick={() => dismiss.mutate(insight.id)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
