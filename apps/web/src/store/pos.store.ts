import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  sku: string;
  image?: string;
  qty: number;
  maxQty: number;
}

interface Customer {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface POSStore {
  cart: CartItem[];
  customer: Customer | null;
  discount: number;
  note: string;
  addItem: (item: Omit<CartItem, 'qty'>) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  setCustomer: (c: Customer | null) => void;
  setDiscount: (d: number) => void;
  setNote: (n: string) => void;
}

export const usePOSStore = create<POSStore>()(
  persist(
    (set, get) => ({
      cart: [],
      customer: null,
      discount: 0,
      note: '',

      addItem: (item) => {
        const existing = get().cart.find((i) => i.id === item.id);
        if (existing) {
          set((s) => ({
            cart: s.cart.map((i) =>
              i.id === item.id
                ? { ...i, qty: Math.min(i.qty + 1, i.maxQty) }
                : i,
            ),
          }));
        } else {
          set((s) => ({ cart: [...s.cart, { ...item, qty: 1 }] }));
        }
      },

      removeItem: (id) => set((s) => ({ cart: s.cart.filter((i) => i.id !== id) })),

      updateQty: (id, qty) => {
        if (qty <= 0) {
          set((s) => ({ cart: s.cart.filter((i) => i.id !== id) }));
        } else {
          set((s) => ({
            cart: s.cart.map((i) =>
              i.id === id ? { ...i, qty: Math.min(qty, i.maxQty) } : i,
            ),
          }));
        }
      },

      clearCart: () => set({ cart: [], discount: 0, customer: null, note: '' }),
      setCustomer: (c) => set({ customer: c }),
      setDiscount: (d) => set({ discount: Math.max(0, Math.min(100, d)) }),
      setNote: (n) => set({ note: n }),
    }),
    { name: 'nexus-pos-cart' },
  ),
);
