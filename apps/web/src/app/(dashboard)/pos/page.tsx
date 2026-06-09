'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Trash2, Plus, Minus, CreditCard,
  Banknote, X, User, Tag, Package, ChevronDown,
  CheckCircle2, ArrowRight, ReceiptText, Smartphone, Store,
  AlertCircle, ScanLine, RefreshCw, Wifi, WifiOff, MessageCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePOSStore } from '@/store/pos.store';

// ── Métodos de pago ──────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { key: 'CASH',      label: 'Efectivo',          icon: Banknote,    color: 'emerald', cash: true },
  { key: 'CREDIT_CARD', label: 'Tarjeta',         icon: CreditCard,  color: 'nexus',   cash: false },
  { key: 'NEQUI',     label: 'Nequi / Daviplata', icon: Smartphone,  color: 'pink',    cash: false },
  { key: 'TRANSFER',  label: 'Transferencia',      icon: ArrowRight,  color: 'blue',    cash: false },
] as const;

const METHOD_COLORS: Record<string, string> = {
  emerald: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  nexus:   'border-nexus-500 bg-nexus-500/10 text-nexus-500',
  pink:    'border-pink-500 bg-pink-500/10 text-pink-500',
  blue:    'border-blue-500 bg-blue-500/10 text-blue-500',
};

