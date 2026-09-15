import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchWithAuth } from '@/lib/api';

export interface CategoryItemDef {
  key: string;
  label: string;
}

export interface CategoryDef {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: CategoryItemDef[];
}

export const INSPECTION_CATEGORIES: CategoryDef[] = [
  {
    id: 'luces',
    title: 'Sistema de Luces',
    icon: 'bulb-outline',
    items: [
      { key: 'estacionamiento', label: 'Estacionamiento' },
      { key: 'bajas', label: 'Luces Bajas' },
      { key: 'altas', label: 'Luces Altas' },
      { key: 'freno', label: 'Luz de Freno (3ª luz)' },
      { key: 'marcha_atras', label: 'Marcha Atrás' },
      { key: 'viraje', label: 'Direccionales / Viraje' },
      { key: 'emergencia', label: 'Luces de Emergencia' },
      { key: 'patente', label: 'Luz de Placa / Patente' },
    ],
  },
  {
    id: 'frenos',
    title: 'Sistema de Frenos',
    icon: 'shield-checkmark-outline',
    items: [
      { key: 'freno_mano', label: 'Freno de Mano' },
      { key: 'freno_pedal', label: 'Pedal de Freno' },
    ],
  },
  {
    id: 'neumaticos',
    title: 'Neumáticos',
    icon: 'disc-outline',
    items: [
      { key: 'delantero_der', label: 'Delantero Derecho' },
      { key: 'delantero_izq', label: 'Delantero Izquierdo' },
      { key: 'trasero_der', label: 'Trasero Derecho' },
      { key: 'trasero_izq', label: 'Trasero Izquierdo' },
      { key: 'repuesto', label: 'Llanta de Repuesto' },
    ],
  },
  {
    id: 'carroceria',
    title: 'Carrocería y Vidrios',
    icon: 'car-outline',
    items: [
      { key: 'parabrisas', label: 'Parabrisas y Vidrios' },
      { key: 'retrovisores', label: 'Espejos Retrovisores' },
      { key: 'latoneria', label: 'Pintura / Rayones Previos' },
      { key: 'parachoques', label: 'Parachoques / Bómper' },
    ],
  },
  {
    id: 'interior',
    title: 'Interior y Tablero',
    icon: 'speedometer-outline',
    items: [
      { key: 'tablero', label: 'Tablero / Testigos encendidos' },
      { key: 'tapiceria', label: 'Tapicería y Asientos' },
      { key: 'radio', label: 'Radio / Pantalla' },
    ],
  },
];

type ItemStatus = 'good' | 'regular' | 'bad';

interface ItemState {
  status: ItemStatus;
  notes: string;
}

interface InspectionSheetProps {
  visible: boolean;
  serviceId: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  existingInspection?: any;
  onClose: () => void;
  onInspectionConfirmed?: () => void;
  onSuccess?: () => void;
}

