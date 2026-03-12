import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { verifyOTP, saveTokens, saveUser, getCurrentUser } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { COLORS, GRADIENTS, SHADOWS } from '@/constants/theme';

export default function VerifyScreen() {
  const router = useRouter();
  const { loginUser } = useAuth();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleVerify = async () => {
    if (code.length < 6) return;
    setIsLoading(true);
    try {
      const result = await verifyOTP(phone!, code);
      if (result.access_token) {
        await saveTokens(result.access_token, result.refresh_token);
        const userRes = await getCurrentUser();
        if (userRes.user) {
          await saveUser(userRes.user);
          // Update in-memory state BEFORE navigating so route guard doesn't redirect
          loginUser(userRes.user);
        }
        // Navigation is now handled by auth-context route guard automatically
      }
    } catch (err: any) {
      Alert.alert('Código incorrecto', err.message || 'Intenta de nuevo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.glowOrb} />
      <View style={styles.content}>
        <LinearGradient colors={GRADIENTS.primary} style={styles.iconBox}>
          <Text style={styles.iconEmoji}>🔐</Text>
        </LinearGradient>

        <Text style={styles.title}>Verificación</Text>
        <Text style={styles.subtitle}>Ingresa el código enviado a{'\n'}<Text style={styles.phoneHighlight}>{phone}</Text></Text>

        <TextInput
          ref={inputRef}
          style={styles.codeInput}
          placeholder="000000"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
          textAlign="center"
        />

        <TouchableOpacity
          style={[styles.button, (code.length < 6 || isLoading) && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={code.length < 6 || isLoading}
          activeOpacity={0.8}
        >
          <LinearGradient colors={GRADIENTS.primary} style={styles.buttonGradient}>
            {isLoading ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.buttonText}>Verificar Código</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  glowOrb: { position: 'absolute', bottom: -100, left: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(124,58,237,0.06)' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  iconBox: { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 24, ...SHADOWS.primary },
  iconEmoji: { fontSize: 32 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  phoneHighlight: { color: COLORS.primary, fontWeight: '700' },
  codeInput: { width: '80%', fontSize: 32, fontWeight: '800', letterSpacing: 12, color: COLORS.text, backgroundColor: COLORS.bgCard, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 28 },
  button: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  buttonDisabled: { opacity: 0.4 },
  buttonGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
