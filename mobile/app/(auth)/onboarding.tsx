import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { completeOnboarding } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function OnboardingScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'client' | 'technician'>('client');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleComplete = async () => {
    if (!fullName.trim()) {
      setError('Ingresa tu nombre completo');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await completeOnboarding({
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        user_type: role,
      });
      await refreshUser();
      // Auth context will redirect based on role
    } catch (err: any) {
      setError(err.message || 'Error al completar registro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.emoji}>👋</Text>
          <Text style={styles.title}>¡Bienvenido!</Text>
          <Text style={styles.subtitle}>Cuéntanos un poco sobre ti</Text>
        </View>

        <View style={styles.card}>
          {/* Name */}
          <Text style={styles.label}>Nombre completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: David Martínez"
            placeholderTextColor="#475569"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

          {/* Email */}
          <Text style={styles.label}>Email (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="tu@email.com"
            placeholderTextColor="#475569"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Role Selection */}
          <Text style={styles.label}>¿Qué tipo de usuario eres?</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleCard, role === 'client' && styles.roleCardActive]}
              onPress={() => setRole('client')}
              activeOpacity={0.7}
            >
              <Text style={styles.roleEmoji}>🚗</Text>
              <Text style={[styles.roleTitle, role === 'client' && styles.roleTitleActive]}>Cliente</Text>
              <Text style={styles.roleDesc}>Necesito un técnico</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleCard, role === 'technician' && styles.roleCardActive]}
              onPress={() => setRole('technician')}
              activeOpacity={0.7}
            >
              <Text style={styles.roleEmoji}>🔧</Text>
              <Text style={[styles.roleTitle, role === 'technician' && styles.roleTitleActive]}>Técnico</Text>
              <Text style={styles.roleDesc}>Ofrezco servicios</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleComplete}
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
                <Text style={styles.buttonText}>Comenzar</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.4)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#f8fafc',
    fontSize: 16,
    marginBottom: 20,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  roleCard: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  roleCardActive: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  roleEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  roleTitle: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '700',
  },
  roleTitleActive: {
    color: '#3b82f6',
  },
  roleDesc: {
    color: '#475569',
    fontSize: 11,
    marginTop: 4,
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
    marginTop: 4,
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
