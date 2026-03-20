import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchWithAuth } from '@/lib/api';

export default function NewQuotationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expiresIn, setExpiresIn] = useState('72'); // default 3 days
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un precio válido para la cotización.');
      return;
    }
    if (description.trim().length < 10) {
      Alert.alert('Descripción corta', 'La descripción debe tener al menos 10 caracteres para que el cliente entienda la propuesta.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth(`/quotations/service/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          description: description.trim(),
          expires_in_hours: parseInt(expiresIn) || 72,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error al enviar cotización');
      }

      Alert.alert('¡Cotización enviada!', 'El cliente será notificado de tu propuesta.', [
        { text: 'OK', onPress: () => router.replace('/(tech)/dashboard' as any) },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo enviar la cotización');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#f0f0f5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cotizar Servicio</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>Precio propuesto (COP)</Text>
          <View style={styles.priceInputContainer}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.priceInput}
              keyboardType="numeric"
              placeholder="Ej: 150000"
              placeholderTextColor="#555872"
              value={amount}
              onChangeText={setAmount}
              maxLength={10}
            />
          </View>

          <Text style={styles.label}>Detalle y alcance del trabajo</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe qué materiales incluye, tiempo estimado de trabajo, etc. (Min. 10 caracteres)"
            placeholderTextColor="#555872"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={1000}
          />

          <Text style={styles.label}>Validez de la oferta (Horas)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="Ej: 72 (3 días)"
            placeholderTextColor="#555872"
            value={expiresIn}
            onChangeText={setExpiresIn}
            maxLength={3}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {isSubmitting ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={styles.submitEmoji}>🚀</Text>
                <Text style={styles.submitText}>Enviar al Cliente</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#050810', zIndex: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(15,23,42,0.8)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#f0f0f5', fontSize: 18, fontWeight: '700' },
  form: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  card: { backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  label: { color: '#8b8fa3', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  priceInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.8)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(80,60,160,0.4)', paddingHorizontal: 16 },
  currencySymbol: { color: '#8b5cf6', fontSize: 24, fontWeight: '800', marginRight: 8 },
  priceInput: { flex: 1, color: '#22c55e', fontSize: 24, fontWeight: '800', paddingVertical: 16 },
  input: { backgroundColor: 'rgba(15,23,42,0.8)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(80,60,160,0.4)', paddingVertical: 14, paddingHorizontal: 16, color: '#f0f0f5', fontSize: 15 },
  textArea: { backgroundColor: 'rgba(15,23,42,0.8)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(80,60,160,0.4)', paddingVertical: 14, paddingHorizontal: 16, color: '#f0f0f5', fontSize: 15, minHeight: 120, lineHeight: 22 },
  footer: { padding: 20, paddingBottom: 40, backgroundColor: '#050810', borderTopWidth: 1, borderTopColor: 'rgba(80,60,160,0.2)' },
  submitBtn: { borderRadius: 16, overflow: 'hidden' },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  submitEmoji: { fontSize: 20 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
