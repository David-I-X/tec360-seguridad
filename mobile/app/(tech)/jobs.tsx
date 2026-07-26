import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchWithAuth } from '@/lib/api';

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: '#eab308' },
  assigned: { label: 'Asignado', color: '#8b5cf6' },
  en_route: { label: 'En camino', color: '#7c3aed' },
  arrived: { label: 'Llegó', color: '#f97316' },
  in_progress: { label: 'En Progreso', color: '#a855f7' },
  completed: { label: 'Completado', color: '#22c55e' },
  cancelled: { label: 'Cancelado', color: '#ef4444' },
};

export default function TechJobsScreen() {
  const router = useRouter();
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/services?page_size=50');
      const data = await res.json();
      const list = data.services || data.items || [];
      setServices(Array.isArray(list) ? list : []);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#8b5cf6" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Trabajos</Text>
        <Text style={styles.headerCount}>{services.length} total</Text>
      </View>

      <FlatList
        data={services}
        keyExtractor={item => item.id?.toString()}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#8b5cf6" />}
        renderItem={({ item }) => {
          const cfg = statusConfig[item.status] || statusConfig.pending;
          const isActive = ['assigned', 'en_route', 'arrived', 'in_progress'].includes(item.status);
          const dateObj = item.scheduled_date || item.requested_date || item.created_at;
          const dateStr = dateObj
            ? `${new Date(dateObj).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} · ${new Date(dateObj).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}`
            : '';

          return (
            <TouchableOpacity
              style={[styles.card, isActive && styles.cardActive]}
              onPress={() => {
                if (isActive) router.push(`/(tech)/service/${item.id}` as any);
              }}
              activeOpacity={isActive ? 0.7 : 1}
            >
              <View style={styles.cardRow}>
                <View style={[styles.dot, { backgroundColor: cfg.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.cardMeta}>{item.service_city} · {dateStr}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: `${cfg.color}20` }]}>
                  <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                {isActive && <Ionicons name="chevron-forward" size={16} color="#555872" />}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>Sin trabajos</Text>
            <Text style={styles.emptySubtitle}>Acepta servicios desde el Dashboard</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810', paddingTop: 60 },
  centered: { flex: 1, backgroundColor: '#050810', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 24, marginBottom: 24 },
  headerTitle: { color: '#f0f0f5', fontSize: 26, fontWeight: '800' },
  headerCount: { color: '#555872', fontSize: 14 },
  card: { backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  cardActive: { borderColor: 'rgba(139,92,246,0.3)' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: { color: '#f0f0f5', fontSize: 16, fontWeight: '700' },
  cardMeta: { color: '#555872', fontSize: 13, marginTop: 4 },
  badge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingTop: 64 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: '#f0f0f5', fontSize: 18, fontWeight: '700' },
  emptySubtitle: { color: '#555872', fontSize: 14, marginTop: 8 },
});
