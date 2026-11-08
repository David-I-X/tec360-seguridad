import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, NEU, RADIUS, SPACING, FONTS, DOCK_CLEARANCE } from '@/constants/theme';
import {
  getMyOrganization,
  updateMyOrganization,
  addOrganizationMember,
  updateMemberQuota,
  removeOrganizationMember,
  validateMemberCourses,
  rechargeOrganizationWallet,
  getOrganizationServices,
  assignServiceToMember,
  OrganizationDashboardData,
  OrganizationMemberInfo,
} from '@/lib/api';

export default function TallerConsoleScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [org, setOrg] = useState<OrganizationDashboardData | null>(null);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [teamServices, setTeamServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'team' | 'dispatch' | 'wallet'>('team');
  const [togglingDispatch, setTogglingDispatch] = useState(false);

  useEffect(() => {
    if (params.tab === 'dispatch') {
      setActiveTab('dispatch');
    } else if (params.tab === 'wallet') {
      setActiveTab('wallet');
      setShowRechargeModal(true);
    } else if (params.tab === 'team') {
      setActiveTab('team');
    }
  }, [params.tab]);

  // Add Member Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newQuota, setNewQuota] = useState('');
  const [validateImmediately, setValidateImmediately] = useState(true);
  const [submittingMember, setSubmittingMember] = useState(false);

  // Quota Modal
  const [editingMember, setEditingMember] = useState<OrganizationMemberInfo | null>(null);
  const [quotaInput, setQuotaInput] = useState('');
  const [resetUsed, setResetUsed] = useState(false);
  const [savingQuota, setSavingQuota] = useState(false);

  // Recharge Modal
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('100000');
  const [recharging, setRecharging] = useState(false);

  // Assign Service Modal
  const [assigningService, setAssigningService] = useState<any | null>(null);
  const [submittingAssign, setSubmittingAssign] = useState(false);

  const formatCOP = (value: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value || 0);

  const loadData = useCallback(async () => {
    try {
      const [orgData, srvData] = await Promise.all([
        getMyOrganization(),
        getOrganizationServices().catch(() => ({
          organization_id: '',
          dispatch_mode: 'manual' as const,
          available_services: [],
          team_services: [],
        })),
      ]);
      setOrg(orgData);
      setAvailableServices(srvData.available_services || []);
      setTeamServices(srvData.team_services || []);
    } catch (err: any) {
      console.error('[TallerConsole] Error loading organization:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleToggleDispatchMode = async (nextMode: 'manual' | 'direct') => {
    if (!org || org.dispatch_mode === nextMode) return;
    setTogglingDispatch(true);
    try {
      const updated = await updateMyOrganization({ dispatch_mode: nextMode });
      setOrg(updated);
      Alert.alert(
        'Modo de Despacho Actualizado',
        nextMode === 'manual'
          ? 'El Taller asigna manualmente los trabajos a sus técnicos.'
          : 'Tus técnicos certificados pueden aceptar servicios directamente usando su cupo.'
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo cambiar el modo de despacho');
    } finally {
      setTogglingDispatch(false);
    }
  };

  const handleAddTechnician = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('Datos incompletos', 'Ingresa el nombre completo y el teléfono del técnico.');
      return;
    }
    setSubmittingMember(true);
    try {
      const parsedQuota = newQuota.trim() === '' ? null : Number(newQuota);
      await addOrganizationMember({
        full_name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim() || undefined,
        org_role: 'technician',
        credit_quota: parsedQuota,
        validate_courses_immediately: validateImmediately,
      });
      setShowAddModal(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewQuota('');
      setValidateImmediately(true);
      await loadData();
      Alert.alert('Técnico Vinculado', 'La subcuenta del técnico fue vinculada a tu taller.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo vincular el técnico');
    } finally {
      setSubmittingMember(false);
    }
  };

  const handleSaveQuota = async () => {
    if (!editingMember) return;
    setSavingQuota(true);
    try {
      const parsedQuota = quotaInput.trim() === '' ? null : Number(quotaInput);
      await updateMemberQuota(editingMember.id, {
        credit_quota: parsedQuota,
        reset_used: resetUsed,
      });
      setEditingMember(null);
      await loadData();
      Alert.alert('Cupo Actualizado', 'El cupo operativo del técnico fue actualizado.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo actualizar el cupo');
    } finally {
      setSavingQuota(false);
    }
  };

  const handleValidateCourses = async (member: OrganizationMemberInfo) => {
    try {
      await validateMemberCourses(member.id);
      await loadData();
      Alert.alert(
        'Cursos Validados',
        `${member.full_name || member.phone} quedó habilitado por tu taller para operar sin trabas.`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudieron validar los cursos');
    }
  };

  const handleRemoveMember = (member: OrganizationMemberInfo) => {
    Alert.alert(
      'Retirar técnico del taller',
      `¿Deseas desvincular a ${member.full_name || member.phone} de tu taller?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Retirar',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeOrganizationMember(member.id);
              await loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo retirar al técnico');
            }
          },
        },
      ]
    );
  };

  const handleRechargeWallet = async () => {
    const amount = Number(rechargeAmount);
    if (!amount || amount < 10000) {
      Alert.alert('Monto inválido', 'El monto mínimo de recarga es $10.000 COP');
      return;
    }
    setRecharging(true);
    try {
      await rechargeOrganizationWallet({ amount, payment_method: 'pse' });
      setShowRechargeModal(false);
      await loadData();
      Alert.alert('Recarga Exitosa', `Se acreditaron ${formatCOP(amount)} a la billetera de tu taller.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo recargar la billetera');
    } finally {
      setRecharging(false);
    }
  };

  const handleAssignService = async (technicianUserId: string) => {
    if (!assigningService) return;
    setSubmittingAssign(true);
    try {
      const res = await assignServiceToMember(assigningService.id, technicianUserId);
      setAssigningService(null);
      await loadData();
      Alert.alert('Servicio Asignado', res.message);
    } catch (err: any) {
      Alert.alert('No se pudo asignar', err.message || 'Error al asignar el servicio');
    } finally {
      setSubmittingAssign(false);
    }
  };

  const technicians = (org?.members || []).filter((m) => m.org_role === 'technician');

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!org) {
    return (
      <View style={[styles.centered, { padding: SPACING.lg }]}>
        <Ionicons name="business-outline" size={48} color="#00F0FF" />
        <Text style={[styles.orgName, { marginTop: 12, textAlign: 'center' }]}>
          Sin Taller Vinculado
        </Text>
        <Text style={[styles.subText, { textAlign: 'center', marginTop: 6 }]}>
          Esta cuenta no tiene un Taller activo asociado.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: DOCK_CLEARANCE + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Top Corporate Brand Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.sunken, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, marginBottom: SPACING.sm, borderWidth: 1, borderColor: 'rgba(0,240,255,0.28)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="shield-checkmark" size={18} color="#00F0FF" />
            <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 14 }}>Tec360 Seguridad</Text>
          </View>
          <Text style={{ color: '#00F0FF', fontWeight: '700', fontSize: 11, letterSpacing: 0.6 }}>MI TALLER</Text>
        </View>

        {/* Workshop Header */}
        <View style={styles.headerCard}>
          <View style={styles.badgeRow}>
            <View style={styles.cyanBadge}>
              <Ionicons name="business" size={12} color="#00F0FF" />
              <Text style={styles.cyanBadgeText}>CUENTA EMPRESA • TALLER</Text>
            </View>
            <View style={styles.ownerBadge}>
              <Text style={styles.ownerBadgeText}>Admin (No opera como técnico)</Text>
            </View>
          </View>

          <Text style={styles.orgName}>{org.name}</Text>
          <Text style={styles.subText}>
            {org.city} {org.nit ? `• NIT ${org.nit}` : ''} • {technicians.length} técnicos en plantilla
          </Text>

          {/* Dispatch Mode Switch */}
          <View style={styles.dispatchSection}>
            <Text style={styles.sectionLabel}>MODO DE DESPACHO DEL TALLER</Text>
            <View style={styles.dispatchPillRow}>
              <TouchableOpacity
                style={[styles.dispatchPill, org.dispatch_mode === 'manual' && styles.dispatchPillActive]}
                disabled={togglingDispatch}
                onPress={() => handleToggleDispatchMode('manual')}
              >
                <Ionicons
                  name="git-branch-outline"
                  size={16}
                  color={org.dispatch_mode === 'manual' ? '#00F0FF' : COLORS.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.dispatchPillTitle,
                      org.dispatch_mode === 'manual' && { color: '#00F0FF' },
                    ]}
                  >
                    El Taller Asigna
                  </Text>
                  <Text style={styles.dispatchPillHint}>Despacho manual</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dispatchPill, org.dispatch_mode === 'direct' && styles.dispatchPillActiveViolet]}
                disabled={togglingDispatch}
                onPress={() => handleToggleDispatchMode('direct')}
              >
                <Ionicons
                  name="flash-outline"
                  size={16}
                  color={org.dispatch_mode === 'direct' ? COLORS.primaryLight : COLORS.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.dispatchPillTitle,
                      org.dispatch_mode === 'direct' && { color: COLORS.primaryLight },
                    ]}
                  >
                    Técnico Acepta
                  </Text>
                  <Text style={styles.dispatchPillHint}>Autónomo con cupo</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Corporate Shared Wallet Card */}
        <LinearGradient colors={['#1e1b4b', '#141722']} style={styles.walletCard}>
          <View style={styles.walletHeaderRow}>
            <View>
              <Text style={styles.walletLabel}>BILLETERA ÚNICA DEL TALLER</Text>
              <Text style={styles.walletAmount}>{formatCOP(org.wallet_balance)}</Text>
            </View>
            <TouchableOpacity
              style={styles.rechargeBtn}
              onPress={() => setShowRechargeModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.rechargeBtnText}>Recargar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bonusBanner}>
            <Ionicons name="gift-outline" size={15} color={COLORS.green} />
            <Text style={styles.bonusBannerText}>
              Bono único de bienvenida por taller acreditado: {formatCOP(org.welcome_bonus_amount || 200000)}
            </Text>
          </View>

          <View style={styles.walletStatsRow}>
            <View style={styles.walletStatCell}>
              <Text style={styles.walletStatLabel}>RECARGADO</Text>
              <Text style={styles.walletStatVal}>{formatCOP(org.total_recharged)}</Text>
            </View>
            <View style={styles.walletStatDivider} />
            <View style={styles.walletStatCell}>
              <Text style={styles.walletStatLabel}>CONSUMIDO EQUIPO</Text>
              <Text style={[styles.walletStatVal, { color: COLORS.primaryLight }]}>
                {formatCOP(org.total_consumed)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Sub-navigation Tabs */}
        <View style={styles.tabSwitchRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'team' && styles.tabBtnActive]}
            onPress={() => setActiveTab('team')}
          >
            <Ionicons
              name="people-outline"
              size={16}
              color={activeTab === 'team' ? COLORS.onPrimary : COLORS.textSecondary}
            />
            <Text style={[styles.tabBtnText, activeTab === 'team' && styles.tabBtnTextActive]}>
              Subcuentas ({technicians.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'dispatch' && styles.tabBtnActive]}
            onPress={() => setActiveTab('dispatch')}
          >
            <Ionicons
              name="clipboard-outline"
              size={16}
              color={activeTab === 'dispatch' ? COLORS.onPrimary : COLORS.textSecondary}
            />
            <Text style={[styles.tabBtnText, activeTab === 'dispatch' && styles.tabBtnTextActive]}>
              Despacho ({availableServices.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'wallet' && styles.tabBtnActive]}
            onPress={() => {
              setActiveTab('wallet');
              setShowRechargeModal(true);
            }}
          >
            <Ionicons
              name="wallet-outline"
              size={16}
              color={activeTab === 'wallet' ? COLORS.onPrimary : COLORS.textSecondary}
            />
            <Text style={[styles.tabBtnText, activeTab === 'wallet' && styles.tabBtnTextActive]}>
              Billetera
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'team' ? (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Técnicos del Taller</Text>
              <TouchableOpacity
                style={styles.addTechBtn}
                onPress={() => setShowAddModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="person-add-outline" size={15} color="#050810" />
                <Text style={styles.addTechBtnText}>Vincular Técnico</Text>
              </TouchableOpacity>
            </View>

            {technicians.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="people-outline" size={40} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>Sin técnicos vinculados aún</Text>
                <Text style={styles.emptySub}>
                  Agrega subcuentas para tus técnicos, asígnales un cupo de la billetera del taller y valida sus cursos.
                </Text>
              </View>
            ) : (
              technicians.map((member) => {
                const hasCap = member.credit_quota !== null && member.credit_quota !== undefined;
                const usagePct =
                  hasCap && member.credit_quota! > 0
                    ? Math.min(100, Math.round((member.quota_used / member.credit_quota!) * 100))
                    : 0;

                return (
                  <View key={member.id} style={styles.memberCard}>
                    <View style={styles.memberTopRow}>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>
                          {(member.full_name || 'T')[0]?.toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>{member.full_name || 'Técnico'}</Text>
                        <Text style={styles.memberPhone}>{member.phone}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusTag,
                          member.courses_validated_by_org || member.is_verified
                            ? styles.statusTagGreen
                            : styles.statusTagYellow,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusTagText,
                            {
                              color:
                                member.courses_validated_by_org || member.is_verified
                                  ? COLORS.green
                                  : COLORS.yellow,
                            },
                          ]}
                        >
                          {member.courses_validated_by_org || member.is_verified
                            ? 'Cursos Validados'
                            : 'Curso Pendiente'}
                        </Text>
                      </View>
                    </View>

                    {/* Quota Box */}
                    <View style={styles.quotaWell}>
                      <View style={styles.quotaHeaderRow}>
                        <Text style={styles.quotaLabel}>
                          Cupo asignado:{' '}
                          <Text style={{ color: COLORS.text, fontWeight: '700' }}>
                            {hasCap ? formatCOP(member.credit_quota!) : 'Sin tope (Usa saldo taller)'}
                          </Text>
                        </Text>
                        <Text style={styles.quotaUsedText}>
                          Usado: {formatCOP(member.quota_used)}
                        </Text>
                      </View>
                      {hasCap && (
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${usagePct}%` }]} />
                        </View>
                      )}
                    </View>

                    {/* Member Actions */}
                    <View style={styles.memberActionsRow}>
                      <TouchableOpacity
                        style={styles.memberActionBtn}
                        onPress={() => {
                          setEditingMember(member);
                          setQuotaInput(
                            member.credit_quota !== null && member.credit_quota !== undefined
                              ? String(member.credit_quota)
                              : ''
                          );
                          setResetUsed(false);
                        }}
                      >
                        <Ionicons name="wallet-outline" size={15} color="#00F0FF" />
                        <Text style={[styles.memberActionText, { color: '#00F0FF' }]}>
                          Asignar Cupo
                        </Text>
                      </TouchableOpacity>

                      {!member.courses_validated_by_org && (
                        <TouchableOpacity
                          style={styles.memberActionBtnGreen}
                          onPress={() => handleValidateCourses(member)}
                        >
                          <Ionicons name="checkmark-done-outline" size={15} color={COLORS.green} />
                          <Text style={[styles.memberActionText, { color: COLORS.green }]}>
                            Validar Cursos
                          </Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.memberRemoveBtn}
                        onPress={() => handleRemoveMember(member)}
                      >
                        <Ionicons name="trash-outline" size={15} color={COLORS.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Servicios Disponibles para Asignar</Text>
            {availableServices.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="radio-outline" size={40} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No hay solicitudes pendientes ahora</Text>
                <Text style={styles.emptySub}>
                  Cuando entren solicitudes en la zona, podrás asignarlas aquí al técnico de tu taller.
                </Text>
              </View>
            ) : (
              availableServices.map((srv) => (
                <View key={srv.id} style={styles.serviceCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={styles.serviceTitle}>{srv.title || srv.service_type}</Text>
                    <Text style={styles.servicePrice}>
                      {srv.estimated_price ? formatCOP(srv.estimated_price) : 'Por cotizar'}
                    </Text>
                  </View>
                  <Text style={styles.serviceAddress} numberOfLines={2}>
                    {srv.service_address} ({srv.service_city})
                  </Text>
                  <TouchableOpacity
                    style={styles.assignBtn}
                    onPress={() => setAssigningService(srv)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="person-add-outline" size={16} color="#fff" />
                    <Text style={styles.assignBtnText}>Asignar a Técnico del Taller</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>
              Servicios Activos del Equipo ({teamServices.length})
            </Text>
            {teamServices.map((ts) => (
              <View key={ts.id} style={styles.serviceCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.serviceTitle}>{ts.title || ts.service_type}</Text>
                  <Text style={{ color: '#00F0FF', fontSize: 12, fontWeight: '700' }}>
                    {ts.status}
                  </Text>
                </View>
                <Text style={styles.serviceAddress}>{ts.service_address}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal: Vincular Técnico */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalCard}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vincular Técnico al Taller</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nombre completo *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej. Carlos Ramírez"
              placeholderTextColor={COLORS.textMuted}
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.inputLabel}>Teléfono celular (+57 o 10 dígitos) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="+573001234567"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              value={newPhone}
              onChangeText={setNewPhone}
            />

            <Text style={styles.inputLabel}>Cupo de crédito en COP (Vacío = sin tope)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej. 50000"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={newQuota}
              onChangeText={setNewQuota}
            />

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>Dar cursos por validados</Text>
                <Text style={styles.switchSub}>
                  Permite al técnico operar de inmediato respaldado por tu taller.
                </Text>
              </View>
              <Switch
                value={validateImmediately}
                onValueChange={setValidateImmediately}
                trackColor={{ false: COLORS.sunken, true: 'rgba(52,211,153,0.4)' }}
                thumbColor={validateImmediately ? COLORS.green : COLORS.textMuted}
              />
            </View>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={handleAddTechnician}
              disabled={submittingMember}
            >
              {submittingMember ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>Guardar Subcuenta</Text>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modal: Editar Cupo */}
      <Modal visible={!!editingMember} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Cupo de {editingMember?.full_name || 'Técnico'}
              </Text>
              <TouchableOpacity onPress={() => setEditingMember(null)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>
              Tope de comisiones en COP (Deja vacío para usar todo el saldo del taller)
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej. 80000"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={quotaInput}
              onChangeText={setQuotaInput}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchTitle}>Reiniciar consumo acumulado a $0</Text>
              <Switch value={resetUsed} onValueChange={setResetUsed} />
            </View>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={handleSaveQuota}
              disabled={savingQuota}
            >
              {savingQuota ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>Actualizar Cupo</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Recargar Billetera Corporativa */}
      <Modal visible={showRechargeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recargar Billetera del Taller</Text>
              <TouchableOpacity onPress={() => setShowRechargeModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Monto en COP</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={rechargeAmount}
              onChangeText={setRechargeAmount}
            />
            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={handleRechargeWallet}
              disabled={recharging}
            >
              {recharging ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>
                  Acreditar {formatCOP(Number(rechargeAmount) || 0)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Asignar Servicio a Técnico */}
      <Modal visible={!!assigningService} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona el Técnico a Asignar</Text>
              <TouchableOpacity onPress={() => setAssigningService(null)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {technicians.map((tech) => (
              <TouchableOpacity
                key={tech.id}
                style={styles.techPickRow}
                disabled={submittingAssign}
                onPress={() => handleAssignService(tech.user_id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{tech.full_name || tech.phone}</Text>
                  <Text style={styles.memberPhone}>
                    {tech.credit_quota !== null
                      ? `Cupo disp: ${formatCOP(tech.quota_remaining || 0)}`
                      : 'Cupo abierto del taller'}
                  </Text>
                </View>
                <Ionicons name="arrow-forward-circle" size={22} color="#00F0FF" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  headerCard: {
    ...NEU.raised,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  cyanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    backgroundColor: 'rgba(0,240,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
  },
  cyanBadgeText: { fontSize: 10, fontWeight: '700', color: '#00F0FF', letterSpacing: 0.5 },
  ownerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.primaryMuted,
  },
  ownerBadgeText: { fontSize: 10, fontWeight: '600', color: COLORS.primaryLight },
  orgName: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.text },
  subText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  dispatchSection: { marginTop: SPACING.md },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  dispatchPillRow: { flexDirection: 'row', gap: 8 },
  dispatchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.sunken,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dispatchPillActive: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0,240,255,0.09)',
  },
  dispatchPillActiveViolet: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  dispatchPillTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  dispatchPillHint: { fontSize: 10, color: COLORS.textMuted },
  walletCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.28)',
  },
  walletHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.6 },
  walletAmount: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  rechargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  rechargeBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  bonusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    padding: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(52,211,153,0.1)',
  },
  bonusBannerText: { fontSize: 11, color: COLORS.green, fontWeight: '600', flex: 1 },
  walletStatsRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  walletStatCell: { flex: 1 },
  walletStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 12 },
  walletStatLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700' },
  walletStatVal: { fontSize: 14, color: COLORS.text, fontWeight: '700', marginTop: 2 },
  tabSwitchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.md,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  tabBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  tabBtnTextActive: { color: '#fff' },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  addTechBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#00F0FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  addTechBtnText: { fontSize: 12, fontWeight: '700', color: '#050810' },
  emptyCard: {
    ...NEU.raised,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },
  memberCard: {
    ...NEU.raised,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: 12,
  },
  memberTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: { color: COLORS.primaryLight, fontWeight: '700', fontSize: 16 },
  memberName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  memberPhone: { fontSize: 12, color: COLORS.textSecondary },
  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  statusTagGreen: { backgroundColor: COLORS.greenMuted },
  statusTagYellow: { backgroundColor: 'rgba(251,191,36,0.14)' },
  statusTagText: { fontSize: 10, fontWeight: '700' },
  quotaWell: {
    marginTop: 10,
    padding: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.sunken,
  },
  quotaHeaderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quotaLabel: { fontSize: 12, color: COLORS.textSecondary },
  quotaUsedText: { fontSize: 12, color: '#00F0FF', fontWeight: '600' },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.surfaceHigh,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#00F0FF' },
  memberActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  memberActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(0,240,255,0.1)',
  },
  memberActionBtnGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.greenMuted,
  },
  memberActionText: { fontSize: 12, fontWeight: '700' },
  memberRemoveBtn: {
    marginLeft: 'auto',
    padding: 7,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.redMuted,
  },
  serviceCard: {
    ...NEU.raised,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: 10,
  },
  serviceTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  servicePrice: { fontSize: 14, fontWeight: '700', color: COLORS.green },
  serviceAddress: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  assignBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryDark,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  assignBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.bgOverlay,
    justifyContent: 'center',
    padding: SPACING.md,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  inputLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 10, marginBottom: 6 },
  modalInput: {
    backgroundColor: COLORS.sunken,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 46,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
  },
  switchTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  switchSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  modalPrimaryBtn: {
    marginTop: 18,
    backgroundColor: COLORS.primaryDark,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  modalPrimaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  techPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
});
