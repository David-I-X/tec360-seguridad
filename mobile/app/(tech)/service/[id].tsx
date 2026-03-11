import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Image, Dimensions, Linking, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { getServiceById, fetchWithAuth, getAuthToken, API_URL } from '@/lib/api';
import { serviceWebSocket } from '@/lib/websocket';

const SCREEN_WIDTH = Dimensions.get('window').width;

type StatusFlow = 'en_route' | 'arrived' | 'in_progress' | 'completed';

const STATUS_ACTIONS: Record<string, { label: string; next: StatusFlow; emoji: string; colors: [string, string] }> = {
  assigned: { label: 'En Camino', next: 'en_route', emoji: '🚗', colors: ['#3b82f6', '#2563eb'] },
  en_route: { label: 'Ya Llegué', next: 'arrived', emoji: '📍', colors: ['#f97316', '#ea580c'] },
  arrived: { label: 'Iniciar Trabajo', next: 'in_progress', emoji: '🔧', colors: ['#a855f7', '#9333ea'] },
  in_progress: { label: 'Finalizar', next: 'completed', emoji: '✅', colors: ['#22c55e', '#16a34a'] },
};

export default function TechServiceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [service, setService] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

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

  // GPS Tracking — send location updates when en_route or in_progress
  useEffect(() => {
    if (!service || !['en_route', 'in_progress'].includes(service.status)) return;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locationSubscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (loc) => {
          serviceWebSocket.sendLocationUpdate(loc.coords.latitude, loc.coords.longitude);
        }
      );
    })();

    return () => { locationSubscription.current?.remove(); };
  }, [service?.status]);

  const handleStatusChange = async () => {
    const action = STATUS_ACTIONS[service?.status];
    if (!action) return;

    // Check if photo is needed for certain transitions
    if (action.next === 'in_progress' || action.next === 'completed') {
      const stage = action.next === 'in_progress' ? 'before' : 'after';
      const photo = await capturePhoto(stage);
      if (!photo) {
        Alert.alert('Foto requerida', `Necesitas tomar una foto ${stage === 'before' ? 'antes de iniciar' : 'del resultado final'}.`);
        return;
      }
      // Upload photo
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
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });
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
    return <View style={styles.centered}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  const action = STATUS_ACTIONS[service?.status];
  const client = service?.client;
  const staticUrl = API_URL.replace(/\/api\/?$/, '');

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: service?.service_lat || 4.6097,
          longitude: service?.service_lon || -74.0817,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
        customMapStyle={darkMapStyle}
      >
        <Marker
          coordinate={{ latitude: service?.service_lat || 4.6097, longitude: service?.service_lon || -74.0817 }}
          title="Ubicación del servicio"
          pinColor="#3b82f6"
        />
      </MapView>

      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#f8fafc" />
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Service Info */}
        <Text style={styles.serviceTitle}>{service?.title}</Text>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={16} color="#64748b" />
          <Text style={styles.infoText}>{service?.service_address}</Text>
        </View>
        {service?.vehicle_plate && (
          <View style={styles.infoRow}>
            <Ionicons name="car" size={16} color="#64748b" />
            <Text style={styles.infoText}>{service.vehicle_type} {service.vehicle_model} — {service.vehicle_plate}</Text>
          </View>
        )}

        {/* Client Info */}
        {client && (
          <View style={styles.clientCard}>
            <Text style={styles.clientLabel}>CLIENTE</Text>
            <View style={styles.clientRow}>
              <LinearGradient colors={['#3b82f6', '#6366f1']} style={styles.clientAvatar}>
                <Text style={styles.clientInitial}>{client.full_name?.[0] || 'C'}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.clientName}>{client.full_name}</Text>
              </View>
              {client.phone && (
                <TouchableOpacity style={styles.phoneBtn} onPress={() => Linking.openURL(`tel:${client.phone}`)}>
                  <Ionicons name="call" size={18} color="#22c55e" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Status Action Button */}
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
            <Text style={styles.completedEmoji}>🎉</Text>
            <Text style={styles.completedText}>Servicio completado</Text>
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
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  map: { width: SCREEN_WIDTH, height: 260 },
  backBtn: { position: 'absolute', top: 56, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(15,23,42,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  sheet: { flex: 1, backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, paddingHorizontal: 20, paddingTop: 24 },
  serviceTitle: { color: '#f8fafc', fontSize: 22, fontWeight: '800', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoText: { color: '#94a3b8', fontSize: 14, flex: 1 },
  clientCard: { backgroundColor: 'rgba(30,41,59,0.5)', borderRadius: 18, padding: 16, marginTop: 16, borderWidth: 1, borderColor: 'rgba(71,85,105,0.2)' },
  clientLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  clientAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  clientInitial: { color: '#fff', fontSize: 16, fontWeight: '800' },
  clientName: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  phoneBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(34,197,94,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  actionBtn: { borderRadius: 18, overflow: 'hidden', marginTop: 24 },
  actionGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 18 },
  actionEmoji: { fontSize: 22 },
  actionText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  completedBanner: { alignItems: 'center', marginTop: 24, padding: 20, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  completedEmoji: { fontSize: 36, marginBottom: 8 },
  completedText: { color: '#22c55e', fontSize: 18, fontWeight: '700' },
});
