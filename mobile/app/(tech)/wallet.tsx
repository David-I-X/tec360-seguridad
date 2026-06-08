import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '@/constants/theme';
import { fetchWithAuth } from '@/lib/api';
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
  const [isRecharging, setIsRecharging] = useState(false);

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
    if (!amount || amount < 5000) return;

    setIsRecharging(true);
    try {
      const res = await fetchWithAuth('/credits/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          payment_method: 'simulated-mobile'
        })
      });
      if (res.ok) {
        setRechargeModalVisible(false);
        fetchData();
      }
    } catch (e) {
      console.error('Error recharging:', e);
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recargar Créditos</Text>
              <TouchableOpacity onPress={() => setRechargeModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.presetAmounts}>
              {[20000, 50000, 100000].map(amount => (
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

            <Text style={styles.inputLabel}>O ingresa un monto personalizado</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                value={customAmount}
                onChangeText={setCustomAmount}
              />
            </View>

            <TouchableOpacity 
              style={[styles.payBtn, isRecharging && { opacity: 0.7 }]} 
              onPress={handleRecharge}
              disabled={isRecharging}
            >
              <LinearGradient colors={['#7c3aed', '#6d28d9']} style={styles.payBtnGradient}>
                <Text style={styles.payBtnText}>
                  {isRecharging ? 'Procesando...' : `Pagar ${formatCOP(Number(customAmount) || 0)}`}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
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
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
  },
  headerTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.text },
  headerSubtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 4 },
  headerBtn: { width: 40, height: 40, borderRadius: RADIUS.round, backgroundColor: COLORS.bgCard, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  
  balanceCard: {
    borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  balanceLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '500' },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: COLORS.text, marginVertical: SPACING.xs, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  freeServicesLabel: { fontSize: FONTS.sizes.xs, color: COLORS.primaryLight, marginBottom: SPACING.md },
  
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md, marginBottom: SPACING.lg },
  primaryAction: { flex: 1, borderRadius: RADIUS.md, overflow: 'hidden' },
  btnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: FONTS.sizes.md },
  secondaryAction: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryBtnText: { color: COLORS.text, fontWeight: '600', fontSize: FONTS.sizes.md },

  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: SPACING.md },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: 'bold', marginBottom: 4 },
  statValue: { fontSize: FONTS.sizes.sm, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyText: { color: COLORS.textMuted, marginTop: SPACING.sm },
  
  txnItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.sm },
  txnIconWrap: { width: 40, height: 40, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  txnInfo: { flex: 1 },
  txnDesc: { color: COLORS.text, fontWeight: '600', fontSize: FONTS.sizes.sm },
  txnDate: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  txnAmountWrap: { alignItems: 'flex-end' },
  txnAmount: { fontWeight: '700', fontSize: FONTS.sizes.md, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  txnBalance: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#18181b', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  presetAmounts: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  presetBtn: { flex: 1, paddingVertical: SPACING.md, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  presetBtnActive: { borderColor: COLORS.primary },
  presetText: { color: COLORS.text, fontWeight: 'bold' },
  presetTextActive: { color: COLORS.primaryLight },
  inputLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginBottom: SPACING.xs },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, marginBottom: SPACING.xl },
  currencySymbol: { color: COLORS.textMuted, fontSize: FONTS.sizes.lg, fontWeight: 'bold', marginRight: SPACING.sm },
  amountInput: { flex: 1, color: COLORS.text, fontSize: FONTS.sizes.lg, paddingVertical: SPACING.md, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  payBtn: { borderRadius: RADIUS.md, overflow: 'hidden' },
  payBtnGradient: { paddingVertical: SPACING.md, alignItems: 'center' },
  payBtnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: 'bold' },
});
