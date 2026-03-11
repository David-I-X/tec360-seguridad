import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Linking, Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform } from 'react-native';

// Lazy import MapView — it's native-only, crashes on web
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
    return <View style={styles.centered}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  const tech = service?.technician;
  const staticUrl = API_URL.replace(/\/api\/?$/, '');
  const isLive = ['en_route', 'arrived', 'in_progress'].includes(service?.status);
  const serviceLat = service?.service_lat || 4.6097;
  const serviceLng = service?.service_lon || -74.0817;

  const statusInfo: Record<string, { label: string; color: string; emoji: string }> = {
    pending: { label: 'Pendiente', color: '#eab308', emoji: '⏳' },
    quoted: { label: 'Cotizado', color: '#6366f1', emoji: '💰' },
    assigned: { label: 'Asignado', color: '#3b82f6', emoji: '🔔' },
    en_route: { label: 'En camino', color: '#2563eb', emoji: '🚗' },
    arrived: { label: 'Llegó', color: '#f97316', emoji: '📍' },
    in_progress: { label: 'Trabajando', color: '#a855f7', emoji: '🔧' },
    completed: { label: 'Completado', color: '#22c55e', emoji: '✅' },
    cancelled: { label: 'Cancelado', color: '#ef4444', emoji: '❌' },
  };
  const si = statusInfo[service?.status] || statusInfo.pending;

  return (
    <View style={styles.container}>
      {/* Map */}
      {isLive && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: techLocation?.lat || serviceLat,
            longitude: techLocation?.lng || serviceLng,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          customMapStyle={darkMapStyle}
        >
          <Marker coordinate={{ latitude: serviceLat, longitude: serviceLng }} title="Ubicación del servicio" pinColor="#3b82f6" />
          {techLocation && (
            <Marker coordinate={{ latitude: techLocation.lat, longitude: techLocation.lng }} title={tech?.full_name || 'Técnico'} pinColor="#22c55e" />
          )}
        </MapView>
      )}

      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#f8fafc" />
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <ScrollView style={[styles.sheet, !isLive && { flex: 1, marginTop: 80 }]} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Status */}
        <View style={[styles.statusBar, { borderColor: `${si.color}40`, backgroundColor: `${si.color}15` }]}>
          <Text style={styles.statusEmoji}>{si.emoji}</Text>
          <Text style={[styles.statusLabel, { color: si.color }]}>{si.label}</Text>
        </View>

        {/* Service Title */}
        <Text style={styles.title}>{service?.title}</Text>
        {service?.description && <Text style={styles.description}>{service.description}</Text>}

        {/* Location Info */}
        <View style={styles.infoRow}>
          <Ionicons name="location" size={16} color="#64748b" />
          <Text style={styles.infoText}>{service?.service_address} — {service?.service_city}</Text>
        </View>

        {/* Vehicle Info */}
        {service?.vehicle_plate && (
          <View style={styles.infoRow}>
            <Ionicons name="car" size={16} color="#64748b" />
            <Text style={styles.infoText}>{service.vehicle_type} {service.vehicle_model} — {service.vehicle_plate}</Text>
          </View>
        )}

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
            <View style={styles.techRow}>
              {tech.avatar_url ? (
                <Image source={{ uri: tech.avatar_url.startsWith('http') ? tech.avatar_url : `${staticUrl}${tech.avatar_url}` }} style={styles.techAvatar} />
              ) : (
                <LinearGradient colors={['#3b82f6', '#6366f1']} style={styles.techAvatar}>
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
            <LinearGradient colors={['#3b82f6', '#6366f1']} style={styles.actionButton}>
              <Ionicons name="pricetags" size={18} color="#fff" />
              <Text style={styles.actionText}>Ver Cotizaciones</Text>
            </LinearGradient>
          </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  map: { width: SCREEN_WIDTH, height: 300 },
  backButton: { position: 'absolute', top: 56, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(15,23,42,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  sheet: { flex: 1, backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, paddingHorizontal: 20, paddingTop: 24 },
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 16 },
  statusEmoji: { fontSize: 22 },
  statusLabel: { fontSize: 15, fontWeight: '700' },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  description: { color: '#94a3b8', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  infoText: { color: '#94a3b8', fontSize: 14, flex: 1 },
  vehiclePhoto: { width: '100%', height: 180, borderRadius: 16, marginVertical: 16 },
  techCard: { backgroundColor: 'rgba(30,41,59,0.5)', borderRadius: 18, padding: 16, marginTop: 16, borderWidth: 1, borderColor: 'rgba(71,85,105,0.2)' },
  techRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  techAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  techInitial: { color: '#fff', fontSize: 18, fontWeight: '800' },
  techName: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  callBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(34,197,94,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 16, marginTop: 20 },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
