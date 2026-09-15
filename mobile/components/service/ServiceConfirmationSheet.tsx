import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchWithAuth } from '@/lib/api';
import { INSPECTION_CATEGORIES } from '../technician/VehicleInspectionSheet';

const STAR_LABELS = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];

interface ServiceConfirmationSheetProps {
  visible: boolean;
  mode: 'inspection' | 'completion';
  service: any;
  onClose: () => void;
  onSuccess: (updatedService?: any) => void;
}

export default function ServiceConfirmationSheet({
  visible,
  mode,
  service,
  onClose,
  onSuccess,
}: ServiceConfirmationSheetProps) {
  // Inspection view state
  const [expandedCat, setExpandedCat] = useState<string>('luces');

  // Completion & Rating state
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>(service?.payment_method || 'cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!visible || !service) return null;

  const inspection = service.service_metadata?.vehicle_inspection;

  // ─── Confirm Inspection ───
  const handleConfirmInspection = async () => {
    setIsSubmitting(true);
    try {
      await fetchWithAuth(`/services/${service.id}/inspection/confirm`, {
        method: 'POST',
      });
      Alert.alert(
        '✅ Inspección confirmada',
        'Has confirmado el estado previo del vehículo. El técnico ya puede comenzar el servicio.'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo confirmar la inspección');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Confirm Completion + Rating ───
  const handleConfirmCompletion = async () => {
    if (rating === 0) {
      Alert.alert('Selecciona una calificación', 'Por favor califica el servicio con estrellas (1-5)');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth(`/services/${service.id}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || undefined,
          payment_method: paymentMethod,
        }),
      });
      Alert.alert('🎉 ¡Servicio finalizado!', 'Gracias por confirmar tu conformidad y calificar el trabajo.');
      onSuccess(res);
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo confirmar la finalización');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute inspection stats
  let badCount = 0;
  let regularCount = 0;
  let goodCount = 0;
  if (inspection?.categories) {
    Object.values(inspection.categories).forEach((cat: any) => {
      Object.values(cat).forEach((it: any) => {
        if (it.status === 'bad') badCount++;
        else if (it.status === 'regular') regularCount++;
        else goodCount++;
      });
    });
  }

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
                <Ionicons
                  name={mode === 'inspection' ? 'search' : 'star'}
                  size={20}
                  color={mode === 'inspection' ? '#818cf8' : '#eab308'}
                />
                <Text style={styles.headerTitle}>
                  {mode === 'inspection'
                    ? 'Inspección de tu Vehículo'
                    : 'Confirmar Conformidad'}
                </Text>
              </View>
              <Text style={styles.subtitle}>
                {service.vehicle_model || service.title}{' '}
                {service.vehicle_plate ? `• ${service.vehicle_plate}` : ''}
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
            {mode === 'inspection' ? (
              /* ─── Mode: Inspection Review ─── */
              <>
                <View style={styles.infoCard}>
                  <Ionicons name="shield-checkmark" size={20} color="#38bdf8" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoCardTitle}>Revisión de Seguridad Pre-Servicio</Text>
                    <Text style={styles.infoCardText}>
                      El técnico registró el estado previo de tu vehículo antes de intervenirlo.
                      Verifica las novedades y confirma para autorizar el inicio del trabajo.
                    </Text>
                  </View>
                </View>

                {/* Summary chips */}
                <View style={styles.chipsRow}>
                  <View style={[styles.chip, styles.chipGood]}>
                    <Text style={styles.chipGoodText}>{goodCount} Buenos</Text>
                  </View>
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

                {inspection?.vehicle_km && (
                  <View style={styles.kmRow}>
                    <Text style={styles.kmLabel}>Kilometraje registrado:</Text>
                    <Text style={styles.kmValue}>{inspection.vehicle_km} km</Text>
                  </View>
                )}

                {/* Categories */}
                <View style={styles.categoriesList}>
                  {INSPECTION_CATEGORIES.map((cat) => {
                    const isExpanded = expandedCat === cat.id;
                    const catData = inspection?.categories?.[cat.id] || {};
                    const issuesCount = cat.items.filter((it) => {
                      const st = catData[it.key]?.status;
                      return st === 'regular' || st === 'bad';
                    }).length;

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
                            {cat.items.map((it) => {
                              const itData = catData[it.key] || { status: 'good', notes: '' };
                              const isBad = itData.status === 'bad';
                              const isRegular = itData.status === 'regular';

                              return (
                                <View key={it.key} style={styles.itemRow}>
                                  <Text style={styles.itemLabel}>{it.label}</Text>
                                  <View style={styles.itemRight}>
                                    {itData.notes ? (
                                      <Text style={styles.itemNote} numberOfLines={1}>
                                        "{itData.notes}"
                                      </Text>
                                    ) : null}
                                    <View
                                      style={[
                                        styles.statusTag,
                                        isBad
                                          ? styles.statusTagBad
                                          : isRegular
                                          ? styles.statusTagRegular
                                          : styles.statusTagGood,
                                      ]}
                                    >
                                       <Text
                                         style={
                                           isBad
                                             ? styles.statusTagBadText
                                             : isRegular
                                             ? styles.statusTagRegularText
                                             : styles.statusTagGoodText
                                         }
                                       >
                                         {isBad ? 'Malo' : isRegular ? 'Regular' : 'Bueno'}
                                       </Text>
                                    </View>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>

                {inspection?.general_notes ? (
                  <View style={styles.obsBox}>
                    <Text style={styles.obsBoxTitle}>Observaciones del Técnico:</Text>
                    <Text style={styles.obsBoxText}>"{inspection.general_notes}"</Text>
                  </View>
                ) : null}
              </>
            ) : (
              /* ─── Mode: Completion & Rating ─── */
              <>
                <View style={styles.ratingHeaderBox}>
                  <Text style={styles.ratingEmoji}>⭐</Text>
                  <Text style={styles.ratingPrompt}>¿Cómo calificarías el servicio?</Text>
                  <Text style={styles.ratingHelper}>
                    El técnico {service.technician?.full_name || ''} ha finalizado. Tu
                    calificación respalda la calidad de Tec360.
                  </Text>
                </View>

                {/* Stars selector */}
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setRating(star)}
                      activeOpacity={0.7}
                      style={styles.starTouch}
                    >
                      <Ionicons
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={42}
                        color={star <= rating ? '#eab308' : '#334155'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.starLabelText}>{STAR_LABELS[rating]}</Text>

                {/* Comments */}
                <View style={styles.commentSection}>
                  <Text style={styles.inputSectionLabel}>Comentario u opinión (opcional):</Text>
                  <TextInput
                    style={styles.commentInput}
                    value={comment}
                    onChangeText={setComment}
                    placeholder="Escribe tu opinión sobre la puntualidad o trabajo realizado..."
                    placeholderTextColor="#555872"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Payment Method Selector */}
                <View style={styles.paymentSection}>
                  <Text style={styles.inputSectionLabel}>Método de Pago:</Text>
                  <View style={styles.paymentRow}>
                    <TouchableOpacity
                      style={[
                        styles.paymentBtn,
                        paymentMethod === 'cash' && styles.paymentBtnActiveCash,
                      ]}
                      onPress={() => setPaymentMethod('cash')}
                    >
                      <Text
                        style={[
                          styles.paymentBtnText,
                          paymentMethod === 'cash' && styles.paymentBtnTextActiveCash,
                        ]}
                      >
                        💵 Efectivo al Técnico
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.paymentBtn,
                        paymentMethod === 'online' && styles.paymentBtnActiveOnline,
                      ]}
                      onPress={() => setPaymentMethod('online')}
                    >
                      <Text
                        style={[
                          styles.paymentBtnText,
                          paymentMethod === 'online' && styles.paymentBtnTextActiveOnline,
                        ]}
                      >
                        💳 Pago en Línea
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Cerrar</Text>
            </TouchableOpacity>

            {mode === 'inspection' ? (
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmInspection}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.btnGradient}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={styles.btnText}>Confirmar Inspección</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmCompletion}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.btnGradient}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.btnText}>Confirmar Conformidad</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
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
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
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
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderColor: 'rgba(56,189,248,0.25)',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
  },
  infoCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#bae6fd',
    marginBottom: 2,
  },
  infoCardText: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipGood: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderColor: 'rgba(34,197,94,0.3)',
  },
  chipGoodText: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: 'bold',
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
  kmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#171b30',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#232948',
  },
  kmLabel: {
    color: '#8b8fa3',
    fontSize: 12,
    fontWeight: '500',
  },
  kmValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoriesList: {
    gap: 8,
  },
  catCard: {
    backgroundColor: '#171b30',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#232948',
    overflow: 'hidden',
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  catHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(99,102,241,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
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
    padding: 8,
    gap: 6,
    backgroundColor: '#121627',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  itemLabel: {
    fontSize: 12,
    color: '#cbd5e1',
    flex: 1,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemNote: {
    fontSize: 11,
    color: '#fbbf24',
    fontStyle: 'italic',
    maxWidth: 120,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusTagGood: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderColor: 'rgba(34,197,94,0.3)',
  },
  statusTagGoodText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusTagRegular: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: 'rgba(245,158,11,0.3)',
  },
  statusTagRegularText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusTagBad: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  statusTagBadText: {
    color: '#f87171',
    fontSize: 10,
    fontWeight: 'bold',
  },
  obsBox: {
    backgroundColor: '#171b30',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#232948',
    padding: 12,
    gap: 4,
  },
  obsBoxTitle: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: 'bold',
  },
  obsBoxText: {
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic',
  },
  ratingHeaderBox: {
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  ratingEmoji: {
    fontSize: 36,
  },
  ratingPrompt: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  ratingHelper: {
    fontSize: 12,
    color: '#8b8fa3',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  starTouch: {
    padding: 4,
  },
  starLabelText: {
    color: '#eab308',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  commentSection: {
    gap: 6,
  },
  inputSectionLabel: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentInput: {
    backgroundColor: '#171b30',
    borderWidth: 1,
    borderColor: '#232948',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 12,
    minHeight: 65,
    textAlignVertical: 'top',
  },
  paymentSection: {
    gap: 8,
    marginTop: 6,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#232948',
    backgroundColor: '#171b30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentBtnActiveCash: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  paymentBtnActiveOnline: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99,102,241,0.15)',
  },
  paymentBtnText: {
    color: '#8b8fa3',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentBtnTextActiveCash: {
    color: '#4ade80',
    fontWeight: 'bold',
  },
  paymentBtnTextActiveOnline: {
    color: '#818cf8',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e243d',
    gap: 10,
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
  confirmBtn: {
    flex: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  btnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
