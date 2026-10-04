import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchWithAuth } from '@/lib/api';
import { COLORS, NEU, RADIUS } from '@/constants/theme';
import { NeuIcon } from '@/components/neu';

type IconName = keyof typeof Ionicons.glyphMap;

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: 'Completado', color: COLORS.green, bg: 'rgba(52,211,153,0.14)' },
  confirmed: { label: 'Completado', color: COLORS.green, bg: 'rgba(52,211,153,0.14)' },
  cancelled: { label: 'Cancelado',  color: COLORS.red,   bg: 'rgba(248,113,113,0.14)' },
};

const typeIcon: Record<string, { icon: IconName; color: string }> = {
  camera_installation: { icon: 'videocam-outline', color: '#c084fc' },
  camera_maintenance:  { icon: 'videocam-outline', color: '#c084fc' },
  alarm_installation:  { icon: 'notifications-outline', color: COLORS.yellow },
  alarm_maintenance:   { icon: 'notifications-outline', color: COLORS.yellow },
  gps_installation:    { icon: 'radio-outline', color: COLORS.blue },
  gps_maintenance:     { icon: 'radio-outline', color: COLORS.blue },
  vehicle_recovery:    { icon: 'shield-half-outline', color: COLORS.red },
  other:               { icon: 'construct-outline', color: COLORS.textSecondary },
};

type FilterKey = 'all' | 'completed' | 'cancelled';

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/services?page_size=50');
      const data = await res.json();
      const list = data.services || data.items || [];
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
    { key: 'all', label: `Todos (${services.length})` },
    { key: 'completed', label: 'Completados' },
    { key: 'cancelled', label: 'Cancelados' },
  ];

  const renderServiceCard = ({ item }: { item: any }) => {
    const cfg = statusConfig[item.status] || statusConfig.completed;
    const isCompleted = ['completed', 'confirmed'].includes(item.status);
    const date = item.created_at ? new Date(item.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '';
    const hasActiveWarranty = isCompleted && (item.warranty_status === 'active' || (item.warranty_days_left ?? 30) > 0);
    const hasExpiredWarranty = isCompleted && (item.warranty_status === 'expired' || item.warranty_days_left === 0);
    const t = typeIcon[item.service_type] || typeIcon.other;

    return (
      <TouchableOpacity
        style={styles.serviceCard}
        onPress={() => router.push(`/(client)/service/${item.id}` as any)}
        activeOpacity={0.8}
      >
        <View style={styles.cardRow}>
          <NeuIcon name={t.icon} color={t.color} size={42} inset />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <View style={styles.cardMeta}>
              <Text style={styles.metaText} numberOfLines={1}>{item.service_city || 'Medellín'}</Text>
              {date ? <Text style={styles.metaText}>· {date}</Text> : null}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Warranty and DIAN Invoices Row */}
        {isCompleted && (
          <View style={styles.bottomCardRow}>
            {hasActiveWarranty && (
              <View style={styles.warrantyBadgeActive}>
                <Ionicons name="shield-checkmark" size={12} color={COLORS.green} />
                <Text style={styles.warrantyBadgeTextActive}>Garantía activa ({item.warranty_days_left ?? 30}d)</Text>
              </View>
            )}
            {hasExpiredWarranty && (
              <View style={styles.warrantyBadgeExpired}>
                <Ionicons name="shield-outline" size={12} color={COLORS.textMuted} />
                <Text style={styles.warrantyBadgeTextExpired}>Garantía vencida</Text>
              </View>
            )}
            {item.factus_bill_number && (
              <TouchableOpacity
                style={styles.invoiceBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  Linking.openURL(`https://api.factus.com.co/v1/bills/download-pdf/${item.factus_bill_number}`);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="receipt-outline" size={12} color={COLORS.green} />
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
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historial</Text>
        <View style={styles.countWell}>
          <Text style={styles.headerCount}>{filtered.length}</Text>
        </View>
      </View>

      {/* Filter Row */}
      <View style={{ maxHeight: 44, marginBottom: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active ? styles.filterChipActive : NEU.raisedSm]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        renderItem={renderServiceCard}
        keyExtractor={item => item.id?.toString()}
        contentContainerStyle={{ paddingBottom: 110, paddingHorizontal: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
            progressBackgroundColor={COLORS.surface}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <NeuIcon name="archive-outline" color={COLORS.textSecondary} size={72} inset />
            <Text style={styles.emptyTitle}>Sin historial</Text>
            <Text style={styles.emptySubtitle}>Aún no tienes servicios completados en esta sección.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 18 },
  headerTitle: { color: COLORS.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  countWell: { ...NEU.inset, minWidth: 32, height: 26, borderRadius: 13, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
  headerCount: { color: COLORS.primaryLight, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  filterRow: { paddingHorizontal: 20, gap: 10 },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: RADIUS.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    ...NEU.inset,
    backgroundColor: COLORS.surfaceHigh,
  },
  filterText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: COLORS.primaryLight, fontWeight: '700' },

  serviceCard: {
    ...NEU.raised,
    borderRadius: RADIUS.xl,
    padding: 16,
    marginBottom: 12,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardContent: { flex: 1 },
  cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', gap: 6, marginTop: 4 },
  metaText: { color: COLORS.textSecondary, fontSize: 12 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },

  bottomCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  warrantyBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.greenMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  warrantyBadgeTextActive: { color: COLORS.green, fontSize: 11, fontWeight: '600' },
  warrantyBadgeExpired: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  warrantyBadgeTextExpired: { color: COLORS.textMuted, fontSize: 11, fontWeight: '500' },
  invoiceBtn: {
    marginLeft: 'auto',
    ...NEU.raisedSm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  invoiceBtnText: { color: COLORS.green, fontSize: 11, fontWeight: '700' },

  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginTop: 14 },
  emptySubtitle: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', maxWidth: 260 },
});
