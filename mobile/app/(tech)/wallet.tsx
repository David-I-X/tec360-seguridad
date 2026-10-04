import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, TextInput, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS, NEU } from '@/constants/theme';
import { fetchWithAuth, rechargeCreditsIntent, rechargeCreditsConfirm } from '@/lib/api';
import { useFocusEffect } from 'expo-router';

interface BalanceData {
  technician_id: string;
  balance: number;
  free_services_remaining: number;
  commission_rate: number;
  can_accept_services: boolean;
}

interface CreditTransaction {
  id: string;
  technician_id: string;
  amount: number;
  transaction_type: string;
  description: string;
  external_reference?: string;
  balance_after: number;
  created_at: string;
}

export default function WalletScreen() {
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rechargeModalVisible, setRechargeModalVisible] = useState(false);
  const [customAmount, setCustomAmount] = useState('50000');
  const [paymentMethod, setPaymentMethod] = useState<'pse' | 'nequi' | 'daviplata' | 'card'>('pse');
  const [isRecharging, setIsRecharging] = useState(false);
  const [rechargeError, setRechargeError] = useState<string | null>(null);
  const [rechargeSuccess, setRechargeSuccess] = useState<{
    txId: string;
    amount: number;
    balanceAfter: number;
  } | null>(null);

  const fetchData = async () => {
    try {
      const [balRes, txnRes] = await Promise.all([
        fetchWithAuth('/credits/balance'),
        fetchWithAuth('/credits/transactions?limit=50')
      ]);

      if (balRes.ok) setBalance(await balRes.json());
      if (txnRes.ok) setTransactions(await txnRes.json());
    } catch (e) {
      console.error('[Wallet] Error loading data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleRecharge = async () => {
    const amount = Number(customAmount);
    if (!amount || amount < 10000) {
      setRechargeError('El monto mínimo de recarga es $10.000 COP');
      return;
    }

    setIsRecharging(true);
    setRechargeError(null);

    try {
      // 1. Iniciar intención de recarga
      const intent = await rechargeCreditsIntent(amount, paymentMethod);
      
      // 2. Simulación de procesamiento bancario seguro (1.5s)
      await new Promise(r => setTimeout(r, 1500));

      // 3. Confirmar recarga con pasarela
      const confirmRes = await rechargeCreditsConfirm(intent.transaction_id, amount, paymentMethod);

      setRechargeSuccess({
        txId: confirmRes.transaction_id,
        amount: confirmRes.amount || amount,
        balanceAfter: confirmRes.balance_after,
      });

      fetchData();
    } catch (e: any) {
      console.error('Error recharging:', e);
      setRechargeError(e.message || 'Error al procesar la recarga. Intenta nuevamente.');
    } finally {
      setIsRecharging(false);
    }
  };

  const formatCOP = (num: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(num);
  };

  const getTransactionIcon = (type: string, amount: number) => {
    if (type === 'recharge' || type === 'bonus') return 'arrow-down-outline';
    if (type === 'commission') return 'flash-outline';
    if (type === 'penalty') return 'warning-outline';
    return amount > 0 ? 'arrow-down-outline' : 'arrow-up-outline';
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (type === 'recharge' || type === 'bonus') return COLORS.green;
    if (type === 'commission') return COLORS.primaryLight;
    if (type === 'penalty') return COLORS.red;
    return amount > 0 ? COLORS.green : COLORS.textMuted;
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayIn = transactions
    .filter(t => new Date(t.created_at) >= todayStart && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const todayOut = transactions
    .filter(t => new Date(t.created_at) >= todayStart && t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mi Billetera</Text>
          <Text style={styles.headerSubtitle}>Gestiona tus créditos y pagos</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Balance Card */}
        <LinearGradient
          colors={['#1e1b4b', '#18181b']}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>Saldo Disponible</Text>
          <Text style={styles.balanceAmount}>
            {balance ? formatCOP(balance.balance) : '$0'}
          </Text>
          
          {balance?.free_services_remaining ? (
             <Text style={styles.freeServicesLabel}>
               🎉 {balance.free_services_remaining} servicio(s) gratis restante(s)
             </Text>
          ) : null}

          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.primaryAction} 
              onPress={() => setRechargeModalVisible(true)}
            >
              <LinearGradient colors={['#7c3aed', '#6d28d9']} style={styles.btnGradient}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.btnText}>Recargar</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryAction}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.secondaryBtnText}>Reporte</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>GANADO HOY</Text>
              <Text style={[styles.statValue, { color: COLORS.green }]}>+{formatCOP(todayIn)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>GASTADO HOY</Text>
              <Text style={[styles.statValue, { color: COLORS.red }]}>-{formatCOP(todayOut)}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Transactions list */}
        <Text style={styles.sectionTitle}>Historial Reciente</Text>
        
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Aún no tienes transacciones</Text>
          </View>
        ) : (
          transactions.map(txn => {
            const isPositive = txn.amount > 0;
            const iconColor = getTransactionColor(txn.transaction_type, txn.amount);
            
            return (
              <View key={txn.id} style={styles.txnItem}>
                <View style={[styles.txnIconWrap, { backgroundColor: iconColor + '20' }]}>
                  <Ionicons name={getTransactionIcon(txn.transaction_type, txn.amount) as any} size={20} color={iconColor} />
                </View>
                <View style={styles.txnInfo}>
                  <Text style={styles.txnDesc} numberOfLines={1}>{txn.description || 'Transacción'}</Text>
                  <Text style={styles.txnDate}>
                    {new Date(txn.created_at).toLocaleDateString()} {new Date(txn.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}
                  </Text>
                </View>
                <View style={styles.txnAmountWrap}>
                  <Text style={[styles.txnAmount, { color: isPositive ? COLORS.green : COLORS.text }]}>
                    {isPositive ? '+' : ''}{formatCOP(txn.amount)}
                  </Text>
                  <Text style={styles.txnBalance}>Saldo: {formatCOP(txn.balance_after)}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Recharge Modal */}
      <Modal visible={rechargeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            {rechargeSuccess ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={60} color={COLORS.green} />
                <Text style={styles.successTitle}>¡Recarga Exitosa!</Text>
                <Text style={styles.successSubtitle}>
                  Se agregaron {formatCOP(rechargeSuccess.amount)} a tu saldo disponible.
                </Text>
                <View style={styles.successDetails}>
                  <Text style={styles.successDetailText}>
                    Referencia: {rechargeSuccess.txId}
                  </Text>
                  <Text style={styles.successDetailText}>
                    Nuevo Saldo: {formatCOP(rechargeSuccess.balanceAfter)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeSuccessBtn}
                  onPress={() => {
                    setRechargeSuccess(null);
                    setRechargeModalVisible(false);
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={['#7c3aed', '#6d28d9']} style={styles.payBtnGradient}>
                    <Text style={styles.payBtnText}>Entendido</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Recargar Créditos</Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (!isRecharging) {
                        setRechargeError(null);
                        setRechargeModalVisible(false);
                      }
                    }}
                  >
                    <Ionicons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                {/* Métodos de Pago */}
                <Text style={styles.inputLabel}>Selecciona método de pago</Text>
                <View style={styles.methodSelectorRow}>
                  {[
                    { id: 'pse', label: 'PSE', icon: 'business-outline' },
                    { id: 'nequi', label: 'Nequi', icon: 'phone-portrait-outline' },
                    { id: 'daviplata', label: 'Daviplata', icon: 'wallet-outline' },
                    { id: 'card', label: 'Tarjeta', icon: 'card-outline' },
                  ].map(m => {
                    const active = paymentMethod === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.methodChip, active && styles.methodChipActive]}
                        onPress={() => setPaymentMethod(m.id as any)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={m.icon as any}
                          size={16}
                          color={active ? '#fff' : COLORS.textMuted}
                        />
                        <Text style={[styles.methodChipText, active && styles.methodChipTextActive]}>
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Presets */}
                <Text style={styles.inputLabel}>Monto a recargar</Text>
                <View style={styles.presetAmounts}>
                  {[20000, 50000, 100000, 200000].map(amount => (
                    <TouchableOpacity 
                      key={amount} 
                      style={[styles.presetBtn, Number(customAmount) === amount && styles.presetBtnActive]}
                      onPress={() => setCustomAmount(amount.toString())}
                    >
                      <Text style={[styles.presetText, Number(customAmount) === amount && styles.presetTextActive]}>
                        {formatCOP(amount)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.inputWrap}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    keyboardType="numeric"
                    value={customAmount}
                    onChangeText={setCustomAmount}
                    placeholder="50000"
                    placeholderTextColor="#555872"
                  />
                </View>

                {rechargeError && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={16} color="#f87171" />
                    <Text style={styles.errorText}>{rechargeError}</Text>
                  </View>
                )}

                <TouchableOpacity 
                  style={[styles.payBtn, isRecharging && { opacity: 0.7 }]} 
                  onPress={handleRecharge}
                  disabled={isRecharging}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={['#7c3aed', '#6d28d9']} style={styles.payBtnGradient}>
                    {isRecharging ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={styles.payBtnText}>Conectando pasarela...</Text>
                      </View>
                    ) : (
                      <Text style={styles.payBtnText}>
                        Pagar {formatCOP(Number(customAmount) || 0)} COP
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  headerBtn: {
    ...NEU.raisedSm,
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center',
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 110 },
  
  balanceCard: {
    ...NEU.raised,
    borderRadius: RADIUS.xl, padding: 20, marginBottom: 20,
    backgroundColor: COLORS.surface,
  },
  balanceLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  balanceAmount: { fontSize: 34, fontWeight: '800', color: COLORS.text, marginVertical: 8, fontVariant: ['tabular-nums'] },
  freeServicesLabel: { fontSize: 12, color: COLORS.primaryLight, marginBottom: 12, fontWeight: '600' },
  
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 16 },
  primaryAction: { flex: 1, borderRadius: RADIUS.md, overflow: 'hidden', boxShadow: NEU.accent.boxShadow },
  btnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  btnText: { color: COLORS.onPrimary, fontWeight: '700', fontSize: 15 },
  secondaryAction: {
    ...NEU.raisedSm,
    flex: 1, borderRadius: RADIUS.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  secondaryBtnText: { color: COLORS.text, fontWeight: '600', fontSize: 15 },

  statsRow: {
    ...NEU.inset,
    flexDirection: 'row', borderRadius: RADIUS.lg, paddingVertical: 14, paddingHorizontal: 8,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 14, letterSpacing: -0.3 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: COLORS.textSecondary, marginTop: 10, fontSize: 14 },
  
  txnItem: {
    ...NEU.raised,
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: RADIUS.lg, marginBottom: 10,
  },
  txnIconWrap: {
    ...NEU.inset,
    width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  txnInfo: { flex: 1 },
  txnDesc: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  txnDate: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  txnAmountWrap: { alignItems: 'flex-end' },
  txnAmount: { fontWeight: '800', fontSize: 15, fontVariant: ['tabular-nums'] },
  txnBalance: { color: COLORS.textMuted, fontSize: 11, marginTop: 2, fontVariant: ['tabular-nums'] },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalContent: {
    ...NEU.raised,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: 22, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  presetAmounts: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  presetBtn: {
    ...NEU.raisedSm,
    flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center',
  },
  presetBtnActive: {
    ...NEU.inset,
    backgroundColor: COLORS.surfaceHigh,
  },
  presetText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 13 },
  presetTextActive: { color: COLORS.primaryLight },
  inputLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  inputWrap: {
    ...NEU.inset,
    flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, paddingHorizontal: 14, marginBottom: 18,
  },
  currencySymbol: { color: COLORS.textMuted, fontSize: 16, fontWeight: '700', marginRight: 6 },
  amountInput: { flex: 1, color: COLORS.text, fontSize: 18, paddingVertical: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  payBtn: { borderRadius: RADIUS.md, overflow: 'hidden', boxShadow: NEU.accent.boxShadow },
  payBtnGradient: { paddingVertical: 15, alignItems: 'center' },
  payBtnText: { color: COLORS.onPrimary, fontSize: 15, fontWeight: '700' },
  methodSelectorRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  methodChip: {
    ...NEU.raisedSm,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  methodChipActive: {
    ...NEU.inset,
    backgroundColor: COLORS.surfaceHigh,
  },
  methodChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  methodChipTextActive: { color: COLORS.primaryLight, fontWeight: '700' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.redMuted,
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: 16,
  },
  errorText: { color: COLORS.red, fontSize: 12, flex: 1 },
  successBox: { alignItems: 'center', paddingVertical: 16 },
  successTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 12 },
  successSubtitle: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 16 },
  successDetails: {
    ...NEU.inset,
    borderRadius: RADIUS.md,
    padding: 14,
    width: '100%',
    marginVertical: 18,
    gap: 6,
  },
  successDetailText: { color: COLORS.textSecondary, fontSize: 12, fontVariant: ['tabular-nums'] },
  closeSuccessBtn: { width: '100%', borderRadius: RADIUS.md, overflow: 'hidden', boxShadow: NEU.accent.boxShadow },
});
