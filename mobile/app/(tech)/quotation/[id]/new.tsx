import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Image, Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchWithAuth, getServiceById } from '@/lib/api';
import { getClientObservations, getMobileImageUrl } from '@/lib/service-utils';

export default function NewQuotationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expiresIn, setExpiresIn] = useState('72'); // default 3 days
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [service, setService] = useState<any>(null);
  const [isLoadingService, setIsLoadingService] = useState(true);
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setIsLoadingService(false);
      return;
    }
    getServiceById(id)
      .then((data) => setService(data?.service || data))
      .catch(() => {})
      .finally(() => setIsLoadingService(false));
  }, [id]);

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

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
        {isLoadingService ? (
          <View style={[styles.summaryCard, { alignItems: 'center', paddingVertical: 20 }]}>
            <ActivityIndicator color="#8b5cf6" />
          </View>
        ) : service && (() => {
          const obs = getClientObservations(service);
          const clientPhoto = getMobileImageUrl(service.vehicle_photo_url);
          const dateVal = service.scheduled_date || service.requested_date || service.created_at;
          return (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryEyebrow}>DETALLE DEL SERVICIO</Text>
              <Text style={styles.summaryTitle}>{service.title}</Text>

              {(service.vehicle_model || service.vehicle_plate) && (
                <View style={styles.summaryMetaRow}>
                  <Ionicons name="car-outline" size={14} color="#60a5fa" />
                  <Text style={styles.summaryMetaText}>
                    {service.vehicle_model ? `${service.vehicle_model} · ` : ''}
                    {service.vehicle_plate || 'Sin placa'}
                  </Text>
                </View>
              )}

              {service.service_address && (
                <View style={styles.summaryMetaRow}>
                  <Ionicons name="location-outline" size={14} color="#eab308" />
                  <Text style={styles.summaryMetaText}>
                    {service.service_address}{service.service_city ? `, ${service.service_city}` : ''}
                  </Text>
                </View>
              )}

              {dateVal && (
                <View style={styles.summaryMetaRow}>
                  <Ionicons name="calendar-outline" size={14} color="#fbbf24" />
                  <Text style={styles.summaryMetaText}>
                    {new Date(dateVal).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(dateVal).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </Text>
                </View>
              )}

              <View style={styles.obsBox}>
                <View style={styles.obsHeader}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color="#fbbf24" />
                  <Text style={styles.obsLabel}>OBSERVACIONES Y FALLA REPORTADA</Text>
                </View>
                <Text style={styles.obsText}>
                  {obs.primary || 'El cliente no registró observaciones adicionales.'}
                </Text>
                {obs.notes && <Text style={styles.obsNote}>Nota adicional: {obs.notes}</Text>}
              </View>

              {clientPhoto && (
                <TouchableOpacity
                  style={styles.photoWrap}
                  activeOpacity={0.85}
                  onPress={() => setZoomPhotoUrl(clientPhoto)}
                >
                  <Image source={{ uri: clientPhoto }} style={styles.photoImg} resizeMode="cover" />
                  <View style={styles.photoBadge}>
                    <Ionicons name="camera-outline" size={12} color="#fbbf24" />
                    <Text style={styles.photoBadgeText}>Foto del cliente · Toca para ampliar</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}

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
      <Modal
        visible={!!zoomPhotoUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomPhotoUrl(null)}
      >
        <View style={styles.zoomBackdrop}>
          <TouchableOpacity style={styles.zoomCloseBtn} onPress={() => setZoomPhotoUrl(null)}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {zoomPhotoUrl && (
            <Image source={{ uri: zoomPhotoUrl }} style={styles.zoomFullImg} resizeMode="contain" />
          )}
        </View>
      </Modal>
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
  summaryCard: {
    backgroundColor: 'rgba(10,14,28,0.85)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(80,60,160,0.3)',
    marginBottom: 14,
    gap: 8,
  },
  summaryEyebrow: { color: '#94a3b8', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  summaryTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '800', lineHeight: 22 },
  summaryMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryMetaText: { color: '#cbd5e1', fontSize: 12, flex: 1 },
  obsBox: {
    marginTop: 4,
    backgroundColor: 'rgba(245,158,11,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.45)',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  obsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  obsLabel: { color: '#fbbf24', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  obsText: { color: '#f8fafc', fontSize: 13, fontWeight: '600', lineHeight: 19 },
  obsNote: { color: '#fde68a', fontSize: 12, marginTop: 2 },
  photoWrap: {
    marginTop: 4,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: '#020617',
    height: 150,
  },
  photoImg: { width: '100%', height: '100%' },
  photoBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(2,6,23,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  photoBadgeText: { color: '#f8fafc', fontSize: 10, fontWeight: '700' },
  zoomBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  zoomCloseBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(30,41,59,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  zoomFullImg: { width: '100%', height: '75%' },
});
