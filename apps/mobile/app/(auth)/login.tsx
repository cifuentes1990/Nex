import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Credenciales incorrectas. Verifica e intenta de nuevo.';
      Alert.alert('Error al ingresar', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoBox}>
            <Text style={s.logoEmoji}>⚡</Text>
          </View>
          <Text style={s.brandName}>Nexus ERP</Text>
          <Text style={s.brandSub}>Plataforma Empresarial</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.title}>Iniciar sesión</Text>
          <Text style={s.subtitle}>Accede a tu cuenta empresarial</Text>

          <View style={s.field}>
            <Text style={s.label}>Correo electrónico</Text>
            <TextInput
              style={s.input}
              placeholder="usuario@empresa.com"
              placeholderTextColor="#52525b"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Contraseña</Text>
            <View style={s.passRow}>
              <TextInput
                style={[s.input, { flex: 1, borderWidth: 0, paddingVertical: 0 }]}
                placeholder="••••••••"
                placeholderTextColor="#52525b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={s.eyeBtn}>
                <Text style={s.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Ingresar →</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>Nexus ERP © {new Date().getFullYear()}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#09090b' },
  scroll:     { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap:   { alignItems: 'center', marginBottom: 40 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: '#6366f1',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    shadowColor: '#6366f1', shadowOpacity: 0.45, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  logoEmoji:  { fontSize: 32 },
  brandName:  { fontSize: 26, fontWeight: '700', color: '#fafafa', letterSpacing: -0.5 },
  brandSub:   { fontSize: 14, color: '#71717a', marginTop: 4 },
  card: {
    backgroundColor: '#18181b', borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: '#27272a',
  },
  title:    { fontSize: 20, fontWeight: '700', color: '#fafafa', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#71717a', marginBottom: 24 },
  field:    { marginBottom: 16 },
  label:    { fontSize: 13, color: '#a1a1aa', marginBottom: 6, fontWeight: '500' },
  input: {
    backgroundColor: '#09090b', borderRadius: 10, borderWidth: 1,
    borderColor: '#27272a', color: '#fafafa', paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15,
  },
  passRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#09090b', borderRadius: 10, borderWidth: 1,
    borderColor: '#27272a', paddingHorizontal: 14, paddingVertical: 12,
  },
  eyeBtn:  { paddingLeft: 8 },
  eyeIcon: { fontSize: 18 },
  btn: {
    backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 8,
    shadowColor: '#6366f1', shadowOpacity: 0.4,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer:      { textAlign: 'center', color: '#3f3f46', fontSize: 12, marginTop: 32 },
});
