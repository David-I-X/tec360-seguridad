import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/auth-context';
import { fetchWithAuth } from '@/lib/api';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [city, setCity] = useState((user as any)?.city || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }

    setIsSaving(true);
    try {
      await fetchWithAuth('/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim() || null,
          city: city.trim() || null,
        }),
      });
      await refreshUser();
      Alert.alert('✅ Perfil actualizado', 'Tus datos han sido guardados correctamente.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo actualizar el perfil');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#f0f0f5" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Perfil</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Phone (read-only) */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Teléfono</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Ionicons name="call-outline" size={18} color="#555872" />
            <Text style={styles.disabledText}>{user?.phone || '—'}</Text>
            <View style={styles.lockedBadge}>
              <Ionicons name="lock-closed" size={10} color="#555872" />
            </View>
          </View>
        </View>

        {/* Full Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nombre completo</Text>
          <View style={styles.input}>
            <Ionicons name="person-outline" size={18} color="#8b8fa3" />
            <TextInput
              style={styles.textInput}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Tu nombre"
              placeholderTextColor="#555872"
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Correo electrónico</Text>
          <View style={styles.input}>
            <Ionicons name="mail-outline" size={18} color="#8b8fa3" />
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor="#555872"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* City */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Ciudad</Text>
          <View style={styles.input}>
            <Ionicons name="location-outline" size={18} color="#8b8fa3" />
            <TextInput
              style={styles.textInput}
              value={city}
              onChangeText={setCity}
              placeholder="Ej: Medellín"
              placeholderTextColor="#555872"
            />
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
          style={{ marginHorizontal: 20, marginTop: 24 }}
        >
          <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.saveBtn}>
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Guardar Cambios</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(10,14,28,0.8)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#f0f0f5', fontSize: 18, fontWeight: '700' },
  fieldGroup: { marginHorizontal: 20, marginBottom: 18 },
  label: { color: '#8b8fa3', fontSize: 12, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(10,14,28,0.85)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  inputDisabled: { opacity: 0.6 },
  textInput: { flex: 1, color: '#f0f0f5', fontSize: 15, fontWeight: '600', padding: 0 },
  disabledText: { flex: 1, color: '#8b8fa3', fontSize: 15, fontWeight: '600' },
  lockedBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(85,88,114,0.2)', justifyContent: 'center', alignItems: 'center' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 16 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
