import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/auth-context';
import { fetchWithAuth } from '@/lib/api';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pendiente',    color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  quoted:      { label: 'Cotizado',     color: '#a855f7', bg: 'rgba(99,102,241,0.15)' },
  assigned:    { label: 'Asignado',     color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  en_route:    { label: 'En camino',    color: '#7c3aed', bg: 'rgba(37,99,235,0.15)' },
  arrived:     { label: 'Llegó',        color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  in_progress: { label: 'En Progreso', color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  completed:   { label: 'Completado',  color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  cancelled:   { label: 'Cancelado',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
};

const typeEmoji: Record<string, string> = {
  camera_installation: '📹', alarm_installation: '🔔', gps_installation: '📍',
  camera_maintenance: '📹', alarm_maintenance: '🔔', gps_maintenance: '📍', other: '🔧',
};

const ACTIVE_STATUSES = ['pending', 'quoted', 'assigned', 'en_route', 'arrived', 'in_progress'];

type FilterKey = 'all' | 'active' | 'completed' | 'cancelled';

export default function ServicesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/services?page_size=50');
      const data = await res.json();
      const list = data.services || data.items || [];
      setServices(Array.isArray(list) ? list : []);
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
    if (filter === 'active') return ACTIVE_STATUSES.includes(s.status);
    if (filter === 'completed') return s.status === 'completed';
    if (filter === 'cancelled') return s.status === 'cancelled';
    return true;
  });

  const activeCount = services.filter(s => ACTIVE_STATUSES.includes(s.status)).length;
  const completedCount = services.filter(s => s.status === 'completed').length;

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'Todos' }, { key: 'active', label: 'Activos' },
    { key: 'completed', label: 'Completados' }, { key: 'cancelled', label: 'Cancelados' },
  ];

  const renderServiceCard = ({ item }: { item: any }) => {
    const isLive = ['en_route', 'arrived', 'in_progress'].includes(item.status);
    const cfg = statusConfig[item.status] || statusConfig.pending;
    const date = item.created_at ? new Date(item.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '';

    return (
      <TouchableOpacity
        style={[styles.serviceCard, isLive && styles.serviceCardLive]}
        onPress={() => {
          if (isLive) router.push(`/(client)/waiting/${item.id}` as any);
          else router.push(`/(client)/service/${item.id}` as any);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          <View style={[styles.dot, { backgroundColor: cfg.color }]} />
          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              {isLive && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>EN VIVO</Text>
                </View>
              )}
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
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Cargando servicios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {user?.full_name?.split(' ')[0] || 'Cliente'} 👋</Text>
          <Text style={styles.headerTitle}>Mis Servicios</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(client)/new-service' as any)}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.newButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="add" size={22} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{services.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { borderColor: 'rgba(139,92,246,0.3)' }]}>
          <Text style={[styles.statNumber, { color: '#8b5cf6' }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Activos</Text>
        </View>
        <View style={[styles.statCard, { borderColor: 'rgba(34,197,94,0.3)' }]}>
          <Text style={[styles.statNumber, { color: '#22c55e' }]}>{completedCount}</Text>
          <Text style={styles.statLabel}>Hechos</Text>
        </View>
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
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>Sin servicios</Text>
            <Text style={styles.emptySubtitle}>¡Solicita tu primer servicio!</Text>
            <TouchableOpacity onPress={() => router.push('/(client)/new-service' as any)} activeOpacity={0.8}>
              <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.emptyButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyButtonText}>Nuevo Servicio</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810', paddingTop: 60 },
  centered: { flex: 1, backgroundColor: '#050810', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#8b8fa3', marginTop: 12, fontSize: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  greeting: { color: '#8b8fa3', fontSize: 14 },
  headerTitle: { color: '#f0f0f5', fontSize: 28, fontWeight: '800', marginTop: 2 },
  newButton: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: 'rgba(10,14,28,0.85)', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  statNumber: { color: '#f0f0f5', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#555872', fontSize: 11, marginTop: 2 },
  filterRow: { paddingHorizontal: 20, marginBottom: 12, maxHeight: 40 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(10,14,28,0.85)', borderWidth: 1, borderColor: 'rgba(80,60,160,0.3)' },
  filterChipActive: { backgroundColor: 'rgba(139,92,246,0.15)', borderColor: '#8b5cf6' },
  filterText: { color: '#555872', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#8b5cf6' },
  serviceCard: { backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  serviceCardLive: { borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.05)' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardContent: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { color: '#f0f0f5', fontSize: 15, fontWeight: '700', flex: 1 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#22c55e' },
  liveText: { color: '#22c55e', fontSize: 9, fontWeight: '800' },
  cardMeta: { flexDirection: 'row', gap: 12 },
  metaText: { color: '#555872', fontSize: 12 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: '#f0f0f5', fontSize: 18, fontWeight: '700' },
  emptySubtitle: { color: '#555872', fontSize: 14, marginTop: 4, marginBottom: 24 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  emptyButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