export default function VehicleInspectionSheet({
  visible,
  serviceId,
  vehicleModel,
  vehiclePlate,
  existingInspection,
  onClose,
  onInspectionConfirmed,
  onSuccess,
}: InspectionSheetProps) {
  // Initialize categories where every item defaults to 'good' (B)
  const [categoriesState, setCategoriesState] = useState<Record<string, Record<string, ItemState>>>(() => {
    if (existingInspection?.categories) {
      return existingInspection.categories;
    }
    const init: Record<string, Record<string, ItemState>> = {};
    INSPECTION_CATEGORIES.forEach((cat) => {
      init[cat.id] = {};
      cat.items.forEach((it) => {
        init[cat.id][it.key] = { status: 'good', notes: '' };
      });
    });
    return init;
  });

  const [vehicleKm, setVehicleKm] = useState(existingInspection?.vehicle_km || '');
  const [generalNotes, setGeneralNotes] = useState(existingInspection?.general_notes || '');
  const [expandedCat, setExpandedCat] = useState<string>('luces');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(!!existingInspection);
  const [isClientConfirmed, setIsClientConfirmed] = useState(!!existingInspection?.client_confirmed);
  const [elapsedMins, setElapsedMins] = useState(0);

  useEffect(() => {
    if (existingInspection) {
      setIsSubmitted(true);
      if (existingInspection.client_confirmed) {
        setIsClientConfirmed(true);
      }
      if (existingInspection.categories) {
        setCategoriesState(existingInspection.categories);
      }
    }
  }, [existingInspection]);

  // Elapsed timer when waiting
  useEffect(() => {
    if (!isSubmitted || isClientConfirmed) return;
    const interval = setInterval(() => {
      setElapsedMins((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, [isSubmitted, isClientConfirmed]);

  const handleSetStatus = (catId: string, itemKey: string, status: ItemStatus) => {
    setCategoriesState((prev) => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        [itemKey]: {
          ...prev[catId]?.[itemKey],
          status,
          notes: prev[catId]?.[itemKey]?.notes || '',
        },
      },
    }));
  };

  const handleSetNotes = (catId: string, itemKey: string, notes: string) => {
    setCategoriesState((prev) => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        [itemKey]: {
          ...prev[catId]?.[itemKey],
          notes,
        },
      },
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await fetchWithAuth(`/services/${serviceId}/inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_km: vehicleKm.trim() || undefined,
          general_notes: generalNotes.trim() || undefined,
          categories: categoriesState,
        }),
      });

      setIsSubmitted(true);
      onSuccess?.();
      onInspectionConfirmed?.();
      Alert.alert(
        '📋 Inspección enviada',
        'Se ha enviado una copia en tiempo real a la pantalla del cliente para su confirmación.'
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo registrar la inspección');
    } finally {
      setIsSubmitting(false);
    }
  };

  let badCount = 0;
  let regularCount = 0;
  Object.values(categoriesState).forEach((cat) => {
    Object.values(cat).forEach((item) => {
      if (item.status === 'bad') badCount++;
      if (item.status === 'regular') regularCount++;
    });
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.titleRow}>
                <Text style={styles.headerTitle}>Inspección Previa</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Pre-Servicio</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>
                {vehicleModel || 'Vehículo'} {vehiclePlate ? `• ${vehiclePlate}` : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#8b8fa3" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {isSubmitted ? (
              /* State after submission */
              <View style={styles.waitingContainer}>
                {isClientConfirmed ? (
                  <View style={styles.confirmedBox}>
                    <View style={styles.confirmedIconCircle}>
                      <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                    </View>
                    <Text style={styles.confirmedTitle}>¡Confirmado por el Cliente!</Text>
                    <Text style={styles.confirmedDesc}>
                      El cliente aprobó la copia del checklist de inspección de su auto. Ya puedes
                      iniciar el trabajo técnico.
                    </Text>
                    <TouchableOpacity
                      style={styles.startWorkBtn}
                      onPress={() => {
                        onInspectionConfirmed?.();
                        onSuccess?.();
                        onClose();
                      }}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#22c55e', '#16a34a']}
                        style={styles.btnGradient}
                      >
                        <Ionicons name="construct-outline" size={20} color="#fff" />
                        <Text style={styles.btnText}>Iniciar Trabajo Ahora</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.waitingBox}>
                    <View style={styles.waitingIconCircle}>
                      <ActivityIndicator size="large" color="#6366f1" />
                    </View>
                    <Text style={styles.waitingTitle}>Esperando confirmación</Text>
                    <Text style={styles.waitingDesc}>
                      El cliente tiene la copia en su pantalla. En cuanto toque "Confirmar",
                      quedarás habilitado para comenzar.
                    </Text>

                    <View style={styles.timerCard}>
                      <Text style={styles.timerText}>
                        Tiempo transcurrido: <Text style={styles.timerNum}>{elapsedMins} min</Text>
                      </Text>
                      <Text style={styles.timerHelper}>
                        Si el cliente no responde en 15 minutos, podrás iniciar automáticamente por
                        seguridad.
                      </Text>
                    </View>

                    {elapsedMins >= 15 && (
                      <TouchableOpacity
                        style={styles.timeoutBtn}
                        onPress={() => {
                          onInspectionConfirmed?.();
                          onSuccess?.();
                          onClose();
                        }}
                      >
                        <Text style={styles.timeoutBtnText}>Continuar por Timeout (15 min)</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ) : (
              /* Checklist Form */
              <>
                {/* Guide banner */}
                <View style={styles.infoBanner}>
                  <Ionicons name="information-circle-outline" size={20} color="#38bdf8" />
                  <Text style={styles.infoBannerText}>
                    Todos los ítems están en <Text style={{ fontWeight: 'bold' }}>Bueno (B)</Text> por
                    defecto. Marca <Text style={{ color: '#fbbf24' }}>R</Text> o{' '}
                    <Text style={{ color: '#f87171' }}>M</Text> si encuentras daños o desgastes previos.
                  </Text>
                </View>

                {/* Summary chips */}
                <View style={styles.summaryRow}>
                  {regularCount > 0 && (
                    <View style={[styles.chip, styles.chipRegular]}>
                      <Text style={styles.chipRegularText}>{regularCount} Regulares</Text>
                    </View>
                  )}
                  {badCount > 0 && (
                    <View style={[styles.chip, styles.chipBad]}>
                      <Text style={styles.chipBadText}>{badCount} Malos</Text>
                    </View>
                  )}
                </View>

                {/* Mileage input */}
                <View style={styles.inputCard}>
                  <Text style={styles.inputLabel}>Kilometraje actual (opcional):</Text>
                  <TextInput
                    style={styles.kmInput}
                    value={vehicleKm}
                    onChangeText={setVehicleKm}
                    placeholder="Ej: 45200"
                    placeholderTextColor="#555872"
                    keyboardType="numeric"
                  />
                </View>

                {/* Categories */}
                <View style={styles.categoriesList}>
                  {INSPECTION_CATEGORIES.map((cat) => {
                    const isExpanded = expandedCat === cat.id;
                    const catItems = categoriesState[cat.id] || {};
                    const issuesCount = Object.values(catItems).filter(
                      (it) => it.status === 'regular' || it.status === 'bad'
                    ).length;

                    return (
                      <View key={cat.id} style={styles.catCard}>
                        <TouchableOpacity
                          style={styles.catHeader}
                          onPress={() => setExpandedCat(isExpanded ? '' : cat.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.catHeaderLeft}>
                            <View style={styles.catIconWrap}>
                              <Ionicons name={cat.icon} size={18} color="#818cf8" />
                            </View>
                            <Text style={styles.catTitle}>{cat.title}</Text>
                            {issuesCount > 0 && (
                              <View style={styles.issueBadge}>
                                <Text style={styles.issueBadgeText}>{issuesCount}</Text>
                              </View>
                            )}
                          </View>
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color="#8b8fa3"
                          />
                        </TouchableOpacity>

                        {isExpanded && (
                          <View style={styles.catBody}>
                            {cat.items.map((item) => {
                              const itState = catItems[item.key] || { status: 'good', notes: '' };
                              const status = itState.status;

                              return (
                                <View key={item.key} style={styles.itemRow}>
                                  <View style={styles.itemLeft}>
                                    <Text style={styles.itemLabel}>{item.label}</Text>
                                  </View>

                                  <View style={styles.statusButtons}>
                                    <TouchableOpacity
                                      style={[
                                        styles.statusBtn,
                                        status === 'good' && styles.statusBtnGood,
                                      ]}
                                      onPress={() => handleSetStatus(cat.id, item.key, 'good')}
                                    >
                                      <Text
                                        style={[
                                          styles.statusBtnText,
                                          status === 'good' && styles.statusBtnTextActive,
                                        ]}
                                      >
                                        B
                                      </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                      style={[
                                        styles.statusBtn,
                                        status === 'regular' && styles.statusBtnRegular,
                                      ]}
                                      onPress={() => handleSetStatus(cat.id, item.key, 'regular')}
                                    >
                                      <Text
                                        style={[
                                          styles.statusBtnText,
                                          status === 'regular' && styles.statusBtnTextActive,
                                        ]}
                                      >
                                        R
                                      </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                      style={[
                                        styles.statusBtn,
                                        status === 'bad' && styles.statusBtnBad,
                                      ]}
                                      onPress={() => handleSetStatus(cat.id, item.key, 'bad')}
                                    >
                                      <Text
                                        style={[
                                          styles.statusBtnText,
                                          status === 'bad' && styles.statusBtnTextActive,
                                        ]}
                                      >
                                        M
                                      </Text>
                                    </TouchableOpacity>
                                  </View>

                                  {(status === 'regular' || status === 'bad') && (
                                    <View style={styles.noteInputRow}>
                                      <TextInput
                                        style={styles.noteInput}
                                        value={itState.notes}
                                        onChangeText={(t) => handleSetNotes(cat.id, item.key, t)}
                                        placeholder="Describe la novedad encontrada..."
                                        placeholderTextColor="#555872"
                                      />
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* Observations */}
                <View style={styles.obsCard}>
                  <Text style={styles.inputLabel}>Observaciones Generales (opcional):</Text>
                  <TextInput
                    style={styles.obsInput}
                    value={generalNotes}
                    onChangeText={setGeneralNotes}
                    placeholder="Ej: Rayón previo en puerta delantera derecha..."
                    placeholderTextColor="#555872"
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer */}
          {!isSubmitted && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#6366f1', '#4f46e5']}
                  style={styles.btnGradient}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color="#fff" />
                      <Text style={styles.btnText}>Enviar al Cliente</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0f1322',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1e243d',
    maxHeight: '92%',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e243d',
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  badge: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderColor: 'rgba(99,102,241,0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    color: '#818cf8',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    color: '#8b8fa3',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#171b30',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    gap: 12,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderColor: 'rgba(56,189,248,0.25)',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#bae6fd',
    lineHeight: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipRegular: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: 'rgba(245,158,11,0.3)',
  },
  chipRegularText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: 'bold',
  },
  chipBad: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  chipBadText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: 'bold',
  },
  inputCard: {
    backgroundColor: '#171b30',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#232948',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  kmInput: {
    backgroundColor: '#0a0d18',
    borderWidth: 1,
    borderColor: '#333b66',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    width: 110,
    textAlign: 'right',
  },
  categoriesList: {
    gap: 10,
  },
  catCard: {
    backgroundColor: '#171b30',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#232948',
    overflow: 'hidden',
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  catHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(99,102,241,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  issueBadge: {
    backgroundColor: '#ea580c',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  issueBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  catBody: {
    borderTopWidth: 1,
    borderTopColor: '#232948',
    padding: 10,
    gap: 8,
    backgroundColor: '#121627',
  },
  itemRow: {
    backgroundColor: '#171b30',
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  itemLeft: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBtn: {
    width: 34,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#232948',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBtnGood: {
    backgroundColor: '#22c55e',
  },
  statusBtnRegular: {
    backgroundColor: '#f59e0b',
  },
  statusBtnBad: {
    backgroundColor: '#ef4444',
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8b8fa3',
  },
  statusBtnTextActive: {
    color: '#ffffff',
  },
  noteInputRow: {
    width: '100%',
    paddingTop: 4,
  },
  noteInput: {
    backgroundColor: '#0a0d18',
    borderWidth: 1,
    borderColor: '#f59e0b44',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    color: '#fff',
  },
  obsCard: {
    backgroundColor: '#171b30',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#232948',
    padding: 12,
    gap: 6,
  },
  obsInput: {
    backgroundColor: '#0a0d18',
    borderWidth: 1,
    borderColor: '#333b66',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    fontSize: 12,
    minHeight: 50,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e243d',
    gap: 12,
    backgroundColor: '#0f1322',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333b66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#8b8fa3',
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  btnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  waitingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  waitingBox: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  waitingIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
  },
  waitingDesc: {
    fontSize: 12,
    color: '#8b8fa3',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  timerCard: {
    backgroundColor: '#171b30',
    borderWidth: 1,
    borderColor: '#232948',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    gap: 4,
    marginTop: 10,
  },
  timerText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '500',
  },
  timerNum: {
    color: '#818cf8',
    fontWeight: 'bold',
  },
  timerHelper: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
  },
  timeoutBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f59e0b66',
    marginTop: 10,
  },
  timeoutBtnText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: 'bold',
  },
  confirmedBox: {
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },
  confirmedIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  confirmedDesc: {
    fontSize: 12,
    color: '#8b8fa3',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  startWorkBtn: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
});
