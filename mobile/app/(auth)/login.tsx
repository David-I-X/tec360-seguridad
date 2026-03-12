import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { requestOTP } from '@/lib/api';
import { COLORS, GRADIENTS, SHADOWS } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOTP = async () => {
    if (phone.length < 10) {
      setError('Ingresa un número válido');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const fullPhone = phone.startsWith('+') ? phone : `+57${phone}`;
      const result = await requestOTP(fullPhone);
      router.push({ pathname: '/(auth)/verify', params: { phone: fullPhone } });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error desconocido');
      setError(err.message || 'Error al enviar el código');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Glow effect */}
      <View style={styles.glowOrb} />

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <LinearGradient colors={GRADIENTS.primary} style={styles.logoIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.logoEmoji}>🛡️</Text>
          </LinearGradient>
          <Text style={styles.logoTitle}>Tec360</Text>
          <Text style={styles.logoSubtitle}>SEGURIDAD</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Iniciar Sesión</Text>
          <Text style={styles.cardSubtitle}>
            Ingresa tu número para recibir un código de verificación
          </Text>

          <View style={styles.inputContainer}>
            <View style={styles.prefix}>
              <Text style={styles.prefixText}>🇨🇴 +57</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="300 123 4567"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(text) => {
                setPhone(text.replace(/[^0-9]/g, ''));
                setError('');
              }}
              maxLength={10}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRequestOTP}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient colors={GRADIENTS.primary} style={styles.buttonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {isLoading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.buttonText}>Solicitar Código</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Técnicos certificados SENA a tu alcance
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  glowOrb: { position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(124,58,237,0.08)' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logoIcon: { width: 76, height: 76, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 16, ...SHADOWS.primary },
  logoEmoji: { fontSize: 34 },
  logoTitle: { fontSize: 38, fontWeight: '900', color: COLORS.text, letterSpacing: -1.5 },
  logoSubtitle: { fontSize: 13, color: COLORS.primary, marginTop: 4, letterSpacing: 4, fontWeight: '700' },
  card: { backgroundColor: COLORS.bgCard, borderRadius: 24, padding: 28, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  cardSubtitle: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 28 },
  inputContainer: { flexDirection: 'row', backgroundColor: 'rgba(5,8,16,0.9)', borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, overflow: 'hidden' },
  prefix: { paddingHorizontal: 16, justifyContent: 'center', borderRightWidth: 1, borderRightColor: COLORS.border },
  prefixText: { color: COLORS.textSecondary, fontSize: 16 },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 18, color: COLORS.text, fontSize: 18, letterSpacing: 1 },
  error: { color: COLORS.red, fontSize: 13, marginBottom: 12, marginLeft: 4 },
  button: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  footer: { textAlign: 'center', color: COLORS.textMuted, fontSize: 13, marginTop: 36 },
});
