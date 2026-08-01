import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Linking, Dimensions, Platform, Alert, RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONTS } from '@/constants/theme';

let MapView: any = View;
let Marker: any = View;
let Polyline: any = View;
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    Polyline = maps.Polyline;
  } catch (e) {}
}
import { useAuth } from '@/lib/auth-context';
import { getServiceById, getAuthToken, API_URL, fetchWithAuth } from '@/lib/api';
import { serviceWebSocket } from '@/lib/websocket';
import { ServicePinMarker, TechnicianPinMarker } from '@/components/map-markers';
import RatingModal from '@/components/rating-modal';
import PaymentModal from '@/components/payment-modal';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Status stepper config ───────────────────────
const SERVICE_STEPS = [
  { key: 'assigned', label: 'Técnico asignado', emoji: '🔔', detail: 'Tu técnico aceptó el servicio' },
  { key: 'en_route', label: 'En camino', emoji: '🚗', detail: 'El técnico está en ruta' },
  { key: 'arrived', label: 'Llegó', emoji: '📍', detail: 'El técnico está en tu ubicación' },
  { key: 'in_progress', label: 'Trabajando', emoji: '🔧', detail: 'El servicio está en progreso' },
  { key: 'completed', label: 'Completado', emoji: '✅', detail: '¡Servicio terminado!' },
];

