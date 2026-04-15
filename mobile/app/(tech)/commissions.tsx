import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { fetchWithAuth, API_URL } from '@/lib/api';

export default function CommissionsScreen() {
  const router = useRouter();
  const [balance, setBalance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/commissions/me/balance');
      if (res.ok) {
        const data = await res.json();
        setBalance(data);
      }
    } catch (e) {
      console.error('Error loading balance:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUploadReceipt = async () => {
    if (!balance?.active_payment?.id) {
      Alert.alert('Sin pago pendiente', 'No tienes comisiones pendientes de pago.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: result.assets[0].uri,
        name: 'receipt.jpg',
        type: 'image/jpeg',
      } as any);
      formData.append('payment_id', balance.active_payment.id);
      formData.append('payment_method', 'nequi');

      const res = await fetchWithAuth('/commissions/me/submit-receipt', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        Alert.alert(
          '✅ Comprobante Enviado',
          'Tu comprobante será revisado por un administrador. Te notificaremos cuando sea aprobado.',
        );
        load();
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Error', err.detail || 'No se pudo enviar el comprobante');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error al subir comprobante');
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    if (!balance?.active_payment?.id) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: result.assets[0].uri,
        name: 'receipt.jpg',
        type: 'image/jpeg',
      } as any);
      formData.append('payment_id', balance.active_payment.id);
      formData.append('payment_method', 'nequi');

      const res = await fetchWithAuth('/commissions/me/submit-receipt', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        Alert.alert('✅ Comprobante Enviado', 'Será revisado por un administrador.');
        load();
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Error', err.detail || 'No se pudo enviar');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#8b5cf6" /></View>;
  }

  const pending = balance?.pending_amount || 0;
  const freeRemaining = balance?.free_services_remaining || 0;
  const isBlocked = balance?.is_blocked || false;
  const activePayment = balance?.active_payment;
  const totalPaid = balance?.total_paid || 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#8b5cf6" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#f0f0f5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Comisiones</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Blocked Banner */}
      {isBlocked && (
        <View style={styles.blockedBanner}>
          <LinearGradient colors={['rgba(239,68,68,0.2)', 'rgba(220,38,38,0.1)']} style={styles.blockedGradient}>
            <Ionicons name="warning" size={24} color="#ef4444" />
            <View style={{ flex: 1 }}>
              <Text style={styles.blockedTitle}>⚠️ Cuenta Bloqueada</Text>
              <Text style={styles.blockedText}>
                No puedes aceptar servicios hasta que pagues tus comisiones pendientes.
              </Text>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <LinearGradient
          colors={pending > 0 ? ['rgba(249,115,22,0.15)', 'rgba(234,88,12,0.08)'] : ['rgba(34,197,94,0.15)', 'rgba(22,163,74,0.08)']}
          style={styles.balanceGradient}
        >
          <Text style={styles.balanceLabel}>Comisión Pendiente</Text>
          <Text style={[styles.balanceAmount, { color: pending > 0 ? '#f97316' : '#22c55e' }]}>
            ${pending.toLocaleString('es-CO')} COP
          </Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatValue}>{balance?.pending_services || 0}</Text>
              <Text style={styles.balanceStatLabel}>Servicios pendientes</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatValue}>${totalPaid.toLocaleString('es-CO')}</Text>
              <Text style={styles.balanceStatLabel}>Total pagado</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Free Services Badge */}
      {freeRemaining > 0 && (
        <View style={styles.freeCard}>
          <LinearGradient colors={['rgba(139,92,246,0.15)', 'rgba(99,102,241,0.08)']} style={styles.freeGradient}>
            <Text style={styles.freeEmoji}>🎉</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.freeTitle}>Servicios Gratis Restantes</Text>
              <Text style={styles.freeText}>
                Te quedan {freeRemaining} servicio{freeRemaining !== 1 ? 's' : ''} sin comisión como bienvenida.
              </Text>
            </View>
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>{freeRemaining}</Text>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>📋 ¿Cómo funciona?</Text>
        <View style={styles.infoStep}>
          <View style={styles.stepDot}><Text style={styles.stepNum}>1</Text></View>
          <Text style={styles.infoText}>Completas un servicio y se calcula el 10% de comisión.</Text>
        </View>
        <View style={styles.infoStep}>
          <View style={styles.stepDot}><Text style={styles.stepNum}>2</Text></View>
          <Text style={styles.infoText}>Cada 3 servicios, te notificamos para que consignes.</Text>
        </View>
        <View style={styles.infoStep}>
          <View style={styles.stepDot}><Text style={styles.stepNum}>3</Text></View>
          <Text style={styles.infoText}>Transfieres a Nequi/Bancolombia y subes el comprobante.</Text>
        </View>
        <View style={styles.infoStep}>
          <View style={styles.stepDot}><Text style={styles.stepNum}>4</Text></View>
          <Text style={styles.infoText}>Un admin verifica y aprueba tu pago. ¡Listo!</Text>
        </View>
      </View>

      {/* Active Payment Section */}
      {activePayment && (
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>
            {activePayment.status === 'submitted' ? '⏳ Comprobante en Revisión' : '💳 Pago Pendiente'}
          </Text>

          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Monto</Text>
              <Text style={styles.paymentValue}>${activePayment.amount.toLocaleString('es-CO')} COP</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Estado</Text>
              <View style={[styles.statusBadge, {
                backgroundColor: activePayment.status === 'submitted'
                  ? 'rgba(234,179,8,0.15)'
                  : activePayment.status === 'approved'
                    ? 'rgba(34,197,94,0.15)'
                    : 'rgba(249,115,22,0.15)',
              }]}>
                <Text style={[styles.statusText, {
                  color: activePayment.status === 'submitted' ? '#eab308'
                    : activePayment.status === 'approved' ? '#22c55e' : '#f97316',
                }]}>
                  {activePayment.status === 'pending' ? 'Pendiente'
                    : activePayment.status === 'submitted' ? 'En revisión'
                      : activePayment.status === 'approved' ? 'Aprobado'
                        : 'Rechazado'}
                </Text>
              </View>
            </View>
            {activePayment.due_date && activePayment.status === 'pending' && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Fecha límite</Text>
                <Text style={[styles.paymentValue, { color: '#ef4444' }]}>
                  {new Date(activePayment.due_date).toLocaleDateString('es-CO', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
            )}
          </View>

          {/* Transfer Info */}
          {activePayment.status === 'pending' && (
            <>
              <View style={styles.transferCard}>
                <Text style={styles.transferTitle}>📱 Datos de Transferencia</Text>
                <View style={styles.transferRow}>
                  <Text style={styles.transferLabel}>Nequi</Text>
                  <Text style={styles.transferValue}>301-XXX-XXXX</Text>
                </View>
                <View style={styles.transferRow}>
                  <Text style={styles.transferLabel}>A nombre de</Text>
                  <Text style={styles.transferValue}>Tec360 Seguridad</Text>
                </View>
                <View style={styles.transferRow}>
                  <Text style={styles.transferLabel}>Monto</Text>
                  <Text style={[styles.transferValue, { color: '#f97316', fontWeight: '800' }]}>
                    ${activePayment.amount.toLocaleString('es-CO')} COP
                  </Text>
                </View>
              </View>

              {/* Upload Buttons */}
              <View style={styles.uploadSection}>
                <TouchableOpacity onPress={handleUploadReceipt} disabled={uploading} activeOpacity={0.8}>
                  <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.uploadBtn}>
                    {uploading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="image" size={20} color="#fff" />
                        <Text style={styles.uploadBtnText}>Subir Comprobante</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleTakePhoto} disabled={uploading} activeOpacity={0.8}>
                  <View style={styles.cameraBtn}>
                    <Ionicons name="camera" size={20} color="#8b5cf6" />
                    <Text style={styles.cameraBtnText}>Tomar Foto</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </>
          )}

          {activePayment.status === 'submitted' && (
            <View style={styles.waitingCard}>
              <ActivityIndicator size="small" color="#eab308" />
              <Text style={styles.waitingText}>
                Tu comprobante está siendo revisado. Te notificaremos cuando sea aprobado.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* No Pending */}
      {!activePayment && pending === 0 && (
        <View style={styles.allClearCard}>
          <Text style={styles.allClearEmoji}>✅</Text>
          <Text style={styles.allClearTitle}>¡Todo al día!</Text>
          <Text style={styles.allClearText}>No tienes comisiones pendientes.</Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  centered: { flex: 1, backgroundColor: '#050810', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { color: '#f0f0f5', fontSize: 18, fontWeight: '800' },

  blockedBanner: { marginHorizontal: 20, marginBottom: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  blockedGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  blockedTitle: { color: '#ef4444', fontSize: 15, fontWeight: '800' },
  blockedText: { color: '#fca5a5', fontSize: 13, lineHeight: 18, marginTop: 2 },

  balanceCard: { marginHorizontal: 20, marginBottom: 16, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  balanceGradient: { padding: 24, alignItems: 'center' },
  balanceLabel: { color: '#888', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  balanceAmount: { fontSize: 36, fontWeight: '900', marginVertical: 8 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, width: '100%' },
  balanceStat: { flex: 1, alignItems: 'center' },
  balanceStatValue: { color: '#f0f0f5', fontSize: 16, fontWeight: '700' },
  balanceStatLabel: { color: '#555872', fontSize: 11, marginTop: 2 },
  balanceDivider: { width: 1, height: 30, backgroundColor: 'rgba(80,60,160,0.3)' },

  freeCard: { marginHorizontal: 20, marginBottom: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  freeGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  freeEmoji: { fontSize: 28 },
  freeTitle: { color: '#c4b5fd', fontSize: 14, fontWeight: '700' },
  freeText: { color: '#8b8bb0', fontSize: 12, marginTop: 2 },
  freeBadge: { backgroundColor: 'rgba(139,92,246,0.3)', borderRadius: 12, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  freeBadgeText: { color: '#a78bfa', fontSize: 18, fontWeight: '900' },

  infoCard: { marginHorizontal: 20, marginBottom: 20, backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  infoTitle: { color: '#f0f0f5', fontSize: 15, fontWeight: '700', marginBottom: 16 },
  infoStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.2)', justifyContent: 'center', alignItems: 'center' },
  stepNum: { color: '#8b5cf6', fontSize: 12, fontWeight: '800' },
  infoText: { color: '#8b8bb0', fontSize: 13, flex: 1, lineHeight: 18 },

  paymentSection: { marginHorizontal: 20, marginBottom: 16 },
  sectionTitle: { color: '#f0f0f5', fontSize: 16, fontWeight: '800', marginBottom: 12 },

  paymentCard: { backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)', marginBottom: 12 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  paymentLabel: { color: '#555872', fontSize: 13 },
  paymentValue: { color: '#f0f0f5', fontSize: 14, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },

  transferCard: { backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', marginBottom: 16 },
  transferTitle: { color: '#f0f0f5', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  transferRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  transferLabel: { color: '#555872', fontSize: 13 },
  transferValue: { color: '#f0f0f5', fontSize: 14, fontWeight: '600' },

  uploadSection: { gap: 10, marginBottom: 16 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  uploadBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cameraBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)', backgroundColor: 'rgba(139,92,246,0.08)' },
  cameraBtnText: { color: '#8b5cf6', fontSize: 15, fontWeight: '700' },

  waitingCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(234,179,8,0.08)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(234,179,8,0.2)' },
  waitingText: { color: '#eab308', fontSize: 13, flex: 1, lineHeight: 18 },

  allClearCard: { alignItems: 'center', paddingVertical: 40, marginHorizontal: 20 },
  allClearEmoji: { fontSize: 48, marginBottom: 12 },
  allClearTitle: { color: '#22c55e', fontSize: 20, fontWeight: '800' },
  allClearText: { color: '#555872', fontSize: 14, marginTop: 4 },
});
