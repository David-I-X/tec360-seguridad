import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { requestOTP } from '@/lib/api';

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
      console.log('[LOGIN] Requesting OTP for:', fullPhone);
      const result = await requestOTP(fullPhone);
      console.log('[LOGIN] OTP result:', JSON.stringify(result));
      Alert.alert('OTP Enviado', `Código enviado a ${fullPhone}${result.code ? `\nCódigo dev: ${result.code}` : ''}`);
      router.push({ pathname: '/(auth)/verify', params: { phone: fullPhone } });
    } catch (err: any) {
      console.log('[LOGIN] Error:', err.message);
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
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={['#3b82f6', '#8b5cf6']}
            style={styles.logoIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.logoEmoji}>🛡️</Text>
          </LinearGradient>
          <Text style={styles.logoTitle}>Tec360</Text>
          <Text style={styles.logoSubtitle}>Seguridad</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Iniciar Sesión</Text>
          <Text style={styles.cardSubtitle}>
            Ingresa tu número de celular para recibir un código de verificación
          </Text>

          <View style={styles.inputContainer}>
            <View style={styles.prefix}>
              <Text style={styles.prefixText}>🇨🇴 +57</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="300 123 4567"
              placeholderTextColor="#6b7280"
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
            <LinearGradient
              colors={['#3b82f6', '#6366f1']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
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
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  logoEmoji: {
    fontSize: 32,
  },
  logoTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -1,
  },
  logoSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.4)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  prefix: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(71, 85, 105, 0.3)',
  },
  prefixText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#f8fafc',
    fontSize: 18,
    letterSpacing: 1,
  },
  error: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 12,
    marginLeft: 4,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 13,
    marginTop: 32,
  },
});
