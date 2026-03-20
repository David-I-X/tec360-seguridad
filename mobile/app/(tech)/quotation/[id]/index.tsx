import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchWithAuth } from '@/lib/api';

export default function TechQuotationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  // fetch quotation details (backend doesn't have a single GET /quotation/:id yet for tech, but we can 
  // get all and filter, or we can just fetch the service quotations if we know the service_id.
  // Actually, wait, there's no direct "GET /quotations/{id}" endpoint in the router.
  // But we have "GET /quotations/me" that we can use to find the specific one, or we can just add a single fetch if available.
  const [quotation, setQuotation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isActioning, setIsActioning] = useState(false);

  const load = useCallback(async () => {
    try {
      // Find my quotation
      const res = await fetchWithAuth('/quotations/me?page_size=50');
      const data = await res.json();
      const list = data.quotations || data.items || [];
      const found = list.find((q: any) => q.id === id);
      if (found) {
        setQuotation(found);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (action: 'accept-counter' | 'reject-counter') => {
    setIsActioning(true);
    try {
      await fetchWithAuth(`/quotations/${id}/${action}`, { method: 'PATCH' });
      Alert.alert('Éxito', action === 'accept-counter' ? 'Contraoferta aceptada.' : 'Contraoferta rechazada.');
      load();
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo procesar la acción.');
    } finally {
      setIsActioning(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: '#eab308',
    accepted: '#22c55e',
    rejected: '#ef4444',
    counter_offered: '#f97316',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente de respuesta',
    accepted: 'Aceptada',
    rejected: 'Rechazada',
    counter_offered: 'Contraoferta del cliente',
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#8b5cf6" /></View>;
  }

  if (!quotation) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: '#8b8fa3' }}>No se encontró la cotización.</Text>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
          <Text style={{ color: '#8b5cf6', fontWeight: 'bold' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = statusColors[quotation.status] || '#555872';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#f0f0f5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle Cotización</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#8b5cf6" />}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.serviceTitle}>{quotation.service?.title || 'Servicio'}</Text>
            <View style={[styles.badge, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabels[quotation.status] || quotation.status}</Text>
            </View>
          </View>

          <Text style={styles.label}>TU PROPUESTA</Text>
          <Text style={styles.amount}>${quotation.amount?.toLocaleString('es-CO')}</Text>
          <Text style={styles.description}>{quotation.description}</Text>

          {quotation.status === 'counter_offered' && (
            <View style={styles.counterBox}>
              <View style={styles.counterHeader}>
                <Ionicons name="alert-circle" size={18} color="#f97316" />
                <Text style={styles.counterTitle}>Contraoferta del cliente</Text>
              </View>
              <Text style={styles.counterAmount}>${quotation.counter_amount?.toLocaleString('es-CO')}</Text>
              {quotation.client_response && (
                <Text style={styles.counterMessage}>"{quotation.client_response}"</Text>
              )}
            </View>
          )}

          {quotation.status === 'rejected' && quotation.client_response && (
            <View style={[styles.counterBox, { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.1)' }]}>
              <View style={styles.counterHeader}>
                <Ionicons name="close-circle" size={18} color="#ef4444" />
                <Text style={[styles.counterTitle, { color: '#ef4444' }]}>Motivo del rechazo</Text>
              </View>
              <Text style={styles.counterMessage}>"{quotation.client_response}"</Text>
            </View>
          )}
        </View>

        {quotation.status === 'counter_offered' && (
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.btn, styles.rejectBtn]} 
              onPress={() => handleAction('reject-counter')}
              disabled={isActioning}
            >
              <Ionicons name="close" size={20} color="#ef4444" />
              <Text style={styles.rejectText}>Rechazar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.btn, styles.acceptBtn]} 
              onPress={() => handleAction('accept-counter')}
              disabled={isActioning}
            >
              {isActioning ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.acceptText}>Aceptar precio</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  centered: { flex: 1, backgroundColor: '#050810', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#050810', zIndex: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(15,23,42,0.8)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#f0f0f5', fontSize: 18, fontWeight: '700' },
  card: { backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)', marginBottom: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  serviceTitle: { color: '#f0f0f5', fontSize: 18, fontWeight: '800', flex: 1, marginRight: 10 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  label: { color: '#8b8fa3', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  amount: { color: '#22c55e', fontSize: 32, fontWeight: '800', marginVertical: 8 },
  description: { color: '#f0f0f5', fontSize: 15, lineHeight: 24, marginTop: 8 },
  counterBox: { marginTop: 24, padding: 16, borderRadius: 16, backgroundColor: 'rgba(249,115,22,0.1)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)' },
  counterHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  counterTitle: { color: '#f97316', fontSize: 14, fontWeight: '700' },
  counterAmount: { color: '#f0f0f5', fontSize: 24, fontWeight: '800' },
  counterMessage: { color: '#8b8fa3', fontSize: 14, fontStyle: 'italic', marginTop: 10, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1 },
  rejectBtn: { backgroundColor: 'transparent', borderColor: 'rgba(239,68,68,0.5)' },
  rejectText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
  acceptBtn: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  acceptText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
