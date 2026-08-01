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
import { COLORS, SPACING, RADIUS, FONTS } from '@/constants/theme';

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
    const dateObj = item.scheduled_date || item.requested_date || item.created_at;
    const dateStr = dateObj
      ? `${new Date(dateObj).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} ${new Date(dateObj).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}`
      : '';

    return (
      <TouchableOpacity
        style={[styles.serviceCard, isLive && styles.serviceCardLive]}
        onPress={() => {
          // Always go to service detail (has map, route, timeline)
          router.push(`/(client)/service/${item.id}` as any);
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
              <Text style={styles.metaText}>📅 {dateStr}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
        <View style={[styles.statCard, { borderColor: COLORS.primaryBorder }]}>
          <Text style={[styles.statNumber, { color: COLORS.primary }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Activos</Text>
        </View>
        <View style={[styles.statCard, { borderColor: COLORS.greenBorder }]}>
          <Text style={[styles.statNumber, { color: COLORS.green }]}>{completedCount}</Text>
          <Text style={styles.statLabel}>Hechos</Text>
        </View>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: SPACING.sm }}>
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
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: SPACING.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
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
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 60 },
  centered: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.textSecondary, marginTop: RADIUS.md, fontSize: FONTS.sizes.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, marginBottom: 20 },
  greeting: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
  headerTitle: { color: COLORS.text, fontSize: 28, fontWeight: '800', marginTop: 2 },
  newButton: { width: SPACING.xxl, height: SPACING.xxl, borderRadius: RADIUS.lg, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: SPACING.sm, elevation: 8 },
  statsRow: { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  statCard: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statNumber: { color: COLORS.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  filterRow: { paddingHorizontal: SPACING.lg, marginBottom: RADIUS.md, maxHeight: 44 },
  filterChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: 20, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: 'rgba(80,60,160,0.3)' },
  filterChipActive: { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary },
  filterText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: COLORS.primary },
  serviceCard: { backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  serviceCardLive: { borderColor: COLORS.greenBorder, backgroundColor: 'rgba(34,197,94,0.05)' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardContent: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', flex: 1 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: COLORS.greenMuted, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', borderRadius: 10, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.green },
  liveText: { color: COLORS.green, fontSize: 9, fontWeight: '800' },
  cardMeta: { flexDirection: 'row', gap: SPACING.md },
  metaText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: SPACING.xs },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: { color: COLORS.text, fontSize: FONTS.sizes.lg, fontWeight: '700' },
  emptySubtitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginTop: SPACING.xs, marginBottom: SPACING.lg },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingVertical: 14, borderRadius: RADIUS.lg },
  emptyButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
