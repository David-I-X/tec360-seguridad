import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Image, Dimensions, Linking, Platform,
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
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { getServiceById, fetchWithAuth, getAuthToken, API_URL } from '@/lib/api';
import { ServicePinMarker, MyLocationMarker } from '@/components/map-markers';
import { serviceWebSocket } from '@/lib/websocket';

const SCREEN_WIDTH = Dimensions.get('window').width;

type StatusFlow = 'en_route' | 'arrived' | 'in_progress' | 'completed';

const STATUS_ACTIONS: Record<string, { label: string; next: StatusFlow; emoji: string; colors: [string, string] }> = {
  assigned: { label: 'En Camino', next: 'en_route', emoji: '🚗', colors: ['#8b5cf6', '#7c3aed'] },
  en_route: { label: 'Ya Llegué', next: 'arrived', emoji: '📍', colors: ['#f97316', '#ea580c'] },
  arrived: { label: 'Iniciar Trabajo', next: 'in_progress', emoji: '🔧', colors: ['#a855f7', '#9333ea'] },
  in_progress: { label: 'Finalizar', next: 'completed', emoji: '✅', colors: ['#22c55e', '#16a34a'] },
};

// ─── Fetch real road route from OSRM (free, no API key) ───
async function fetchRouteCoordinates(
  originLat: number, originLng: number,
  destLat: number, destLng: number
): Promise<{ latitude: number; longitude: number }[]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const coords = data.routes[0].geometry.coordinates;
      return coords.map((c: number[]) => ({ latitude: c[1], longitude: c[0] }));
    }
  } catch (e) {
    console.warn('[Route] OSRM fetch failed:', e);
  }
  // Fallback: straight line
  return [
    { latitude: originLat, longitude: originLng },
    { latitude: destLat, longitude: destLng },
  ];
}

