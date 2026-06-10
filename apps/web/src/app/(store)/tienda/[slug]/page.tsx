'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const pub = axios.create({ baseURL: API });

interface Product {
  id: string;
  name: string;
  sku: string;
  image: string | null;
  basePrice: number;
  salePrice: number | null;
  description: string | null;
  category: { id: string; name: string } | null;
}

interface CartItem extends Product {
  quantity: number;
}

interface Store {
  storeName: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  primaryColor: string;
  description: string | null;
  whatsappNumber: string | null;
  instagramHandle: string | null;
  acceptsCOD: boolean;
  acceptsTransfer: boolean;
  acceptsOnline: boolean;
  minOrderAmount: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
}

export default function StoreCatalogPage() {
  const params    = useParams();
  const router    = useRouter();
  const slug      = params.slug as string;

  const [store, setStore]         = useState<Store | null>(null);
  const [products, setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState('');
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cart, setCart]           = useState<CartItem[]>([]);
  const [showCart, setShowCart]   = useState(false);

  // Load store info
  useEffect(() => {
    pub.get(`/storefront/${slug}`)
      .then(r => setStore(r.data.data ?? r.data))
      .catch(() => setError('Tienda no encontrada o no disponible'));
  }, [slug]);

  // Load categories
  useEffect(() => {
    pub.get(`/storefront/${slug}/categories`)
      .then(r => setCategories(r.data.data ?? r.data ?? []))
      .catch(() => {});
  }, [slug]);

  // Load products
  const loadProducts = useCallback(() => {
    setLoading(true);
    pub.get(`/storefront/${slug}/products`, {
      params: { search: search || undefined, category: category || undefined, page, limit: 24 },
    })
      .then(r => {
        const d = r.data.data ?? r.data;
        setProducts(d.items ?? []);
        setTotalPages(d.pages ?? 1);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [slug, search, category, page]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // Cart helpers
  const addToCart = (product: Product) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.id === id ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0),
    );
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + (i.salePrice ?? i.basePrice) * i.quantity, 0);
  const primary   = store?.primaryColor ?? '#6366f1';

  const goToCheckout = () => {
    sessionStorage.setItem(`nexus-cart-${slug}`, JSON.stringify(cart));
    router.push(`/tienda/${slug}/checkout`);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center">
          <p className="text-5xl mb-4">🏪</p>
          <h1 className="text-2xl font-bold text-zinc-800 mb-2">Tienda no encontrada</h1>
          <p className="text-zinc-500">Esta tienda no existe o no está disponible por el momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Banner */}
      {store?.bannerUrl && (
        <div className="h-48 md:h-64 w-full overflow-hidden">
          <img src={store.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Store header */}
      <div className="sticky top-0 z-30 bg-white border-b border-zinc-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {store?.logoUrl ? (
              <img src={store.logoUrl} alt="Logo" className="h-10 w-10 rounded-xl object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: primary }}>
                {(store?.storeName ?? 'T')[0]}
              </div>
            )}
            <div>
              <h1 className="font-bold text-zinc-900 text-lg leading-tight">
                {store?.storeName ?? ''}
              </h1>
              {store?.description && (
                <p className="text-xs text-zinc-500 line-clamp-1">{store.description}</p>
              )}
            </div>
          </div>

          {/* Cart button */}
          <button
            onClick={() => setShowCart(true)}
            className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: primary }}
          >
            🛒 Carrito
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="🔍 Buscar productos..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[200px] max-w-sm h-9 px-3 rounded-lg border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:border-transparent"
          style={{ '--tw-ring-color': primary } as React.CSSProperties}
        />
        <button
          onClick={() => { setCategory(''); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
            !category ? 'text-white border-transparent' : 'text-zinc-600 bg-white border-zinc-200'
          }`}
          style={!category ? { backgroundColor: primary } : {}}
        >
          Todos
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => { setCategory(cat.id); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
              category === cat.id ? 'text-white border-transparent' : 'text-zinc-600 bg-white border-zinc-200'
            }`}
            style={category === cat.id ? { backgroundColor: primary } : {}}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="max-w-6xl mx-auto px-4 pb-24">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="aspect-square bg-zinc-200 rounded-xl mb-3" />
                <div className="h-3 bg-zinc-200 rounded mb-2 w-3/4" />
                <div className="h-4 bg-zinc-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-zinc-500">No hay productos disponibles</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {products.map(product => {
                const price  = product.salePrice ?? product.basePrice;
                const inCart = cart.find(i => i.id === product.id);
                return (
                  <div key={product.id} className="bg-white rounded-2xl overflow-hidden border border-zinc-100 hover:shadow-md transition-shadow group">
                    <div className="aspect-square bg-zinc-100 overflow-hidden">
                      {product.image ? (
                        <img src={product.image} alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl text-zinc-300">📦</div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-zinc-800 text-sm leading-tight line-clamp-2 mb-1">{product.name}</p>
                      {product.salePrice && (
                        <p className="text-xs text-zinc-400 line-through">{fmt(product.basePrice)}</p>
                      )}
                      <p className="font-bold text-base mb-2" style={{ color: primary }}>{fmt(price)}</p>
                      {inCart ? (
                        <div className="flex items-center justify-between">
                          <button onClick={() => updateQty(product.id, -1)}
                            className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 font-bold text-lg flex items-center justify-center">−</button>
                          <span className="font-bold text-sm">{inCart.quantity}</span>
                          <button onClick={() => updateQty(product.id, 1)}
                            className="w-7 h-7 rounded-lg text-white font-bold text-lg flex items-center justify-center"
                            style={{ backgroundColor: primary }}>+</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          className="w-full py-1.5 rounded-lg text-white text-xs font-semibold transition-opacity hover:opacity-90"
                          style={{ backgroundColor: primary }}
                        >
                          Agregar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 rounded-lg border border-zinc-200 bg-white text-sm disabled:opacity-40">← Anterior</button>
                <span className="px-4 py-2 text-sm text-zinc-500">Página {page} de {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 rounded-lg border border-zinc-200 bg-white text-sm disabled:opacity-40">Siguiente →</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating cart summary */}
      {cartCount > 0 && !showCart && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => setShowCart(true)}
            className="flex items-center gap-4 px-6 py-3.5 rounded-2xl text-white shadow-xl font-semibold text-sm"
            style={{ backgroundColor: primary }}
          >
            <span>🛒 {cartCount} producto{cartCount !== 1 ? 's' : ''}</span>
            <span className="w-px h-4 bg-white/30" />
            <span>{fmt(cartTotal)}</span>
            <span className="ml-1">→</span>
          </button>
        </div>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="w-full max-w-sm bg-white h-full flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100">
              <h2 className="font-bold text-lg">Tu carrito</h2>
              <button onClick={() => setShowCart(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold">✕</button>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
                <p className="text-5xl mb-3">🛒</p>
                <p>Tu carrito está vacío</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-zinc-100 overflow-hidden shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                        <p className="text-xs font-bold" style={{ color: primary }}>
                          {fmt(item.salePrice ?? item.basePrice)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => updateQty(item.id, -1)}
                          className="w-7 h-7 rounded-lg bg-zinc-100 font-bold flex items-center justify-center text-zinc-700">−</button>
                        <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, 1)}
                          className="w-7 h-7 rounded-lg text-white font-bold flex items-center justify-center"
                          style={{ backgroundColor: primary }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-5 border-t border-zinc-100 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Subtotal ({cartCount} ítem{cartCount !== 1 ? 's' : ''})</span>
                    <span className="font-bold">{fmt(cartTotal)}</span>
                  </div>
                  <button
                    onClick={goToCheckout}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90"
                    style={{ backgroundColor: primary }}
                  >
                    Ir a pagar →
                  </button>
                  <button onClick={() => setShowCart(false)}
                    className="w-full py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">
                    Seguir comprando
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-zinc-400 border-t border-zinc-200 bg-white mt-8">
        {store?.whatsappNumber && (
          <a
            href={`https://wa.me/${store.whatsappNumber.replace(/\D/g, '')}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mb-3 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 font-medium text-sm"
          >
            💬 Escribenos por WhatsApp
          </a>
        )}
        <p className="mt-2">Powered by <strong>Nexus ERP</strong></p>
      </footer>
    </div>
  );
}
