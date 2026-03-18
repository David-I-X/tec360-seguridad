import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Linking, Dimensions, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
import { getServiceById, getAuthToken, API_URL } from '@/lib/api';
import { serviceWebSocket } from '@/lib/websocket';

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

export default function ServiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [service, setService] = useState<any>(null);
  const [techLocation, setTechLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadService = useCallback(async () => {
    try {
      const data = await getServiceById(id!);
      setService(data.service || data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [id]);

  useEffect(() => { loadService(); }, [loadService]);

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

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#8b5cf6" /></View>;
  }

  const tech = service?.technician;
  const staticUrl = API_URL.replace(/\/api\/?$/, '');
  const isLive = ['assigned', 'en_route', 'arrived', 'in_progress'].includes(service?.status);
  const serviceLat = service?.service_lat || 6.2518;
  const serviceLng = service?.service_lon || -75.5636;
  const hasCoords = !!(service?.service_lat && service?.service_lon);
  const si = statusInfo[service?.status] || statusInfo.pending;

  const formattedDate = service?.scheduled_date
    ? new Date(service.scheduled_date).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
    : null;
  const formattedPrice = service?.estimated_price
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(service.estimated_price)
    : null;

  // Map region
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
      android: `geo:${serviceLat},${serviceLng}?q=${serviceLat},${serviceLng}(Ubicación del servicio)`,
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
        {/* Service pin */}
        <Marker coordinate={{ latitude: serviceLat, longitude: serviceLng }} title="Ubicación del servicio" pinColor="#8b5cf6" />
        {/* Technician live pin */}
        {techLocation && (
          <Marker coordinate={{ latitude: techLocation.lat, longitude: techLocation.lng }} title={tech?.full_name || 'Técnico'} pinColor="#22c55e" />
        )}
        {/* Route line */}
        {techLocation && (
          <Polyline
            coordinates={[
              { latitude: techLocation.lat, longitude: techLocation.lng },
              { latitude: serviceLat, longitude: serviceLng },
            ]}
            strokeColor="#8b5cf6"
            strokeWidth={3}
            lineDashPattern={[8, 4]}
          />
        )}
      </MapView>

      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#f0f0f5" />
      </TouchableOpacity>

      {/* Open maps */}
      {hasCoords && (
        <TouchableOpacity style={styles.mapsBtn} onPress={openInMaps} activeOpacity={0.8}>
          <Ionicons name="navigate" size={14} color="#fff" />
          <Text style={styles.mapsBtnText}>Ver en mapa</Text>
        </TouchableOpacity>
      )}

      {/* Bottom Sheet */}
      <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── Technician Card (web-like) ── */}
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
                  {/* Rating badge */}
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#eab308" />
                    <Text style={styles.ratingText}>
                      {tech.average_rating?.toFixed(1) || 'Nuevo'}
                    </Text>
                  </View>
                  {/* Verified badge */}
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
                    <Text style={styles.verifiedText}>Verificado</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Buttons - matching web */}
            <View style={styles.techActions}>
              <TouchableOpacity style={styles.profileBtn} activeOpacity={0.7}>
                <Text style={styles.profileBtnText}>Ver perfil completo</Text>
              </TouchableOpacity>
              {tech.phone && (
                <TouchableOpacity
                  style={styles.callBtnFull}
                  onPress={() => Linking.openURL(`tel:${tech.phone}`)}
                  activeOpacity={0.7}
                >
                  <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.callBtnGradient}>
                    <Ionicons name="call" size={16} color="#fff" />
                    <Text style={styles.callBtnText}>Llamar</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── Status Timeline (web-like stepper) ── */}
        {isLive && <StatusTimeline status={service?.status} />}

        {/* ── Current Status Banner ── */}
        {!isLive && (
          <View style={[styles.statusBanner, { borderColor: `${si.color}40`, backgroundColor: `${si.color}15` }]}>
            <Text style={styles.statusEmoji}>{si.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusLabel, { color: si.color }]}>{si.label}</Text>
            </View>
          </View>
        )}

        {/* ── Service Info ── */}
        <Text style={styles.title}>{service?.title}</Text>
        {service?.description && service.description.toLowerCase() !== 'sin descripción' && (
          <Text style={styles.description}>"{service.description}"</Text>
        )}

        {/* Info Cards */}
        <View style={styles.infoGrid}>
          {/* Location */}
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

          {/* Date & Price */}
          <View style={styles.infoRowSplit}>
            {formattedDate && (
              <View style={[styles.infoCard, { flex: 1 }]}>
                <View style={[styles.infoIconBox, { backgroundColor: 'rgba(168,85,247,0.15)' }]}>
                  <Ionicons name="calendar" size={18} color="#a855f7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Fecha</Text>
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

          {/* Vehicle */}
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

        {/* Vehicle Photo */}
        {service?.vehicle_photo_url && (
          <Image
            source={{ uri: service.vehicle_photo_url.startsWith('http') ? service.vehicle_photo_url : `${staticUrl}${service.vehicle_photo_url}` }}
            style={styles.vehiclePhoto}
          />
        )}

        {/* Actions */}
        {service?.status === 'pending' && (
          <TouchableOpacity onPress={() => router.push(`/(client)/quotations/${id}` as any)} activeOpacity={0.8}>
            <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.actionButton}>
              <Ionicons name="pricetags" size={18} color="#fff" />
              <Text style={styles.actionText}>Ver Cotizaciones</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {service?.status === 'completed' && (
          <View style={styles.completedBanner}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>🎉</Text>
            <Text style={{ color: '#22c55e', fontSize: 18, fontWeight: '800' }}>¡Servicio completado!</Text>
            <Text style={{ color: '#8b8fa3', fontSize: 13, textAlign: 'center', marginTop: 4 }}>Tu técnico ha finalizado el trabajo exitosamente.</Text>
          </View>
        )}
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
      {/* Active step banner */}
      {activeStep && (
        <View style={styles.activeStepBanner}>
          <Text style={{ fontSize: 22 }}>{activeStep.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.activeStepLabel}>{activeStep.label}</Text>
            <Text style={styles.activeStepDetail}>{activeStep.detail}</Text>
          </View>
        </View>
      )}

      {/* Steps */}
      {SERVICE_STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const upcoming = i > currentIndex;

        return (
          <View
            key={step.key}
            style={[styles.stepRow, upcoming && { opacity: 0.35 }]}
          >
            {/* Circle */}
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

            {/* Label */}
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

            {/* Active pulse */}
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
  container: { flex: 1, backgroundColor: '#050810' },
  centered: { flex: 1, backgroundColor: '#050810', justifyContent: 'center', alignItems: 'center' },
  map: { width: SCREEN_WIDTH, height: 280 },
  backButton: { position: 'absolute', top: 56, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(15,23,42,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  mapsBtn: { position: 'absolute', top: 56, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(139,92,246,0.9)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, zIndex: 10 },
  mapsBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  sheet: { flex: 1, backgroundColor: '#050810', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, paddingHorizontal: 20, paddingTop: 24 },

  /* ── Tech Card ── */
  techCard: { backgroundColor: 'rgba(10,14,28,0.85)', borderRadius: 22, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)', overflow: 'hidden' },
  techGradientBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#8b5cf6' },
  techCardLabel: { color: '#555872', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 14 },
  techRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  techAvatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(139,92,246,0.3)' },
  techInitial: { color: '#fff', fontSize: 20, fontWeight: '800' },
  techName: { color: '#f0f0f5', fontSize: 17, fontWeight: '800', marginBottom: 6 },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(234,179,8,0.1)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.2)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  ratingText: { color: '#eab308', fontSize: 11, fontWeight: '700' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { color: '#8b8fa3', fontSize: 11 },
  techActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  profileBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  profileBtnText: { color: '#3b82f6', fontSize: 13, fontWeight: '600' },
  callBtnFull: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  callBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14 },
  callBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  /* ── Status Timeline ── */
  timelineContainer: { marginBottom: 20 },
  activeStepBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)', borderRadius: 18, padding: 14, marginBottom: 14 },
  activeStepLabel: { color: '#f0f0f5', fontSize: 14, fontWeight: '700' },
  activeStepDetail: { color: '#8b8fa3', fontSize: 12, marginTop: 2 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  stepLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#3b82f6' },

  /* ── Status Banner (non-live) ── */
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 16 },
  statusEmoji: { fontSize: 22 },
  statusLabel: { fontSize: 15, fontWeight: '700' },

  /* ── Service Info ── */
  title: { color: '#f0f0f5', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  description: { color: '#8b8fa3', fontSize: 14, fontStyle: 'italic', lineHeight: 20, marginBottom: 16, borderLeftWidth: 2, borderLeftColor: 'rgba(139,92,246,0.3)', paddingLeft: 10 },
  infoGrid: { gap: 10, marginBottom: 16 },
  infoRowSplit: { flexDirection: 'row', gap: 10 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(80,60,160,0.15)' },
  infoIconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  infoLabel: { color: '#555872', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  infoValue: { color: '#f0f0f5', fontSize: 14, fontWeight: '700' },
  infoSub: { color: '#8b8fa3', fontSize: 12, marginTop: 1 },
  vehiclePhoto: { width: '100%', height: 180, borderRadius: 16, marginBottom: 16 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 16, marginBottom: 16 },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  completedBanner: { alignItems: 'center', marginTop: 8, padding: 24, backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
});
