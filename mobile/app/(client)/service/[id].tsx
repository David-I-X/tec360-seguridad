import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Linking, Dimensions, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Lazy import MapView — it's native-only
let MapView: any = View;
let Marker: any = View;
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
  } catch (e) { /* maps not available */ }
}
import { useAuth } from '@/lib/auth-context';
import { getServiceById, getAuthToken, API_URL } from '@/lib/api';
import { serviceWebSocket } from '@/lib/websocket';

const SCREEN_WIDTH = Dimensions.get('window').width;

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
  const isLive = ['en_route', 'arrived', 'in_progress'].includes(service?.status);
  const serviceLat = service?.service_lat || 6.2518;
  const serviceLng = service?.service_lon || -75.5636;
  const hasCoords = !!(service?.service_lat && service?.service_lon);

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
  const si = statusInfo[service?.status] || statusInfo.pending;

  const formattedDate = service?.scheduled_date
    ? new Date(service.scheduled_date).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
    : null;
  const formattedPrice = service?.estimated_price
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(service.estimated_price)
    : null;

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
        initialRegion={{
          latitude: techLocation?.lat || serviceLat,
          longitude: techLocation?.lng || serviceLng,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
        customMapStyle={darkMapStyle}
      >
        <Marker coordinate={{ latitude: serviceLat, longitude: serviceLng }} title="Ubicación del servicio" pinColor="#8b5cf6" />
        {techLocation && (
          <Marker coordinate={{ latitude: techLocation.lat, longitude: techLocation.lng }} title={tech?.full_name || 'Técnico'} pinColor="#22c55e" />
        )}
      </MapView>

      {/* Navigate to maps button */}
      {hasCoords && (
        <TouchableOpacity style={styles.navigateBtn} onPress={openInMaps} activeOpacity={0.8}>
          <Ionicons name="navigate" size={16} color="#fff" />
          <Text style={styles.navigateBtnText}>Abrir mapa</Text>
        </TouchableOpacity>
      )}

      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#f0f0f5" />
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Status */}
        <View style={[styles.statusBar, { borderColor: `${si.color}40`, backgroundColor: `${si.color}15` }]}>
          <Text style={styles.statusEmoji}>{si.emoji}</Text>
          <Text style={[styles.statusLabel, { color: si.color }]}>{si.label}</Text>
          {isLive && (
            <View style={styles.livePulse}>
              <View style={styles.livePulseDot} />
              <Text style={styles.livePulseText}>EN VIVO</Text>
            </View>
          )}
        </View>

        {/* Service Title */}
        <Text style={styles.title}>{service?.title}</Text>
        {service?.description && <Text style={styles.description}>{service.description}</Text>}

        {/* Info Cards */}
        <View style={styles.infoGrid}>
          {/* Location */}
          <View style={styles.infoCard}>
            <View style={[styles.infoIconBox, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
              <Ionicons name="location" size={18} color="#8b5cf6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoCardLabel}>Ubicación</Text>
              <Text style={styles.infoCardValue} numberOfLines={2}>{service?.service_address}</Text>
              {service?.service_city && <Text style={styles.infoCardSub}>{service.service_city}</Text>}
            </View>
          </View>

          {/* Date & Price Row */}
          <View style={styles.infoRowSplit}>
            {formattedDate && (
              <View style={[styles.infoCard, { flex: 1 }]}>
                <View style={[styles.infoIconBox, { backgroundColor: 'rgba(168,85,247,0.15)' }]}>
                  <Ionicons name="calendar" size={18} color="#a855f7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoCardLabel}>Fecha</Text>
                  <Text style={styles.infoCardValue} numberOfLines={1}>{formattedDate}</Text>
                </View>
              </View>
            )}
            {formattedPrice && (
              <View style={[styles.infoCard, { flex: 1 }]}>
                <View style={[styles.infoIconBox, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                  <Ionicons name="cash" size={18} color="#22c55e" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoCardLabel}>Precio</Text>
                  <Text style={[styles.infoCardValue, { color: '#22c55e' }]}>{formattedPrice}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Vehicle Info */}
          {service?.vehicle_plate && (
            <View style={styles.infoCard}>
              <View style={[styles.infoIconBox, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                <Ionicons name="car" size={18} color="#3b82f6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoCardLabel}>Vehículo</Text>
                <Text style={styles.infoCardValue}>{service.vehicle_type} {service.vehicle_model}</Text>
                <Text style={styles.infoCardSub}>Placa: {service.vehicle_plate}</Text>
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

        {/* Technician */}
        {tech && (
          <View style={styles.techCard}>
            <Text style={styles.sectionLabel}>TÉCNICO ASIGNADO</Text>
            <View style={styles.techRow}>
              {tech.avatar_url ? (
                <Image source={{ uri: tech.avatar_url.startsWith('http') ? tech.avatar_url : `${staticUrl}${tech.avatar_url}` }} style={styles.techAvatar} />
              ) : (
                <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.techAvatar}>
                  <Text style={styles.techInitial}>{tech.full_name?.[0] || 'T'}</Text>
                </LinearGradient>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.techName}>{tech.full_name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="star" size={14} color="#eab308" />
                  <Text style={{ color: '#eab308', fontSize: 13, fontWeight: '600' }}>{tech.average_rating?.toFixed(1) || '—'}</Text>
                </View>
              </View>
              {tech.phone && (
                <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${tech.phone}`)}>
                  <Ionicons name="call" size={18} color="#22c55e" />
                </TouchableOpacity>
              )}
            </View>
          </View>
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
            <Text style={styles.completedEmoji}>🎉</Text>
            <Text style={styles.completedTitle}>¡Servicio completado!</Text>
            <Text style={styles.completedSub}>Tu técnico ha finalizado el trabajo exitosamente.</Text>
          </View>
        )}
      </ScrollView>
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
  navigateBtn: { position: 'absolute', top: 56, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(139,92,246,0.9)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, zIndex: 10 },
  navigateBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  sheet: { flex: 1, backgroundColor: '#050810', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, paddingHorizontal: 20, paddingTop: 24 },
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 16 },
  statusEmoji: { fontSize: 22 },
  statusLabel: { fontSize: 15, fontWeight: '700', flex: 1 },
  livePulse: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  livePulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  livePulseText: { color: '#22c55e', fontSize: 9, fontWeight: '800' },
  title: { color: '#f0f0f5', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  description: { color: '#8b8fa3', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  sectionLabel: { color: '#555872', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  infoGrid: { gap: 10, marginBottom: 16 },
  infoRowSplit: { flexDirection: 'row', gap: 10 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(80,60,160,0.15)' },
  infoIconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  infoCardLabel: { color: '#555872', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  infoCardValue: { color: '#f0f0f5', fontSize: 14, fontWeight: '700' },
  infoCardSub: { color: '#8b8fa3', fontSize: 12, marginTop: 1 },
  vehiclePhoto: { width: '100%', height: 180, borderRadius: 16, marginBottom: 16 },
  techCard: { backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  techRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  techAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  techInitial: { color: '#fff', fontSize: 18, fontWeight: '800' },
  techName: { color: '#f0f0f5', fontSize: 16, fontWeight: '700' },
  callBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(34,197,94,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 16, marginBottom: 16 },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  completedBanner: { alignItems: 'center', marginTop: 8, padding: 24, backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  completedEmoji: { fontSize: 40, marginBottom: 8 },
  completedTitle: { color: '#22c55e', fontSize: 18, fontWeight: '800' },
  completedSub: { color: '#8b8fa3', fontSize: 13, textAlign: 'center', marginTop: 4 },
});
