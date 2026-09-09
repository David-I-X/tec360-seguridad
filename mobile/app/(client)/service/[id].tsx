import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Linking, Dimensions, Platform, Alert, RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Polyline, UrlTile, PROVIDER_GOOGLE } from 'react-native-maps';
import { getServiceById, getAuthToken, API_URL, fetchWithAuth } from '@/lib/api';
import { serviceWebSocket } from '@/lib/websocket';
import { ServicePinMarker, TechnicianPinMarker } from '@/components/map-markers';
import RatingModal from '@/components/rating-modal';
import PaymentModal from '@/components/payment-modal';
import { COLORS, SPACING, RADIUS, FONTS } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Status stepper config ───────────────────────
const SERVICE_STEPS = [
  { key: 'assigned', label: 'Técnico asignado', icon: 'notifications-outline', detail: 'Tu técnico aceptó el servicio' },
  { key: 'en_route', label: 'En camino', icon: 'navigate-outline', detail: 'El técnico está en ruta satelital' },
  { key: 'arrived', label: 'Llegó al sitio', icon: 'location-outline', detail: 'El técnico está en tu ubicación' },
  { key: 'in_progress', label: 'En progreso', icon: 'construct-outline', detail: 'El servicio está ejecutándose' },
  { key: 'completed', label: 'Completado', icon: 'checkmark-circle-outline', detail: '¡Servicio terminado exitosamente!' },
];

const statusInfo: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: 'Pendiente', color: '#f59e0b', icon: 'time-outline' },
  quoted: { label: 'Con Cotizaciones', color: '#818cf8', icon: 'document-text-outline' },
  assigned: { label: 'Asignado', color: '#60a5fa', icon: 'person-outline' },
  en_route: { label: 'En camino', color: '#38bdf8', icon: 'navigate-outline' },
  arrived: { label: 'Llegó al sitio', color: '#fb923c', icon: 'location-outline' },
  in_progress: { label: 'En Progreso', color: '#c084fc', icon: 'construct-outline' },
  completed: { label: 'Completado', color: '#34d399', icon: 'checkmark-circle-outline' },
  confirmed: { label: 'Confirmado', color: '#34d399', icon: 'checkmark-circle' },
  cancelled: { label: 'Cancelado', color: '#f87171', icon: 'close-circle-outline' },
};

function formatDetailedDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const dateFormatted = d.toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeFormatted = d.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${dateFormatted} a las ${timeFormatted}`;
  } catch {
    return null;
  }
}

// ─── Fetch real road route from OSRM ───
async function fetchRouteCoordinates(
  originLat: number, originLng: number,
  destLat: number, destLng: number
): Promise<{ coords: { latitude: number; longitude: number }[]; duration: string; distance: string }> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coords = route.geometry.coordinates.map((c: number[]) => ({ latitude: c[1], longitude: c[0] }));
      const mins = Math.round(route.duration / 60);
      const km = (route.distance / 1000).toFixed(1);
      return { coords, duration: `${mins} min`, distance: `${km} km` };
    }
  } catch (e) {
    console.warn('[Route] OSRM fetch failed:', e);
  }
  return { coords: [], duration: '', distance: '' };
}

export default function ServiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [service, setService] = useState<any>(null);
  const [techLocation, setTechLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ duration: string; distance: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRating, setShowRating] = useState(false);
  const [canRate, setCanRate] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSlideExpanded, setIsSlideExpanded] = useState(false);
  const lastRouteFetchRef = useRef<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<MapView | null>(null);

  const handleConfirmPayment = async (method: string) => {
    try {
      await fetchWithAuth(`/services/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: method })
      });
      setService((prev: any) => ({ ...prev, status: 'confirmed' }));
      setCanRate(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo confirmar el servicio');
    }
  };

  const loadService = useCallback(async () => {
    try {
      const data = await getServiceById(id!);
      setService(data.service || data);
    } catch (e) {
      console.error('[ServiceDetail] Error loading service:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadService();
  }, [loadService]);

  // Check if user can rate (for completed services)
  useEffect(() => {
    if (!service || service.status !== 'completed') return;
    (async () => {
      try {
        const res = await fetchWithAuth(`/ratings/services/${id}/can-rate`);
        if (res.ok) {
          const data = await res.json();
          setCanRate(data.can_rate);
          setAlreadyRated(!data.can_rate && data.reason?.includes('ya'));
        }
      } catch {
        setCanRate(true);
      }
    })();
  }, [service, id]);

  // WebSocket for live tracking
  useEffect(() => {
    if (!id) return;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      const token = await getAuthToken();
      if (!token) return;
      serviceWebSocket.connect(id, token);
      unsubscribe = serviceWebSocket.onMessage((msg) => {
        if (msg.type === 'location_update') {
          setTechLocation({ lat: msg.data.lat, lng: msg.data.lng });
        }
        if (msg.type === 'status_update') {
          setService((prev: any) => prev ? { ...prev, status: msg.data.status } : prev);
        }
      });
    })();

    return () => {
      serviceWebSocket.disconnect();
      unsubscribe?.();
    };
  }, [id]);

  // Fetch real road route when tech location updates
  useEffect(() => {
    if (!techLocation || !service?.service_lat || !service?.service_lon) return;

    if (lastRouteFetchRef.current) {
      const dlat = Math.abs(techLocation.lat - lastRouteFetchRef.current.lat);
      const dlng = Math.abs(techLocation.lng - lastRouteFetchRef.current.lng);
      if (dlat < 0.002 && dlng < 0.002) return;
    }

    lastRouteFetchRef.current = { ...techLocation };

    (async () => {
      const result = await fetchRouteCoordinates(
        techLocation.lat, techLocation.lng,
        service.service_lat, service.service_lon
      );
      if (result.coords.length > 0) {
        setRouteCoords(result.coords);
        setRouteInfo({ duration: result.duration, distance: result.distance });
      }
    })();
  }, [techLocation, service?.service_lat, service?.service_lon]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando telemetría del servicio...</Text>
      </View>
    );
  }

  const tech = service?.technician;
  const staticUrl = API_URL.replace(/\/api\/?$/, '');
  const isLive = ['assigned', 'en_route', 'arrived', 'in_progress'].includes(service?.status);
  const isTrackingStatus = ['en_route', 'in_progress'].includes(service?.status);

  const hasServiceCoords = service?.service_lat != null && service?.service_lon != null
    && (service.service_lat !== 0 || service.service_lon !== 0);
  const serviceLat = hasServiceCoords ? service.service_lat : 6.2518;
  const serviceLng = hasServiceCoords ? service.service_lon : -75.5636;
  const si = statusInfo[service?.status] || statusInfo.pending;

  const formattedDate = formatDetailedDate(service?.scheduled_date || service?.requested_date || service?.created_at);
  const formattedPrice = service?.estimated_price
    ? `$${Number(service.estimated_price).toLocaleString('es-CO')}`
    : null;

  const getRegion = () => {
    if (techLocation) {
      const midLat = (techLocation.lat + serviceLat) / 2;
      const midLng = (techLocation.lng + serviceLng) / 2;
      const deltaLat = Math.abs(techLocation.lat - serviceLat) * 1.6 || 0.02;
      const deltaLng = Math.abs(techLocation.lng - serviceLng) * 1.6 || 0.02;
      return {
        latitude: midLat,
        longitude: midLng,
        latitudeDelta: Math.max(deltaLat, 0.015),
        longitudeDelta: Math.max(deltaLng, 0.015),
      };
    }
    return {
      latitude: serviceLat,
      longitude: serviceLng,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    };
  };

  const openInMaps = () => {
    const url = Platform.select({
      ios: `maps:0,0?q=${serviceLat},${serviceLng}`,
      android: `geo:${serviceLat},${serviceLng}?q=${serviceLat},${serviceLng}(Servicio)`,
    });
    if (url) Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      {/* ── 1. FULLSCREEN MAP BACKGROUND ── */}
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? undefined : PROVIDER_GOOGLE}
        style={styles.fullscreenMap}
        initialRegion={getRegion()}
        mapType={Platform.OS === 'android' ? 'none' : 'standard'}
        customMapStyle={darkMapStyle}
      >
        <UrlTile
          urlTemplate="https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          zIndex={-1}
        />

        <Marker
          coordinate={{ latitude: serviceLat, longitude: serviceLng }}
          title="Ubicación del servicio"
          anchor={{ x: 0.5, y: 1 }}
        >
          <ServicePinMarker />
        </Marker>

        {techLocation && (
          <Marker
            coordinate={{ latitude: techLocation.lat, longitude: techLocation.lng }}
            title={tech?.full_name || 'Técnico'}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <TechnicianPinMarker label={tech?.full_name?.split(' ')[0]} />
          </Marker>
        )}

        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#38bdf8"
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* ── 2. FLOATING TOP CONTROLS ── */}
      <View style={styles.topControlBar}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.floatingRoundBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Right Buttons: Google Maps & Slide Drawer Toggle */}
        <View style={styles.topRightRow}>
          {hasServiceCoords && (
            <TouchableOpacity
              style={styles.floatingActionBtn}
              onPress={openInMaps}
              activeOpacity={0.8}
            >
              <Ionicons name="navigate" size={13} color="#fff" />
              <Text style={styles.floatingActionText}>Google Maps</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.floatingActionBtn, styles.floatingToggleBtn]}
            onPress={() => setIsSlideExpanded(prev => !prev)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isSlideExpanded ? "chevron-down" : "reorder-three"}
              size={15}
              color="#fff"
            />
            <Text style={styles.floatingActionText}>
              {isSlideExpanded ? "Minimizar" : "Detalles"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 3. MAP OVERLAYS (ETA, Live Pulse, Legend) ── */}
      {routeInfo && routeInfo.duration && (
        <View style={styles.etaOverlay}>
          <Ionicons name="speedometer-outline" size={14} color="#38bdf8" />
          <Text style={styles.etaText}>{routeInfo.duration}</Text>
          <Text style={styles.etaDivider}>·</Text>
          <Text style={styles.etaDistance}>{routeInfo.distance}</Text>
        </View>
      )}

      {isLive && !techLocation && (
        <View style={styles.trackingOverlay}>
          {isTrackingStatus ? (
            <>
              <ActivityIndicator size="small" color="#f59e0b" />
              <Text style={styles.trackingOverlayText}>
                Esperando ubicación del técnico...
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="time-outline" size={15} color="#94a3b8" />
              <Text style={styles.trackingOverlayText}>
                El técnico aún no inicia ruta
              </Text>
            </>
          )}
        </View>
      )}

      {techLocation && (
        <View style={styles.liveTrackingBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTrackingText}>ENLACE ACTIVO</Text>
        </View>
      )}

      {techLocation && (
        <View style={styles.legendOverlay}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8b5cf6' }]} />
            <Text style={styles.legendText}>Destino</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#38bdf8' }]} />
            <Text style={styles.legendText}>Técnico</Text>
          </View>
        </View>
      )}

      {/* ── 4. SLIDE DRAWER (COLLAPSIBLE BOTTOM SHEET) ── */}
      <View style={[styles.slideSheet, isSlideExpanded ? styles.slideSheetExpanded : styles.slideSheetCollapsed]}>
        {/* Drag Handle Bar */}
        <TouchableOpacity
          style={styles.dragHandleContainer}
          onPress={() => setIsSlideExpanded(prev => !prev)}
          activeOpacity={0.8}
        >
          <View style={styles.dragHandlePill} />
        </TouchableOpacity>

        {/* ── COLLAPSED VIEW: Quick Glance Bar ── */}
        {!isSlideExpanded ? (
          <View style={styles.collapsedContent}>
            <View style={styles.collapsedRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.collapsedBadgeRow}>
                  <View style={[styles.miniStatusDot, { backgroundColor: si.color }]} />
                  <Text style={[styles.miniStatusLabel, { color: si.color }]}>
                    {si.label}
                  </Text>
                  {isLive && (
                    <View style={styles.miniLiveTag}>
                      <Text style={styles.miniLiveText}>EN VIVO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.collapsedTitle} numberOfLines={1}>
                  {service?.title}
                </Text>
                {formattedDate && (
                  <Text style={styles.collapsedDate} numberOfLines={1}>
                    📅 {formattedDate}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                onPress={() => setIsSlideExpanded(true)}
                style={styles.expandBtn}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#8b5cf6', '#7c3aed']}
                  style={styles.expandBtnGradient}
                >
                  <Text style={styles.expandBtnText}>Ver detalles</Text>
                  <Ionicons name="chevron-up" size={16} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ── EXPANDED VIEW: Complete Organized Details ── */
          <ScrollView
            style={styles.expandedScrollView}
            contentContainerStyle={{ paddingBottom: 60 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); loadService(); }}
                tintColor={COLORS.primary}
              />
            }
          >
            {/* Header: Status Tag & Close Button */}
            <View style={styles.expandedHeaderRow}>
              <View style={[styles.statusBanner, { borderColor: `${si.color}40`, backgroundColor: `${si.color}15` }]}>
                <Ionicons name={si.icon} size={18} color={si.color} />
                <Text style={[styles.statusBannerLabel, { color: si.color }]}>
                  {si.label}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.minimizeBtn}
                onPress={() => setIsSlideExpanded(false)}
              >
                <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
                <Text style={styles.minimizeText}>Ver mapa</Text>
              </TouchableOpacity>
            </View>

            {/* Title & Description */}
            <Text style={styles.title}>{service?.title}</Text>
            {service?.description && service.description.toLowerCase() !== 'sin descripción' && (
              <Text style={styles.description}>
                {`"${service.description}"`}
              </Text>
            )}

            {/* Scheduled Date & Time Banner */}
            {formattedDate && (
              <View style={styles.scheduledBanner}>
                <Ionicons name="time" size={18} color="#c084fc" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.scheduledLabel}>CITA PROGRAMADA</Text>
                  <Text style={styles.scheduledValue}>{formattedDate}</Text>
                </View>
              </View>
            )}

            {/* Technician Card */}
            {tech && (
              <View style={styles.techCard}>
                <View style={styles.techGradientBar} />
                <Text style={styles.techCardLabel}>TÉCNICO ASIGNADO</Text>

                <View style={styles.techRow}>
                  {tech.avatar_url ? (
                    <Image
                      source={{ uri: tech.avatar_url.startsWith('http') ? tech.avatar_url : `${staticUrl}${tech.avatar_url}` }}
                      style={styles.techAvatar}
                    />
                  ) : (
                    <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.techAvatar}>
                      <Text style={styles.techInitial}>{(tech.full_name || 'T').charAt(0).toUpperCase()}</Text>
                    </LinearGradient>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.techName}>{tech.full_name || 'Técnico'}</Text>
                    <View style={styles.badgesRow}>
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={12} color="#fbbf24" />
                        <Text style={styles.ratingText}>{Number(tech.average_rating || 5).toFixed(1)}</Text>
                      </View>
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="shield-checkmark" size={12} color="#34d399" />
                        <Text style={styles.verifiedText}>Certificado 360</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.techActions}>
                  <TouchableOpacity
                    style={styles.profileBtn}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/(client)/tech-profile/${tech.id || service?.technician_id}` as any)}
                  >
                    <Text style={styles.profileBtnText}>Perfil</Text>
                  </TouchableOpacity>

                  {tech.phone && (
                    <TouchableOpacity
                      style={styles.callBtnFull}
                      onPress={() => Linking.openURL(`tel:${tech.phone}`)}
                      activeOpacity={0.7}
                    >
                      <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.callBtnGradient}>
                        <Ionicons name="call" size={15} color="#fff" />
                        <Text style={styles.callBtnText}>Llamar</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.callBtnFull}
                    onPress={() => router.push(`/(client)/chat/${id}` as any)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.callBtnGradient}>
                      <Ionicons name="chatbubbles" size={15} color="#fff" />
                      <Text style={styles.callBtnText}>Chat</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Status Timeline Stepper */}
            {isLive && <StatusTimeline status={service?.status} />}

            {/* Info Cards Grid */}
            <View style={styles.infoGrid}>
              <View style={styles.infoCard}>
                <View style={[styles.infoIconBox, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
                  <Ionicons name="location" size={18} color="#8b5cf6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Ubicación del Servicio</Text>
                  <Text style={styles.infoValue} numberOfLines={2}>{service?.service_address || "Sin dirección"}</Text>
                  {service?.service_city && <Text style={styles.infoSub}>{service.service_city}</Text>}
                </View>
                {hasServiceCoords && (
                  <TouchableOpacity onPress={openInMaps} style={styles.mapsSmallBtn}>
                    <Ionicons name="navigate" size={13} color="#38bdf8" />
                  </TouchableOpacity>
                )}
              </View>

              {formattedPrice && (
                <View style={styles.infoCard}>
                  <View style={[styles.infoIconBox, { backgroundColor: 'rgba(52,211,153,0.15)' }]}>
                    <Ionicons name="cash" size={18} color="#34d399" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>Inversión Estimada</Text>
                    <Text style={[styles.infoValue, { color: '#34d399' }]}>{formattedPrice}</Text>
                  </View>
                </View>
              )}

              {service?.vehicle_plate && (
                <View style={styles.infoCard}>
                  <View style={[styles.infoIconBox, { backgroundColor: 'rgba(56,189,248,0.15)' }]}>
                    <Ionicons name="car" size={18} color="#38bdf8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>Vehículo Registrado</Text>
                    <Text style={styles.infoValue}>{service.vehicle_type} {service.vehicle_model}</Text>
                    <Text style={styles.infoSub}>Placa: {service.vehicle_plate}</Text>
                  </View>
                </View>
              )}
            </View>

            {service?.vehicle_photo_url && (
              <Image
                source={{ uri: service.vehicle_photo_url.startsWith('http') ? service.vehicle_photo_url : `${staticUrl}${service.vehicle_photo_url}` }}
                style={styles.vehiclePhoto}
              />
            )}

            {/* Action Buttons: Pending / Quoted */}
            {service?.status === 'pending' && (
              <View style={styles.actionGroup}>
                <TouchableOpacity onPress={() => router.push(`/(client)/quotations/${id}` as any)} activeOpacity={0.8}>
                  <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.actionButton}>
                    <Ionicons name="pricetags" size={18} color="#fff" />
                    <Text style={styles.actionText}>Ver Cotizaciones Disponibles</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Cancelar servicio',
                      '¿Estás seguro de que deseas cancelar este servicio?',
                      [
                        { text: 'No', style: 'cancel' },
                        {
                          text: 'Sí, cancelar',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await fetchWithAuth(`/services/${id}`, { method: 'DELETE' });
                              Alert.alert('Servicio cancelado', 'Tu servicio ha sido cancelado.');
                              router.back();
                            } catch {
                              Alert.alert('Error', 'No se pudo cancelar el servicio.');
                            }
                          },
                        },
                      ]
                    );
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.actionButton, { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }]}>
                    <Ionicons name="close-circle" size={18} color="#ef4444" />
                    <Text style={[styles.actionText, { color: '#ef4444' }]}>Cancelar servicio</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Action Buttons: Completed */}
            {service?.status === 'completed' && (
              <View style={styles.completedBanner}>
                <Text style={{ fontSize: 36, marginBottom: 6 }}>🎉</Text>
                <Text style={{ color: '#34d399', fontSize: 18, fontWeight: '800' }}>¡Servicio completado!</Text>
                <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                  El técnico terminó la instalación. Confirma para cerrar el servicio.
                </Text>
                <TouchableOpacity onPress={() => setShowPaymentModal(true)} activeOpacity={0.8} style={{ marginTop: 14, width: '100%' }}>
                  <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.actionButton}>
                    <Ionicons name="card" size={18} color="#fff" />
                    <Text style={styles.actionText}>Confirmar y Pagar</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {['completed', 'confirmed'].includes(service?.status) && (
              <View style={[styles.completedBanner, { marginTop: 12, backgroundColor: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.25)' }]}>
                {service?.status === 'confirmed' && (
                  <>
                    <Text style={{ fontSize: 32, marginBottom: 4 }}>✅</Text>
                    <Text style={{ color: '#34d399', fontSize: 16, fontWeight: '800' }}>Servicio Confirmado</Text>
                    <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 2 }}>Gracias por confiar en Tec360 Seguridad.</Text>
                  </>
                )}
                {canRate && (
                  <TouchableOpacity onPress={() => setShowRating(true)} activeOpacity={0.8} style={{ marginTop: 12, width: '100%' }}>
                    <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.actionButton}>
                      <Ionicons name="star" size={18} color="#fff" />
                      <Text style={styles.actionText}>Calificar Servicio</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                {alreadyRated && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <Ionicons name="checkmark-circle" size={16} color="#34d399" />
                    <Text style={{ color: '#34d399', fontSize: 12, fontWeight: '600' }}>Ya calificaste este servicio</Text>
                  </View>
                )}
              </View>
            )}

            {/* Support Button (WhatsApp) */}
            <TouchableOpacity
              style={styles.supportBtn}
              onPress={() => Linking.openURL('https://wa.me/573052156601?text=' + encodeURIComponent('Hola, necesito ayuda con mi servicio #' + id))}
              activeOpacity={0.7}
            >
              <View style={styles.supportBtnInner}>
                <Ionicons name="logo-whatsapp" size={20} color="#22c55e" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.supportBtnTitle}>¿Requieres soporte en vivo?</Text>
                  <Text style={styles.supportBtnSub}>Chatea con la central de operaciones</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#555872" />
              </View>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Modals */}
      <RatingModal
        visible={showRating}
        techName={tech?.full_name?.split(' ')[0]}
        onClose={() => setShowRating(false)}
        onSubmit={async (rating, comment) => {
          await fetchWithAuth(`/ratings/services/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating, comment: comment || null }),
          });
          setShowRating(false);
          setCanRate(false);
          setAlreadyRated(true);
          Alert.alert('¡Gracias! 🌟', 'Tu calificación ha sido enviada.');
        }}
      />

      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={service?.estimated_price || 0}
        onConfirm={(method) => handleConfirmPayment(method)}
      />
    </View>
  );
}

