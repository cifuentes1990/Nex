import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, ScrollView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { productsApi, api } from '@/lib/api';
import { useDebounce } from '@/lib/hooks';

interface CartItem {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
}

type PayMethod = 'CASH' | 'CARD' | 'TRANSFER';

const PAY_OPTS: { value: PayMethod; icon: string; label: string }[] = [
  { value: 'CASH',     icon: '💵', label: 'Efectivo' },
  { value: 'CARD',     icon: '💳', label: 'Tarjeta'  },
  { value: 'TRANSFER', icon: '📲', label: 'Transfer.' },
];

export default function PosScreen() {
  const [search, setSearch]       = useState('');
  const [cart, setCart]           = useState<CartItem[]>([]);
  const [showCart, setShowCart]   = useState(false);
  const [method, setMethod]       = useState<PayMethod>('CASH');
  const [paid, setPaid]           = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['mobile-products', debouncedSearch],
    queryFn: () => productsApi.list({
      search: debouncedSearch || undefined,
      status: 'ACTIVE',
      limit: 40,
    }),
  });

  const products: any[] = data?.items ?? [];

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const tax      = +(subtotal * 0.19).toFixed(0);
  const total    = subtotal + tax;
  const change   = method === 'CASH' && paid ? Math.max(0, +paid - total) : 0;

  const add = (p: any) => {
    const price = p.salePrice ?? p.basePrice ?? 0;
    setCart((prev) => {
      const ex = prev.find((i) => i.productId === p.id);
      if (ex) return prev.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: p.id, name: p.name, sku: p.sku ?? '', unitPrice: price, quantity: 1 }];
    });
  };

  const dec = (productId: string) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.productId === productId);
      if (!ex) return prev;
      if (ex.quantity <= 1) return prev.filter((i) => i.productId !== productId);
      return prev.map((i) => i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  const sell = useMutation({
    mutationFn: async () => {
      return api.post('/orders', {
        channel: 'POS',
        deliveryMethod: 'PICKUP',
        subtotal,
        taxAmount: tax,
        total,
        paymentMethod: method,
        paidAmount: method === 'CASH' ? +paid : total,
        items: cart.map((i) => ({
          productId: i.productId,
          name: i.name,
          sku: i.sku,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      }).then((r) => r.data.data);
    },
    onSuccess: (order) => {
      const changeMsg = change > 0 ? `\nCambio: $${change.toLocaleString('es-CO')}` : '';
      Alert.alert(
        '✅ Venta registrada',
        `${order.number}\nTotal: $${order.total?.toLocaleString('es-CO')}${changeMsg}`,
        [{
          text: 'Nueva venta',
          onPress: () => { setCart([]); setShowCart(false); setPaid(''); setSearch(''); },
        }],
      );
    },
    onError: () => Alert.alert('Error', 'No se pudo registrar la venta'),
  });

  const handleSell = () => {
    if (cart.length === 0) return;
    if (method === 'CASH' && (!paid || +paid < total)) {
      Alert.alert('Monto insuficiente', `El total es $${total.toLocaleString('es-CO')}`);
      return;
    }
    sell.mutate();
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>POS</Text>
        {cart.length > 0 && (
          <TouchableOpacity style={s.cartBadge} onPress={() => setShowCart(true)}>
            <Text style={s.cartBadgeTxt}>🛒 {cart.reduce((a, i) => a + i.quantity, 0)} · ${total.toLocaleString('es-CO')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Búsqueda */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.searchInput}
          placeholder="🔍  Buscar producto o código..."
          placeholderTextColor="#52525b"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Grid de productos */}
      {isLoading ? (
        <View style={s.center}><ActivityIndicator color="#6366f1" size="large" /></View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          numColumns={2}
          contentContainerStyle={s.grid}
          renderItem={({ item }) => {
            const qty = cart.find((c) => c.productId === item.id)?.quantity ?? 0;
            const price = item.salePrice ?? item.basePrice ?? 0;
            return (
              <TouchableOpacity
                style={[s.productCard, qty > 0 && s.productCardOn]}
                onPress={() => add(item)}
                activeOpacity={0.8}
              >
                <Text style={s.productName} numberOfLines={2}>{item.name}</Text>
                <Text style={s.productPrice}>${price.toLocaleString('es-CO')}</Text>
                {item.sku ? <Text style={s.productSku}>{item.sku}</Text> : null}
                {qty > 0 && (
                  <View style={s.qtyDot}>
                    <Text style={s.qtyDotTxt}>{qty}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={s.center}><Text style={s.emptyTxt}>Sin productos</Text></View>
          }
        />
      )}

      {/* Modal carrito */}
      <Modal
        visible={showCart}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCart(false)}
      >
        <SafeAreaView style={s.cartModal}>
          <View style={s.cartHead}>
            <Text style={s.cartTitle}>Carrito</Text>
            <TouchableOpacity onPress={() => setShowCart(false)}>
              <Text style={s.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.cartBody}>
            {/* Items */}
            {cart.map((item) => (
              <View key={item.productId} style={s.cartRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cartItemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.cartItemPrice}>${item.unitPrice.toLocaleString('es-CO')} c/u</Text>
                </View>
                <View style={s.qtyCtrl}>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => dec(item.productId)}>
                    <Text style={s.qtyBtnTxt}>−</Text>
                  </TouchableOpacity>
                  <Text style={s.qtyNum}>{item.quantity}</Text>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => add({ id: item.productId, name: item.name, sku: item.sku, salePrice: item.unitPrice })}>
                    <Text style={s.qtyBtnTxt}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.cartRowTotal}>${(item.unitPrice * item.quantity).toLocaleString('es-CO')}</Text>
              </View>
            ))}

            {/* Pago */}
            <View style={s.section}>
              <Text style={s.sectionLbl}>MÉTODO DE PAGO</Text>
              <View style={s.payRow}>
                {PAY_OPTS.map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    style={[s.payBtn, method === p.value && s.payBtnOn]}
                    onPress={() => setMethod(p.value)}
                  >
                    <Text style={s.payIcon}>{p.icon}</Text>
                    <Text style={[s.payLbl, method === p.value && s.payLblOn]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {method === 'CASH' && (
              <View style={s.section}>
                <Text style={s.sectionLbl}>MONTO RECIBIDO</Text>
                <TextInput
                  style={s.amtInput}
                  placeholder="0"
                  placeholderTextColor="#52525b"
                  value={paid}
                  onChangeText={setPaid}
                  keyboardType="numeric"
                />
                {change > 0 && (
                  <Text style={s.changeTxt}>Cambio: ${change.toLocaleString('es-CO')}</Text>
                )}
              </View>
            )}

            {/* Resumen */}
            <View style={s.summary}>
              <View style={s.summaryRow}>
                <Text style={s.summaryLbl}>Subtotal</Text>
                <Text style={s.summaryVal}>${subtotal.toLocaleString('es-CO')}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLbl}>IVA (19%)</Text>
                <Text style={s.summaryVal}>${tax.toLocaleString('es-CO')}</Text>
              </View>
              <View style={[s.summaryRow, { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#27272a' }]}>
                <Text style={[s.summaryLbl, { color: '#fafafa', fontSize: 17, fontWeight: '700' }]}>Total</Text>
                <Text style={[s.summaryVal, { color: '#6366f1', fontSize: 22, fontWeight: '800' }]}>
                  ${total.toLocaleString('es-CO')}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={s.cartFoot}>
            <TouchableOpacity
              style={[s.sellBtn, sell.isPending && { opacity: 0.6 }]}
              onPress={handleSell}
              disabled={sell.isPending}
            >
              {sell.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.sellBtnTxt}>✅ Registrar venta</Text>
              }
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#09090b' },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title:         { fontSize: 28, fontWeight: '700', color: '#fafafa' },
  cartBadge:     { backgroundColor: '#6366f1', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  cartBadgeTxt:  { color: '#fff', fontWeight: '600', fontSize: 13 },
  searchWrap:    { paddingHorizontal: 16, marginBottom: 12 },
  searchInput:   { backgroundColor: '#18181b', borderRadius: 10, borderWidth: 1, borderColor: '#27272a', color: '#fafafa', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTxt:      { color: '#71717a', fontSize: 16 },
  grid:          { paddingHorizontal: 8, paddingBottom: 20 },
  productCard:   { flex: 1, margin: 6, backgroundColor: '#18181b', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#27272a', minHeight: 90, position: 'relative' },
  productCardOn: { borderColor: '#6366f1', backgroundColor: '#6366f110' },
  productName:   { fontSize: 14, fontWeight: '600', color: '#fafafa', marginBottom: 6 },
  productPrice:  { fontSize: 15, fontWeight: '700', color: '#6366f1' },
  productSku:    { fontSize: 11, color: '#52525b', marginTop: 4 },
  qtyDot:        { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center' },
  qtyDotTxt:     { color: '#fff', fontSize: 12, fontWeight: '700' },
  cartModal:     { flex: 1, backgroundColor: '#09090b' },
  cartHead:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  cartTitle:     { fontSize: 20, fontWeight: '700', color: '#fafafa' },
  closeX:        { fontSize: 18, color: '#71717a', padding: 4 },
  cartBody:      { flex: 1, padding: 16 },
  cartRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  cartItemName:  { fontSize: 14, color: '#fafafa', fontWeight: '500' },
  cartItemPrice: { fontSize: 12, color: '#71717a', marginTop: 2 },
  qtyCtrl:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12 },
  qtyBtn:        { width: 28, height: 28, borderRadius: 8, backgroundColor: '#27272a', justifyContent: 'center', alignItems: 'center' },
  qtyBtnTxt:     { fontSize: 16, color: '#fafafa', fontWeight: '700' },
  qtyNum:        { fontSize: 16, color: '#fafafa', fontWeight: '700', minWidth: 20, textAlign: 'center' },
  cartRowTotal:  { fontSize: 15, color: '#fafafa', fontWeight: '600', minWidth: 65, textAlign: 'right' },
  section:       { marginVertical: 16 },
  sectionLbl:    { fontSize: 11, color: '#71717a', fontWeight: '600', marginBottom: 10, letterSpacing: 0.8 },
  payRow:        { flexDirection: 'row', gap: 10 },
  payBtn:        { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a' },
  payBtnOn:      { backgroundColor: '#6366f122', borderColor: '#6366f1' },
  payIcon:       { fontSize: 22, marginBottom: 4 },
  payLbl:        { fontSize: 12, color: '#71717a' },
  payLblOn:      { color: '#6366f1', fontWeight: '600' },
  amtInput:      { backgroundColor: '#18181b', borderRadius: 10, borderWidth: 1, borderColor: '#27272a', color: '#fafafa', paddingHorizontal: 14, paddingVertical: 12, fontSize: 22, fontWeight: '700' },
  changeTxt:     { marginTop: 8, color: '#22c55e', fontSize: 16, fontWeight: '600' },
  summary:       { marginTop: 8 },
  summaryRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  summaryLbl:    { fontSize: 14, color: '#71717a' },
  summaryVal:    { fontSize: 15, color: '#fafafa', fontWeight: '600' },
  cartFoot:      { padding: 20, borderTopWidth: 1, borderTopColor: '#27272a' },
  sellBtn:       { backgroundColor: '#6366f1', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  sellBtnTxt:    { color: '#fff', fontSize: 16, fontWeight: '700' },
});
