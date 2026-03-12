import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchWithAuth, saveUser, getCurrentUser } from '@/lib/api';
import { COLORS, GRADIENTS, SHADOWS } from '@/constants/theme';

export default function OnboardingScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'client' | 'technician'>('client');
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    if (!fullName.trim()) {
      Alert.alert('Campo requerido', 'Ingresa tu nombre completo');
      return;
    }
    setIsLoading(true);
    try {
      await fetchWithAuth('/users/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email: email || undefined, role }),
      });
      const userRes = await getCurrentUser();
      if (userRes.user) await saveUser(userRes.user);
      if (role === 'technician') {
        router.replace('/(tech)/dashboard');
      } else {
        router.replace('/(client)/services');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.glowOrb} />
      <View style={styles.content}>
        <Text style={styles.title}>¡Bienvenido!</Text>
        <Text style={styles.subtitle}>Completa tu perfil para continuar</Text>

        <Text style={styles.label}>Nombre completo</Text>
        <TextInput style={styles.input} placeholder="Tu nombre" placeholderTextColor={COLORS.textMuted} value={fullName} onChangeText={setFullName} />

        <Text style={styles.label}>Email (opcional)</Text>
        <TextInput style={styles.input} placeholder="correo@ejemplo.com" placeholderTextColor={COLORS.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.label}>¿Qué eres?</Text>
        <View style={styles.roleRow}>
          {(['client', 'technician'] as const).map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.roleCard, role === r && styles.roleCardActive]}
              onPress={() => setRole(r)}
              activeOpacity={0.7}
            >
              <Text style={styles.roleEmoji}>{r === 'client' ? '🏠' : '🔧'}</Text>
              <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                {r === 'client' ? 'Cliente' : 'Técnico'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && { opacity: 0.6 }]}
          onPress={handleComplete}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <LinearGradient colors={GRADIENTS.primary} style={styles.buttonGradient}>
            {isLoading ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.buttonText}>Continuar</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  glowOrb: { position: 'absolute', top: -80, left: -60, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(124,58,237,0.06)' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 30, fontWeight: '900', color: COLORS.text, marginBottom: 6 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 32 },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: COLORS.bgCard, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 16, paddingHorizontal: 18, color: COLORS.text, fontSize: 16, marginBottom: 20 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  roleCard: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 18, padding: 20, alignItems: 'center', gap: 8, borderWidth: 2, borderColor: COLORS.border },
  roleCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryMuted },
  roleEmoji: { fontSize: 28 },
  roleText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700' },
  roleTextActive: { color: COLORS.primary },
  button: { borderRadius: 16, overflow: 'hidden' },
  buttonGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
