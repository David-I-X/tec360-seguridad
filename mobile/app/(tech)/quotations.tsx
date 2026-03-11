import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchWithAuth } from '@/lib/api';

export default function TechQuotationsScreen() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/quotations/my');
      const data = await res.json();
      setQuotations(data.quotations || data || []);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusColors: Record<string, string> = {
    pending: '#eab308',
    accepted: '#22c55e',
    rejected: '#ef4444',
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Cotizaciones</Text>
      </View>

      <FlatList
        data={quotations}
        keyExtractor={item => item.id?.toString()}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#3b82f6" />}
        renderItem={({ item }) => {
          const statusColor = statusColors[item.status] || '#64748b';
          return (
            <View style={styles.quoteCard}>
              <View style={styles.quoteHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quoteTitle}>{item.service?.title || 'Servicio'}</Text>
                  <Text style={styles.quoteCity}>{item.service?.service_city}</Text>
                </View>
                <View>
                  <Text style={styles.quotePrice}>${item.price?.toLocaleString('es-CO')}</Text>
                  <View style={[styles.quoteBadge, { backgroundColor: `${statusColor}20` }]}>
                    <Text style={[styles.quoteBadgeText, { color: statusColor }]}>
                      {item.status === 'pending' ? 'Pendiente' : item.status === 'accepted' ? 'Aceptada' : 'Rechazada'}
                    </Text>
                  </View>
                </View>
              </View>
              {item.message && (
                <Text style={styles.quoteMessage} numberOfLines={2}>"{item.message}"</Text>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>💰</Text>
            <Text style={styles.emptyTitle}>Sin cotizaciones</Text>
            <Text style={styles.emptySubtitle}>Cotiza servicios disponibles desde el Dashboard</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingTop: 60 },
  centered: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, marginBottom: 16 },
  headerTitle: { color: '#f8fafc', fontSize: 24, fontWeight: '800' },
  quoteCard: { backgroundColor: 'rgba(30,41,59,0.5)', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(71,85,105,0.2)' },
  quoteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  quoteTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
  quoteCity: { color: '#64748b', fontSize: 12, marginTop: 4 },
  quotePrice: { color: '#22c55e', fontSize: 18, fontWeight: '800', textAlign: 'right' },
  quoteBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-end' },
  quoteBadgeText: { fontSize: 10, fontWeight: '700' },
  quoteMessage: { color: '#94a3b8', fontSize: 13, fontStyle: 'italic', marginTop: 10, lineHeight: 18 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  emptySubtitle: { color: '#64748b', fontSize: 13, marginTop: 4, textAlign: 'center' },
});