// ── Modal de cobro ────────────────────────────────────────────────────
function PaymentModal({ total, onConfirm, onClose, isPending }: {
  total: number;
  onConfirm: (method: string, paidAmount: number, note: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [method, setMethod] = useState<string>('CASH');
  const [received, setReceived] = useState('');
  const [note, setNote]     = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  const receivedNum = parseFloat(received) || 0;
  const change      = method === 'CASH' ? Math.max(0, receivedNum - total) : 0;
  const canConfirm  = method !== 'CASH' || receivedNum >= total;

  // Billetes/montos rápidos en COP
  const quickAmounts = [
    Math.ceil(total / 1000) * 1000,
    Math.ceil(total / 5000) * 5000,
    Math.ceil(total / 10000) * 10000,
    Math.ceil(total / 50000) * 50000,
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">

        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-nexus-500" />
            <h2 className="font-bold text-lg">Cobrar venta</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Total */}
          <div className="text-center py-3 rounded-xl bg-nexus-500/10 border border-nexus-500/20">
            <p className="text-xs text-muted-foreground mb-1">Total a cobrar</p>
            <p className="text-4xl font-bold text-nexus-500 tabular-nums">{formatCurrency(total)}</p>
          </div>

          {/* Método */}
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map(pm => {
              const Icon = pm.icon;
              const active = method === pm.key;
              return (
                <button
                  key={pm.key}
                  onClick={() => setMethod(pm.key)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                    active ? METHOD_COLORS[pm.color] : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {pm.label}
                  {active && <CheckCircle2 className="h-3.5 w-3.5 ml-auto" />}
                </button>
              );
            })}
          </div>

          {/* Efectivo: monto recibido + cambio */}
          {method === 'CASH' && (
            <div className="space-y-3">
              <Input
                ref={inputRef}
                type="number"
                value={received}
                onChange={e => setReceived(e.target.value)}
                placeholder={`Monto recibido (mín. ${formatCurrency(total)})`}
                className="h-12 text-lg font-bold text-center tabular-nums"
                min={0}
              />
              {/* Montos rápidos */}
              <div className="flex gap-2 flex-wrap">
                {quickAmounts.map(a => (
                  <button key={a} onClick={() => setReceived(String(a))}
                    className="px-3 py-1.5 rounded-lg bg-muted hover:bg-nexus-500/10 hover:text-nexus-500 text-xs font-medium transition-colors border border-border tabular-nums">
                    {formatCurrency(a)}
                  </button>
                ))}
              </div>
              {/* Cambio */}
              <div className={cn('flex items-center justify-between p-3 rounded-xl border',
                change > 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-muted border-border')}>
                <span className="text-sm font-medium">Cambio a devolver</span>
                <span className={cn('text-xl font-bold tabular-nums', change > 0 ? 'text-emerald-500' : 'text-muted-foreground')}>
                  {formatCurrency(change)}
                </span>
              </div>
              {received && !canConfirm && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Faltan {formatCurrency(total - receivedNum)}
                </div>
              )}
            </div>
          )}

          {/* Nota */}
          <Input value={note} onChange={e => setNote(e.target.value)}
            placeholder="Nota interna (opcional)" className="h-9" />
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <Button variant="ghost" onClick={onClose} disabled={isPending} className="flex-1">Cancelar</Button>
          <Button
            onClick={() => onConfirm(method, method === 'CASH' ? receivedNum : total, note)}
            disabled={!canConfirm || isPending}
            className="flex-[2] gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
          >
            {isPending
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Procesando...</>
              : <><CheckCircle2 className="h-4 w-4" />Confirmar venta</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Página POS ────────────────────────────────────────────────────────
export default function POSPage() {
  const [search,          setSearch]          = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showPayment,     setShowPayment]     = useState(false);
  const [lastOrder,       setLastOrder]       = useState<any>(null);
  const [scanMode,        setScanMode]        = useState(false);
  const [barcodeBuffer,   setBarcodeBuffer]   = useState('');
  const [apiError,        setApiError]        = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { cart, addItem, removeItem, updateQty, clearCart,
          discount, setDiscount, customer, setCustomer } = usePOSStore();
  const queryClient = useQueryClient();

  // ── Productos ──────────────────────────────────────────────────────
  const { data: categories } = useQuery({
    queryKey: ['pos-categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data),
    staleTime: 10 * 60_000,
  });

  const { data: products, isLoading, isError, refetch } = useQuery({
    queryKey: ['pos-products', search, selectedCategory],
    queryFn: () =>
      api.get('/products', {
        params: {
          search:     search || undefined,
          categoryId: selectedCategory || undefined,
          status:     'ACTIVE',
          sellsInStore: true,
          limit: 60,
        },
      }).then(r => {
        setApiError(null);
        return r.data.data;
      }),
    staleTime: 30_000,
    retry: 1,
  });

  // ── Crear orden ────────────────────────────────────────────────────
  const createOrder = useMutation({
    mutationFn: (data: any) => api.post('/orders', data),
    onSuccess: res => {
      const order = res.data.data;
      setLastOrder(order);
      toast.success('✅ Venta registrada', { description: `${order.number} · ${formatCurrency(order.total)}` });
      clearCart();
      setShowPayment(false);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Error al procesar la venta';
      toast.error(msg);
    },
  });

  const subtotal       = cart.reduce((a, i) => a + i.price * i.qty, 0);
  const discountAmount = discount > 0 ? (subtotal * discount) / 100 : 0;
  const taxAmount      = (subtotal - discountAmount) * 0.19;
  const total          = subtotal - discountAmount + taxAmount;
  const totalItems     = cart.reduce((a, i) => a + i.qty, 0);

  // ── Armar mensaje de recibo para WhatsApp ─────────────────────────
  const buildWhatsAppReceipt = (order: any): string => {
    const lines = (order.items ?? [])
      .map((i: any) => `  • ${i.name} x${i.quantity} — ${formatCurrency(i.total ?? i.unitPrice * i.quantity)}`)
      .join('\n');
    const greeting = order.customer?.firstName ? ` ${order.customer.firstName}` : '';
    return [
      `Hola${greeting}! 👋 Gracias por tu compra.`,
      '',
      `🧾 *Pedido:* ${order.number}`,
      lines ? `\n${lines}` : '',
      '',
      `💰 *Total pagado:* ${formatCurrency(order.total)}`,
      '',
      '¡Gracias por preferirnos! 🙏',
    ].join('\n');
  };

  // ── Agregar producto al carrito ────────────────────────────────────
  const addProduct = useCallback((product: any) => {
    addItem({
      id:        product.id,
      name:      product.name,
      price:     product.salePrice ?? product.basePrice,
      costPrice: product.costPrice ?? 0,
      sku:       product.sku ?? '',
      image:     product.image,
      maxQty:    999,
    });
  }, [addItem]);

  // ── Escaneo de código de barras (lector USB/Bluetooth) ─────────────
  // Los lectores envían caracteres rápido y terminan con Enter
  useEffect(() => {
    if (!scanMode) return;

    const onKey = (e: KeyboardEvent) => {
      // Ignorar si el foco está en un input normal
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Enter') {
        const code = barcodeBuffer.trim();
        if (code.length >= 3) lookupBarcode(code);
        setBarcodeBuffer('');
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        return;
      }

      if (e.key.length === 1) {
        setBarcodeBuffer(prev => prev + e.key);
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        // Si no llega Enter en 200ms, tratar como código completo
        barcodeTimer.current = setTimeout(() => {
          setBarcodeBuffer(prev => {
            if (prev.length >= 3) lookupBarcode(prev);
            return '';
          });
        }, 200);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); if (barcodeTimer.current) clearTimeout(barcodeTimer.current); };
  }, [scanMode, barcodeBuffer]);

  // ── Búsqueda de código de barras en el campo de texto ─────────────
  // Cuando el usuario escribe en el input y el string parece un código de barras
  const handleSearchChange = (value: string) => {
    setSearch(value);
    // Si es un código numérico largo (8-13 dígitos) = posible barcode
    if (/^\d{8,13}$/.test(value.trim())) {
      lookupBarcode(value.trim());
    }
  };

  const lookupBarcode = async (code: string) => {
    try {
      const res = await api.get(`/products/lookup/${code}`);
      const product = res.data.data;
      addProduct(product);
      setSearch('');
      toast.success(`Agregado: ${product.name}`, { duration: 1500 });
      searchRef.current?.focus();
    } catch {
      toast.error(`Código no encontrado: ${code}`);
    }
  };

  // ── Confirmar pago ─────────────────────────────────────────────────
  const handleConfirmPayment = (method: string, paidAmount: number, note: string) => {
    createOrder.mutate({
      customerId:     customer?.id,
      channel:        'POS',
      deliveryMethod: 'PICKUP',
      paymentMethod:  method,
      paidAmount,
      discountAmount,
      taxAmount,
      notes:          note || undefined,
      items: cart.map(item => ({
        productId: item.id,
        name:      item.name,
        sku:       item.sku,
        quantity:  item.qty,
        unitPrice: item.price,
        costPrice: item.costPrice,
        taxRate:   0.19,
      })),
    });
  };

  // ── Atajos de teclado ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2' && cart.length > 0) { e.preventDefault(); setShowPayment(true); }
      if (e.key === 'Escape')  { setShowPayment(false); setScanMode(false); }
      if (e.key === 'F3')      { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F4')      { e.preventDefault(); setScanMode(m => !m); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cart]);

  return (
    <>
      <div className="pos-grid bg-background overflow-hidden">

        {/* ── LEFT: Productos ─────────────────────────────────────── */}
        <div className="flex flex-col overflow-hidden border-r border-border">

          {/* Header búsqueda */}
          <div className="p-3 border-b border-border space-y-2.5 bg-card">
            <div className="flex gap-2">
              {/* Búsqueda / código de barras */}
              <div className="relative flex-1">
                {scanMode
                  ? <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 animate-pulse" />
                  : <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                }
                <Input
                  ref={searchRef}
                  value={search}
                  onChange={e => handleSearchChange(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && search.trim()) lookupBarcode(search.trim()); }}
                  placeholder={scanMode
                    ? 'Escanea el código de barras...'
                    : 'Buscar por nombre, SKU o código de barras (F3)'}
                  className={cn('pl-9 h-10', scanMode && 'border-emerald-500/50 bg-emerald-500/5')}
                  autoFocus
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Botón escaneo */}
              <button
                onClick={() => setScanMode(m => !m)}
                title="Activar modo escáner (F4)"
                className={cn(
                  'w-10 h-10 rounded-lg border flex items-center justify-center transition-all shrink-0',
                  scanMode
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-500',
                )}
              >
                <ScanLine className="h-4 w-4" />
              </button>
            </div>

            {/* Modo escaneo activo */}
            {scanMode && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Modo escáner activo — apunta el lector a cualquier código de barras
                <span className="ml-auto text-muted-foreground">F4 para desactivar</span>
              </div>
            )}

            {/* Categorías */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 custom-scroll">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                  !selectedCategory ? 'bg-nexus-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}
              >
                Todos
              </button>
              {categories?.items?.map((cat: any) => (
                <button key={cat.id}
                  onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                    selectedCategory === cat.id ? 'bg-nexus-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Grilla de productos */}
          <div className="flex-1 overflow-auto custom-scroll p-3">

            {/* Error state */}
            {isError && (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                <AlertCircle className="h-10 w-10 text-rose-500 opacity-60" />
                <p className="text-sm font-medium text-rose-500">Error al cargar productos</p>
                <p className="text-xs">Verifica la conexión con el servidor</p>
                <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-2">
                  <RefreshCw className="h-3.5 w-3.5" /> Reintentar
                </Button>
              </div>
            )}

            {/* Loading skeleton */}
            {isLoading && !isError && (
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            )}

            {/* Grilla */}
            {!isLoading && !isError && (
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                {products?.items?.map((product: any) => {
                  const inCart = cart.find(c => c.id === product.id);
                  const outOfStock = product.trackInventory && (product.stock ?? 0) === 0;
                  return (
                    <button
                      key={product.id}
                      onClick={() => !outOfStock && addProduct(product)}
                      disabled={outOfStock}
                      className={cn(
                        'relative bg-card border rounded-xl p-2.5 text-left transition-all duration-150 group',
                        outOfStock
                          ? 'border-border opacity-50 cursor-not-allowed'
                          : inCart
                            ? 'border-nexus-500 ring-1 ring-nexus-500/30 bg-nexus-500/5 active:scale-[0.97]'
                            : 'border-border hover:border-nexus-500/50 hover:shadow-sm active:scale-[0.97]',
                      )}
                    >
                      {/* Imagen */}
                      <div className="aspect-square rounded-lg bg-muted mb-2 overflow-hidden">
                        {product.image
                          ? <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                          : <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                        }
                        {outOfStock && (
                          <div className="absolute inset-0 rounded-xl bg-background/60 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-full border border-rose-500/30">SIN STOCK</span>
                          </div>
                        )}
                      </div>

                      <p className="text-xs font-medium line-clamp-2 leading-tight">{product.name}</p>
                      <p className="text-sm font-bold text-nexus-500 mt-1 tabular-nums">
                        {formatCurrency(product.salePrice ?? product.basePrice)}
                      </p>
                      {product.salePrice && product.salePrice < product.basePrice && (
                        <p className="text-[10px] text-muted-foreground line-through tabular-nums">{formatCurrency(product.basePrice)}</p>
                      )}

                      {/* Cantidad en carrito */}
                      {inCart && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-nexus-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
                          {inCart.qty}
                        </div>
                      )}

                      {/* Stock bajo */}
                      {!outOfStock && product.trackInventory && (product.stock ?? 99) <= 5 && (
                        <Badge variant="destructive" className="absolute bottom-1.5 right-1.5 text-[9px] px-1.5 py-0">
                          {product.stock}ud
                        </Badge>
                      )}

                      {/* Hover + */}
                      {!outOfStock && (
                        <div className="absolute inset-0 rounded-xl bg-nexus-500/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <div className="w-8 h-8 rounded-full bg-nexus-500 flex items-center justify-center shadow-lg">
                            <Plus className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Sin resultados */}
                {!isLoading && products?.items?.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                    <Package className="h-12 w-12 opacity-20" />
                    <div className="text-center">
                      <p className="text-sm font-medium">No se encontraron productos</p>
                      {search
                        ? <p className="text-xs mt-1 opacity-60">Sin resultados para "{search}"</p>
                        : <p className="text-xs mt-1 opacity-60">Agrega productos en la sección Productos</p>}
                    </div>
                    {search && (
                      <Button size="sm" variant="outline" onClick={() => setSearch('')}>
                        <X className="h-3.5 w-3.5 mr-1" /> Limpiar búsqueda
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Carrito ───────────────────────────────────────── */}
        <div className="flex flex-col bg-card">

          {/* Header carrito */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-nexus-500" />
                <span className="font-semibold text-sm">Venta en tienda</span>
                {totalItems > 0 && (
                  <span className="w-5 h-5 rounded-full bg-nexus-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </div>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-xs text-rose-500 hover:text-rose-400 transition-colors">
                  Vaciar
                </button>
              )}
            </div>

            {/* Cliente */}
            <button className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground flex-1 text-left truncate text-xs">
                {customer ? `${customer.firstName}${customer.lastName ? ' ' + customer.lastName : ''}` : 'Cliente general'}
              </span>
              {customer
                ? <X className="h-3 w-3 text-muted-foreground shrink-0" onClick={e => { e.stopPropagation(); setCustomer(null); }} />
                : <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
              }
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-auto custom-scroll p-2 space-y-1.5">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground select-none">
                <ShoppingCart className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-xs font-medium">Carrito vacío</p>
                <p className="text-[11px] opacity-50 mt-0.5">Toca un producto para agregar</p>
                <p className="text-[10px] opacity-40 mt-3">O escanea un código con F4</p>
              </div>
            ) : cart.map(item => (
              <div key={item.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border group hover:border-nexus-500/30 transition-colors">
                <div className="w-8 h-8 rounded-md bg-muted overflow-hidden shrink-0">
                  {item.image
                    ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    : <Package className="h-3.5 w-3.5 m-2 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate leading-tight">{item.name}</p>
                  <p className="text-[11px] text-nexus-500 tabular-nums">{formatCurrency(item.price)}</p>
                </div>
                {/* Controles */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => updateQty(item.id, item.qty - 1)}
                    className="w-6 h-6 rounded-md bg-muted hover:bg-rose-500/20 hover:text-rose-500 flex items-center justify-center transition-colors">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-7 text-center text-sm font-bold tabular-nums">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, item.qty + 1)}
                    className="w-6 h-6 rounded-md bg-muted hover:bg-nexus-500/20 hover:text-nexus-500 flex items-center justify-center transition-colors">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <div className="text-right shrink-0 min-w-[52px]">
                  <p className="text-sm font-bold tabular-nums">{formatCurrency(item.price * item.qty)}</p>
                  <button onClick={() => removeItem(item.id)}
                    className="text-muted-foreground hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totales + pago */}
          <div className="border-t border-border p-3 space-y-2.5">
            {cart.length > 0 && (
              <>
                {/* Descuento */}
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Input type="number" placeholder="Descuento %" className="h-8 text-sm flex-1"
                    value={discount || ''} onChange={e => setDiscount(Number(e.target.value))} min={0} max={100} />
                  {discount > 0 && (
                    <span className="text-xs text-emerald-500 font-semibold tabular-nums whitespace-nowrap">
                      -{formatCurrency(discountAmount)}
                    </span>
                  )}
                </div>

                {/* Desglose */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground text-xs">
                    <span>Subtotal ({totalItems} ítem{totalItems !== 1 ? 's' : ''})</span>
                    <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-500 text-xs">
                      <span>Descuento ({discount}%)</span>
                      <span className="tabular-nums">-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground text-xs">
                    <span>IVA (19%)</span>
                    <span className="tabular-nums">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t border-border pt-1.5">
                    <span>Total</span>
                    <span className="text-nexus-500 tabular-nums">{formatCurrency(total)}</span>
                  </div>
                </div>
              </>
            )}

            {/* Botón principal */}
            <Button
              onClick={() => setShowPayment(true)}
              disabled={cart.length === 0}
              className="w-full h-12 text-base font-bold gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
            >
              <ReceiptText className="h-5 w-5" />
              {cart.length === 0 ? 'Agrega productos al carrito' : `Cobrar ${formatCurrency(total)}`}
              {cart.length > 0 && <span className="text-emerald-200 text-xs font-normal ml-auto">F2</span>}
            </Button>

            {/* Última venta */}
            {lastOrder && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-semibold">{lastOrder.number}</span>
                  <span className="text-muted-foreground">· {formatCurrency(lastOrder.total)}</span>
                </div>

                {/* Botón WhatsApp — solo si el cliente tiene teléfono */}
                {lastOrder.customer?.phone && (
                  <a
                    href={`https://wa.me/${lastOrder.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(buildWhatsAppReceipt(lastOrder))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-9 rounded-lg bg-emerald-600/10 border border-emerald-600/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-600/20 transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Enviar recibo por WhatsApp
                  </a>
                )}
              </div>
            )}

            {/* Atajos */}
            <div className="flex gap-3 text-[10px] text-muted-foreground/50 justify-center">
              <span>F2 Cobrar</span><span>·</span>
              <span>F3 Buscar</span><span>·</span>
              <span>F4 Escáner</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de cobro */}
      {showPayment && (
        <PaymentModal
          total={total}
          onConfirm={handleConfirmPayment}
          onClose={() => setShowPayment(false)}
          isPending={createOrder.isPending}
        />
      )}
    </>
  );
}
