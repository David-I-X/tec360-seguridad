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

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pendiente',   color: COLORS.yellow,       bg: 'rgba(251,191,36,0.14)' },
  assigned:    { label: 'Asignado',    color: COLORS.primaryLight, bg: 'rgba(139,92,246,0.16)' },
  en_route:    { label: 'En camino',   color: COLORS.blue,         bg: 'rgba(96,165,250,0.16)' },
  arrived:     { label: 'Llegó',       color: COLORS.orange,       bg: 'rgba(251,146,60,0.16)' },
  in_progress: { label: 'En progreso', color: COLORS.primaryLight, bg: 'rgba(139,92,246,0.22)' },
  completed:   { label: 'Completado',  color: COLORS.green,        bg: 'rgba(52,211,153,0.16)' },
  confirmed:   { label: 'Completado',  color: COLORS.green,        bg: 'rgba(52,211,153,0.16)' },
  cancelled:   { label: 'Cancelado',   color: COLORS.red,          bg: 'rgba(248,113,113,0.16)' },
};

type JobFilter = 'all' | 'active' | 'completed' | 'warranty_active' | 'warranty_expired';

export default function TechJobsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState<any[]>([]);
  const [filter, setFilter] = useState<JobFilter>('all');
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

  const filteredServices = services.filter((item) => {
    const isActive = ['assigned', 'en_route', 'arrived', 'in_progress'].includes(item.status);
    const isCompleted = ['completed', 'confirmed'].includes(item.status);
    const isWarrantyActive = isCompleted && (item.warranty_status === 'active' || (item.warranty_days_left ?? 30) > 0);
    const isWarrantyExpired = isCompleted && (item.warranty_status === 'expired' || item.warranty_days_left === 0);

    if (filter === 'active') return isActive;
    if (filter === 'completed') return isCompleted;
    if (filter === 'warranty_active') return isWarrantyActive;
    if (filter === 'warranty_expired') return isWarrantyExpired;
    return true;
  });

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  const filterTabs: { key: JobFilter; label: string }[] = [
    { key: 'all', label: `Todos (${services.length})` },
    { key: 'active', label: 'Activos' },
    { key: 'completed', label: 'Completados' },
    { key: 'warranty_active', label: 'Con garantía' },
    { key: 'warranty_expired', label: 'Vencida' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Trabajos</Text>
        <View style={styles.countWell}>
          <Text style={styles.headerCount}>{filteredServices.length}</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={{ maxHeight: 44, marginBottom: 16 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filterTabs.map((tab) => {
            const active = filter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterChip, active ? styles.filterChipActive : NEU.raisedSm]}
                onPress={() => setFilter(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredServices}
        keyExtractor={item => item.id?.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} colors={[COLORS.primary]} progressBackgroundColor={COLORS.surface} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }}
        renderItem={({ item }) => {
          const cfg = statusConfig[item.status] || { label: item.status, color: COLORS.textSecondary, bg: 'rgba(255,255,255,0.06)' };
          const isActive = ['assigned', 'en_route', 'arrived', 'in_progress'].includes(item.status);
          const isCompleted = ['completed', 'confirmed'].includes(item.status);
          const hasActiveWarranty = isCompleted && (item.warranty_status === 'active' || (item.warranty_days_left ?? 30) > 0);
          const daysLeft = item.warranty_days_left ?? 30;

          return (
            <TouchableOpacity
              style={[styles.card, isActive && styles.cardActive]}
              onPress={() => router.push(`/(tech)/service/${item.id}` as any)}
              activeOpacity={0.85}
            >
              <View style={styles.cardRow}>
                <View style={[styles.dot, { backgroundColor: cfg.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {item.service_city || item.service_address || 'Medellín'} · {item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString('es-CO') : 'Sin fecha'}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>

              {/* Warranty Info */}
              {isCompleted && (
                <View style={styles.warrantyRow}>
                  {hasActiveWarranty ? (
                    <View style={styles.warrantyBadgeActive}>
                      <Ionicons name="shield-checkmark" size={13} color={COLORS.green} />
                      <Text style={styles.warrantyBadgeTextActive}>Garantía activa ({daysLeft}d restantes)</Text>
                    </View>
                  ) : (
                    <View style={styles.warrantyBadgeExpired}>
                      <Ionicons name="shield-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.warrantyBadgeTextExpired}>Garantía vencida</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Electronic Invoice Buttons */}
              {isCompleted && (item.factus_bill_number || item.technician_invoice_url) && (
                <View style={styles.invoiceRow}>
                  {item.technician_invoice_url && (
                    <TouchableOpacity
                      style={styles.techInvoiceBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        Linking.openURL(item.technician_invoice_url);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="document-text-outline" size={13} color={COLORS.primaryLight} />
                      <Text style={styles.techInvoiceBtnText}>Cuenta de cobro</Text>
                    </TouchableOpacity>
                  )}
                  {item.factus_bill_number && (
                    <TouchableOpacity
                      style={styles.clientInvoiceBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        Linking.openURL(`https://api.factus.com.co/v1/bills/download-pdf/${item.factus_bill_number}`);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="receipt-outline" size={13} color={COLORS.green} />
                      <Text style={styles.clientInvoiceBtnText}>Factura DIAN ({item.factus_bill_number})</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <NeuIcon name="briefcase-outline" color={COLORS.textSecondary} size={72} inset />
            <Text style={styles.emptyTitle}>Sin trabajos aquí</Text>
            <Text style={styles.emptySubtitle}>No hay servicios registrados en este filtro.</Text>
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
  filterScroll: { paddingHorizontal: 20, gap: 10 },
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
  filterChipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: COLORS.primaryLight, fontWeight: '700' },
  card: { ...NEU.raised, borderRadius: RADIUS.xl, padding: 18, marginBottom: 14 },
  cardActive: { backgroundColor: COLORS.surfaceHigh },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  cardMeta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  badge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  warrantyRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
  },
  warrantyBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.greenMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  warrantyBadgeTextActive: { color: COLORS.green, fontSize: 12, fontWeight: '600' },
  warrantyBadgeExpired: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  warrantyBadgeTextExpired: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
  invoiceRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  techInvoiceBtn: {
    ...NEU.raisedSm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  techInvoiceBtnText: { color: COLORS.primaryLight, fontSize: 12, fontWeight: '600' },
  clientInvoiceBtn: {
    ...NEU.raisedSm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clientInvoiceBtnText: { color: COLORS.green, fontSize: 12, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingTop: 56, gap: 8 },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginTop: 14 },
  emptySubtitle: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' },
});
