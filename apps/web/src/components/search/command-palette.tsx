'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Package, Users, X, ArrowRight, ShoppingCart, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

type ResultItem = {
  type: 'product' | 'customer' | 'order';
  id: string;
  label: string;
  sub?: string;
  meta?: string;
  href: string;
};

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery]           = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router   = useRouter();

  // Limpiar y enfocar al abrir
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Búsqueda de productos
  const { data: products } = useQuery({
    queryKey: ['cmd-products', query],
    queryFn: () =>
      api.get('/products', { params: { search: query, limit: 5, status: 'ACTIVE' } })
         .then(r => r.data.data?.items ?? []),
    enabled: open && query.length >= 2,
    staleTime: 30_000,
  });

  // Búsqueda de clientes
  const { data: customers } = useQuery({
    queryKey: ['cmd-customers', query],
    queryFn: () =>
      api.get('/customers', { params: { search: query, limit: 4 } })
         .then(r => r.data.data?.items ?? []),
    enabled: open && query.length >= 2,
    staleTime: 30_000,
  });

  // Búsqueda de órdenes (por número)
  const { data: orders } = useQuery({
    queryKey: ['cmd-orders', query],
    queryFn: () =>
      api.get('/orders', { params: { search: query, limit: 3 } })
         .then(r => r.data.data?.items ?? []),
    enabled: open && query.length >= 3,
    staleTime: 30_000,
  });

  const results: ResultItem[] = [
    ...(products ?? []).map((p: any): ResultItem => ({
      type:  'product',
      id:    p.id,
      label: p.name,
      sub:   p.sku ? `SKU: ${p.sku}` : undefined,
      meta:  formatCurrency(p.salePrice ?? p.basePrice),
      href:  `/products/${p.id}`,
    })),
    ...(customers ?? []).map((c: any): ResultItem => ({
      type:  'customer',
      id:    c.id,
      label: `${c.firstName} ${c.lastName ?? ''}`.trim(),
      sub:   c.phone ?? c.email,
      href:  `/customers/${c.id}`,
    })),
    ...(orders ?? []).map((o: any): ResultItem => ({
      type:  'order',
      id:    o.id,
      label: o.number,
      sub:   o.customer ? `${o.customer.firstName} ${o.customer.lastName ?? ''}`.trim() : 'Cliente general',
      meta:  formatCurrency(o.total),
      href:  `/orders/${o.id}`,
    })),
  ];

  const navigate = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  // Navegación con teclas
  useEffect(() => {
    if (!open || results.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && results[selectedIndex]) navigate(results[selectedIndex].href);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results, selectedIndex, navigate]);

  const ICONS = {
    product:  { Icon: Package, bg: 'bg-nexus-500/10',  text: 'text-nexus-500' },
    customer: { Icon: Users,   bg: 'bg-blue-500/10',   text: 'text-blue-500'  },
    order:    { Icon: FileText,bg: 'bg-amber-500/10',  text: 'text-amber-500' },
  };

  const SECTION_LABELS: Record<string, string> = {
    product:  '📦 Productos',
    customer: '👤 Clientes',
    order:    '🧾 Pedidos',
  };

  // Agrupar por tipo para mostrar secciones
  const grouped: Record<string, ResultItem[]> = {};
  for (const r of results) {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  }

  let globalIndex = 0;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Buscar productos, clientes, pedidos..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          {query ? (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">
              Esc
            </kbd>
          )}
        </div>

        {/* Resultados */}
        <div className="max-h-[400px] overflow-y-auto custom-scroll">
          {query.length < 2 ? (
            <div className="py-10 text-center space-y-2">
              <Search className="h-8 w-8 mx-auto text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">Escribe para buscar en toda la plataforma</p>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/50 mt-3">
                <span>📦 Productos</span>
                <span>·</span>
                <span>👤 Clientes</span>
                <span>·</span>
                <span>🧾 Pedidos</span>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">Sin resultados para <strong>"{query}"</strong></p>
            </div>
          ) : (
            Object.entries(grouped).map(([type, items]) => (
              <div key={type}>
                <div className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider bg-muted/30 border-b border-border/50">
                  {SECTION_LABELS[type]}
                </div>
                {items.map((r) => {
                  const idx = globalIndex++;
                  const { Icon, bg, text } = ICONS[r.type];
                  return (
                    <button
                      key={`${r.type}-${r.id}`}
                      onClick={() => navigate(r.href)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-border/30 last:border-0',
                        idx === selectedIndex ? 'bg-nexus-500/10' : 'hover:bg-muted/50',
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', bg)}>
                        <Icon className={cn('h-3.5 w-3.5', text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.label}</p>
                        {r.sub && <p className="text-xs text-muted-foreground truncate">{r.sub}</p>}
                      </div>
                      {r.meta && (
                        <span className="text-sm font-semibold text-nexus-500 tabular-nums shrink-0">{r.meta}</span>
                      )}
                      <ArrowRight className={cn(
                        'h-3.5 w-3.5 shrink-0 transition-colors',
                        idx === selectedIndex ? 'text-nexus-500' : 'text-muted-foreground/20',
                      )} />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground/50">
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>Esc cerrar</span>
        </div>
      </div>
    </div>
  );
}
