import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, NEU, RADIUS, GRADIENTS } from '@/constants/theme';
import { NeuCard, NeuWell, NeuButton } from '@/components/neu';

interface BasicCoursesModalProps {
  visible: boolean;
  onDismiss: () => void;
  onStartCourse: () => void;
  onViewAllCourses: () => void;
}

export function BasicCoursesModal({
  visible,
  onDismiss,
  onStartCourse,
  onViewAllCourses,
}: BasicCoursesModalProps) {
  if (!visible) return null;

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStartCourse();
  };

  const handleViewAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onViewAllCourses();
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Close button top right */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleDismiss}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header Icon / Badge */}
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Ionicons name="school" size={14} color={COLORS.primaryLight} />
                <Text style={styles.badgeText}>ESCUELA TEC360</Text>
              </View>
            </View>

            <View style={styles.iconCircle}>
              <LinearGradient
                colors={['#7c3aed', '#6366f1']}
                style={styles.iconGradient}
              >
                <Ionicons name="ribbon-outline" size={36} color="#fff" />
              </LinearGradient>
            </View>

            <Text style={styles.title}>¡Bienvenido al Equipo Técnico!</Text>
            <Text style={styles.subtitle}>
              Comienza con el pie derecho completando los cursos de inducción y estándares de calidad oficiales de Tec360.
            </Text>

            {/* Course Card Preview */}
            <NeuCard style={styles.courseCard}>
              <View style={styles.courseHeader}>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>INDUCCIÓN BÁSICA</Text>
                </View>
                <View style={styles.pointsPill}>
                  <Text style={styles.pointsPillText}>+25 pts</Text>
                </View>
              </View>

              <Text style={styles.courseTitle}>
                Fundamentos de Instalación y Seguridad Tec360
              </Text>

              <Text style={styles.courseDescription}>
                Protocolos de oro, manejo de ramales automotrices, herramientas esenciales y toma de evidencias de calidad.
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                  <Text style={styles.metaText}>~2 horas</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="layers-outline" size={14} color={COLORS.textMuted} />
                  <Text style={styles.metaText}>Principiante</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="shield-checkmark-outline" size={14} color="#10b981" />
                  <Text style={[styles.metaText, { color: '#10b981' }]}>Certificado digital</Text>
                </View>
              </View>
            </NeuCard>

            {/* Non-mandatory notice */}
            <NeuWell style={styles.noticeWell}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.primaryLight} />
              <Text style={styles.noticeText}>
                <Text style={{ fontWeight: '700', color: COLORS.text }}>Paso opcional por ahora: </Text>
                Puedes continuar sin realizar el curso y hacerlo cuando tengas tiempo desde tu panel o perfil.
              </Text>
            </NeuWell>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <NeuButton
                label="Comenzar Curso Básico"
                icon="play"
                onPress={handleStart}
                style={styles.primaryBtn}
              />

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleViewAll}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryBtnText}>Ver catálogo de cursos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dismissBtn}
                onPress={handleDismiss}
                activeOpacity={0.7}
              >
                <Text style={styles.dismissBtnText}>Hacerlo más tarde, ir al panel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 12, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 44 : 24,
  },
  modalContainer: {
    ...NEU.raised,
    width: '100%',
    maxHeight: '90%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.35)',
    overflow: 'hidden',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 22,
    alignItems: 'center',
  },
  badgeRow: {
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  badgeText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 6,
  },
  courseCard: {
    width: '100%',
    borderRadius: RADIUS.xl,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryPillText: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pointsPill: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pointsPillText: {
    color: '#facc15',
    fontSize: 11,
    fontWeight: '800',
  },
  courseTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
    lineHeight: 20,
  },
  courseDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  noticeWell: {
    width: '100%',
    borderRadius: RADIUS.lg,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 18,
    backgroundColor: 'rgba(20, 22, 34, 0.8)',
  },
  noticeText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  actionsContainer: {
    width: '100%',
    gap: 10,
    alignItems: 'center',
  },
  primaryBtn: {
    width: '100%',
  },
  secondaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
  dismissBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  dismissBtnText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
});
