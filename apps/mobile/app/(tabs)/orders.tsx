import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Linking, ActivityIndicator, Modal, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente', CONFIRMED: 'Confirmado', PROCESSING: 'En proceso',
  SHIPPED: 'En camino', DELIVERED: 'Entregado',  CANCELLED: 'Cancelado',
};
const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b', CONFIRMED: '#6366f1', PROCESSING: '#3b82f6',
  SHIPPED: '#8b5cf6', DELIVERED: '#22c55e', CANCELLED: '#ef4444',
};
const NEXT_STATUS: Record<string, string | null> = {
  PENDING: 'CONFIRMED', CONFIRMED: 'PROCESSING', PROCESSING: 'SHIPPED',
  SHIPPED: 'DELIVERED', DELIVERED: null,
};
const NEXT_LABEL: Record<string, string> = {
  PENDING: 'Confirmar', CONFIRMED: 'Preparar', PROCESSING: 'Enviar', SHIPPED: 'Entregar',
};

const FILTERS = [
  { label: 'Todos', value: '' },
  { label: 'Pendientes', value: 'PENDING' },
  { label: 'En camino', value: 'SHIPPED' },
  { label: 'Entregados', value: 'DELIVERED' },
];

export default function OrdersScreen() {
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter]     = useState('');
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['mobile-orders', filter],
    queryFn: () => ordersApi.list({
      status: filter || undefined,
      limit: 50,
      sort: 'createdAt',
      order: 'desc',
    }),
    refetchInterval: 30_000,
  });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mobile-orders'] }); setSelected(null); },
    onError: () => Alert.alert('Error', 'No se pudo actualizar el estado'),
  });

  const orders: any[] = data?.items ?? [];

  const renderOrder = ({ item }: { item: any }) => {
    const name = item.customer
      ? `${item.customer.firstName} ${item.customer.lastName ?? ''}`.trim()
      : 'Cliente general';
    const addr = item.shippingAddress;
    const next = NEXT_STATUS[item.status];
    const color = STATUS_COLOR[item.status] ?? '#71717a';

    return (
      <TouchableOpacity style={s.card} onPress={() => setSelected(item)} activeOpacity={0.85}>
        <View style={s.cardTop}>
          <Text style={s.orderNum}>{item.number}</Text>
          <View style={[s.badge, { backgroundColor: color + '22' }]}>
            <Text style={[s.badgeText, { color }]}>{STATUS_LABEL[item.status] ?? item.status}</Text>
          </View>
        </View>
        <Text style={s.customer}>{name}</Text>
        {addr?.street && (
          <Text style={s.addr} numberOfLines={1}>📍 {addr.street}{addr.city ? `, ${addr.city}` : ''}</Text>
        )}
        {item.customer?.phone && (
          <Text style={s.phone}>📞 {item.customer.phone}</Text>
        )}
        <View style={s.cardBottom}>
          <Text style={s.total}>${item.total?.toLocaleString('es-CO')}</Text>
          {next && (
            <TouchableOpacity
              style={s.advBtn}
              onPress={() => advance.mutate({ id: item.id, status: next })}
              disabled={advance.isPending}
              activeOpacity={0.8}
            >
              {advance.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.advBtnText}>{NEXT_LABEL[item.status]} →</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Pedidos</Text>
        <Text style={s.sub}>{orders.length} órdenes</Text>
      </View>

      {/* Filtros */}
      <View style={s.filtersRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[s.filterBtn, filter === f.value && s.filterBtnOn]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[s.filterTxt, filter === f.value && s.filterTxtOn]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator color="#6366f1" size="large" /></View>
      ) : orders.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyEmoji}>📭</Text>
          <Text style={s.emptyTxt}>Sin pedidos{filter ? ' con este filtro' : ''}</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(i) => i.id}
          renderItem={renderOrder}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />
          }
        />
      )}

      {/* Modal detalle */}
      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <SafeAreaView style={s.modal}>
            {/* Header modal */}
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>{selected.number}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Text style={s.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody}>
              {/* Estado */}
              <View style={[s.badge, { alignSelf: 'flex-start', backgroundColor: (STATUS_COLOR[selected.status] ?? '#71717a') + '22', marginBottom: 20 }]}>
                <Text style={[s.badgeText, { color: STATUS_COLOR[selected.status] ?? '#71717a' }]}>
                  {STATUS_LABEL[selected.status]}
                </Text>
              </View>

              {/* Cliente */}
              {selected.customer && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>CLIENTE</Text>
                  <Text style={s.sectionVal}>
                    {selected.customer.firstName} {selected.customer.lastName ?? ''}
                  </Text>
                  {selected.customer.phone && (
                    <View style={s.actionBtns}>
                      <TouchableOpacity
                        style={s.callBtn}
                        onPress={() => Linking.openURL(`tel:${selected.customer.phone}`)}
                      >
                        <Text style={s.callBtnTxt}>📞 Llamar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.callBtn, s.waBtn]}
                        onPress={() => Linking.openURL(`https://wa.me/${selected.customer.phone.replace(/\D/g, '')}`)}
                      >
                        <Text style={[s.callBtnTxt, { color: '#22c55e' }]}>💬 WhatsApp</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Dirección */}
              {selected.shippingAddress?.street && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>DIRECCIÓN</Text>
                  <Text style={s.sectionVal}>{selected.shippingAddress.street}</Text>
                  {selected.shippingAddress.city && (
                    <Text style={s.sectionSub}>{selected.shippingAddress.city}</Text>
                  )}
                  {selected.shippingAddress.instructions && (
                    <Text style={s.instructions}>📝 {selected.shippingAddress.instructions}</Text>
                  )}
                  <TouchableOpacity
                    style={[s.callBtn, { backgroundColor: '#3b82f622', borderColor: '#3b82f650', marginTop: 10 }]}
                    onPress={() =>
                      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(selected.shippingAddress.street)}`)
                    }
                  >
                    <Text style={[s.callBtnTxt, { color: '#3b82f6' }]}>🗺️ Ver en Maps</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Productos */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>PRODUCTOS</Text>
                {(selected.items ?? []).map((item: any, i: number) => (
                  <View key={i} style={s.itemRow}>
                    <Text style={s.itemName}>{item.quantity}× {item.name}</Text>
                    <Text style={s.itemTotal}>${item.total?.toLocaleString('es-CO')}</Text>
                  </View>
                ))}
                <View style={[s.itemRow, s.totalRow]}>
                  <Text style={[s.itemName, { color: '#fafafa', fontWeight: '700' }]}>Total</Text>
                  <Text style={[s.itemTotal, { color: '#6366f1', fontWeight: '700', fontSize: 16 }]}>
                    ${selected.total?.toLocaleString('es-CO')}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Botón avanzar estado */}
            {NEXT_STATUS[selected.status] && (
              <View style={s.modalFoot}>
                <TouchableOpacity
                  style={s.advanceBig}
                  onPress={() => advance.mutate({ id: selected.id, status: NEXT_STATUS[selected.status]! })}
                  disabled={advance.isPending}
                >
                  {advance.isPending
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.advanceBigTxt}>{NEXT_LABEL[selected.status]} →</Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#09090b' },
  header:       { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  title:        { fontSize: 28, fontWeight: '700', color: '#fafafa' },
  sub:          { fontSize: 13, color: '#71717a', marginTop: 2 },
  filtersRow:   { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterBtn:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a' },
  filterBtnOn:  { backgroundColor: '#6366f122', borderColor: '#6366f1' },
  filterTxt:    { fontSize: 13, color: '#71717a' },
  filterTxtOn:  { color: '#6366f1', fontWeight: '600' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyEmoji:   { fontSize: 48, marginBottom: 12 },
  emptyTxt:     { color: '#71717a', fontSize: 16 },
  list:         { paddingHorizontal: 16, paddingBottom: 20 },
  card:         { backgroundColor: '#18181b', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#27272a' },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderNum:     { fontSize: 15, fontWeight: '700', color: '#fafafa' },
  badge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:    { fontSize: 12, fontWeight: '600' },
  customer:     { color: '#a1a1aa', fontSize: 14, marginBottom: 4 },
  addr:         { color: '#71717a', fontSize: 13, marginBottom: 2 },
  phone:        { color: '#71717a', fontSize: 13, marginBottom: 8 },
  cardBottom:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  total:        { fontSize: 18, fontWeight: '700', color: '#fafafa' },
  advBtn:       { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  advBtnText:   { color: '#fff', fontSize: 13, fontWeight: '600' },
  modal:        { flex: 1, backgroundColor: '#09090b' },
  modalHead:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  modalTitle:   { fontSize: 20, fontWeight: '700', color: '#fafafa' },
  closeX:       { fontSize: 18, color: '#71717a', padding: 4 },
  modalBody:    { flex: 1, padding: 20 },
  section:      { marginBottom: 24 },
  sectionTitle: { fontSize: 11, color: '#71717a', fontWeight: '600', marginBottom: 8, letterSpacing: 0.8 },
  sectionVal:   { fontSize: 16, color: '#fafafa', fontWeight: '500' },
  sectionSub:   { fontSize: 14, color: '#a1a1aa', marginTop: 2 },
  instructions: { fontSize: 13, color: '#a1a1aa', marginTop: 8, fontStyle: 'italic' },
  actionBtns:   { flexDirection: 'row', gap: 10, marginTop: 10 },
  callBtn:      { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#6366f122', borderWidth: 1, borderColor: '#6366f150' },
  callBtnTxt:   { color: '#6366f1', fontWeight: '600', fontSize: 14 },
  waBtn:        { backgroundColor: '#22c55e22', borderColor: '#22c55e50' },
  itemRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalRow:     { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#27272a' },
  itemName:     { fontSize: 14, color: '#a1a1aa', flex: 1 },
  itemTotal:    { fontSize: 14, color: '#a1a1aa', fontWeight: '500' },
  modalFoot:    { padding: 20, borderTopWidth: 1, borderTopColor: '#27272a' },
  advanceBig:   { backgroundColor: '#6366f1', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  advanceBigTxt:{ color: '#fff', fontSize: 16, fontWeight: '700' },
});
