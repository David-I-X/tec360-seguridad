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
  assigned: { label: 'Asignado', color: '#3b82f6' },
  en_route: { label: 'En camino', color: '#2563eb' },
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
    return <View style={styles.centered}><ActivityIndicator size="large" color="#3b82f6" /></View>;
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#3b82f6" />}
        renderItem={({ item }) => {
          const cfg = statusConfig[item.status] || statusConfig.pending;
          const isActive = ['assigned', 'en_route', 'arrived', 'in_progress'].includes(item.status);
          const date = item.created_at ? new Date(item.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '';

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
                  <Text style={styles.cardMeta}>{item.service_city} · {date}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: `${cfg.color}20` }]}>
                  <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                {isActive && <Ionicons name="chevron-forward" size={16} color="#475569" />}
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
  container: { flex: 1, backgroundColor: '#0f172a', paddingTop: 60 },
  centered: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, marginBottom: 16 },
  headerTitle: { color: '#f8fafc', fontSize: 24, fontWeight: '800' },
  headerCount: { color: '#64748b', fontSize: 13 },
  card: { backgroundColor: 'rgba(30,41,59,0.5)', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(71,85,105,0.2)' },
  cardActive: { borderColor: 'rgba(59,130,246,0.3)' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
  cardMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  emptySubtitle: { color: '#64748b', fontSize: 13, marginTop: 4 },
});
