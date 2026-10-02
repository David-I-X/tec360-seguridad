import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONTS } from '@/constants/theme';
import { createDigitalPaymentIntent, confirmDigitalPayment } from '@/lib/api';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  amount: number;
  serviceId?: string;
  onConfirm: (method: string) => void;
}

export default function PaymentModal({ visible, onClose, amount, serviceId, onConfirm }: PaymentModalProps) {
  const [method, setMethod] = useState<'online' | 'cash'>('online');
  const [onlineType, setOnlineType] = useState<'pse' | 'card' | 'nequi' | 'daviplata'>('pse');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Procesando pago...');
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    txId?: string;
    invoiceNumber?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (method === 'cash') {
      onConfirm('cash');
      onClose();
      return;
    }

    if (!serviceId) {
      setErrorMessage('No se encontró el identificador del servicio');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage('Creando intención de pago segura...');

    try {
      // 1. Intent con la pasarela digital
      const intent = await createDigitalPaymentIntent(serviceId, amount, onlineType);

      setStatusMessage('Validando transacción con la entidad financiera...');
      await new Promise(r => setTimeout(r, 1800));

      // 2. Confirmación con la pasarela y emisión DIAN
      setStatusMessage('Generando factura electrónica DIAN...');
      const confirmRes = await confirmDigitalPayment(intent.transaction_id);

      setPaymentResult({
        txId: confirmRes.transaction_id,
        invoiceNumber: confirmRes.invoice_number,
      });

      setIsSuccess(true);
      if (onConfirm) onConfirm(onlineType);
    } catch (e: any) {
      console.error('[PaymentModal] Error al procesar pago:', e);
      setErrorMessage(e.message || 'Ocurrió un error al procesar el pago. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDone = () => {
    setIsSuccess(false);
    setPaymentResult(null);
    onClose();
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
              <Text style={styles.successText}>
                Tu servicio ha sido pagado y validado satisfactoriamente.
              </Text>

              {paymentResult && (
                <View style={styles.receiptBox}>
                  {paymentResult.txId && (
                    <Text style={styles.receiptText}>
                      Ref: {paymentResult.txId}
                    </Text>
                  )}
                  {paymentResult.invoiceNumber && (
                    <Text style={[styles.receiptText, { color: '#22c55e', fontWeight: '700' }]}>
                      Factura DIAN: {paymentResult.invoiceNumber}
                    </Text>
                  )}
                </View>
              )}

              <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.8}>
                <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.confirmGradient}>
                  <Text style={styles.confirmText}>Aceptar y Finalizar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.headerTitle}>Confirmar y Pagar</Text>
                  <Text style={styles.headerSubtitle}>Completa tu transacción para finalizar</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={isLoading}>
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
                  disabled={isLoading}
                >
                  <View style={[styles.methodIconBox, method === 'online' && styles.methodIconBoxActiveBlue]}>
                    <Ionicons name="flash" size={20} color={method === 'online' ? '#3b82f6' : COLORS.textMuted} />
                  </View>
                  <Text style={styles.methodText}>En Línea</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.methodBtn, method === 'cash' && styles.methodBtnActive]} 
                  onPress={() => setMethod('cash')}
                  disabled={isLoading}
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
                  <Text style={styles.subSectionTitle}>Canal Digital</Text>
                  <View style={styles.onlineTabs}>
                    {[
                      { id: 'pse', label: 'PSE' },
                      { id: 'card', label: 'Tarjeta' },
                      { id: 'nequi', label: 'Nequi' },
                      { id: 'daviplata', label: 'Daviplata' },
                    ].map(tab => (
                      <TouchableOpacity 
                        key={tab.id}
                        style={[styles.onlineTab, onlineType === tab.id && styles.onlineTabActive]}
                        onPress={() => setOnlineType(tab.id as any)}
                        disabled={isLoading}
                      >
                        <Text style={[styles.onlineTabText, onlineType === tab.id && styles.onlineTabTextActive]}>
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {onlineType === 'pse' && (
                    <View style={styles.fakeInput}>
                      <Text style={styles.fakeInputText}>Bancos colombianos vía PSE (Sandbox)</Text>
                      <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                    </View>
                  )}
                  {onlineType === 'card' && (
                    <View style={styles.cardGrid}>
                      <View style={[styles.fakeInput, { flex: 1, minWidth: '100%' }]}>
                        <Text style={styles.fakeInputText}>Tarjeta Débito / Crédito (Visa, Mastercard)</Text>
                        <Ionicons name="card" size={16} color="#3b82f6" />
                      </View>
                    </View>
                  )}
                  {onlineType === 'nequi' && (
                    <View style={styles.fakeInput}>
                      <Text style={styles.fakeInputText}>Pasarela Nequi Colombia (Sandbox)</Text>
                      <Ionicons name="phone-portrait" size={16} color="#a855f7" />
                    </View>
                  )}
                  {onlineType === 'daviplata' && (
                    <View style={styles.fakeInput}>
                      <Text style={styles.fakeInputText}>Pasarela Daviplata (Sandbox)</Text>
                      <Ionicons name="wallet" size={16} color="#ef4444" />
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

              {/* Error Message */}
              {errorMessage && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color="#ef4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Action Button */}
              <TouchableOpacity 
                style={[styles.confirmBtn, isLoading && { opacity: 0.7 }]} 
                onPress={handleConfirm}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.confirmGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {isLoading ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.confirmText}>{statusMessage}</Text>
                    </View>
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
                <Text style={styles.secureText}>Pago cifrado y protegido por Tec360 Gateway</Text>
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
  subSectionTitle: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  methodsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  methodBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, alignItems: 'center', gap: 8 },
  methodBtnActive: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' },
  methodIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  methodIconBoxActiveBlue: { backgroundColor: 'rgba(59,130,246,0.2)' },
  methodIconBoxActiveIndigo: { backgroundColor: 'rgba(99,102,241,0.2)' },
  methodText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  
  onlineContainer: { marginBottom: 20 },
  onlineTabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4, marginBottom: 14, gap: 4 },
  onlineTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  onlineTabActive: { backgroundColor: 'rgba(139,92,246,0.3)', borderWidth: 1, borderColor: '#8b5cf6' },
  onlineTabText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  onlineTabTextActive: { color: '#fff', fontWeight: '700' },
  
  fakeInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.8)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  fakeInputText: { color: '#cbd5e1', fontSize: 12 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  
  cashWarning: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', padding: 16, borderRadius: 16, marginBottom: 20 },
  cashWarningTitle: { color: COLORS.yellow, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  cashWarningText: { color: 'rgba(245,158,11,0.8)', fontSize: 12, lineHeight: 18 },
  
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', padding: 12, borderRadius: 12, marginBottom: 16 },
  errorText: { color: '#f87171', fontSize: 12, flex: 1 },

  confirmBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  confirmGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  
  secureFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  secureText: { color: COLORS.textMuted, fontSize: 10 },
  
  successContainer: { padding: 32, alignItems: 'center' },
  successIconWrapper: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(34,197,94,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { color: COLORS.text, fontSize: 24, fontWeight: '800', marginBottom: 8 },
  successText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  receiptBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  receiptText: { color: '#cbd5e1', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  doneBtn: { width: '100%', borderRadius: 16, overflow: 'hidden', marginTop: 8 },
});