// ─── Status Timeline Component ──────────────────
function StatusTimeline({ status }: { status: string }) {
  const currentIndex = SERVICE_STEPS.findIndex(s => s.key === status);
  const activeStep = SERVICE_STEPS[currentIndex];

  return (
    <View style={styles.timelineContainer}>
      {activeStep && (
        <View style={styles.activeStepBanner}>
          <Ionicons name={activeStep.icon as any} size={22} color="#38bdf8" />
          <View style={{ flex: 1 }}>
            <Text style={styles.activeStepLabel}>{activeStep.label}</Text>
            <Text style={styles.activeStepDetail}>{activeStep.detail}</Text>
          </View>
        </View>
      )}

      {SERVICE_STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const upcoming = i > currentIndex;

        return (
          <View key={step.key} style={[styles.stepRow, upcoming && { opacity: 0.35 }]}>
            <View
              style={[
                styles.stepCircle,
                done && { backgroundColor: '#34d399', borderColor: '#34d399' },
                active && { backgroundColor: 'rgba(56,189,248,0.2)', borderColor: '#38bdf8' },
                upcoming && { backgroundColor: 'rgba(85,88,114,0.1)', borderColor: 'rgba(85,88,114,0.3)' },
              ]}
            >
              {done ? (
                <Ionicons name="checkmark" size={13} color="#fff" />
              ) : (
                <Ionicons name={step.icon as any} size={12} color={active ? '#38bdf8' : '#64748b'} />
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                done && { color: '#34d399' },
                active && { color: '#38bdf8' },
                upcoming && { color: '#64748b' },
              ]}
            >
              {step.label}
            </Text>
            {active && <View style={styles.activeDot} />}
          </View>
        );
      })}
    </View>
  );
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#f8fafc' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4f46e5' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#3730a3' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#c7d2fe' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0369a1' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#7dd3fc' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  fullscreenMap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  centered: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.textSecondary, marginTop: 12, fontSize: FONTS.sizes.sm },

  // Top Floating Bar
  topControlBar: {
    position: 'absolute',
    top: 52,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  floatingRoundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(15,23,42,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingToggleBtn: {
    backgroundColor: 'rgba(139,92,246,0.9)',
    borderColor: 'rgba(139,92,246,0.5)',
  },
  floatingActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Map Overlays
  etaOverlay: {
    position: 'absolute',
    top: 104,
    left: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10,14,28,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    zIndex: 15,
  },
  etaText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  etaDivider: { color: COLORS.textMuted, fontSize: 12 },
  etaDistance: { color: COLORS.textSecondary, fontSize: 11 },

  trackingOverlay: {
    position: 'absolute',
    top: 104,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10,14,28,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    zIndex: 15,
  },
  trackingOverlayText: { color: '#f59e0b', fontSize: 10, fontWeight: '700' },

  liveTrackingBadge: {
    position: 'absolute',
    top: 148,
    left: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(52,211,153,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
    zIndex: 15,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399' },
  liveTrackingText: { color: '#34d399', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  legendOverlay: {
    position: 'absolute',
    top: 148,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(10,14,28,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(80,60,160,0.2)',
    zIndex: 15,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendText: { color: COLORS.textSecondary, fontSize: 10 },

  // Slide Drawer / Sheet
  slideSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,14,28,0.95)',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 20,
    zIndex: 30,
  },
  slideSheetCollapsed: {
    height: 140,
    paddingHorizontal: SPACING.md,
  },
  slideSheetExpanded: {
    height: SCREEN_HEIGHT * 0.74,
    paddingHorizontal: SPACING.md,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragHandlePill: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  // Collapsed View
  collapsedContent: {
    flex: 1,
    justifyContent: 'center',
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  collapsedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  miniStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniStatusLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  miniLiveTag: {
    backgroundColor: 'rgba(52,211,153,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
  },
  miniLiveText: {
    color: '#34d399',
    fontSize: 8,
    fontWeight: '800',
  },
  collapsedTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  collapsedDate: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  expandBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  expandBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  expandBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Expanded View
  expandedScrollView: {
    flex: 1,
  },
  expandedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  minimizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
  },
  minimizeText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  statusBannerLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 12,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primaryBorder,
    paddingLeft: 8,
  },
  scheduledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(192,132,252,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.25)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  scheduledLabel: {
    color: '#c084fc',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scheduledValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },

  // Technician Card
  techCard: {
    backgroundColor: 'rgba(18,22,40,0.85)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(80,60,160,0.25)',
    overflow: 'hidden',
  },
  techGradientBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.primary,
  },
  techCardLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  techAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.primaryBorder,
  },
  techInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  techName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
    borderRadius: RADIUS.round,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ratingText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '600',
  },
  techActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  profileBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  callBtnFull: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  callBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
  },
  callBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Status Stepper
  timelineContainer: {
    marginBottom: 14,
  },
  activeStepBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  activeStepLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  activeStepDetail: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38bdf8',
  },

  // Info Grid
  infoGrid: {
    gap: 8,
    marginBottom: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(18,22,40,0.85)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(80,60,160,0.15)',
  },
  infoIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 1,
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  infoSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  mapsSmallBtn: {
    padding: 6,
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
  },
  vehiclePhoto: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    marginBottom: 12,
  },

  // Actions
  actionGroup: {
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 13,
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  completedBanner: {
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(52,211,153,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.25)',
    marginBottom: 10,
  },

  // Support
  supportBtn: {
    marginTop: 6,
    marginBottom: 12,
  },
  supportBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  supportBtnTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  supportBtnSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
});
