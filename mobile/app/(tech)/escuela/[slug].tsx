import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { COLORS, NEU, RADIUS } from '@/constants/theme';
import { NeuIcon, NeuCard, NeuWell, NeuButton } from '@/components/neu';
import {
  getCourseDetailBySlug,
  enrollInCourse,
  CourseDetailResponse,
  LessonSummary,
} from '@/lib/api';

export default function CourseDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!slug) return;
    try {
      setIsLoading(true);
      const res = await getCourseDetailBySlug(slug);
      setCourse(res);
    } catch (err: any) {
      console.error('Error cargando detalle del curso:', err);
      Alert.alert('Error', 'No se pudo cargar el curso seleccionado.');
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleEnroll = async () => {
    if (!slug) return;
    setIsEnrolling(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await enrollInCourse(slug);
      await loadDetail();
      // Jump to first lesson
      if (course?.lessons && course.lessons.length > 0) {
        router.push(`/(tech)/escuela/${slug}/leccion/${course.lessons[0].slug}` as any);
      }
    } catch (err: any) {
      Alert.alert('Inscripción', err.message || 'No se pudo completar la inscripción');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleOpenLesson = (lesson: LessonSummary) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/(tech)/escuela/${slug}/leccion/${lesson.slug}` as any);
  };

  if (isLoading || !course) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
        <Text style={styles.loadingText}>Cargando temario...</Text>
      </View>
    );
  }

  const completedCount = course.lessons.filter((l) => l.is_completed).length;
  const totalLessons = course.lessons.length;
  const allCompleted = totalLessons > 0 && completedCount >= totalLessons;
  const firstIncompleteLesson = course.lessons.find((l) => !l.is_completed) || course.lessons[0];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {course.title}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Course Info Card */}
        <NeuCard style={styles.heroCard}>
          <View style={styles.pillRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{course.category.toUpperCase()}</Text>
            </View>
            <View style={styles.pointsPill}>
              <Ionicons name="trophy-outline" size={13} color={COLORS.yellow} />
              <Text style={styles.pointsPillText}>+{course.rank_points_reward} pts rango</Text>
            </View>
            {course.is_required_for_technicians && (
              <View style={styles.requiredPill}>
                <Ionicons name="star" size={12} color="#15171D" />
                <Text style={styles.requiredPillText}>Obligatorio</Text>
              </View>
            )}
          </View>

          <Text style={styles.courseTitle}>{course.title}</Text>

          {course.description ? (
            <Text style={styles.courseDescription}>{course.description}</Text>
          ) : null}

          {/* Instructor & Metadata */}
          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Ionicons name="person-circle-outline" size={16} color={COLORS.primaryLight} />
              <Text style={styles.metaLabel}>Instructor:</Text>
              <Text style={styles.metaValue}>{course.instructor_name || 'Equipo Técnico Tec360'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.metaLabel}>Duración:</Text>
              <Text style={styles.metaValue}>{course.estimated_hours} horas estimadas</Text>
            </View>
            {course.badge_name && (
              <View style={styles.metaRow}>
                <Ionicons name="ribbon-outline" size={16} color={COLORS.green} />
                <Text style={styles.metaLabel}>Insignia:</Text>
                <Text style={[styles.metaValue, { color: COLORS.green }]}>{course.badge_name}</Text>
              </View>
            )}
          </View>

          {/* Progress or Enrollment Status */}
          {course.is_enrolled && (
            <NeuWell style={styles.progressCard}>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Progreso técnico</Text>
                <Text style={styles.progressPctText}>{Math.round(course.progress_pct || 0)}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.max(5, Math.min(100, course.progress_pct || 0))}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressSubtext}>
                {completedCount} de {totalLessons} lecciones completadas
              </Text>
            </NeuWell>
          )}

          {/* Certification Passed Banner */}
          {course.quiz_passed && course.certificate_code && (
            <TouchableOpacity
              style={styles.certificateBanner}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                router.push(`/(tech)/escuela/certificado/${course.certificate_code}` as any);
              }}
            >
              <Ionicons name="shield-checkmark" size={24} color={COLORS.green} />
              <View style={{ flex: 1 }}>
                <Text style={styles.certificateBannerTitle}>¡Certificado Aprobado!</Text>
                <Text style={styles.certificateBannerCode}>{course.certificate_code}</Text>
              </View>
              <View style={styles.certificateBannerBtn}>
                <Text style={styles.certificateBannerBtnText}>Ver Diploma</Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.onPrimary} />
              </View>
            </TouchableOpacity>
          )}
        </NeuCard>

        {/* Syllabus Section */}
        <View style={styles.syllabusSection}>
          <View style={styles.syllabusHeaderRow}>
            <Text style={styles.syllabusTitle}>Temario de Lecciones</Text>
            <Text style={styles.syllabusCountText}>{totalLessons} módulos</Text>
          </View>

          {course.lessons.map((lesson, idx) => {
            const isCompleted = lesson.is_completed;
            const durationMin = Math.round(lesson.video_duration_seconds / 60) || 10;

            return (
              <TouchableOpacity
                key={lesson.id}
                onPress={() => handleOpenLesson(lesson)}
                activeOpacity={0.78}
                style={styles.lessonRowWrapper}
              >
                <NeuCard style={[styles.lessonCard, isCompleted && styles.lessonCardCompleted]}>
                  {/* Status Circle */}
                  <View style={[styles.statusIconBox, isCompleted && styles.statusIconBoxCompleted]}>
                    {isCompleted ? (
                      <Ionicons name="checkmark-sharp" size={18} color={COLORS.green} />
                    ) : (
                      <Text style={styles.lessonNumber}>{idx + 1}</Text>
                    )}
                  </View>

                  {/* Title & Duration */}
                  <View style={styles.lessonInfo}>
                    <Text
                      style={[styles.lessonTitle, isCompleted && styles.lessonTitleCompleted]}
                      numberOfLines={2}
                    >
                      {lesson.title}
                    </Text>
                    <View style={styles.lessonMetaRow}>
                      <Ionicons name="play-circle-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.lessonMetaText}>{durationMin} min</Text>
                      {lesson.is_free_preview && !course.is_enrolled && (
                        <View style={styles.previewTag}>
                          <Text style={styles.previewTagText}>Vista previa</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </NeuCard>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Evaluation Banner if all completed */}
        {course.is_enrolled && allCompleted && !course.quiz_passed && (
          <NeuCard style={styles.quizCtaCard}>
            <View style={styles.quizCtaIconWrap}>
              <Ionicons name="school" size={26} color={COLORS.yellow} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.quizCtaTitle}>Evaluación de Certificación</Text>
              <Text style={styles.quizCtaDesc}>
                Has completado todas las lecciones. Responde el quiz con 100% para obtener tu diploma.
              </Text>
            </View>
          </NeuCard>
        )}
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {!course.is_enrolled ? (
          <NeuButton
            label={isEnrolling ? 'Inscribiendo...' : 'Inscribirme en el Curso'}
            icon="school-outline"
            loading={isEnrolling}
            onPress={handleEnroll}
          />
        ) : allCompleted && !course.quiz_passed ? (
          <NeuButton
            label="Iniciar Evaluación (100% de rigor)"
            icon="trophy"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              router.push(`/(tech)/escuela/${slug}/quiz` as any);
            }}
          />
        ) : course.quiz_passed ? (
          <NeuButton
            label="Ver Certificado Oficial"
            icon="ribbon"
            tone="surface"
            onPress={() => {
              router.push(`/(tech)/escuela/certificado/${course.certificate_code}` as any);
            }}
          />
        ) : (
          <NeuButton
            label={firstIncompleteLesson ? `Continuar: ${firstIncompleteLesson.title}` : 'Continuar Curso'}
            icon="play"
            onPress={() => {
              if (firstIncompleteLesson) handleOpenLesson(firstIncompleteLesson);
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  backButton: {
    ...NEU.raisedSm,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  content: {
    paddingHorizontal: 20,
    gap: 20,
  },

  /* Hero Card */
  heroCard: {
    padding: 20,
    borderRadius: RADIUS.xl,
    gap: 14,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    backgroundColor: 'rgba(139,92,246,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryPillText: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(234,179,8,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pointsPillText: {
    color: COLORS.yellow,
    fontSize: 11,
    fontWeight: '700',
  },
  requiredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.yellow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  requiredPillText: {
    color: '#15171D',
    fontSize: 10,
    fontWeight: '800',
  },
  courseTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  courseDescription: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  metaBox: {
    backgroundColor: COLORS.sunken,
    padding: 12,
    borderRadius: RADIUS.md,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  metaValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },

  /* Progress in Hero */
  progressCard: {
    padding: 12,
    borderRadius: RADIUS.md,
    gap: 8,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  progressPctText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#15171D',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressSubtext: {
    color: COLORS.textMuted,
    fontSize: 11,
  },

  /* Certificate Banner */
  certificateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
    borderRadius: RADIUS.lg,
    padding: 14,
  },
  certificateBannerTitle: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: '700',
  },
  certificateBannerCode: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  certificateBannerBtn: {
    backgroundColor: COLORS.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  certificateBannerBtnText: {
    color: COLORS.onPrimary,
    fontSize: 11,
    fontWeight: '700',
  },

  /* Syllabus */
  syllabusSection: {
    gap: 12,
  },
  syllabusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syllabusTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  syllabusCountText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  lessonRowWrapper: {
    marginBottom: 8,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: RADIUS.lg,
    gap: 12,
  },
  lessonCardCompleted: {
    opacity: 0.9,
  },
  statusIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconBoxCompleted: {
    backgroundColor: 'rgba(52,211,153,0.16)',
  },
  lessonNumber: {
    color: COLORS.primaryLight,
    fontSize: 14,
    fontWeight: '700',
  },
  lessonInfo: {
    flex: 1,
    gap: 4,
  },
  lessonTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  lessonTitleCompleted: {
    color: COLORS.textSecondary,
  },
  lessonMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lessonMetaText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  previewTag: {
    backgroundColor: 'rgba(96,165,250,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  previewTagText: {
    color: COLORS.blue,
    fontSize: 9,
    fontWeight: '700',
  },

  /* Quiz CTA */
  quizCtaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.3)',
    backgroundColor: 'rgba(234,179,8,0.06)',
  },
  quizCtaIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(234,179,8,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizCtaTitle: {
    color: COLORS.yellow,
    fontSize: 15,
    fontWeight: '800',
  },
  quizCtaDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },

  /* Bottom Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