export default function TechServiceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [service, setService] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<any>(null);
  const lastRouteFetch = useRef<{ lat: number; lng: number } | null>(null);

  const loadService = useCallback(async () => {
    try {
      const data = await getServiceById(id!);
      setService(data.service || data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [id]);

  useEffect(() => { loadService(); }, [loadService]);

  // WebSocket connection
  useEffect(() => {
    if (!id) return;
    let unsub: (() => void) | undefined;
    (async () => {
      const token = await getAuthToken();
      if (!token) return;
      serviceWebSocket.connect(id, token);
      unsub = serviceWebSocket.onMessage((msg) => {
        if (msg.type === 'status_update') {
          setService((prev: any) => prev ? { ...prev, status: msg.data.status } : prev);
        }
      });
    })();
    return () => { serviceWebSocket.disconnect(); unsub?.(); };
  }, [id]);

  // GPS Tracking
  useEffect(() => {
    if (!service || !['en_route', 'in_progress'].includes(service.status)) return;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locationSubscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (loc) => {
          setMyLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          serviceWebSocket.sendLocationUpdate(loc.coords.latitude, loc.coords.longitude);
        }
      );
    })();

    return () => { locationSubscription.current?.remove(); };
  }, [service?.status]);

  // Get initial location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setMyLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  // ─── Fetch real road route when location changes significantly ───
  useEffect(() => {
    if (!myLocation || !service?.service_lat || !service?.service_lon) return;

    // Only re-fetch if moved >200m
    if (lastRouteFetch.current) {
      const dlat = Math.abs(myLocation.lat - lastRouteFetch.current.lat);
      const dlng = Math.abs(myLocation.lng - lastRouteFetch.current.lng);
      if (dlat < 0.002 && dlng < 0.002) return;
    }

    lastRouteFetch.current = { ...myLocation };

    (async () => {
      const coords = await fetchRouteCoordinates(
        myLocation.lat, myLocation.lng,
        service.service_lat, service.service_lon
      );
      setRouteCoords(coords);

      // Also fetch route info (distance/duration)
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${myLocation.lng},${myLocation.lat};${service.service_lon},${service.service_lat}?overview=false`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes?.[0]) {
          const r = data.routes[0];
          const mins = Math.round(r.duration / 60);
          const km = (r.distance / 1000).toFixed(1);
          setRouteInfo({ distance: `${km} km`, duration: `${mins} min` });
        }
      } catch (e) {}
    })();
  }, [myLocation, service?.service_lat, service?.service_lon]);

  const handleStatusChange = async () => {
    const action = STATUS_ACTIONS[service?.status];
    if (!action) return;

    if (action.next === 'in_progress' || action.next === 'completed') {
      const stage = action.next === 'in_progress' ? 'before' : 'after';
      const photo = await capturePhoto(stage);
      if (!photo) {
        Alert.alert('Foto requerida', `Necesitas tomar una foto ${stage === 'before' ? 'antes de iniciar' : 'del resultado final'}.`);
        return;
      }
      await uploadEvidence(photo, stage);
    }

    setIsUpdating(true);
    try {
      await fetchWithAuth(`/services/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action.next }),
      });
      setService((prev: any) => prev ? { ...prev, status: action.next } : prev);

      if (action.next === 'completed') {
        Alert.alert('¡Servicio completado!', 'Excelente trabajo 🎉', [
          { text: 'OK', onPress: () => router.replace('/(tech)/dashboard') },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const capturePhoto = async (stage: string): Promise<string | null> => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
    if (result.canceled || !result.assets[0]) return null;
    const compressed = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return compressed.uri;
  };

  const uploadEvidence = async (uri: string, stage: string) => {
    const formData = new FormData();
    formData.append('file', { uri, name: `${stage}.jpg`, type: 'image/jpeg' } as any);
    formData.append('service_id', id!);
    formData.append('stage', stage);
    await fetchWithAuth('/uploads/evidence', { method: 'POST', body: formData });
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#8b5cf6" /></View>;
  }

  const action = STATUS_ACTIONS[service?.status];
  const client = service?.client;
  const staticUrl = API_URL.replace(/\/api\/?$/, '');
  const serviceLat = service?.service_lat || 6.2518;
  const serviceLng = service?.service_lon || -75.5636;
  const isTracking = ['en_route', 'in_progress'].includes(service?.status);

  const openNavigation = () => {
    const url = Platform.select({
      ios: `maps:0,0?daddr=${serviceLat},${serviceLng}&dirflg=d`,
      android: `google.navigation:q=${serviceLat},${serviceLng}&mode=d`,
    });
    if (url) Linking.openURL(url);
  };

  const getMapRegion = () => {
    if (myLocation) {
      const midLat = (myLocation.lat + serviceLat) / 2;
      const midLng = (myLocation.lng + serviceLng) / 2;
      const deltaLat = Math.abs(myLocation.lat - serviceLat) * 1.6 || 0.02;
      const deltaLng = Math.abs(myLocation.lng - serviceLng) * 1.6 || 0.02;
      return { latitude: midLat, longitude: midLng, latitudeDelta: Math.max(deltaLat, 0.01), longitudeDelta: Math.max(deltaLng, 0.01) };
    }
    return { latitude: serviceLat, longitude: serviceLng, latitudeDelta: 0.015, longitudeDelta: 0.015 };
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={getMapRegion()}
        customMapStyle={darkMapStyle}
      >
        <Marker coordinate={{ latitude: serviceLat, longitude: serviceLng }} title="Ubicación del servicio" anchor={{ x: 0.5, y: 1 }}>
          <ServicePinMarker />
        </Marker>
        {myLocation && (
          <Marker coordinate={{ latitude: myLocation.lat, longitude: myLocation.lng }} title="Mi ubicación" anchor={{ x: 0.5, y: 0.5 }}>
            <MyLocationMarker />
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

      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#f0f0f5" />
      </TouchableOpacity>

      {/* Navigate */}
      <TouchableOpacity style={styles.navBtn} onPress={openNavigation} activeOpacity={0.8}>
        <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.navBtnGradient}>
          <Ionicons name="navigate" size={16} color="#fff" />
          <Text style={styles.navBtnText}>Navegar</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* ETA overlay */}
      {routeInfo && (
        <View style={styles.etaOverlay}>
          <Ionicons name="navigate" size={14} color="#3b82f6" />
          <Text style={styles.etaText}>{routeInfo.duration}</Text>
          <Text style={styles.etaDivider}>·</Text>
          <Text style={styles.etaDistance}>{routeInfo.distance}</Text>
        </View>
      )}

      {/* Bottom Sheet */}
      <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={styles.serviceTitle}>{service?.title}</Text>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <View style={[styles.infoIconBox, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
              <Ionicons name="location" size={18} color="#8b5cf6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Dirección</Text>
              <Text style={styles.infoValue} numberOfLines={2}>{service?.service_address}</Text>
              {service?.service_city && <Text style={styles.infoSub}>{service.service_city}</Text>}
            </View>
          </View>

          {service?.vehicle_plate && (
            <View style={styles.infoCard}>
              <View style={[styles.infoIconBox, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                <Ionicons name="car" size={18} color="#3b82f6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Vehículo</Text>
                <Text style={styles.infoValue}>{service.vehicle_type} {service.vehicle_model} — {service.vehicle_plate}</Text>
              </View>
            </View>
          )}
        </View>

        {isTracking && (
          <View style={styles.trackingBanner}>
            <View style={styles.trackingDot} />
            <Text style={styles.trackingText}>GPS activo — enviando ubicación al cliente</Text>
          </View>
        )}

        {client && (
          <View style={styles.clientCard}>
            <Text style={styles.clientLabel}>CLIENTE</Text>
            <View style={styles.clientRow}>
              {client.avatar_url ? (
                <Image source={{ uri: client.avatar_url.startsWith('http') ? client.avatar_url : `${staticUrl}${client.avatar_url}` }} style={styles.clientAvatar} />
              ) : (
                <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.clientAvatar}>
                  <Text style={styles.clientInitial}>{client.full_name?.[0] || 'C'}</Text>
                </LinearGradient>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.clientName}>{client.full_name}</Text>
                {client.phone && <Text style={styles.clientPhone}>{client.phone}</Text>}
              </View>
              {client.phone && (
                <TouchableOpacity style={styles.phoneBtn} onPress={() => Linking.openURL(`tel:${client.phone}`)}>
                  <Ionicons name="call" size={18} color="#22c55e" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {action && (
          <TouchableOpacity
            style={[styles.actionBtn, isUpdating && { opacity: 0.6 }]}
            onPress={handleStatusChange}
            disabled={isUpdating}
            activeOpacity={0.8}
          >
            <LinearGradient colors={action.colors} style={styles.actionGradient}>
              {isUpdating ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={styles.actionEmoji}>{action.emoji}</Text>
                  <Text style={styles.actionText}>{action.label}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {service?.status === 'completed' && (
          <View style={styles.completedBanner}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🎉</Text>
            <Text style={{ color: '#22c55e', fontSize: 18, fontWeight: '700' }}>Servicio completado</Text>
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
  map: { width: SCREEN_WIDTH, height: 300 },
  backBtn: { position: 'absolute', top: 56, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(15,23,42,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  navBtn: { position: 'absolute', top: 56, right: 16, borderRadius: 20, overflow: 'hidden', zIndex: 10 },
  navBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  navBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  etaOverlay: { position: 'absolute', top: 100, left: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(10,14,28,0.92)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)', zIndex: 10 },
  etaText: { color: '#f0f0f5', fontSize: 13, fontWeight: '700' },
  etaDivider: { color: '#555872', fontSize: 13 },
  etaDistance: { color: '#8b8fa3', fontSize: 12 },
  sheet: { flex: 1, backgroundColor: '#050810', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, paddingHorizontal: 20, paddingTop: 24 },
  serviceTitle: { color: '#f0f0f5', fontSize: 22, fontWeight: '800', marginBottom: 14 },
  infoGrid: { gap: 10, marginBottom: 14 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(80,60,160,0.15)' },
  infoIconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  infoLabel: { color: '#555872', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  infoValue: { color: '#f0f0f5', fontSize: 14, fontWeight: '700' },
  infoSub: { color: '#8b8fa3', fontSize: 12, marginTop: 1 },
  trackingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(34,197,94,0.08)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', borderRadius: 14, padding: 12, marginBottom: 14 },
  trackingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  trackingText: { color: '#22c55e', fontSize: 12, fontWeight: '600', flex: 1 },
  clientCard: { backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  clientLabel: { color: '#555872', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  clientAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  clientInitial: { color: '#fff', fontSize: 16, fontWeight: '800' },
  clientName: { color: '#f0f0f5', fontSize: 16, fontWeight: '700' },
  clientPhone: { color: '#8b8fa3', fontSize: 12, marginTop: 2 },
  phoneBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(34,197,94,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  actionBtn: { borderRadius: 18, overflow: 'hidden', marginTop: 8, marginBottom: 16 },
  actionGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 18 },
  actionEmoji: { fontSize: 22 },
  actionText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  completedBanner: { alignItems: 'center', marginTop: 8, padding: 20, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
});
