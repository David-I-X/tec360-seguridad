import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Linking,
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
  confirmed: { label: 'Completado', color: '#22c55e' },
  cancelled: { label: 'Cancelado', color: '#ef4444' },
};

type JobFilter = 'all' | 'active' | 'completed' | 'warranty_active' | 'warranty_expired';

export default function TechJobsScreen() {
  const router = useRouter();
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
    return <View style={styles.centered}><ActivityIndicator size="large" color="#8b5cf6" /></View>;
  }

  const filterTabs: { key: JobFilter; label: string }[] = [
    { key: 'all', label: `Todos (${services.length})` },
    { key: 'active', label: 'Activos' },
    { key: 'completed', label: 'Completados' },
    { key: 'warranty_active', label: '🛡️ Con Garantía' },
    { key: 'warranty_expired', label: 'Garantía Vencida' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Trabajos</Text>
        <Text style={styles.headerCount}>{filteredServices.length} visibles</Text>
      </View>

      {/* Filter Tabs */}
      <View style={{ maxHeight: 44, marginBottom: 14 }}>
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
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(tab.key)}
                activeOpacity={0.7}
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
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#8b5cf6" />}
        renderItem={({ item }) => {
          const cfg = statusConfig[item.status] || statusConfig.pending;
          const isActive = ['assigned', 'en_route', 'arrived', 'in_progress'].includes(item.status);
          const isCompleted = ['completed', 'confirmed'].includes(item.status);
          const canOpen = isActive || isCompleted;
          const dateObj = item.scheduled_date || item.requested_date || item.created_at;
          const dateStr = dateObj
            ? `${new Date(dateObj).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} · ${new Date(dateObj).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}`
            : '';
          const hasActiveWarranty = isCompleted && (item.warranty_status === 'active' || (item.warranty_days_left ?? 30) > 0);
          const hasExpiredWarranty = isCompleted && (item.warranty_status === 'expired' || item.warranty_days_left === 0);

          return (
            <TouchableOpacity
              style={[styles.card, isActive && styles.cardActive]}
              onPress={() => {
                if (canOpen) router.push(`/(tech)/service/${item.id}` as any);
              }}
              activeOpacity={canOpen ? 0.7 : 1}
            >
              <View style={styles.cardRow}>
                <View style={[styles.dot, { backgroundColor: cfg.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.cardMeta}>{item.service_city || 'Sin ciudad'} · {dateStr}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: `${cfg.color}20` }]}>
                  <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                {canOpen && <Ionicons name="chevron-forward" size={16} color="#555872" />}
              </View>

              {/* Warranty Banner */}
              {isCompleted && (
                <View style={styles.warrantyRow}>
                  {hasActiveWarranty && (
                    <View style={styles.warrantyBadgeActive}>
                      <Ionicons name="shield-checkmark" size={13} color="#22c55e" />
                      <Text style={styles.warrantyBadgeTextActive}>
                        Garantía: {item.warranty_days_left ?? 30} días restantes
                      </Text>
                    </View>
                  )}
                  {hasExpiredWarranty && (
                    <View style={styles.warrantyBadgeExpired}>
                      <Ionicons name="shield-outline" size={13} color="#6b7280" />
                      <Text style={styles.warrantyBadgeTextExpired}>Garantía Vencida (30d)</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Invoices Row if completed */}
              {isCompleted && (item.tech_pdf_url || item.pdf_url) && (
                <View style={styles.invoiceRow}>
                  {item.tech_pdf_url && (
                    <TouchableOpacity
                      style={styles.techInvoiceBtn}
                      onPress={() => Linking.openURL(item.tech_pdf_url)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="receipt-outline" size={14} color="#8b5cf6" />
                      <Text style={styles.techInvoiceBtnText}>Comisión DIAN</Text>
                    </TouchableOpacity>
                  )}
                  {item.pdf_url && (
                    <TouchableOpacity
                      style={styles.clientInvoiceBtn}
                      onPress={() => Linking.openURL(item.pdf_url)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="document-text-outline" size={14} color="#22c55e" />
                      <Text style={styles.clientInvoiceBtnText}>Factura DIAN</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>Sin trabajos</Text>
            <Text style={styles.emptySubtitle}>No hay trabajos con el filtro seleccionado</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810', paddingTop: 60 },
  centered: { flex: 1, backgroundColor: '#050810', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 24, marginBottom: 16 },
  headerTitle: { color: '#f0f0f5', fontSize: 26, fontWeight: '800' },
  headerCount: { color: '#555872', fontSize: 14 },
  filterScroll: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(10,14,28,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(80,60,160,0.25)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(139,92,246,0.18)',
    borderColor: '#8b5cf6',
  },
  filterChipText: { color: '#8b8fa3', fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#8b5cf6', fontWeight: '700' },
  card: { backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  cardActive: { borderColor: 'rgba(139,92,246,0.4)', backgroundColor: 'rgba(18,22,44,0.85)' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: { color: '#f0f0f5', fontSize: 15, fontWeight: '700' },
  cardMeta: { color: '#555872', fontSize: 12, marginTop: 3 },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  warrantyRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
  },
  warrantyBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34,197,94,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  warrantyBadgeTextActive: { color: '#22c55e', fontSize: 12, fontWeight: '600' },
  warrantyBadgeExpired: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(107,114,128,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  warrantyBadgeTextExpired: { color: '#9ca3af', fontSize: 12, fontWeight: '500' },
  invoiceRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  techInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  techInvoiceBtnText: { color: '#a78bfa', fontSize: 12, fontWeight: '600' },
  clientInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clientInvoiceBtnText: { color: '#4ade80', fontSize: 12, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingTop: 64 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: '#f0f0f5', fontSize: 18, fontWeight: '700' },
  emptySubtitle: { color: '#555872', fontSize: 14, marginTop: 8 },
});
