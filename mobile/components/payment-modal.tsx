import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONTS } from '@/constants/theme';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  amount: number;
  onConfirm: (method: string) => void;
}

export default function PaymentModal({ visible, onClose, amount, onConfirm }: PaymentModalProps) {
  const [method, setMethod] = useState<'online' | 'cash'>('online');
  const [onlineType, setOnlineType] = useState<'pse' | 'card'>('pse');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleConfirm = () => {
    setIsLoading(true);
    // Simulate payment processing
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      if (onConfirm) onConfirm(method);
      
      // Close after showing success
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2000);
    }, 1500);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(val);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          
          {isSuccess ? (
            <View style={styles.successContainer}>
              <View style={styles.successIconWrapper}>
                <Ionicons name="checkmark-circle" size={64} color={COLORS.green} />
              </View>
              <Text style={styles.successTitle}>¡Pago Exitoso!</Text>
              <Text style={styles.successText}>Tu servicio ha sido confirmado. Hemos registrado tu método de pago.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.headerTitle}>Confirmar y Pagar</Text>
                  <Text style={styles.headerSubtitle}>Completa tu transacción para finalizar</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Amount Card */}
              <View style={styles.amountCard}>
                <View style={styles.amountInfo}>
                  <Text style={styles.amountLabel}>Total a pagar</Text>
                  <Text style={styles.amountValue}>{formatCurrency(amount || 0)}</Text>
                </View>
                <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.amountIconWrapper}>
                  <Ionicons name="shield-checkmark" size={24} color="#fff" />
                </LinearGradient>
              </View>

              {/* Method Selection */}
              <Text style={styles.sectionTitle}>Método de Pago</Text>
              <View style={styles.methodsRow}>
                <TouchableOpacity 
                  style={[styles.methodBtn, method === 'online' && styles.methodBtnActive]} 
                  onPress={() => setMethod('online')}
                >
                  <View style={[styles.methodIconBox, method === 'online' && styles.methodIconBoxActiveBlue]}>
                    <Ionicons name="flash" size={20} color={method === 'online' ? '#3b82f6' : COLORS.textMuted} />
                  </View>
                  <Text style={styles.methodText}>En Línea</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.methodBtn, method === 'cash' && styles.methodBtnActive]} 
                  onPress={() => setMethod('cash')}
                >
                  <View style={[styles.methodIconBox, method === 'cash' && styles.methodIconBoxActiveIndigo]}>
                    <Ionicons name="cash" size={20} color={method === 'cash' ? '#6366f1' : COLORS.textMuted} />
                  </View>
                  <Text style={styles.methodText}>Efectivo</Text>
                </TouchableOpacity>
              </View>

              {/* Conditional Content */}
              {method === 'online' ? (
                <View style={styles.onlineContainer}>
                  <View style={styles.onlineTabs}>
                    <TouchableOpacity 
                      style={[styles.onlineTab, onlineType === 'pse' && styles.onlineTabActive]}
                      onPress={() => setOnlineType('pse')}
                    >
                      <Text style={[styles.onlineTabText, onlineType === 'pse' && styles.onlineTabTextActive]}>PSE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.onlineTab, onlineType === 'card' && styles.onlineTabActive]}
                      onPress={() => setOnlineType('card')}
                    >
                      <Text style={[styles.onlineTabText, onlineType === 'card' && styles.onlineTabTextActive]}>Tarjeta</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {onlineType === 'pse' ? (
                    <View style={styles.fakeInput}>
                      <Text style={styles.fakeInputText}>Selecciona tu banco (Simulación)</Text>
                      <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
                    </View>
                  ) : (
                    <View style={styles.cardGrid}>
                      <View style={[styles.fakeInput, { flex: 1, minWidth: '100%' }]}>
                        <Text style={styles.fakeInputText}>Número de tarjeta</Text>
                      </View>
                      <View style={[styles.fakeInput, { flex: 1 }]}>
                        <Text style={styles.fakeInputText}>MM/YY</Text>
                      </View>
                      <View style={[styles.fakeInput, { flex: 1 }]}>
                        <Text style={styles.fakeInputText}>CVV</Text>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.cashWarning}>
                  <Ionicons name="alert-circle" size={20} color={COLORS.yellow} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cashWarningTitle}>Pago Directo al Técnico</Text>
                    <Text style={styles.cashWarningText}>
                      Debes entregar el valor total en efectivo al técnico una vez finalizado el servicio.
                    </Text>
                  </View>
                </View>
              )}

              {/* Action Button */}
              <TouchableOpacity 
                style={[styles.confirmBtn, isLoading && { opacity: 0.6 }]} 
                onPress={handleConfirm}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.confirmGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name={method === 'online' ? "card" : "checkmark"} size={20} color="#fff" />
                      <Text style={styles.confirmText}>
                        {method === 'online' ? "Pagar ahora" : "Confirmar Pago en Efectivo"}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={styles.secureFooter}>
                <Ionicons name="lock-closed" size={10} color={COLORS.textMuted} />
                <Text style={styles.secureText}>Pago seguro procesado por Tec360 Gateway</Text>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, backgroundColor: COLORS.bgCard, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  scrollContent: { padding: 24 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  headerTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  headerSubtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
  closeBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  
  amountCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 20, borderRadius: 16, marginBottom: 24 },
  amountInfo: { gap: 4 },
  amountLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  amountValue: { color: COLORS.text, fontSize: 28, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  amountIconWrapper: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  
  sectionTitle: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 12 },
  methodsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  methodBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, alignItems: 'center', gap: 8 },
  methodBtnActive: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' },
  methodIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  methodIconBoxActiveBlue: { backgroundColor: 'rgba(59,130,246,0.2)' },
  methodIconBoxActiveIndigo: { backgroundColor: 'rgba(99,102,241,0.2)' },
  methodText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  
  onlineContainer: { marginBottom: 24 },
  onlineTabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4, marginBottom: 16 },
  onlineTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  onlineTabActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  onlineTabText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  onlineTabTextActive: { color: COLORS.text },
  
  fakeInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.8)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  fakeInputText: { color: COLORS.textMuted, fontSize: 13 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  
  cashWarning: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', padding: 16, borderRadius: 16, marginBottom: 24 },
  cashWarningTitle: { color: COLORS.yellow, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  cashWarningText: { color: 'rgba(245,158,11,0.8)', fontSize: 12, lineHeight: 18 },
  
  confirmBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  confirmGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  secureFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  secureText: { color: COLORS.textMuted, fontSize: 10 },
  
  successContainer: { padding: 40, alignItems: 'center' },
  successIconWrapper: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(34,197,94,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successTitle: { color: COLORS.text, fontSize: 24, fontWeight: '800', marginBottom: 8 },
  successText: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
