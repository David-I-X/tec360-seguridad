import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchWithAuth } from '@/lib/api';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  completed:   { label: 'Completado',  color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  confirmed:   { label: 'Completado',  color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  cancelled:   { label: 'Cancelado',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
};

const typeEmoji: Record<string, string> = {
  camera_installation: '📹', alarm_installation: '🔔', gps_installation: '📍',
  camera_maintenance: '📹', alarm_maintenance: '🔔', gps_maintenance: '📍', other: '🔧',
};

type FilterKey = 'all' | 'completed' | 'cancelled';

export default function HistoryScreen() {
  const router = useRouter();
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/services?page_size=50');
      const data = await res.json();
      const list = data.services || data.items || [];
      // Only keep history items
      const historyList = (Array.isArray(list) ? list : []).filter(s =>
        ['completed', 'confirmed', 'cancelled'].includes(s.status)
      );
      setServices(historyList);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const filtered = services.filter(s => {
    if (filter === 'all') return true;
    if (filter === 'completed') return ['completed', 'confirmed'].includes(s.status);
    if (filter === 'cancelled') return s.status === 'cancelled';
    return true;
  });

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'completed', label: 'Completados' },
    { key: 'cancelled', label: 'Cancelados' },
  ];

  const renderServiceCard = ({ item }: { item: any }) => {
    const cfg = statusConfig[item.status] || statusConfig.completed;
    const isCompleted = ['completed', 'confirmed'].includes(item.status);
    const date = item.created_at ? new Date(item.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '';
    const hasActiveWarranty = isCompleted && (item.warranty_status === 'active' || (item.warranty_days_left ?? 30) > 0);
    const hasExpiredWarranty = isCompleted && (item.warranty_status === 'expired' || item.warranty_days_left === 0);

    return (
      <TouchableOpacity
        style={styles.serviceCard}
        onPress={() => router.push(`/(client)/service/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          <View style={[styles.dot, { backgroundColor: cfg.color }]} />
          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            </View>
            <View style={styles.cardMeta}>
              <Text style={styles.metaText}>
                {typeEmoji[item.service_type] || '🔧'} {item.service_city || 'Sin ubicación'}
              </Text>
              <Text style={styles.metaText}>📅 {date}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#555872" />
        </View>

        {/* Warranty and DIAN Invoices Row */}
        {isCompleted && (
          <View style={styles.bottomCardRow}>
            {hasActiveWarranty && (
              <View style={styles.warrantyBadgeActive}>
                <Ionicons name="shield-checkmark" size={12} color="#22c55e" />
                <Text style={styles.warrantyBadgeTextActive}>
                  Garantía: {item.warranty_days_left ?? 30}d
                </Text>
              </View>
            )}
            {hasExpiredWarranty && (
              <View style={styles.warrantyBadgeExpired}>
                <Ionicons name="shield-outline" size={12} color="#9ca3af" />
                <Text style={styles.warrantyBadgeTextExpired}>Garantía Vencida</Text>
              </View>
            )}
            {item.pdf_url && (
              <TouchableOpacity
                style={styles.invoiceBtn}
                onPress={() => Linking.openURL(item.pdf_url)}
                activeOpacity={0.7}
              >
                <Ionicons name="document-text-outline" size={12} color="#22c55e" />
                <Text style={styles.invoiceBtnText}>Factura DIAN</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historial de Servicios</Text>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 8 }}>
        {filters.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filtered}
        renderItem={renderServiceCard}
        keyExtractor={item => item.id?.toString()}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🗄️</Text>
            <Text style={styles.emptyTitle}>Sin historial</Text>
            <Text style={styles.emptySubtitle}>Aún no tienes servicios completados</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810', paddingTop: 60 },
  centered: { flex: 1, backgroundColor: '#050810', justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, marginBottom: 20 },
  headerTitle: { color: '#f0f0f5', fontSize: 28, fontWeight: '800' },
  filterRow: { paddingHorizontal: 24, marginBottom: 16, maxHeight: 40 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(10,14,28,0.85)', borderWidth: 1, borderColor: 'rgba(80,60,160,0.3)' },
  filterChipActive: { backgroundColor: 'rgba(139,92,246,0.15)', borderColor: '#8b5cf6' },
  filterText: { color: '#555872', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#8b5cf6' },
  serviceCard: { backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardContent: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { color: '#f0f0f5', fontSize: 16, fontWeight: '700', flex: 1 },
  cardMeta: { flexDirection: 'row', gap: 12 },
  metaText: { color: '#555872', fontSize: 13 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  bottomCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  warrantyBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34,197,94,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  warrantyBadgeTextActive: { color: '#22c55e', fontSize: 11, fontWeight: '600' },
  warrantyBadgeExpired: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(107,114,128,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  warrantyBadgeTextExpired: { color: '#9ca3af', fontSize: 11, fontWeight: '500' },
  invoiceBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  invoiceBtnText: { color: '#4ade80', fontSize: 11, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: '#f0f0f5', fontSize: 18, fontWeight: '700' },
  emptySubtitle: { color: '#555872', fontSize: 14, marginTop: 4, marginBottom: 24 },
});
