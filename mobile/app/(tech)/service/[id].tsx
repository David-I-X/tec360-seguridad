import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Image, Dimensions, Linking, Platform, RefreshControl,
  Modal, TextInput, KeyboardAvoidingView,
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
import { COLORS, SPACING, RADIUS, FONTS } from '@/constants/theme';

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
  const [refreshing, setRefreshing] = useState(false);
  const [paymentRegistered, setPaymentRegistered] = useState(false);
  const [isRegisteringPayment, setIsRegisteringPayment] = useState(false);
  const [incidentModalVisible, setIncidentModalVisible] = useState(false);
  const [incidentData, setIncidentData] = useState({ type: 'other', desc: '' });
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);
  const [adjustmentModalVisible, setAdjustmentModalVisible] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({ amount: '', desc: '' });
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<any>(null);
  const lastRouteFetch = useRef<{ lat: number; lng: number } | null>(null);

  const loadService = useCallback(async () => {
    try {
      const data = await getServiceById(id!);
      setService(data.service || data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); setRefreshing(false); }
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
    formData.append('image_type', stage);
    await fetchWithAuth('/uploads/service-photo', { method: 'POST', body: formData });
  };

  // Check if payment already registered for this service
  useEffect(() => {
    if (!service || service.status !== 'completed') return;
    (async () => {
      try {
        const res = await fetchWithAuth(`/payments/service/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) setPaymentRegistered(true);
        }
      } catch (_) {}
    })();
  }, [service?.status, id]);

  const registerCashPayment = async (amountStr: string) => {
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }
    setIsRegisteringPayment(true);
    try {
      const res = await fetchWithAuth('/payments/cash/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: id, amount }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al registrar pago');
      }
      setPaymentRegistered(true);
      Alert.alert('✅ Pago registrado', `$${amount.toLocaleString('es-CO')} COP registrado exitosamente.`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsRegisteringPayment(false);
    }
  };

  const handleReportIncident = async () => {
    if (!incidentData.desc || incidentData.desc.length < 10) {
      Alert.alert('Error', 'La descripción debe tener al menos 10 caracteres');
      return;
    }
    setIsSubmittingIncident(true);
    try {
      const res = await fetchWithAuth(`/services/${id}/incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_type: incidentData.type,
          description: incidentData.desc
        })
      });
      if (!res.ok) throw new Error('Error al reportar incidente');
      Alert.alert('Incidente reportado', 'El equipo de soporte ha sido notificado.');
      setIncidentModalVisible(false);
      setIncidentData({ type: 'other', desc: '' });
      loadService();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSubmittingIncident(false);
    }
  };

  const handlePriceAdjustment = async () => {
    const amount = Number(adjustmentData.amount);
    if (!amount || amount <= 0 || !adjustmentData.desc) {
      Alert.alert('Error', 'Ingresa un monto válido y una descripción');
      return;
    }
    setIsSubmittingAdjustment(true);
    try {
      const res = await fetchWithAuth(`/services/${id}/price-adjustment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description: adjustmentData.desc
        })
      });
      if (!res.ok) throw new Error('Error al solicitar ajuste');
      Alert.alert('Solicitud enviada', 'El cliente debe aprobar este ajuste.');
      setAdjustmentModalVisible(false);
      setAdjustmentData({ amount: '', desc: '' });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSubmittingAdjustment(false);
    }
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
      <ScrollView 
        style={styles.sheet} 
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadService(); }} tintColor="#8b5cf6" />}
      >
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
              <TouchableOpacity style={styles.phoneBtn} onPress={() => router.push(`/(tech)/chat/${id}` as any)}>
                <Ionicons name="chatbubbles" size={18} color="#8b5cf6" />
              </TouchableOpacity>
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

        {service?.status === 'pending' && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push(`/(tech)/quotation/${id}/new` as any)}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#a855f7', '#9333ea']} style={styles.actionGradient}>
              <Text style={styles.actionEmoji}>💰</Text>
              <Text style={styles.actionText}>Cotizar Servicio</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {service?.status === 'completed' && (
          <View style={styles.completedBanner}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🎉</Text>
            <Text style={{ color: '#22c55e', fontSize: 18, fontWeight: '700' }}>Servicio completado</Text>
            {!paymentRegistered ? (
              <TouchableOpacity
                style={[styles.actionBtn, { marginTop: 16, width: '100%' }, isRegisteringPayment && { opacity: 0.6 }]}
                disabled={isRegisteringPayment}
                activeOpacity={0.8}
                onPress={() => {
                  const defaultAmount = service?.estimated_price ? String(service.estimated_price) : '';
                  Alert.prompt
                    ? Alert.prompt('💰 Registrar Cobro', 'Ingresa el monto recibido en COP:', [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Confirmar', onPress: (val?: string) => registerCashPayment(val || defaultAmount) },
                      ], 'plain-text', defaultAmount, 'number-pad')
                    : Alert.alert('💰 Registrar Cobro', `¿Confirmar cobro de $${defaultAmount || '0'} COP?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Confirmar', onPress: () => registerCashPayment(defaultAmount) },
                      ]);
                }}
              >
                <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.actionGradient}>
                  {isRegisteringPayment ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={styles.actionEmoji}>💰</Text>
                      <Text style={styles.actionText}>Registrar Cobro</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                <Text style={{ color: '#22c55e', fontSize: 14, fontWeight: '600' }}>Pago registrado</Text>
              </View>
            )}
          </View>
        )}

        {/* Secondary Actions (Report Incident / Price Adjustment) */}
        {service?.status !== 'completed' && service?.status !== 'cancelled' && (
          <View style={styles.secondaryActionsContainer}>
            <TouchableOpacity 
              style={styles.secondaryBtn}
              onPress={() => setIncidentModalVisible(true)}
            >
              <Ionicons name="warning-outline" size={20} color="#f59e0b" />
              <Text style={styles.secondaryBtnText}>Reportar Incidente</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryBtn}
              onPress={() => setAdjustmentModalVisible(true)}
            >
              <Ionicons name="pricetag-outline" size={20} color="#3b82f6" />
              <Text style={styles.secondaryBtnText}>Ajuste de Monto</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Chat button is now inside the client card above */}
      </ScrollView>

      {/* Incident Modal */}
      <Modal visible={incidentModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reportar Incidente</Text>
              <TouchableOpacity onPress={() => setIncidentModalVisible(false)}>
                <Ionicons name="close" size={24} color="#f0f0f5" />
              </TouchableOpacity>
            </View>
            <View style={styles.incidentTypes}>
              {[
                { id: 'client_absent', label: 'Cliente ausente' },
                { id: 'vehicle_mismatch', label: 'Vehículo diferente' },
                { id: 'device_incompatible', label: 'Incompatible' },
                { id: 'security_issue', label: 'Seguridad' },
                { id: 'other', label: 'Otro' },
              ].map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.typeBtn, incidentData.type === type.id && styles.typeBtnActive]}
                  onPress={() => setIncidentData({ ...incidentData, type: type.id })}
                >
                  <Text style={[styles.typeText, incidentData.type === type.id && styles.typeTextActive]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.textArea}
              placeholder="Describe el incidente (mínimo 10 caracteres)..."
              placeholderTextColor="#555872"
              multiline
              value={incidentData.desc}
              onChangeText={text => setIncidentData({ ...incidentData, desc: text })}
            />
            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: '#f59e0b' }]} 
              onPress={handleReportIncident}
              disabled={isSubmittingIncident}
            >
              {isSubmittingIncident ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Reportar Incidente</Text>}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Adjustment Modal */}
      <Modal visible={adjustmentModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajuste de Monto</Text>
              <TouchableOpacity onPress={() => setAdjustmentModalVisible(false)}>
                <Ionicons name="close" size={24} color="#f0f0f5" />
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#8b8fa3', fontSize: 13, marginBottom: 16 }}>
              Solicita un pago extra por viáticos, materiales adicionales o tiempo extra.
            </Text>
            <View style={styles.inputWrap}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="Monto adicional"
                placeholderTextColor="#555872"
                keyboardType="numeric"
                value={adjustmentData.amount}
                onChangeText={text => setAdjustmentData({ ...adjustmentData, amount: text })}
              />
            </View>
            <TextInput
              style={[styles.textArea, { height: 80, marginTop: 12 }]}
              placeholder="Razón del ajuste..."
              placeholderTextColor="#555872"
              multiline
              value={adjustmentData.desc}
              onChangeText={text => setAdjustmentData({ ...adjustmentData, desc: text })}
            />
            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: '#3b82f6' }]} 
              onPress={handlePriceAdjustment}
              disabled={isSubmittingAdjustment}
            >
              {isSubmittingAdjustment ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Solicitar Ajuste</Text>}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  map: { width: SCREEN_WIDTH, height: 300 },
  backBtn: { position: 'absolute', top: 56, left: SPACING.md, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(15,23,42,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  navBtn: { position: 'absolute', top: 56, right: SPACING.md, borderRadius: 20, overflow: 'hidden', zIndex: 10 },
  navBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 10, borderRadius: 20 },
  navBtnText: { color: '#fff', fontSize: 13, fontWeight: FONTS.weights.bold },
  etaOverlay: { position: 'absolute', top: 100, left: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: 'rgba(10,14,28,0.92)', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, zIndex: 10 },
  etaText: { color: COLORS.text, fontSize: 13, fontWeight: FONTS.weights.bold },
  etaDivider: { color: COLORS.textMuted, fontSize: 13 },
  etaDistance: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs },
  sheet: { flex: 1, backgroundColor: COLORS.bg, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, marginTop: -SPACING.lg, paddingHorizontal: 20, paddingTop: SPACING.lg },
  serviceTitle: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginBottom: SPACING.md },
  infoGrid: { gap: 12, marginBottom: SPACING.md },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: RADIUS.lg, padding: 20, borderWidth: 1, borderColor: COLORS.borderLight },
  infoIconBox: { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  infoLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: FONTS.weights.semibold, marginBottom: 2 },
  infoValue: { color: COLORS.text, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },
  infoSub: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginTop: 1 },
  trackingBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: 'rgba(34,197,94,0.08)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', borderRadius: 14, padding: SPACING.md, marginBottom: SPACING.md },
  trackingDot: { width: SPACING.sm, height: SPACING.sm, borderRadius: SPACING.xs, backgroundColor: COLORS.green },
  trackingText: { color: COLORS.green, fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold, flex: 1 },
  clientCard: { backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 18, padding: 20, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  clientLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: FONTS.weights.bold, letterSpacing: 1, marginBottom: SPACING.md },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  clientAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  clientInitial: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '800' },
  clientName: { color: COLORS.text, fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold },
  clientPhone: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginTop: 2 },
  phoneBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.greenMuted, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.greenBorder },
  actionBtn: { borderRadius: 18, overflow: 'hidden', marginTop: SPACING.sm, marginBottom: SPACING.md },
  actionGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 18, borderRadius: 18 },
  actionEmoji: { fontSize: 22 },
  actionText: { color: '#fff', fontSize: FONTS.sizes.lg, fontWeight: '800' },
  completedBanner: { alignItems: 'center', marginTop: SPACING.sm, padding: 20, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  secondaryActionsContainer: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: 'rgba(10,14,28,0.8)', paddingVertical: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  secondaryBtnText: { color: COLORS.text, fontSize: 13, fontWeight: FONTS.weights.semibold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#18181b', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: COLORS.text, fontSize: FONTS.sizes.xl, fontWeight: '800' },
  incidentTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  typeBtn: { paddingHorizontal: 14, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: 'rgba(10,14,28,0.8)', borderWidth: 1, borderColor: COLORS.border },
  typeBtnActive: { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: '#f59e0b' },
  typeText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: FONTS.weights.semibold },
  typeTextActive: { color: '#f59e0b' },
  textArea: { backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: RADIUS.lg, padding: SPACING.md, color: COLORS.text, fontSize: FONTS.sizes.sm, height: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  submitBtn: { paddingVertical: SPACING.md, borderRadius: RADIUS.lg, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  currencySymbol: { color: COLORS.textMuted, fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, marginRight: SPACING.sm },
  amountInput: { flex: 1, color: COLORS.text, fontSize: FONTS.sizes.xl, paddingVertical: SPACING.md, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  chatInlineBtn: { borderRadius: 18, overflow: 'hidden', marginTop: SPACING.lg, marginBottom: SPACING.md },
  chatInlineGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16, borderRadius: 18 },
  chatInlineText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '800' },
});
