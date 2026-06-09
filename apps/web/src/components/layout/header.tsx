'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Search, Command, Sparkles, CheckCheck, X, ExternalLink, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'ahora mismo';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} día${d > 1 ? 's' : ''}`;
  return `hace ${Math.floor(d / 30)} mes${Math.floor(d / 30) > 1 ? 'es' : ''}`;
}

const NOTIF_ICON: Record<string, string> = {
  LOW_STOCK:    '📦',
  NEW_ORDER:    '🛒',
  PAYMENT:      '💳',
  INVOICE_PAID: '✅',
  SYSTEM:       '🔔',
  AI_INSIGHT:   '🤖',
  TASK:         '📋',
  WARNING:      '⚠️',
};

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef  = useRef<HTMLButtonElement>(null);
  const qc = useQueryClient();

  /* ── fetch notifications ── */
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?limit=20').then((r) => r.data.data),
    refetchInterval: 60_000,
  });

  const notifications: any[] = notifData?.items ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  /* ── mark single as read ── */
  const markOne = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  /* ── mark all as read ── */
  const markAll = useMutation({
    mutationFn: () => api.patch('/notifications/read-all', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  /* ── close on outside click ── */
  useEffect(() => {
    if (!panelOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current  && !bellRef.current.contains(e.target as Node)
      ) {
        setPanelOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [panelOpen]);

  return (
    <header className="h-16 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Command search */}
      <button
        className="flex items-center gap-2 px-3 h-9 rounded-lg bg-muted hover:bg-muted/80 text-sm text-muted-foreground transition-colors flex-1 max-w-sm"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Buscar...</span>
        <div className="ml-auto flex items-center gap-1 text-[11px] bg-background border border-border rounded px-1.5 py-0.5">
          <Command className="h-2.5 w-2.5" />
          <span>K</span>
        </div>
      </button>

      <div className="flex-1" />

      {/* AI Quick */}
      <Link href="/ai">
        <Button variant="outline" size="sm" className="gap-2 border-nexus-500/30 text-nexus-500 hover:bg-nexus-500/10">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Preguntar a la IA</span>
        </Button>
      </Link>

      {/* ── Notifications ── */}
      <div className="relative">
        <button
          ref={bellRef}
          onClick={() => setPanelOpen((v) => !v)}
          className={cn(
            'relative h-9 w-9 inline-flex items-center justify-center rounded-lg transition-colors',
            panelOpen
              ? 'bg-nexus-500/10 text-nexus-500'
              : 'hover:bg-accent text-muted-foreground hover:text-foreground',
          )}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* ── Panel ── */}
        {panelOpen && (
          <div
            ref={panelRef}
            className="absolute right-0 top-11 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-card border border-border rounded-xl shadow-nexus-lg z-50 flex flex-col max-h-[520px] animate-slide-up"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-nexus-500" />
                <span className="text-sm font-semibold">Notificaciones</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold bg-rose-500/15 text-rose-500 px-1.5 py-0.5 rounded-full">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAll.mutate()}
                    disabled={markAll.isPending}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-nexus-500 transition-colors px-2 py-1 rounded-md hover:bg-nexus-500/10"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>Leer todo</span>
                  </button>
                )}
                <button
                  onClick={() => setPanelOpen(false)}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto custom-scroll flex-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Sin notificaciones</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => { if (!n.isRead) markOne.mutate(n.id); }}
                    className={cn(
                      'flex gap-3 px-4 py-3.5 border-b border-border/50 last:border-0 cursor-pointer transition-colors',
                      n.isRead
                        ? 'hover:bg-accent/50'
                        : 'bg-nexus-500/[0.04] hover:bg-nexus-500/[0.08]',
                    )}
                  >
                    {/* Icon */}
                    <div className="shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center text-base">
                      {NOTIF_ICON[n.type] ?? '🔔'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm leading-snug',
                        !n.isRead && 'font-medium text-foreground',
                        n.isRead  && 'text-muted-foreground',
                      )}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground/60 mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!n.isRead && (
                      <div className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-nexus-500" />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border">
              <Link
                href="/notifications"
                onClick={() => setPanelOpen(false)}
                className="flex items-center justify-center gap-1.5 text-xs text-nexus-500 hover:text-nexus-400 transition-colors font-medium"
              >
                <ExternalLink className="h-3 w-3" />
                Ver todas las notificaciones
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
