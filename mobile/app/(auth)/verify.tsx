import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { verifyOTP } from '@/lib/api';

const CODE_LENGTH = 6;

export default function VerifyScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleVerify = async () => {
    if (code.length !== CODE_LENGTH) {
      setError('Ingresa el código completo');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await verifyOTP(phone || '', code);
      if (result.is_new_user) {
        router.replace('/(auth)/onboarding');
      } else {
        // Auth context will handle redirect based on role
        router.replace('/');
      }
    } catch (err: any) {
      setError(err.message || 'Código incorrecto');
    } finally {
      setIsLoading(false);
    }
  };

  const maskedPhone = phone ? `***${phone.slice(-4)}` : '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.emoji}>🔐</Text>
          <Text style={styles.title}>Verificación</Text>
          <Text style={styles.subtitle}>
            Ingresa el código de 6 dígitos enviado a {maskedPhone}
          </Text>
        </View>

        <View style={styles.card}>
          <TextInput
            ref={inputRef}
            style={styles.codeInput}
            value={code}
            onChangeText={(text) => {
              setCode(text.replace(/[^0-9]/g, ''));
              setError('');
            }}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            placeholder="000000"
            placeholderTextColor="#334155"
            textContentType="oneTimeCode"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleVerify}
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
                <Text style={styles.buttonText}>Verificar</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
  },
  backText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  codeInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.4)',
    paddingVertical: 18,
    paddingHorizontal: 24,
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 12,
    marginBottom: 20,
  },
  error: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
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
});
