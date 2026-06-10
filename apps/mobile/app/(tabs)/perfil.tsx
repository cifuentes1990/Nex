import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { storage } from '@/lib/storage';

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  SUPERVISOR: 'Supervisor',
  CASHIER: 'Cajero',
  EMPLOYEE: 'Empleado',
  VIEWER: 'Observador',
};

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiUrl, setApiUrl]               = useState('');

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  };

  const saveApiUrl = async () => {
    const url = apiUrl.trim();
    if (!url) return;
    await storage.setApiUrl(url);
    setShowApiConfig(false);
    setApiUrl('');
    Alert.alert('✅ Guardado', 'Reinicia la app para que el cambio tome efecto.');
  };

  const initial = user?.name?.[0]?.toUpperCase() ?? '?';

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>Perfil</Text>

        {/* Avatar */}
        <View style={s.avatarWrap}>
          <View style={s.avatar}>
            <Text style={s.avatarLetter}>{initial}</Text>
          </View>
          <Text style={s.name}>{user?.name ?? 'Usuario'}</Text>
          <Text style={s.email}>{user?.email ?? ''}</Text>
          {user?.role && (
            <View style={s.roleBadge}>
              <Text style={s.roleText}>{ROLE_LABEL[user.role] ?? user.role}</Text>
            </View>
          )}
        </View>

        {/* Opciones */}
        <View style={s.card}>
          <TouchableOpacity
            style={s.option}
            onPress={() => setShowApiConfig((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={s.optIcon}>🔗</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.optLabel}>URL del servidor API</Text>
              <Text style={s.optSub}>Configura la IP de tu servidor</Text>
            </View>
            <Text style={s.arrow}>{showApiConfig ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showApiConfig && (
            <View style={s.apiBox}>
              <Text style={s.apiBoxLabel}>
                Ejemplo: http://192.168.1.10:4000/api/v1
              </Text>
              <TextInput
                style={s.apiInput}
                value={apiUrl}
                onChangeText={setApiUrl}
                placeholder="http://192.168.1.10:4000/api/v1"
                placeholderTextColor="#52525b"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TouchableOpacity style={s.saveBtn} onPress={saveApiUrl}>
                <Text style={s.saveBtnTxt}>Guardar</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={s.divider} />

          <TouchableOpacity style={s.option} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={s.optIcon}>🚪</Text>
            <Text style={[s.optLabel, { color: '#ef4444' }]}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.version}>Nexus ERP Mobile v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#09090b' },
  scroll:      { padding: 20, paddingBottom: 40 },
  title:       { fontSize: 28, fontWeight: '700', color: '#fafafa', marginBottom: 24 },
  avatarWrap:  { alignItems: 'center', marginBottom: 32 },
  avatar:      { width: 80, height: 80, borderRadius: 40, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', marginBottom: 14, shadowColor: '#6366f1', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  avatarLetter:{ fontSize: 32, fontWeight: '700', color: '#fff' },
  name:        { fontSize: 22, fontWeight: '700', color: '#fafafa', marginBottom: 4 },
  email:       { fontSize: 14, color: '#71717a', marginBottom: 10 },
  roleBadge:   { backgroundColor: '#6366f122', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: '#6366f150' },
  roleText:    { color: '#6366f1', fontWeight: '600', fontSize: 13 },
  card:        { backgroundColor: '#18181b', borderRadius: 16, borderWidth: 1, borderColor: '#27272a', overflow: 'hidden' },
  option:      { flexDirection: 'row', alignItems: 'center', padding: 16 },
  optIcon:     { fontSize: 20, marginRight: 14 },
  optLabel:    { fontSize: 15, color: '#fafafa', fontWeight: '500' },
  optSub:      { fontSize: 12, color: '#71717a', marginTop: 2 },
  arrow:       { fontSize: 12, color: '#71717a' },
  divider:     { height: 1, backgroundColor: '#27272a' },
  apiBox:      { paddingHorizontal: 16, paddingBottom: 16 },
  apiBoxLabel: { fontSize: 12, color: '#71717a', marginBottom: 8 },
  apiInput:    { backgroundColor: '#09090b', borderRadius: 8, borderWidth: 1, borderColor: '#27272a', color: '#fafafa', paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  saveBtn:     { backgroundColor: '#6366f1', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  saveBtnTxt:  { color: '#fff', fontWeight: '600' },
  version:     { textAlign: 'center', color: '#3f3f46', fontSize: 12, marginTop: 32 },
});
