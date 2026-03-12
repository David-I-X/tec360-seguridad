import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Image, Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { useAuth } from '@/lib/auth-context';
import { getServiceById, getAuthToken, API_URL } from '@/lib/api';
import { serviceWebSocket } from '@/lib/websocket';

const STATUS_STEPS = [
  { key: 'assigned', label: 'Técnico asignado', emoji: '🔔' },
  { key: 'en_route', label: 'En camino', emoji: '🚗' },
  { key: 'arrived', label: 'Llegó', emoji: '📍' },
  { key: 'in_progress', label: 'Trabajando', emoji: '🔧' },
  { key: 'completed', label: 'Completado', emoji: '✅' },
];

export default function WaitingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [service, setService] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pulse animation
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(
      withTiming(1.15, { duration: 1000 }),
      withTiming(1, { duration: 1000 }),
    ), -1, true);
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const loadService = useCallback(async () => {
    try {
      const data = await getServiceById(id!);
      setService(data.service || data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { loadService(); }, [loadService]);

  // WebSocket for real-time updates
  useEffect(() => {
    if (!id) return;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      const token = await getAuthToken();
      if (!token) return;

      serviceWebSocket.connect(id, token);
      unsubscribe = serviceWebSocket.onMessage((msg) => {
        if (msg.type === 'status_update') {
          setService((prev: any) => prev ? { ...prev, status: msg.data.status } : prev);
          if (['en_route', 'in_progress'].includes(msg.data.status)) {
            router.push(`/(client)/service/${id}` as any);
          }
        }
      });
    })();

    return () => {
      serviceWebSocket.disconnect();
      unsubscribe?.();
    };
  }, [id, router]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  const tech = service?.technician;
  const currentStep = STATUS_STEPS.findIndex(s => s.key === service?.status);
  const staticUrl = API_URL.replace(/\/api\/?$/, '');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#f0f0f5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Estado del Servicio</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Radar animation */}
      <View style={styles.radarContainer}>
        <Animated.View style={[styles.radarOuter, pulseStyle]}>
          <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.radarInner}>
            <Text style={styles.radarEmoji}>🛡️</Text>
          </LinearGradient>
        </Animated.View>
        <Text style={styles.radarText}>
          {service?.status === 'pending' ? 'Buscando técnicos disponibles...' :
            service?.status === 'assigned' ? 'Técnico asignado' :
              service?.status === 'en_route' ? '¡Tu técnico viene en camino!' :
                'Servicio en progreso'}
        </Text>
      </View>

      {/* Status Stepper */}
      <View style={styles.stepperCard}>
        {STATUS_STEPS.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <View key={step.key} style={[styles.stepRow, { opacity: i > currentStep ? 0.3 : 1 }]}>
              <View style={[styles.stepCircle, done && styles.stepDone, active && styles.stepActive]}>
                {done ? <Ionicons name="checkmark" size={14} color="#fff" /> : <Text style={styles.stepEmoji}>{step.emoji}</Text>}
              </View>
              <Text style={[styles.stepText, active && styles.stepTextActive]}>{step.label}</Text>
              {i < STATUS_STEPS.length - 1 && <View style={[styles.stepLine, done && styles.stepLineDone]} />}
            </View>
          );
        })}
      </View>

      {/* Technician Card */}
      {tech && (
        <View style={styles.techCard}>
          <Text style={styles.techSectionTitle}>Tu Técnico</Text>
          <View style={styles.techRow}>
            {tech.avatar_url ? (
              <Image
                source={{ uri: tech.avatar_url.startsWith('http') ? tech.avatar_url : `${staticUrl}${tech.avatar_url}` }}
                style={styles.techAvatar}
              />
            ) : (
              <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.techAvatar}>
                <Text style={styles.techInitial}>{tech.full_name?.[0] || 'T'}</Text>
              </LinearGradient>
            )}
            <View style={styles.techInfo}>
              <Text style={styles.techName}>{tech.full_name || 'Técnico'}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#eab308" />
                <Text style={styles.ratingText}>{tech.average_rating?.toFixed(1) || '—'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.techActions}>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => tech.phone && Linking.openURL(`tel:${tech.phone}`)}
            >
              <Ionicons name="call" size={18} color="#22c55e" />
              <Text style={styles.callText}>Llamar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => {/* TODO: Navigate to tech profile */}}
            >
              <Ionicons name="person" size={18} color="#8b5cf6" />
              <Text style={styles.profileText}>Ver Perfil</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Service Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>{service?.title}</Text>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={16} color="#555872" />
          <Text style={styles.infoText}>{service?.service_address || service?.service_city}</Text>
        </View>
        {service?.vehicle_plate && (
          <View style={styles.infoRow}>
            <Ionicons name="car" size={16} color="#555872" />
            <Text style={styles.infoText}>{service.vehicle_type} {service.vehicle_model} — {service.vehicle_plate}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  centered: { flex: 1, backgroundColor: '#050810', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  headerTitle: { color: '#f0f0f5', fontSize: 18, fontWeight: '700' },
  radarContainer: { alignItems: 'center', paddingVertical: 30 },
  radarOuter: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: 'rgba(139,92,246,0.3)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  radarInner: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10 },
  radarEmoji: { fontSize: 28 },
  radarText: { color: '#8b8fa3', fontSize: 15, fontWeight: '600' },
  stepperCard: { marginHorizontal: 20, backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(80,60,160,0.3)', borderWidth: 2, borderColor: 'rgba(80,60,160,0.4)' },
  stepDone: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  stepActive: { backgroundColor: 'rgba(139,92,246,0.2)', borderColor: '#8b5cf6' },
  stepEmoji: { fontSize: 14 },
  stepText: { color: '#8b8fa3', fontSize: 14, fontWeight: '600', flex: 1 },
  stepTextActive: { color: '#f0f0f5' },
  stepLine: { position: 'absolute', left: 15, top: 34, width: 2, height: 14, backgroundColor: 'rgba(80,60,160,0.3)' },
  stepLineDone: { backgroundColor: '#22c55e' },
  techCard: { marginHorizontal: 20, backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  techSectionTitle: { color: '#555872', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
  techRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  techAvatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  techInitial: { color: '#fff', fontSize: 20, fontWeight: '800' },
  techInfo: { flex: 1 },
  techName: { color: '#f0f0f5', fontSize: 17, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { color: '#eab308', fontSize: 14, fontWeight: '600' },
  techActions: { flexDirection: 'row', gap: 10 },
  callButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  callText: { color: '#22c55e', fontSize: 14, fontWeight: '700' },
  profileButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(139,92,246,0.1)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' },
  profileText: { color: '#8b5cf6', fontSize: 14, fontWeight: '700' },
  infoCard: { marginHorizontal: 20, backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  infoTitle: { color: '#f0f0f5', fontSize: 17, fontWeight: '700', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoText: { color: '#8b8fa3', fontSize: 14 },
});
