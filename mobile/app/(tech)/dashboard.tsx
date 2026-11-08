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
  getMyDispatchOffers,
  acceptDispatchOffer,
  rejectDispatchOffer,
  getDemandHotspots,
  DispatchOffer,
  DemandHotspot,
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
  oil_change:          { icon: 'water', color: '#f59e0b' },
  tire_change:         { icon: 'disc', color: '#fb923c' },
  battery_service:     { icon: 'battery-charging', color: '#34d399' },
  brake_service:       { icon: 'hand-left', color: '#fb7185' },
  chain_kit_service:   { icon: 'link', color: '#a855f7' },
  spark_bulbs_wipers:  { icon: 'bulb', color: '#facc15' },
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
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'installations' | 'mechanics'>('all');
  const [showBasicCoursesModal, setShowBasicCoursesModal] = useState(false);
  const [coursesModalMode, setCoursesModalMode] = useState<'intro' | 'gate'>('intro');
  const [canOperateCourses, setCanOperateCourses] = useState<boolean>(true);

  // Estados de despacho inteligente en vivo
  const [dispatchOffers, setDispatchOffers] = useState<DispatchOffer[]>([]);
  const [demandHotspots, setDemandHotspots] = useState<DemandHotspot[]>([]);
  const [isDispatchProcessing, setIsDispatchProcessing] = useState(false);
  const [offerCountdowns, setOfferCountdowns] = useState<Record<string, number>>({});

  // Countdown timer para ofertas prioritarias
  useEffect(() => {
    const initialTimers: Record<string, number> = {};
    dispatchOffers.forEach((o) => {
      const remaining = o.time_left_seconds !== undefined && o.time_left_seconds !== null
        ? Math.max(0, o.time_left_seconds)
        : 60;
      initialTimers[o.id] = remaining;
    });
    setOfferCountdowns(initialTimers);

    const interval = setInterval(() => {
      setOfferCountdowns((prev) => {
        const next: Record<string, number> = {};
        let changed = false;
        Object.keys(prev).forEach((id) => {
          const cur = prev[id];
          const n = cur > 0 ? cur - 1 : 0;
          next[id] = n;
          if (n !== cur) changed = true;
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [dispatchOffers]);

  const loadDispatch = useCallback(async () => {
    if (!isOnline) return;
    try {
      const [offersRes, spotsRes] = await Promise.all([
        getMyDispatchOffers().catch(() => ({ offers: [], total: 0 })),
        getDemandHotspots().catch(() => ({ hotspots: [], total: 0 })),
      ]);
      setDispatchOffers(offersRes.offers || []);
      setDemandHotspots(spotsRes.hotspots || []);
    } catch (e) {
      console.error('Error fetching dispatch on mobile:', e);
    }
  }, [isOnline]);

  useEffect(() => {
    loadDispatch();
    if (!isOnline) return;
    const interval = setInterval(() => {
      loadDispatch();
    }, 8000);
    return () => clearInterval(interval);
  }, [loadDispatch, isOnline]);

  const handleAcceptOffer = async (offerId: string) => {
    if (!canOperateCourses && user?.role !== 'reaction_team') {
      setCoursesModalMode('gate');
      setShowBasicCoursesModal(true);
      return;
    }
    try {
      setIsDispatchProcessing(true);
      const res = await acceptDispatchOffer(offerId);
      Alert.alert('¡Misión Táctica Aceptada!', 'Despacho confirmado en tiempo real.', [
        {
          text: 'Abrir Misión',
          onPress: () => router.push(`/(tech)/service/${res.service_id}` as any),
        },
      ]);
      load();
      loadDispatch();
    } catch (e: any) {
      if (e?.message?.includes('MANUAL_DISPATCH_MODE')) { Alert.alert('Asignación por tu Taller', 'Tu taller tiene activo el despacho manual. Solicítale al administrador de tu taller que te asigne este servicio.'); return; }
      if (e?.message?.includes('COURSE_REQUIRED')) {
        setCoursesModalMode('gate');
        setShowBasicCoursesModal(true);
        return;
      }
      Alert.alert('No se pudo tomar la oferta', e.message || 'La oferta pudo expirar o fue tomada por otro técnico.');
      loadDispatch();
    } finally {
      setIsDispatchProcessing(false);
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    try {
      setIsDispatchProcessing(true);
      await rejectDispatchOffer(offerId);
      setDispatchOffers((prev) => prev.filter((o) => o.id !== offerId));
    } catch (e: any) {
      console.error('Error rejecting dispatch offer:', e);
    } finally {
      setIsDispatchProcessing(false);
    }
  };

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

      // Active course in Escuela Tec & onboarding gate status
      try {
        const [courses, gateRes] = await Promise.all([
          getMyCoursesList().catch(() => []),
          fetchWithAuth('/courses/onboarding-status').catch(() => null),
        ]);
        const uncompleted = (courses || []).find((c: any) => !c.quiz_passed) || (courses || [])[0];
        setActiveCourse(uncompleted || null);
        if (gateRes && gateRes.ok) {
          const gateData = await gateRes.json();
          setCanOperateCourses(Boolean(gateData.can_operate));
        }
      } catch (_) {}
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleAcceptService = async (serviceId: string) => {
    if (!canOperateCourses && user?.role !== 'reaction_team') {
      setCoursesModalMode('gate');
      setShowBasicCoursesModal(true);
      return;
    }
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
      if (e?.message?.includes('MANUAL_DISPATCH_MODE')) { Alert.alert('Asignación por tu Taller', 'Tu taller tiene activo el despacho manual. Solicítale al administrador de tu taller que te asigne este servicio.'); return; }
      if (e?.message?.includes('COURSE_REQUIRED')) {
        setCoursesModalMode('gate');
        setShowBasicCoursesModal(true);
        return;
      }
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
        data={isOnline ? availableServices.filter((s: any) => {
          const isMechanics = ['oil_change', 'tire_change', 'battery_service', 'brake_service', 'chain_kit_service', 'spark_bulbs_wipers'].includes(s.service_type) || s.service_metadata?.service_category === 'quick_mechanics';
          if (categoryFilter === 'mechanics') return isMechanics;
          if (categoryFilter === 'installations') return !isMechanics;
          return true;
        }) : []}
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
                <Text style={styles.role}>{user?.organization?.name ? `Técnico certificado • ${user.organization.name}` : 'Técnico certificado'}</Text>
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

            {/* Ofertas prioritarias de despacho inteligente */}
            {isOnline && dispatchOffers.filter(o => o.status === 'pending' && (offerCountdowns[o.id] ?? 1) > 0).map((offer) => {
              const secondsLeft = offerCountdowns[offer.id] ?? (offer.time_left_seconds || 60);
              const isUrgent = secondsLeft <= 15;
              const formattedPrice = offer.estimated_price
                ? `${offer.estimated_price.toLocaleString('es-CO')}`
                : null;

              return (
                <View key={offer.id} style={[styles.priorityOfferCard, isUrgent && styles.priorityOfferCardUrgent]}>
                  {/* Top Bar Indicator */}
                  <View style={styles.priorityOfferHeader}>
                    <View style={styles.priorityOfferBadge}>
                      <Ionicons name="flash" size={13} color="#000" />
                      <Text style={styles.priorityOfferBadgeText}>MISIÓN PRIORITARIA</Text>
                    </View>
                    <View style={styles.waveBadge}>
                      <Text style={styles.waveBadgeText}>OLA {offer.wave}</Text>
                    </View>
                    <View style={[styles.countdownBadge, isUrgent && styles.countdownBadgeUrgent]}>
                      <Ionicons name="time-outline" size={13} color={isUrgent ? '#fff' : COLORS.yellow} />
                      <Text style={[styles.countdownText, isUrgent && styles.countdownTextUrgent]}>
                        {secondsLeft}s
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.priorityOfferTitle} numberOfLines={2}>
                    {offer.service_title || 'Servicio Táctico Asignado'}
                  </Text>

                  <View style={styles.priorityOfferMetaRow}>
                    <Ionicons name="location" size={14} color={COLORS.yellow} />
                    <Text style={styles.priorityOfferLocation} numberOfLines={1}>
                      {offer.service_address || 'Medellín, Antioquia'}{offer.service_city ? `, ${offer.service_city}` : ''}
                    </Text>
                  </View>

                  <View style={styles.priorityOfferDetailsRow}>
                    {offer.distance_km !== null && offer.distance_km !== undefined && (
                      <View style={styles.detailChip}>
                        <Ionicons name="navigate-outline" size={12} color={COLORS.blue} />
                        <Text style={styles.detailChipText}>{offer.distance_km.toFixed(1)} km</Text>
                      </View>
                    )}
                    {offer.vehicle_plate && (
                      <View style={styles.detailChip}>
                        <Ionicons name="car-outline" size={12} color={COLORS.textSecondary} />
                        <Text style={styles.detailChipText}>{offer.vehicle_plate.toUpperCase()}</Text>
                      </View>
                    )}
                    {formattedPrice && (
                      <View style={[styles.detailChip, styles.detailChipPrice]}>
                        <Text style={styles.priceChipText}>{formattedPrice}</Text>
                      </View>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={styles.priorityOfferActions}>
                    <TouchableOpacity
                      disabled={isDispatchProcessing}
                      onPress={() => handleRejectOffer(offer.id)}
                      style={styles.rejectBtn}
                    >
                      <Text style={styles.rejectBtnText}>Declinar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={isDispatchProcessing}
                      onPress={() => handleAcceptOffer(offer.id)}
                      style={styles.acceptBtn}
                    >
                      {isDispatchProcessing ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={16} color="#000" />
                          <Text style={styles.acceptBtnText}>Aceptar Misión</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {/* Zonas Calientes de Demanda (Hotspots) */}
            {isOnline && demandHotspots.length > 0 && (
              <View style={styles.hotspotsCard}>
                <View style={styles.hotspotsHeader}>
                  <Ionicons name="flame" size={16} color="#f59e0b" />
                  <Text style={styles.hotspotsTitle}>Zonas con Alta Demanda</Text>
                  <View style={styles.hotspotLiveBadge}>
                    <Text style={styles.hotspotLiveText}>EN VIVO</Text>
                  </View>
                </View>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={demandHotspots}
                  keyExtractor={(item, index) => index.toString()}
                  contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                  renderItem={({ item }) => (
                    <View style={[styles.hotspotPill, item.urgency_level === 'high' && styles.hotspotPillHigh]}>
                      <Text style={styles.hotspotZone}>{item.zone_name}</Text>
                      <Text style={styles.hotspotCount}>{item.active_requests_count} solicitudes</Text>
                    </View>
                  )}
                />
              </View>
            )}

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
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 }}>
              {[
                { key: 'all', label: 'Todos' },
                { key: 'installations', label: '📡 Instalaciones' },
                { key: 'mechanics', label: '🔩 Mecánica Rápida' },
              ].map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setCategoryFilter(cat.key as any)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: categoryFilter === cat.key ? COLORS.primary : COLORS.surface,
                    borderWidth: 1,
                    borderColor: categoryFilter === cat.key ? COLORS.primaryLight : 'rgba(255,255,255,0.08)',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: categoryFilter === cat.key ? '#fff' : COLORS.textSecondary }}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ display: 'none' }}>
              <View style={styles.countWell}>
                <Text style={styles.sectionCount}>{isOnline ? availableServices.length : 0}</Text>
              </View>
            </View>
          </>
        }
        renderItem={({ item }) => {
          const t = typeIcon[item.service_type] || typeIcon.other;
          const isMechanics = (item.service_metadata?.service_category === 'quick_mechanics') || ['oil_change', 'tire_change', 'battery_service', 'brake_service', 'chain_kit_service', 'spark_bulbs_wipers'].includes(item.service_type);
          return (
            <View style={styles.serviceCard}>
              <View style={styles.cardRow}>
                <NeuIcon name={t.icon} color={t.color} size={46} inset />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  {item.service_metadata?.supplies_provider && (
                    <Text style={{ color: isMechanics ? '#fbbf24' : '#60a5fa', fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                      {isMechanics
                        ? (item.service_metadata.supplies_provider === 'client' ? '🧰 Cliente pone repuesto' : '🚚 Técnico lleva repuesto')
                        : (item.service_metadata.supplies_provider === 'client' ? '🧰 Cliente tiene equipo' : '📦 Técnico lleva equipo')}
                      {item.service_metadata.supplies_notes ? ` · ${item.service_metadata.supplies_notes}` : ''}
                    </Text>
                  )}
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
        mode={coursesModalMode}
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

  // Dispatch Priority Offer Styles
  priorityOfferCard: {
    ...NEU.raised,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: RADIUS.xl,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
  },
  priorityOfferCardUrgent: {
    borderColor: '#ef4444',
    backgroundColor: '#1f1315',
  },
  priorityOfferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  priorityOfferBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityOfferBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  waveBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  waveBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  countdownBadgeUrgent: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  countdownText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '800',
  },
  countdownTextUrgent: {
    color: '#fff',
  },
  priorityOfferTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 6,
  },
  priorityOfferMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  priorityOfferLocation: {
    color: '#cbd5e1',
    fontSize: 13,
    flex: 1,
  },
  priorityOfferDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  detailChipText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  detailChipPrice: {
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderColor: 'rgba(52,211,153,0.3)',
  },
  priceChipText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '800',
  },
  priorityOfferActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rejectBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  acceptBtn: {
    ...NEU.raised,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
  },
  acceptBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // Hotspots Card
  hotspotsCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  hotspotsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  hotspotsTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  hotspotLiveBadge: {
    backgroundColor: 'rgba(245,158,11,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  hotspotLiveText: {
    color: '#f59e0b',
    fontSize: 9,
    fontWeight: '800',
  },
  hotspotPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  hotspotPillHigh: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  hotspotZone: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  hotspotCount: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
});
