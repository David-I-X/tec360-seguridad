import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchWithAuth, getServiceById } from '@/lib/api';

export default function QuotationsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [service, setService] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [serviceData, quoteRes] = await Promise.all([
        getServiceById(id!),
        fetchWithAuth(`/quotations/service/${id}`),
      ]);
      setService(serviceData.service || serviceData);
      const quoteData = await quoteRes.json();
      setQuotations(quoteData.quotations || quoteData || []);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async (quotationId: string) => {
    Alert.alert('Aceptar cotización', '¿Deseas aceptar esta cotización? El técnico será asignado a tu servicio.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aceptar', style: 'default', onPress: async () => {
          setAccepting(quotationId);
          try {
            await fetchWithAuth(`/quotations/${quotationId}/accept`, { method: 'POST' });
            Alert.alert('¡Cotización aceptada!', 'Tu técnico ha sido notificado.', [
              { text: 'OK', onPress: () => router.replace(`/(client)/waiting/${id}` as any) },
            ]);
          } catch (err: any) {
            Alert.alert('Error', err.message);
          } finally {
            setAccepting(null);
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#8b5cf6" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#f0f0f5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cotizaciones</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Service Info */}
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceTitle}>{service?.title}</Text>
        <Text style={styles.serviceSubtitle}>{quotations.length} cotizaciones recibidas</Text>
      </View>

      {/* Quotation cards */}
      {quotations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyTitle}>Sin cotizaciones aún</Text>
          <Text style={styles.emptySubtitle}>Los técnicos están revisando tu solicitud</Text>
        </View>
      ) : (
        quotations.map((q: any) => (
          <View key={q.id} style={styles.quoteCard}>
            <View style={styles.quoteHeader}>
              <View style={styles.techRow}>
                <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.techAvatar}>
                  <Text style={styles.techInitial}>{q.technician?.full_name?.[0] || 'T'}</Text>
                </LinearGradient>
                <View>
                  <Text style={styles.techName}>{q.technician?.full_name || 'Técnico'}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={12} color="#eab308" />
                    <Text style={styles.ratingText}>{q.technician?.average_rating?.toFixed(1) || '—'}</Text>
                  </View>
                </View>
              </View>
              <View>
                <Text style={styles.priceLabel}>Precio</Text>
                <Text style={styles.price}>${q.price?.toLocaleString('es-CO')}</Text>
              </View>
            </View>

            {q.message && <Text style={styles.quoteMessage}>"{q.message}"</Text>}

            <View style={styles.quoteMetaRow}>
              <View style={styles.quoteMeta}>
                <Ionicons name="time" size={14} color="#555872" />
                <Text style={styles.quoteMetaText}>{q.estimated_time || 'Sin estimar'}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.acceptButton, accepting === q.id && { opacity: 0.6 }]}
              onPress={() => handleAccept(q.id)}
              disabled={!!accepting}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.acceptGradient}>
                {accepting === q.id ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.acceptText}>Aceptar Cotización</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  centered: { flex: 1, backgroundColor: '#050810', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  headerTitle: { color: '#f0f0f5', fontSize: 18, fontWeight: '700' },
  serviceInfo: { paddingHorizontal: 20, marginBottom: 20 },
  serviceTitle: { color: '#f0f0f5', fontSize: 22, fontWeight: '800' },
  serviceSubtitle: { color: '#555872', fontSize: 14, marginTop: 4 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: '#f0f0f5', fontSize: 18, fontWeight: '700' },
  emptySubtitle: { color: '#555872', fontSize: 14, marginTop: 4 },
  quoteCard: { marginHorizontal: 20, backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 20, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  quoteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  techRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  techAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  techInitial: { color: '#fff', fontSize: 16, fontWeight: '800' },
  techName: { color: '#f0f0f5', fontSize: 15, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { color: '#eab308', fontSize: 12, fontWeight: '600' },
  priceLabel: { color: '#555872', fontSize: 11, textAlign: 'right' },
  price: { color: '#22c55e', fontSize: 20, fontWeight: '800' },
  quoteMessage: { color: '#8b8fa3', fontSize: 14, fontStyle: 'italic', marginBottom: 12, lineHeight: 20 },
  quoteMetaRow: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  quoteMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quoteMetaText: { color: '#555872', fontSize: 13 },
  acceptButton: { borderRadius: 14, overflow: 'hidden' },
  acceptGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  acceptText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