const statusInfo: Record<string, { label: string; color: string; emoji: string }> = {
  pending: { label: 'Pendiente', color: '#eab308', emoji: '⏳' },
  quoted: { label: 'Cotizado', color: '#a855f7', emoji: '💰' },
  assigned: { label: 'Asignado', color: '#8b5cf6', emoji: '🔔' },
  en_route: { label: 'En camino', color: '#7c3aed', emoji: '🚗' },
  arrived: { label: 'Llegó', color: '#f97316', emoji: '📍' },
  in_progress: { label: 'Trabajando', color: '#a855f7', emoji: '🔧' },
  completed: { label: 'Completado', color: '#22c55e', emoji: '✅' },
  cancelled: { label: 'Cancelado', color: '#ef4444', emoji: '❌' },
};

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
  const lastRouteFetchRef = React.useRef<{ lat: number; lng: number } | null>(null);

  const handleConfirmPayment = async (method: string) => {
    try {
      await fetchWithAuth(`/services/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: method })
      });
      setService((prev: any) => ({ ...prev, status: 'confirmed' }));
      // Update canRate to allow rating if applicable
      setCanRate(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo confirmar el servicio');
    }
  };

  const loadService = useCallback(async () => {
    try {
      const data = await getServiceById(id!);
      setService(data.service || data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); setRefreshing(false); }
  }, [id]);

  useEffect(() => { loadService(); }, [loadService]);

  // Check if user can rate (for completed services)
  useEffect(() => {
    if (!service || service.status !== 'completed') return;
    (async () => {
      try {
        const res = await fetchWithAuth(`/ratings/services/${id}/can-rate`);
        const data = await res.json();
        setCanRate(data.can_rate);
        setAlreadyRated(!data.can_rate && data.reason?.includes('ya'));
      } catch (e) {
        // If endpoint fails, still allow rating attempt
        setCanRate(true);
      }
    })();
  }, [service?.status, id]);

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

    return () => { serviceWebSocket.disconnect(); unsubscribe?.(); };
  }, [id]);

  // ─── Fetch real road route when tech location updates ───
  useEffect(() => {
    if (!techLocation || !service?.service_lat || !service?.service_lon) return;

    // Only re-fetch if moved >200m
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
    return <View style={styles.centered}><ActivityIndicator size="large" color="#8b5cf6" /></View>;
  }

  const tech = service?.technician;
  const staticUrl = API_URL.replace(/\/api\/?$/, '');
  const isLive = ['assigned', 'en_route', 'arrived', 'in_progress'].includes(service?.status);
  const isTrackingStatus = ['en_route', 'in_progress'].includes(service?.status);
  // Use explicit null check — 0.0 is falsy in JS but valid coord
  const hasServiceCoords = service?.service_lat != null && service?.service_lon != null
    && (service.service_lat !== 0 || service.service_lon !== 0);
  const serviceLat = hasServiceCoords ? service.service_lat : 6.2518;
  const serviceLng = hasServiceCoords ? service.service_lon : -75.5636;
  const si = statusInfo[service?.status] || statusInfo.pending;

  const serviceDateObj = service?.scheduled_date || service?.requested_date || service?.created_at;
  const formattedDate = serviceDateObj
    ? `${new Date(serviceDateObj).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })} · ${new Date(serviceDateObj).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}`
    : null;
  const formattedPrice = service?.estimated_price
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(service.estimated_price)
    : null;

  const getRegion = () => {
    if (techLocation) {
      const midLat = (techLocation.lat + serviceLat) / 2;
      const midLng = (techLocation.lng + serviceLng) / 2;
      const deltaLat = Math.abs(techLocation.lat - serviceLat) * 1.6 || 0.02;
      const deltaLng = Math.abs(techLocation.lng - serviceLng) * 1.6 || 0.02;
      return { latitude: midLat, longitude: midLng, latitudeDelta: Math.max(deltaLat, 0.01), longitudeDelta: Math.max(deltaLng, 0.01) };
    }
    return { latitude: serviceLat, longitude: serviceLng, latitudeDelta: 0.015, longitudeDelta: 0.015 };
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
      {/* Map — ALWAYS visible */}
      <MapView
        style={styles.map}
        initialRegion={getRegion()}
        customMapStyle={darkMapStyle}
      >
        <Marker coordinate={{ latitude: serviceLat, longitude: serviceLng }} title="Ubicación del servicio" anchor={{ x: 0.5, y: 1 }}>
          <ServicePinMarker />
        </Marker>
        {techLocation && (
          <Marker coordinate={{ latitude: techLocation.lat, longitude: techLocation.lng }} title={tech?.full_name || 'Técnico'} anchor={{ x: 0.5, y: 0.5 }}>
            <TechnicianPinMarker label={tech?.full_name?.split(' ')[0]} />
          </Marker>
        )}
        {/* Real road route */}
        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#3b82f6"
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#f0f0f5" />
      </TouchableOpacity>

      {/* Open maps */}
      {hasServiceCoords && (
        <TouchableOpacity style={styles.mapsBtn} onPress={openInMaps} activeOpacity={0.8}>
          <Ionicons name="navigate" size={14} color="#fff" />
          <Text style={styles.mapsBtnText}>Ver en mapa</Text>
        </TouchableOpacity>
      )}

      {/* ETA overlay */}
      {routeInfo && routeInfo.duration && (
        <View style={styles.etaOverlay}>
          <Ionicons name="navigate" size={14} color="#3b82f6" />
          <Text style={styles.etaText}>{routeInfo.duration}</Text>
          <Text style={styles.etaDivider}>·</Text>
          <Text style={styles.etaDistance}>{routeInfo.distance}</Text>
        </View>
      )}

      {/* Tracking status overlay on map */}
      {isLive && !techLocation && (
        <View style={styles.trackingOverlay}>
          {isTrackingStatus ? (
            <>
              <ActivityIndicator size="small" color="#eab308" />
              <Text style={styles.trackingOverlayText}>
                Esperando ubicación del técnico...
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="time-outline" size={16} color="#8b8fa3" />
              <Text style={styles.trackingOverlayText}>
                El técnico aún no está en camino
              </Text>
            </>
          )}
        </View>
      )}

      {/* Live tracking active badge */}
      {techLocation && (
        <View style={styles.liveTrackingBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTrackingText}>EN VIVO</Text>
        </View>
      )}

      {/* Legend */}
      {techLocation && (
        <View style={styles.legendOverlay}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8b5cf6' }]} />
            <Text style={styles.legendText}>Destino</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.legendText}>Técnico</Text>
          </View>
        </View>
      )}

      {/* Bottom Sheet */}
      <ScrollView 
        style={styles.sheet} 
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadService(); }} tintColor="#8b5cf6" />}
      >

        {/* ── Technician Card ── */}
        {tech && (
          <View style={styles.techCard}>
            <View style={styles.techGradientBar} />
            <Text style={styles.techCardLabel}>TÉCNICO ASIGNADO</Text>

            <View style={styles.techRow}>
              {tech.avatar_url ? (
                <Image source={{ uri: tech.avatar_url.startsWith('http') ? tech.avatar_url : `${staticUrl}${tech.avatar_url}` }} style={styles.techAvatar} />
              ) : (
                <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.techAvatar}>
                  <Text style={styles.techInitial}>{(tech.full_name || 'T').charAt(0).toUpperCase()}</Text>
                </LinearGradient>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.techName}>{tech.full_name || 'Técnico'}</Text>
                <View style={styles.badgesRow}>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#eab308" />
                    <Text style={styles.ratingText}>{tech.average_rating?.toFixed(1) || 'Nuevo'}</Text>
                  </View>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
                    <Text style={styles.verifiedText}>Verificado</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.techActions}>
              <TouchableOpacity style={styles.profileBtn} activeOpacity={0.7} onPress={() => router.push(`/(client)/tech-profile/${tech.id || service?.technician_id}` as any)}>
                <Text style={styles.profileBtnText}>Ver perfil</Text>
              </TouchableOpacity>
              {tech.phone && (
                <TouchableOpacity style={styles.callBtnFull} onPress={() => Linking.openURL(`tel:${tech.phone}`)} activeOpacity={0.7}>
                  <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.callBtnGradient}>
                    <Ionicons name="call" size={16} color="#fff" />
                    <Text style={styles.callBtnText}>Llamar</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.callBtnFull} onPress={() => router.push(`/(client)/chat/${id}` as any)} activeOpacity={0.7}>
                <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.callBtnGradient}>
                  <Ionicons name="chatbubbles" size={16} color="#fff" />
                  <Text style={styles.callBtnText}>Chat</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Status Timeline ── */}
        {isLive && <StatusTimeline status={service?.status} />}

        {/* Status Banner (non-live) */}
        {!isLive && (
          <View style={[styles.statusBanner, { borderColor: `${si.color}40`, backgroundColor: `${si.color}15` }]}>
            <Text style={{ fontSize: 22 }}>{si.emoji}</Text>
            <Text style={[styles.statusBannerLabel, { color: si.color }]}>{si.label}</Text>
          </View>
        )}

        {/* Title */}
        <Text style={styles.title}>{service?.title}</Text>
        {service?.description && service.description.toLowerCase() !== 'sin descripción' && (
          <Text style={styles.description}>"{service.description}"</Text>
        )}

        {/* Info Cards */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <View style={[styles.infoIconBox, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
              <Ionicons name="location" size={18} color="#8b5cf6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Ubicación</Text>
              <Text style={styles.infoValue} numberOfLines={2}>{service?.service_address}</Text>
              {service?.service_city && <Text style={styles.infoSub}>{service.service_city}</Text>}
            </View>
          </View>

          <View style={styles.infoRowSplit}>
            {formattedDate && (
              <View style={[styles.infoCard, { flex: 1 }]}>
                <View style={[styles.infoIconBox, { backgroundColor: 'rgba(168,85,247,0.15)' }]}>
                  <Ionicons name="calendar" size={18} color="#a855f7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Fecha y Hora</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{formattedDate}</Text>
                </View>
              </View>
            )}
            {formattedPrice && (
              <View style={[styles.infoCard, { flex: 1 }]}>
                <View style={[styles.infoIconBox, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                  <Ionicons name="cash" size={18} color="#22c55e" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Precio</Text>
                  <Text style={[styles.infoValue, { color: '#22c55e' }]}>{formattedPrice}</Text>
                </View>
              </View>
            )}
          </View>

          {service?.vehicle_plate && (
            <View style={styles.infoCard}>
              <View style={[styles.infoIconBox, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                <Ionicons name="car" size={18} color="#3b82f6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Vehículo</Text>
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

        {service?.status === 'pending' && (
          <>
            <TouchableOpacity onPress={() => router.push(`/(client)/quotations/${id}` as any)} activeOpacity={0.8}>
              <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.actionButton}>
                <Ionicons name="pricetags" size={18} color="#fff" />
                <Text style={styles.actionText}>Ver Cotizaciones</Text>
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
                        } catch (err) {
                          Alert.alert('Error', 'No se pudo cancelar el servicio.');
                        }
                      },
                    },
                  ]
                );
              }}
              activeOpacity={0.8}
              style={{ marginTop: 4 }}
            >
              <View style={[styles.actionButton, { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }]}>
                <Ionicons name="close-circle" size={18} color="#ef4444" />
                <Text style={[styles.actionText, { color: '#ef4444' }]}>Cancelar servicio</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {service?.status === 'completed' && (
          <View style={styles.completedBanner}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>🎉</Text>
            <Text style={{ color: '#22c55e', fontSize: 18, fontWeight: '800' }}>¡Servicio completado!</Text>
            <Text style={{ color: '#8b8fa3', fontSize: 13, textAlign: 'center', marginTop: 4 }}>
              El técnico ha indicado que terminó el trabajo. Por favor, confirma que todo quedó bien.
            </Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(true)} activeOpacity={0.8} style={{ marginTop: 16, width: '100%' }}>
              <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.actionButton}>
                <Ionicons name="card" size={18} color="#fff" />
                <Text style={styles.actionText}>Confirmar y Pagar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {['completed', 'confirmed'].includes(service?.status) && (
          <View style={[styles.completedBanner, { marginTop: service?.status === 'completed' ? 16 : 0, backgroundColor: 'rgba(234,179,8,0.05)', borderColor: 'rgba(234,179,8,0.2)' }]}>
            {service?.status === 'confirmed' && (
              <>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>✅</Text>
                <Text style={{ color: '#22c55e', fontSize: 18, fontWeight: '800' }}>¡Servicio Confirmado!</Text>
                <Text style={{ color: '#8b8fa3', fontSize: 13, textAlign: 'center', marginTop: 4 }}>Gracias por usar Tec360.</Text>
              </>
            )}
            {canRate && (
              <TouchableOpacity onPress={() => setShowRating(true)} activeOpacity={0.8} style={{ marginTop: 16, width: '100%' }}>
                <LinearGradient colors={['#eab308', '#ca8a04']} style={styles.actionButton}>
                  <Ionicons name="star" size={18} color="#fff" />
                  <Text style={styles.actionText}>Calificar servicio</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            {alreadyRated && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                <Text style={{ color: '#22c55e', fontSize: 13, fontWeight: '600' }}>Ya calificaste este servicio</Text>
              </View>
            )}
          </View>
        )}

        {/* Rating Modal */}
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

        {/* Payment Modal */}
        <PaymentModal
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          amount={service?.estimated_price || 0}
          onConfirm={(method) => handleConfirmPayment(method)}
        />

        {/* Chat button is now inside the technician card above */}
      </ScrollView>
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
          <Text style={{ fontSize: 22 }}>{activeStep.emoji}</Text>
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
                done && { backgroundColor: '#22c55e', borderColor: '#22c55e' },
                active && { backgroundColor: 'rgba(59,130,246,0.2)', borderColor: '#3b82f6' },
                upcoming && { backgroundColor: 'rgba(85,88,114,0.1)', borderColor: 'rgba(85,88,114,0.3)' },
              ]}
            >
              {done ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text style={{ fontSize: 12 }}>{step.emoji}</Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                done && { color: '#22c55e' },
                active && { color: '#3b82f6' },
                upcoming && { color: '#555872' },
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
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  map: { width: SCREEN_WIDTH, height: 280 },
  backButton: { position: 'absolute', top: 56, left: SPACING.md, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(15,23,42,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  mapsBtn: { position: 'absolute', top: 56, right: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(139,92,246,0.9)', paddingHorizontal: 14, paddingVertical: SPACING.sm, borderRadius: RADIUS.round, zIndex: 10 },
  mapsBtnText: { color: '#fff', fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold },
  etaOverlay: { position: 'absolute', top: 100, left: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: 'rgba(10,14,28,0.92)', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, zIndex: 10 },
  etaText: { color: COLORS.text, fontSize: 13, fontWeight: FONTS.weights.bold },
  etaDivider: { color: COLORS.textMuted, fontSize: 13 },
  etaDistance: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs },
  legendOverlay: { position: 'absolute', top: 240, left: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.bgOverlay, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, zIndex: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: SPACING.sm, height: SPACING.sm, borderRadius: SPACING.xs },
  legendText: { color: COLORS.textSecondary, fontSize: 11 },
  sheet: { flex: 1, backgroundColor: COLORS.bg, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, marginTop: -SPACING.lg, paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },

  techCard: { backgroundColor: COLORS.bgCard, borderRadius: 22, padding: SPACING.lg, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  techGradientBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: COLORS.primary },
  techCardLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: FONTS.weights.bold, letterSpacing: 1.5, marginBottom: SPACING.md },
  techRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  techAvatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 2, borderColor: COLORS.primaryBorder },
  techInitial: { color: '#fff', fontSize: FONTS.sizes.xl, fontWeight: '800' },
  techName: { color: COLORS.text, fontSize: 17, fontWeight: '800', marginBottom: 6 },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: 'rgba(234,179,8,0.1)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.2)', borderRadius: RADIUS.round, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  ratingText: { color: COLORS.yellow, fontSize: 11, fontWeight: FONTS.weights.bold },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  verifiedText: { color: COLORS.textSecondary, fontSize: 11 },
  techActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  profileBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  profileBtnText: { color: '#3b82f6', fontSize: 13, fontWeight: FONTS.weights.semibold },
  callBtnFull: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  callBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: 12, borderRadius: 14 },
  callBtnText: { color: '#fff', fontSize: 13, fontWeight: FONTS.weights.bold },

  timelineContainer: { marginBottom: SPACING.lg },
  activeStepBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)', borderRadius: 18, padding: SPACING.lg, marginBottom: SPACING.md },
  activeStepLabel: { color: COLORS.text, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },
  activeStepDetail: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginTop: 2 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm },
  stepCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  stepLabel: { fontSize: 13, fontWeight: FONTS.weights.semibold, flex: 1 },
  activeDot: { width: 7, height: 7, borderRadius: SPACING.xs, backgroundColor: '#3b82f6' },

  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderRadius: 14, padding: SPACING.lg, borderWidth: 1, marginBottom: SPACING.md },
  statusBannerLabel: { fontSize: 15, fontWeight: FONTS.weights.bold },

  title: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginBottom: 6 },
  description: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontStyle: 'italic', lineHeight: 20, marginBottom: SPACING.md, borderLeftWidth: 2, borderLeftColor: COLORS.primaryBorder, paddingLeft: 10 },
  infoGrid: { gap: SPACING.md, marginBottom: SPACING.md },
  infoRowSplit: { flexDirection: 'row', gap: SPACING.md },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.borderLight },
  infoIconBox: { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  infoLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: FONTS.weights.semibold, marginBottom: 2 },
  infoValue: { color: COLORS.text, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },
  infoSub: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginTop: 1 },
  vehiclePhoto: { width: '100%', height: 180, borderRadius: RADIUS.lg, marginBottom: SPACING.md },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.md, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, marginBottom: SPACING.md },
  actionText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold },
  trackingOverlay: { position: 'absolute', top: 240, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: 'rgba(10,14,28,0.92)', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(234,179,8,0.3)', zIndex: 10 },
  trackingOverlayText: { color: COLORS.yellow, fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold },
  liveTrackingBadge: { position: 'absolute', top: 240, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.greenMuted, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.round, borderWidth: 1, borderColor: COLORS.greenBorder, zIndex: 10 },
  liveDot: { width: 7, height: 7, borderRadius: SPACING.xs, backgroundColor: COLORS.green },
  liveTrackingText: { color: COLORS.green, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  completedBanner: { alignItems: 'center', padding: SPACING.lg, backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  chatInlineBtn: { borderRadius: 18, overflow: 'hidden', marginTop: SPACING.lg, marginBottom: SPACING.md },
  chatInlineGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16, borderRadius: 18 },
  chatInlineText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '800' },
});
