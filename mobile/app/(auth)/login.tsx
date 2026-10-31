import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { requestOTP } from '@/lib/api';
import { sendMobileFirebaseOTP } from '@/lib/firebase-auth';
import { COLORS, GRADIENTS, SHADOWS } from '@/constants/theme';

type CountryKey = 'CO' | 'MX';

interface CountryConfig {
  key: CountryKey;
  name: string;
  dialCode: string;
  placeholder: string;
  flag: string;
}

const COUNTRIES: Record<CountryKey, CountryConfig> = {
  CO: {
    key: 'CO',
    name: 'Colombia',
    dialCode: '+57',
    placeholder: '300 123 4567',
    flag: '🇨🇴',
  },
  MX: {
    key: 'MX',
    name: 'México',
    dialCode: '+52',
    placeholder: '55 1234 5678',
    flag: '🇲🇽',
  },
};

export default function LoginScreen() {
  const router = useRouter();
  const [selectedCountry, setSelectedCountry] = useState<CountryKey>('CO');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const currentCountry = COUNTRIES[selectedCountry];

  const handleRequestOTP = async () => {
    if (phone.length < 10) {
      setError(`Ingresa los 10 dígitos de tu línea de ${currentCountry.name}`);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const fullPhone = phone.startsWith('+') ? phone : `${currentCountry.dialCode}${phone}`;
      try {
        await sendMobileFirebaseOTP(fullPhone);
        router.push({ pathname: '/(auth)/verify', params: { phone: fullPhone, provider: 'firebase' } });
      } catch (fbErr: any) {
        console.warn('Firebase Phone Auth error, intentando fallback:', fbErr);
        if (fbErr.code === 'auth/invalid-phone-number') {
          throw new Error('El número telefónico no es válido para envío de SMS.');
        } else if (fbErr.code === 'auth/too-many-requests') {
          throw new Error('Demasiados intentos. Espera unos minutos antes de volver a intentar.');
        } else if (fbErr.code === 'auth/quota-exceeded') {
          throw new Error('Cuota de SMS superada temporalmente.');
        }
        // Fallback al endpoint del backend
        await requestOTP(fullPhone);
        router.push({ pathname: '/(auth)/verify', params: { phone: fullPhone, provider: 'legacy' } });
      }
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
            Ingresa tu línea para recibir el código de verificación SMS
          </Text>

          {/* Country Selector (Colombia / México) */}
          <View style={styles.countrySelector}>
            <TouchableOpacity
              style={[styles.countryTab, selectedCountry === 'CO' && styles.countryTabActive]}
              onPress={() => {
                setSelectedCountry('CO');
                setError('');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.countryTabText, selectedCountry === 'CO' && styles.countryTabTextActive]}>
                🇨🇴 Colombia (+57)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.countryTab, selectedCountry === 'MX' && styles.countryTabActive]}
              onPress={() => {
                setSelectedCountry('MX');
                setError('');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.countryTabText, selectedCountry === 'MX' && styles.countryTabTextActive]}>
                🇲🇽 México (+52)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Input with Dial Code Badge */}
          <View style={styles.inputContainer}>
            <View style={styles.prefix}>
              <Text style={styles.prefixText}>{currentCountry.flag} {currentCountry.dialCode}</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder={currentCountry.placeholder}
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(text) => {
                let cleaned = text.trim();
                if (cleaned.startsWith('+52') || (cleaned.startsWith('52') && cleaned.length > 10)) {
                  setSelectedCountry('MX');
                  cleaned = cleaned.startsWith('+52') ? cleaned.slice(3) : cleaned.slice(2);
                } else if (cleaned.startsWith('+57') || (cleaned.startsWith('57') && cleaned.length > 10)) {
                  setSelectedCountry('CO');
                  cleaned = cleaned.startsWith('+57') ? cleaned.slice(3) : cleaned.slice(2);
                }
                cleaned = cleaned.replace(/[^0-9]/g, '').slice(0, 10);
                setPhone(cleaned);
                setError('');
              }}
              maxLength={10}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, (isLoading || phone.length < 10) && styles.buttonDisabled]}
            onPress={handleRequestOTP}
            disabled={isLoading || phone.length < 10}
            activeOpacity={0.8}
          >
            <LinearGradient colors={GRADIENTS.primary} style={styles.buttonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {isLoading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.buttonText}>Solicitar Código de Seguridad</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Técnicos certificados a tu alcance
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  glowOrb: { position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(124,58,237,0.08)' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 36 },
  logoIcon: { width: 76, height: 76, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 16, ...SHADOWS.primary },
  logoEmoji: { fontSize: 34 },
  logoTitle: { fontSize: 38, fontWeight: '900', color: COLORS.text, letterSpacing: -1.5 },
  logoSubtitle: { fontSize: 13, color: COLORS.primary, marginTop: 4, letterSpacing: 4, fontWeight: '700' },
  card: { backgroundColor: COLORS.bgCard, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  cardSubtitle: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 20 },

  countrySelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(5,8,16,0.9)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  countryTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  countryTabActive: {
    backgroundColor: 'rgba(124,58,237,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.5)',
  },
  countryTabText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  countryTabTextActive: {
    color: COLORS.text,
    fontWeight: '800',
  },

  inputContainer: { flexDirection: 'row', backgroundColor: 'rgba(5,8,16,0.9)', borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, overflow: 'hidden' },
  prefix: { paddingHorizontal: 14, justifyContent: 'center', borderRightWidth: 1, borderRightColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.02)' },
  prefixText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 18, color: COLORS.text, fontSize: 17, letterSpacing: 1 },
  error: { color: COLORS.red, fontSize: 13, marginBottom: 12, marginLeft: 4 },
  button: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 16 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  footer: { textAlign: 'center', color: COLORS.textMuted, fontSize: 13, marginTop: 32 },
});
