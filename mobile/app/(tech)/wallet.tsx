import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, AppState, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { COLORS, RADIUS, NEU } from '@/constants/theme';
import {
  fetchWithAuth,
  getMyTopUpRequests,
  subscribeUserTopUpEvents,
  type TopUpRequestItem,
} from '@/lib/api';
import { BreBTopUpModal } from '@/components/topup/BreBTopUpModal';
import { useFocusEffect } from 'expo-router';

interface BalanceData {
  technician_id?: string;
  balance: number;
  total_recharged?: number;
  total_consumed?: number;
  free_services_remaining: number;
  commission_rate: number;
  can_accept_services: boolean;
  welcome_bonus_granted?: boolean;
  welcome_bonus_amount?: number; is_organization_wallet?: boolean; organization_name?: string | null; org_wallet_balance?: number | null; credit_quota?: number | null; quota_used?: number | null; quota_remaining?: number | null; dispatch_mode?: 'manual' | 'direct' | null;
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
  const [topUpRequests, setTopUpRequests] = useState<TopUpRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rechargeModalVisible, setRechargeModalVisible] = useState(false);

  const welcomeShownRef = useRef(false);

  const showWelcomeBonusAlert = (bonusAmount = 200000) => {
    Alert.alert(
      '🎁 ¡Te regalamos $200.000 en créditos por bienvenida!',
      `Hemos recargado automáticamente ${formatCOP(bonusAmount)} COP en tu billetera operativa para que puedas empezar a aceptar servicios sin recargar de tu bolsillo.\n\n• Bono acreditado: +${formatCOP(bonusAmount)} COP\n• Comisión por servicio: 10%\n• Cobertura en servicios: ${formatCOP(bonusAmount * 10)} COP`,
      [{ text: '¡Excelente!', style: 'default' }]
    );
  };

  const showReportAlert = () => {
    const bal = balance?.balance ?? 200000;
    const recharged = balance?.total_recharged ?? 200000;
    const consumed = balance?.total_consumed ?? 0;
    const rate = (balance?.commission_rate ?? 0.1) * 100;
    Alert.alert(
      '📊 Reporte Operativo de Billetera',
      `• Saldo disponible: ${formatCOP(bal)} COP\n• Bono de bienvenida: $200.000 COP\n• Total acreditado: ${formatCOP(recharged)} COP\n• Consumido en comisiones: ${formatCOP(consumed)} COP\n• Tarifa de comisión: ${rate.toFixed(0)}% por servicio`,
      [{ text: 'Cerrar', style: 'cancel' }]
    );
  };

  const fetchData = useCallback(async () => {
    try {
      const [balRes, txnRes, reqsData] = await Promise.all([
        fetchWithAuth('/credits/balance'),
        fetchWithAuth('/credits/transactions?limit=50'),
        getMyTopUpRequests(5).catch(() => [] as TopUpRequestItem[]),
      ]);

      if (balRes.ok) {
        const balData = await balRes.json();
        setBalance(balData);
        if (!welcomeShownRef.current && !balData.is_organization_wallet) {
          welcomeShownRef.current = true;
          showWelcomeBonusAlert(balData.welcome_bonus_amount || 200000);
        }
      }
      if (txnRes.ok) setTransactions(await txnRes.json());
      setTopUpRequests(reqsData);
    } catch (e) {
      console.error('[Wallet] Error loading data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const hasPendingTopUp = topUpRequests.some((r) => r.status === 'pending');

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  useEffect(() => {
    if (!hasPendingTopUp) return;

    const unsubscribeWs = subscribeUserTopUpEvents(fetchData);
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetchData();
    });
    const notifSub = Notifications.addNotificationReceivedListener((notif) => {
      if (notif.request.content.data?.notification_type === 'credit_topup') {
        fetchData();
      }
    });

    return () => {
      unsubscribeWs();
      appSub.remove();
      notifSub.remove();
    };
  }, [fetchData, hasPendingTopUp]);

  // Al recibir push aunque no hubiera foco completo, mantenerse al día sin polling.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.notification.request.content.data?.notification_type === 'credit_topup') {
        fetchData();
      }
    });
    return () => sub.remove();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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
          <Text style={styles.balanceLabel}>{balance?.is_organization_wallet ? `Cupo Operativo • ${balance.organization_name || 'Tu Taller'}` : 'Saldo Disponible'}</Text>
          <Text style={styles.balanceAmount}>
            {balance ? formatCOP(balance.balance) : '$0'}
          </Text>
          
          <TouchableOpacity onPress={() => showWelcomeBonusAlert(balance?.welcome_bonus_amount || 200000)}>
            <Text style={styles.freeServicesLabel}>
              {balance?.is_organization_wallet ? `🏢 Saldo Taller: ${formatCOP(balance.org_wallet_balance || 0)} • Cupo usado: ${formatCOP(balance.quota_used || 0)}${balance.credit_quota !== null && balance.credit_quota !== undefined ? ` / ${formatCOP(balance.credit_quota)}` : ' (Sin tope)'} • Despacho: ${balance.dispatch_mode === 'direct' ? 'Directo' : 'Asignado por Taller'}` : '🎁 ¡Te regalamos $200.000 en créditos por bienvenida!'}
            </Text>
          </TouchableOpacity>

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
            <TouchableOpacity style={styles.secondaryAction} onPress={showReportAlert}>
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

        {/* Recargas pendientes o recientes */}
        {topUpRequests.length > 0 && (
          <View style={{ marginBottom: 18 }}>
            <Text style={styles.sectionTitle}>Solicitudes de recarga Bre-B</Text>
            {topUpRequests.map((req) => {
              const isPending = req.status === 'pending';
              const isApproved = req.status === 'approved';
              const badgeColor = isPending ? COLORS.yellow : isApproved ? COLORS.green : COLORS.red;
              const statusLabel = isPending ? 'En revisión' : isApproved ? 'Aprobada' : 'Rechazada';
              return (
                <View key={req.id} style={styles.txnItem}>
                  <View style={[styles.txnIconWrap, { backgroundColor: badgeColor + '20' }]}>
                    <Ionicons
                      name={isPending ? 'time-outline' : isApproved ? 'checkmark-circle-outline' : 'close-circle-outline'}
                      size={20}
                      color={badgeColor}
                    />
                  </View>
                  <View style={styles.txnInfo}>
                    <Text style={styles.txnDesc} numberOfLines={1}>
                      Recarga {formatCOP(req.amount)}
                      {req.reference_hint ? ` · Ref ${req.reference_hint}` : ''}
                    </Text>
                    <Text style={styles.txnDate} numberOfLines={2}>
                      {req.reject_reason
                        ? req.reject_reason
                        : (() => {
                            const iso = /([zZ]|[+-]\d{2}:?\d{2})$/.test(req.created_at)
                              ? req.created_at
                              : `${req.created_at}Z`;
                            const dt = new Date(iso);
                            return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}`;
                          })()}
                    </Text>
                  </View>
                  <View style={styles.txnAmountWrap}>
                    <Text style={[styles.txnAmount, { color: badgeColor, fontSize: 12 }]}>
                      {statusLabel}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

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

      {/* Recarga Bre-B con comprobante */}
      <BreBTopUpModal
        visible={rechargeModalVisible}
        onClose={() => setRechargeModalVisible(false)}
        onSubmitted={fetchData}
      />
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
