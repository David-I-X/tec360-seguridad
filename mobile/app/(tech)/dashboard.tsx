import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Switch, Image, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import {
  fetchWithAuth,
  getMyCoursesList,
  API_URL,
  hasSeenBasicCoursesModal,
  markSeenBasicCoursesModal,
} from '@/lib/api';
import { COLORS, NEU, RADIUS } from '@/constants/theme';
import { NeuIcon, NeuButton } from '@/components/neu';
import { BasicCoursesModal } from '@/components/BasicCoursesModal';

type IconName = keyof typeof Ionicons.glyphMap;

const typeIcon: Record<string, { icon: IconName; color: string }> = {
  camera_installation: { icon: 'videocam', color: '#c084fc' },
  camera_maintenance:  { icon: 'videocam', color: '#c084fc' },
  alarm_installation:  { icon: 'notifications', color: COLORS.yellow },
  alarm_maintenance:   { icon: 'notifications', color: COLORS.yellow },
  gps_installation:    { icon: 'radio', color: COLORS.blue },
  gps_maintenance:     { icon: 'radio', color: COLORS.blue },
  vehicle_recovery:    { icon: 'shield-half', color: COLORS.red },
  other:               { icon: 'construct', color: COLORS.textSecondary },
};

export default function TechDashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ isNewTech?: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [myActiveService, setMyActiveService] = useState<any>(null);
  const [stats, setStats] = useState({ completed: 0, rating: 0 });
  const [earnings, setEarnings] = useState({ total: 0, pending: 0 });
  const [activeCourse, setActiveCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [showBasicCoursesModal, setShowBasicCoursesModal] = useState(false);

  // Check if newly registered technician should see the basic courses modal
  useEffect(() => {
    async function checkIntroModal() {
      if (!user?.id) return;
      const alreadySeen = await hasSeenBasicCoursesModal(user.id);
      if (params.isNewTech === '1' || !alreadySeen) {
        setShowBasicCoursesModal(true);
      }
    }
    checkIntroModal();
  }, [user?.id, params.isNewTech]);

  const handleDismissIntroModal = async () => {
    setShowBasicCoursesModal(false);
    if (user?.id) {
      await markSeenBasicCoursesModal(user.id);
    }
  };

  const handleStartIntroCourse = async () => {
    setShowBasicCoursesModal(false);
    if (user?.id) {
      await markSeenBasicCoursesModal(user.id);
    }
    router.push('/(tech)/escuela/fundamentos-instalacion-seguridad' as any);
  };

  const handleViewAllIntroCourses = async () => {
    setShowBasicCoursesModal(false);
    if (user?.id) {
      await markSeenBasicCoursesModal(user.id);
    }
    router.push('/(tech)/escuela' as any);
  };

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
      const completed = myServices.filter((s: any) => ['completed', 'confirmed'].includes(s.status)).length;
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

      // Active course in Escuela Tec
      try {
        const courses = await getMyCoursesList();
        const uncompleted = (courses || []).find((c: any) => !c.quiz_passed) || (courses || [])[0];
        setActiveCourse(uncompleted || null);
      } catch (_) {}
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleAcceptService = async (serviceId: string) => {
    setAcceptingId(serviceId);
    try {
      const res = await fetchWithAuth(`/services/${serviceId}/accept`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'No se pudo aceptar el servicio');
      }
      load(); // Reload
      Alert.alert('¡Servicio Aceptado!', 'El servicio ha sido asignado a tu cuenta.');
    } catch (e: any) {
      Alert.alert('No se pudo aceptar', e.message || 'Error al aceptar el servicio');
    } finally {
      setAcceptingId(null);
    }
  };

  const staticUrl = API_URL.replace(/\/api\/?$/, '');

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <FlatList
        data={isOnline ? availableServices : []}
        keyExtractor={item => item.id?.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} colors={[COLORS.primary]} progressBackgroundColor={COLORS.surface} />}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.avatarRing}>
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url.startsWith('http') ? user.avatar_url : `${staticUrl}${user.avatar_url}` }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarText}>{user?.full_name?.[0] || 'T'}</Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.greeting} numberOfLines={1}>Hola, {user?.full_name?.split(' ')[0]}</Text>
                <Text style={styles.role}>Técnico certificado</Text>
              </View>
            </View>

            {/* Availability: the one control a technician touches every shift */}
            <View style={styles.toggleCard}>
              <View style={[styles.statusWell, isOnline && styles.statusWellOn]}>
                <View style={[styles.onlineDot, { backgroundColor: isOnline ? COLORS.green : COLORS.textMuted }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleText}>{isOnline ? 'En línea' : 'Fuera de línea'}</Text>
                <Text style={styles.toggleHint}>{isOnline ? 'Recibes solicitudes cercanas' : 'No recibirás solicitudes'}</Text>
              </View>
              <Switch
                value={isOnline}
                accessibilityLabel="Disponibilidad para recibir servicios"
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
                trackColor={{ false: COLORS.sunken, true: 'rgba(52,211,153,0.35)' }}
                thumbColor={isOnline ? COLORS.green : COLORS.textMuted}
                ios_backgroundColor={COLORS.sunken}
              />
            </View>

            {/* Shift summary: one carved panel, three readings */}
            <View style={styles.statsPanel}>
              <View style={styles.statCell}>
                <Text style={styles.statNumber}>{stats.completed}</Text>
                <Text style={styles.statLabel}>Completados</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color={COLORS.yellow} />
                  <Text style={styles.statNumber}>{(stats.rating || 0).toFixed(1)}</Text>
                </View>
                <Text style={styles.statLabel}>Calificación</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={[styles.statNumber, styles.statMoney]} numberOfLines={1} adjustsFontSizeToFit>
                  ${earnings.total.toLocaleString('es-CO')}
                </Text>
                <Text style={styles.statLabel}>Cobrado</Text>
              </View>
            </View>

            {/* Active Service or Escuela Tec Learning Hub */}
            {myActiveService ? (
              <TouchableOpacity
                style={styles.activeCard}
                onPress={() => router.push(`/(tech)/service/${myActiveService.id}` as any)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Abrir servicio en curso: ${myActiveService.title}`}
              >
                <NeuIcon name="navigate" color={COLORS.primaryLight} size={48} inset />
                <View style={{ flex: 1 }}>
                  <View style={styles.liveBadge}>
                    <View style={styles.livePulse} />
                    <Text style={styles.liveText}>En curso</Text>
                  </View>
                  <Text style={styles.activeCardTitle} numberOfLines={1}>{myActiveService.title}</Text>
                  <View style={styles.activeCardMeta}>
                    <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
                    <Text style={styles.activeCardLocation} numberOfLines={1}>{myActiveService.service_city || myActiveService.service_address}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.primaryLight} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.learningCard}
                onPress={() => {
                  if (activeCourse?.course?.slug) {
                    router.push(`/(tech)/escuela/${activeCourse.course.slug}` as any);
                  } else {
                    router.push('/(tech)/escuela' as any);
                  }
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Abrir Escuela Tec"
              >
                <NeuIcon name="school" color={COLORS.primaryLight} size={46} inset />
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.learningTagRow}>
                    <View style={styles.learningBadge}>
                      <Ionicons name="sparkles" size={10} color={COLORS.yellow} />
                      <Text style={styles.learningBadgeText}>
                        {activeCourse ? 'Capacitación en curso' : 'Campus Técnico'}
                      </Text>
                    </View>
                    {activeCourse?.progress_pct ? (
                      <Text style={styles.learningPctText}>{Math.round(activeCourse.progress_pct)}%</Text>
                    ) : (
                      <Text style={styles.learningPtsText}>+40 pts rango</Text>
                    )}
                  </View>
                  <Text style={styles.learningTitle} numberOfLines={1}>
                    {activeCourse?.course?.title || 'Escuela Tec · Sube a Rango Élite'}
                  </Text>
                  <Text style={styles.learningSubtitle} numberOfLines={1}>
                    {activeCourse
                      ? `${activeCourse.completed_lessons || 0} de ${activeCourse.course?.lessons_count || 0} lecciones completadas`
                      : 'Certifícate en GPS 4G, dashcams HD y redes CAN-Bus'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.primaryLight} />
              </TouchableOpacity>
            )}

            {/* Available Services */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Servicios disponibles</Text>
              <View style={styles.countWell}>
                <Text style={styles.sectionCount}>{isOnline ? availableServices.length : 0}</Text>
              </View>
            </View>
          </>
        }
        renderItem={({ item }) => {
          const t = typeIcon[item.service_type] || typeIcon.other;
          return (
            <View style={styles.serviceCard}>
              <View style={styles.cardRow}>
                <NeuIcon name={t.icon} color={t.color} size={46} inset />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.cardMeta}>
                    <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
                    <Text style={styles.cardMetaText}>{item.service_city || 'Sin ubicación'}</Text>
                    {(item.scheduled_date || item.requested_date || item.created_at) && (
                      <>
                        <Text style={styles.cardMetaSep}>·</Text>
                        <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
                        <Text style={styles.cardMetaText}>
                          {new Date(item.scheduled_date || item.requested_date || item.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                {item.estimated_price && (
                  <Text style={styles.cardPrice}>${item.estimated_price.toLocaleString('es-CO')}</Text>
                )}
              </View>
              <NeuButton
                label="Aceptar servicio"
                icon="checkmark-circle"
                loading={acceptingId === item.id}
                onPress={() => handleAcceptService(item.id)}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <NeuIcon name={isOnline ? 'file-tray-outline' : 'moon-outline'} color={COLORS.textSecondary} size={76} inset />
            <Text style={styles.emptyTitle}>{isOnline ? 'Sin servicios disponibles' : 'Estás fuera de línea'}</Text>
            <Text style={styles.emptySubtitle}>{isOnline ? 'Te avisaremos apenas un cliente cercano solicite un servicio.' : 'Activa tu disponibilidad para empezar a recibir servicios.'}</Text>
          </View>
        }
      />

      <BasicCoursesModal
        visible={showBasicCoursesModal}
        onDismiss={handleDismissIntroModal}
        onStartCourse={handleStartIntroCourse}
        onViewAllCourses={handleViewAllIntroCourses}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, marginBottom: 28 },
  avatarRing: { ...NEU.raisedSm, width: 60, height: 60, borderRadius: 30, padding: 4 },
  avatar: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden' },
  avatarFallback: { backgroundColor: COLORS.primaryDark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.onPrimary, fontSize: 20, fontWeight: '800' },
  greeting: { color: COLORS.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  role: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },

  toggleCard: { ...NEU.raised, flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 24, borderRadius: RADIUS.xl, padding: 18, marginBottom: 20 },
  statusWell: { ...NEU.inset, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statusWellOn: { backgroundColor: '#13221D' },
  onlineDot: { width: 12, height: 12, borderRadius: 6 },
  toggleText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  toggleHint: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },

  statsPanel: { ...NEU.inset, flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, borderRadius: RADIUS.xl, paddingVertical: 18, marginBottom: 24 },
  statCell: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 6 },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: COLORS.border },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statNumber: { color: COLORS.text, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statMoney: { fontSize: 18 },
  statLabel: { color: COLORS.textSecondary, fontSize: 12 },

  activeCard: { ...NEU.raised, flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 24, marginBottom: 28, borderRadius: RADIUS.xl, padding: 16 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  livePulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.green },
  liveText: { color: COLORS.green, fontSize: 12, fontWeight: '700' },
  activeCardTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  activeCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  activeCardLocation: { color: COLORS.textSecondary, fontSize: 13, flexShrink: 1 },

  learningCard: {
    ...NEU.raised,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 24,
    marginBottom: 28,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.22)',
  },
  learningTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  learningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139,92,246,0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  learningBadgeText: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '700',
  },
  learningPctText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '800',
  },
  learningPtsText: {
    color: COLORS.yellow,
    fontSize: 10,
    fontWeight: '800',
  },
  learningTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  learningSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  countWell: { ...NEU.inset, minWidth: 34, height: 28, borderRadius: 14, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  sectionCount: { color: COLORS.primaryLight, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },

  serviceCard: { ...NEU.raised, borderRadius: RADIUS.xl, padding: 18, marginBottom: 20, marginHorizontal: 24 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  cardMetaText: { color: COLORS.textSecondary, fontSize: 13 },
  cardMetaSep: { color: COLORS.textMuted, marginHorizontal: 2 },
  cardPrice: { color: COLORS.green, fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },

  emptyContainer: { alignItems: 'center', paddingTop: 36, paddingHorizontal: 32, gap: 6 },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginTop: 18 },
  emptySubtitle: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
