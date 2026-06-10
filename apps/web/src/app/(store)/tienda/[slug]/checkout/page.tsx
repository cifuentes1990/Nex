'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const pub = axios.create({ baseURL: API });

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
}

type PayMethod = 'COD' | 'TRANSFER' | 'ONLINE';
type DeliveryMethod = 'HOME_DELIVERY' | 'PICKUP';

const CITIES_CO = [
  'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Cúcuta', 'Bucaramanga',
  'Pereira', 'Santa Marta', 'Ibagué', 'Pasto', 'Manizales', 'Neiva', 'Villavicencio',
  'Armenia', 'Valledupar', 'Montería', 'Sincelejo', 'Popayán', 'Florencia',
];

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const slug   = params.slug as string;

  const [store, setStore]         = useState<any>(null);
  const [cart, setCart]           = useState<any[]>([]);
  const [delivery, setDelivery]   = useState<DeliveryMethod>('HOME_DELIVERY');
  const [payMethod, setPayMethod] = useState<PayMethod>('TRANSFER');
  const [city, setCity]           = useState('');
  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<any>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]     = useState<any>(null);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', city: '', instructions: '', notes: '',
  });

  // Load store and cart from sessionStorage
  useEffect(() => {
    pub.get(`/storefront/${slug}`)
      .then(r => setStore(r.data.data ?? r.data))
      .catch(() => router.push(`/tienda/${slug}`));

    const saved = sessionStorage.getItem(`nexus-cart-${slug}`);
    if (!saved) { router.push(`/tienda/${slug}`); return; }
    try { setCart(JSON.parse(saved)); } catch { router.push(`/tienda/${slug}`); }
  }, [slug, router]);

  // Recalculate shipping when city changes
  useEffect(() => {
    if (!city || delivery !== 'HOME_DELIVERY') {
      setShippingOptions([]);
      setSelectedShipping(null);
      return;
    }
    setLoadingShipping(true);
    setSelectedShipping(null);
    pub.get(`/storefront/${slug}/shipping`, { params: { city, total: subtotal } })
      .then(r => {
        const data = r.data.data ?? r.data;
        if (Array.isArray(data)) {
          setShippingOptions(data);
          if (data.length === 1) setSelectedShipping(data[0]);
        } else {
          setShippingOptions([]);
        }
      })
      .catch(() => setShippingOptions([]))
      .finally(() => setLoadingShipping(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, delivery, slug]);

  const primary   = store?.primaryColor ?? '#6366f1';
  const subtotal  = cart.reduce((s, i) => s + (i.salePrice ?? i.basePrice) * i.quantity, 0);
  const shipping  = delivery === 'HOME_DELIVERY' ? (selectedShipping?.cost ?? 0) : 0;
  const total     = subtotal + shipping;
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const setField = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const validPayMethods: PayMethod[] = [
    ...(store?.acceptsCOD      ? ['COD']      as PayMethod[] : []),
    ...(store?.acceptsTransfer ? ['TRANSFER'] as PayMethod[] : []),
    ...(store?.acceptsOnline   ? ['ONLINE']   as PayMethod[] : []),
  ];

  const PAY_LABELS: Record<PayMethod, string> = {
    COD:      '💵 Efectivo contra entrega',
    TRANSFER: '🏦 Transferencia / Nequi',
    ONLINE:   '💳 Pago online (PSE / Tarjeta)',
  };

  const PAY_MAP: Record<PayMethod, string> = {
    COD:      'CASH',
    TRANSFER: 'BANK_TRANSFER',
    ONLINE:   'STRIPE',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    if (delivery === 'HOME_DELIVERY' && !form.city) return;
    if (delivery === 'HOME_DELIVERY' && !form.address) return;
    if (delivery === 'HOME_DELIVERY' && shippingOptions.length > 0 && !selectedShipping) return;

    setSubmitting(true);
    try {
      const res = await pub.post(`/storefront/${slug}/orders`, {
        name:           form.name,
        email:          form.email || undefined,
        phone:          form.phone,
        address:        form.address || undefined,
        city:           form.city || undefined,
        instructions:   form.instructions || undefined,
        notes:          form.notes || undefined,
        deliveryMethod: delivery,
        paymentMethod:  PAY_MAP[payMethod],
        subtotal,
        taxAmount:      0,
        shippingCost:   shipping,
        total,
        items: cart.map(i => ({
          productId: i.id,
          name:      i.name,
          sku:       i.sku ?? '',
          quantity:  i.quantity,
          unitPrice: i.salePrice ?? i.basePrice,
        })),
      });
      const order = res.data.data ?? res.data;
      sessionStorage.removeItem(`nexus-cart-${slug}`);
      setSuccess(order);
    } catch {
      alert('Error al procesar tu pedido. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-8 h-8 border-4 border-zinc-300 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4 text-3xl">✅</div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">¡Pedido recibido!</h2>
          <p className="text-zinc-500 mb-4">Tu pedido <strong className="text-zinc-800">{success.number}</strong> fue registrado con éxito.</p>
          <div className="bg-zinc-50 rounded-2xl p-4 text-left mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Total</span>
              <span className="font-bold">{fmt(success.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Método de pago</span>
              <span className="font-medium">{PAY_LABELS[payMethod]}</span>
            </div>
            {delivery === 'HOME_DELIVERY' && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Entrega</span>
                <span className="font-medium">🛵 Domicilio</span>
              </div>
            )}
          </div>
          {store.whatsappNumber && (
            <a
              href={`https://wa.me/${store.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! Acabo de hacer el pedido ${success.number} por ${fmt(success.total)}.`)}`}
              target="_blank" rel="noopener noreferrer"
              className="block w-full py-3 rounded-xl bg-emerald-500 text-white font-bold mb-3 hover:bg-emerald-600 transition-colors"
            >
              💬 Confirmar por WhatsApp
            </a>
          )}
          <button
            onClick={() => router.push(`/tienda/${slug}`)}
            className="w-full py-3 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50"
          >
            Seguir comprando
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push(`/tienda/${slug}`)}
            className="text-zinc-400 hover:text-zinc-700 transition-colors">← Volver</button>
          <div className="flex-1 text-center">
            <p className="font-bold text-zinc-800">{store.storeName}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 mb-6">Finaliza tu pedido</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Contact info */}
            <div className="bg-white rounded-2xl p-5 border border-zinc-100">
              <h3 className="font-semibold text-zinc-800 mb-4">Tu información</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1">Nombre completo *</label>
                  <input required value={form.name} onChange={e => setField('name', e.target.value)}
                    placeholder="Juan Pérez"
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
                    style={{ '--tw-ring-color': primary } as React.CSSProperties} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">Teléfono *</label>
                    <input required value={form.phone} onChange={e => setField('phone', e.target.value)}
                      placeholder="+57 300 000 0000" type="tel"
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">Correo (opcional)</label>
                    <input value={form.email} onChange={e => setField('email', e.target.value)}
                      placeholder="juan@email.com" type="email"
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2" />
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery method */}
            <div className="bg-white rounded-2xl p-5 border border-zinc-100">
              <h3 className="font-semibold text-zinc-800 mb-4">Método de entrega</h3>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: 'HOME_DELIVERY', label: '🛵 Domicilio', sub: 'Lo llevamos a tu puerta' },
                  { value: 'PICKUP',        label: '🏪 Recoger',   sub: 'Recoge en nuestra tienda' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDelivery(opt.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      delivery === opt.value ? 'border-transparent' : 'border-zinc-200'
                    }`}
                    style={delivery === opt.value ? { borderColor: primary, backgroundColor: `${primary}10` } : {}}
                  >
                    <p className="font-semibold text-sm">{opt.label}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{opt.sub}</p>
                  </button>
                ))}
              </div>

              {/* Address fields */}
              {delivery === 'HOME_DELIVERY' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">Ciudad *</label>
                    <select required value={form.city} onChange={e => { setField('city', e.target.value); setCity(e.target.value); }}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-sm bg-white focus:outline-none focus:ring-2">
                      <option value="">Selecciona tu ciudad...</option>
                      {CITIES_CO.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">Dirección *</label>
                    <input required value={form.address} onChange={e => setField('address', e.target.value)}
                      placeholder="Calle 123 # 45-67, Barrio"
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">Indicaciones (opcional)</label>
                    <input value={form.instructions} onChange={e => setField('instructions', e.target.value)}
                      placeholder="Apto 301, timbre azul, cerca al parque..."
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2" />
                  </div>

                  {/* Shipping options */}
                  {loadingShipping && (
                    <p className="text-xs text-zinc-500 flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-zinc-300 border-t-indigo-500 rounded-full animate-spin" />
                      Calculando envío...
                    </p>
                  )}
                  {shippingOptions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-zinc-500">Opciones de envío</p>
                      {shippingOptions.map(opt => (
                        <button
                          key={opt.zoneId}
                          type="button"
                          onClick={() => setSelectedShipping(opt)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                            selectedShipping?.zoneId === opt.zoneId ? 'border-transparent' : 'border-zinc-200'
                          }`}
                          style={selectedShipping?.zoneId === opt.zoneId ? { borderColor: primary, backgroundColor: `${primary}10` } : {}}
                        >
                          <div className="text-left">
                            <p className="text-sm font-medium">{opt.carrier ?? opt.zoneName}</p>
                            <p className="text-xs text-zinc-500">{opt.minDays}–{opt.maxDays} días hábiles</p>
                          </div>
                          <p className="font-bold text-sm">
                            {opt.isFree ? <span className="text-emerald-600">Gratis</span> : fmt(opt.cost)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  {!loadingShipping && city && shippingOptions.length === 0 && (
                    <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                      ⚠️ No tenemos envío disponible para esta ciudad. Contáctanos para coordinar.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Payment method */}
            <div className="bg-white rounded-2xl p-5 border border-zinc-100">
              <h3 className="font-semibold text-zinc-800 mb-4">Método de pago</h3>
              {validPayMethods.length === 0 ? (
                <p className="text-sm text-zinc-500">El vendedor no tiene métodos de pago configurados aún.</p>
              ) : (
                <div className="space-y-2">
                  {validPayMethods.map(pm => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPayMethod(pm)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                        payMethod === pm ? 'border-transparent' : 'border-zinc-200'
                      }`}
                      style={payMethod === pm ? { borderColor: primary, backgroundColor: `${primary}10` } : {}}
                    >
                      <span className="text-base">{PAY_LABELS[pm].split(' ')[0]}</span>
                      <span className="text-sm font-medium">{PAY_LABELS[pm].substring(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl p-5 border border-zinc-100">
              <label className="text-xs font-medium text-zinc-500 block mb-2">Notas del pedido (opcional)</label>
              <textarea value={form.notes} onChange={e => setField('notes', e.target.value)}
                rows={2} placeholder="Instrucciones especiales, comentarios..."
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm resize-none focus:outline-none focus:ring-2" />
            </div>

            <button
              type="submit"
              disabled={submitting || (delivery === 'HOME_DELIVERY' && shippingOptions.length > 0 && !selectedShipping)}
              className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: primary }}
            >
              {submitting ? 'Procesando...' : `Confirmar pedido — ${fmt(total)}`}
            </button>
          </form>

          {/* Order summary */}
          <div>
            <div className="bg-white rounded-2xl p-5 border border-zinc-100 sticky top-20">
              <h3 className="font-semibold text-zinc-800 mb-4">Tu pedido ({cartCount} ítem{cartCount !== 1 ? 's' : ''})</h3>
              <div className="space-y-3 mb-4">
                {cart.map(item => {
                  const price = item.salePrice ?? item.basePrice;
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-zinc-100 overflow-hidden shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                        <p className="text-xs text-zinc-500">{item.quantity} × {fmt(price)}</p>
                      </div>
                      <p className="text-sm font-bold shrink-0">{fmt(price * item.quantity)}</p>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-zinc-100 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Subtotal</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Envío</span>
                  <span>{delivery === 'PICKUP' ? 'Gratis (recoges)' : selectedShipping ? (selectedShipping.isFree ? '🎉 Gratis' : fmt(selectedShipping.cost)) : '—'}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-zinc-100">
                  <span>Total</span>
                  <span style={{ color: primary }}>{fmt(total)}</span>
                </div>
              </div>

              {store.minOrderAmount > 0 && subtotal < store.minOrderAmount && (
                <p className="mt-3 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  ⚠️ Mínimo de pedido: {fmt(store.minOrderAmount)}. Faltan {fmt(store.minOrderAmount - subtotal)}.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
