import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Switch, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/auth-context';
import { fetchWithAuth, API_URL } from '@/lib/api';

const typeEmoji: Record<string, string> = {
  camera_installation: '📹', alarm_installation: '🔔', gps_installation: '📍',
  camera_maintenance: '📹', alarm_maintenance: '🔔', gps_maintenance: '📍', other: '🔧',
};

export default function TechDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [myActiveService, setMyActiveService] = useState<any>(null);
  const [stats, setStats] = useState({ completed: 0, rating: 0 });
  const [earnings, setEarnings] = useState({ total: 0, pending: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      // Load available services
      const availRes = await fetchWithAuth('/services/available');
      const availData = await availRes.json();
      setAvailableServices(availData.services || availData || []);

      // Load my services to find active one
      const myRes = await fetchWithAuth('/services?page_size=20');
      const myData = await myRes.json();
      const myServices = myData.services || myData.items || [];
      const active = myServices.find((s: any) =>
        ['assigned', 'en_route', 'arrived', 'in_progress'].includes(s.status)
      );
      setMyActiveService(active || null);

      // Stats
      const completed = myServices.filter((s: any) => s.status === 'completed').length;
      setStats({ completed, rating: user?.average_rating || 0 });

      // Earnings (if payments enabled)
      try {
        const earningsRes = await fetchWithAuth('/payments/my-summary');
        if (earningsRes.ok) {
          const earningsData = await earningsRes.json();
          setEarnings({
            total: earningsData.total_collected || 0,
            pending: earningsData.pending_validation || 0,
          });
        }
      } catch (_) {}
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleAcceptService = async (serviceId: string) => {
    try {
      await fetchWithAuth(`/services/${serviceId}/accept`, { method: 'POST' });
      load(); // Reload
    } catch (e: any) {
      console.error(e);
    }
  };

  const staticUrl = API_URL.replace(/\/api\/?$/, '');

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#8b5cf6" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={isOnline ? availableServices : []}
        keyExtractor={item => item.id?.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#8b5cf6" />}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url.startsWith('http') ? user.avatar_url : `${staticUrl}${user.avatar_url}` }} style={styles.avatar} />
                ) : (
                  <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.avatar}>
                    <Text style={styles.avatarText}>{user?.full_name?.[0] || 'T'}</Text>
                  </LinearGradient>
                )}
                <View>
                  <Text style={styles.greeting}>Hola, {user?.full_name?.split(' ')[0]} 👋</Text>
                  <Text style={styles.role}>Técnico certificado</Text>
                </View>
              </View>
            </View>

            {/* Online Toggle */}
            <View style={styles.toggleCard}>
              <View style={styles.toggleLeft}>
                <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#22c55e' : '#555872' }]} />
                <Text style={styles.toggleText}>{isOnline ? 'En línea' : 'Fuera de línea'}</Text>
              </View>
              <Switch
                value={isOnline}
                onValueChange={async (val) => {
                  setIsOnline(val);
                  try {
                    await fetchWithAuth('/technicians/me/availability', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ is_available: val }),
                    });
                  } catch (e) {
                    setIsOnline(!val); // rollback
                    console.error('Failed to update availability:', e);
                  }
                }}
                trackColor={{ false: '#334155', true: 'rgba(34,197,94,0.3)' }}
                thumbColor={isOnline ? '#22c55e' : '#555872'}
              />
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="checkmark-done" size={20} color="#22c55e" />
                <Text style={styles.statNumber}>{stats.completed}</Text>
                <Text style={styles.statLabel}>Completados</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="star" size={20} color="#eab308" />
                <Text style={styles.statNumber}>{(stats.rating || 0).toFixed(1)}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="cash" size={20} color="#f59e0b" />
                <Text style={[styles.statNumber, { fontSize: 16 }]}>${earnings.total.toLocaleString('es-CO')}</Text>
                <Text style={styles.statLabel}>Cobrado</Text>
              </View>
            </View>

            {/* Active Service */}
            {myActiveService && (
              <TouchableOpacity
                style={styles.activeCard}
                onPress={() => router.push(`/(tech)/service/${myActiveService.id}` as any)}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['rgba(139,92,246,0.15)', 'rgba(99,102,241,0.1)']} style={styles.activeCardGradient}>
                  <View style={styles.activeCardHeader}>
                    <View style={styles.liveBadge}>
                      <View style={styles.livePulse} />
                      <Text style={styles.liveText}>SERVICIO ACTIVO</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#8b5cf6" />
                  </View>
                  <Text style={styles.activeCardTitle}>{myActiveService.title}</Text>
                  <View style={styles.activeCardMeta}>
                    <Ionicons name="location" size={14} color="#555872" />
                    <Text style={styles.activeCardLocation}>{myActiveService.service_city || myActiveService.service_address}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Available Services */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Servicios Disponibles</Text>
              <Text style={styles.sectionCount}>{availableServices.length}</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.serviceCard}>
            <View style={styles.cardRow}>
              <Text style={styles.cardEmoji}>{typeEmoji[item.service_type] || '🔧'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={styles.cardMeta}>
                  <Ionicons name="location-outline" size={13} color="#555872" />
                  <Text style={styles.cardMetaText}>{item.service_city || 'Sin ubicación'}</Text>
                </View>
              </View>
              {item.estimated_price && (
                <Text style={styles.cardPrice}>${item.estimated_price.toLocaleString('es-CO')}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptService(item.id)} activeOpacity={0.8}>
              <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.acceptGradient}>
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.acceptText}>Aceptar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>{isOnline ? '📭' : '😴'}</Text>
            <Text style={styles.emptyTitle}>{isOnline ? 'Sin servicios disponibles' : 'Estás fuera de línea'}</Text>
            <Text style={styles.emptySubtitle}>{isOnline ? 'Espera nuevas solicitudes de clientes' : 'Activa tu estado para recibir servicios'}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810', paddingTop: 60 },
  centered: { flex: 1, backgroundColor: '#050810', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 24 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  greeting: { color: '#f0f0f5', fontSize: 20, fontWeight: '700' },
  role: { color: '#555872', fontSize: 13, marginTop: 4 },
  toggleCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 24, backgroundColor: 'rgba(10,14,28,0.85)', borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  onlineDot: { width: 12, height: 12, borderRadius: 6 },
  toggleText: { color: '#f0f0f5', fontSize: 16, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: 'rgba(10,14,28,0.85)', borderRadius: 20, padding: 20, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  statNumber: { color: '#f0f0f5', fontSize: 24, fontWeight: '800' },
  statLabel: { color: '#555872', fontSize: 12 },
  activeCard: { marginHorizontal: 24, marginBottom: 24, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  activeCardGradient: { padding: 20 },
  activeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(139,92,246,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8b5cf6' },
  liveText: { color: '#8b5cf6', fontSize: 11, fontWeight: '800' },
  activeCardTitle: { color: '#f0f0f5', fontSize: 18, fontWeight: '700' },
  activeCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  activeCardLocation: { color: '#555872', fontSize: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  sectionTitle: { color: '#f0f0f5', fontSize: 18, fontWeight: '700' },
  sectionCount: { color: '#8b5cf6', fontSize: 16, fontWeight: '700' },
  serviceCard: { backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 20, padding: 20, marginBottom: 16, marginHorizontal: 24, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  cardEmoji: { fontSize: 28 },
  cardTitle: { color: '#f0f0f5', fontSize: 16, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  cardMetaText: { color: '#555872', fontSize: 13 },
  cardPrice: { color: '#22c55e', fontSize: 18, fontWeight: '800' },
  acceptBtn: { borderRadius: 16, overflow: 'hidden' },
  acceptGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16 },
  acceptText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: '#f0f0f5', fontSize: 18, fontWeight: '700' },
  emptySubtitle: { color: '#555872', fontSize: 14, marginTop: 8, textAlign: 'center' },
});

