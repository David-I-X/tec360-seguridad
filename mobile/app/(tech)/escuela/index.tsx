import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { COLORS, NEU, RADIUS, GRADIENTS } from '@/constants/theme';
import { NeuIcon, NeuCard, NeuWell } from '@/components/neu';
import {
  getCoursesList,
  getMyCoursesList,
  CourseListItem,
  API_URL,
} from '@/lib/api';

type IconName = keyof typeof Ionicons.glyphMap;

const CATEGORIES: { id: string; label: string; icon: IconName; color: string }[] = [
  { id: 'all', label: 'Todos', icon: 'layers-outline', color: COLORS.primaryLight },
  { id: 'basicos', label: 'Fundamentos', icon: 'shield-checkmark-outline', color: COLORS.green },
  { id: 'gps_alarmas', label: 'GPS y Alarmas', icon: 'radio-outline', color: COLORS.primaryLight },
  { id: 'dashcam', label: 'Dashcams HD', icon: 'videocam-outline', color: COLORS.blue },
  { id: 'mecanica_basica', label: 'Mecánica y Redes', icon: 'hardware-chip-outline', color: COLORS.yellow },
  { id: 'proveedor', label: 'Proveedores', icon: 'cube-outline', color: '#ec4899' },
];

const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  beginner: { label: 'Principiante', color: COLORS.green },
  intermediate: { label: 'Intermedio', color: COLORS.yellow },
  advanced: { label: 'Avanzado', color: COLORS.red },
};

export default function EscuelaCatalogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [onlyRequired, setOnlyRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const staticUrl = API_URL.replace(/\/api\/?$/, '');

  const loadData = useCallback(async () => {
    try {
      const [allRes, myRes] = await Promise.all([
        getCoursesList(),
        getMyCoursesList().catch(() => []),
      ]);
      setCourses(allRes || []);
      setMyCourses(myRes || []);
    } catch (err) {
      console.error('Error cargando cursos de Escuela Tec:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (selectedCategory !== 'all' && c.category !== selectedCategory) return false;
      if (onlyRequired && !c.is_required_for_technicians) return false;
      return true;
    });
  }, [courses, selectedCategory, onlyRequired]);

  // Active in-progress course (first uncompleted)
  const activeEnrolled = useMemo(() => {
    return myCourses.find((item) => !item.quiz_passed && item.progress_pct > 0) || myCourses[0];
  }, [myCourses]);

  const handleSelectCategory = (catId: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedCategory(catId);
  };

  const getThumbnailUri = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${staticUrl}${url}`;
  };

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
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Escuela Tec</Text>
          <Text style={styles.headerSubtitle}>Campus Técnico y Certificaciones</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setOnlyRequired(!onlyRequired);
          }}
          style={[styles.filterRequiredBtn, onlyRequired && styles.filterRequiredBtnActive]}
          hitSlop={6}
        >
          <Ionicons
            name={onlyRequired ? 'star' : 'star-outline'}
            size={18}
            color={onlyRequired ? COLORS.yellow : COLORS.textMuted}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={COLORS.primaryLight}
            colors={[COLORS.primaryLight]}
          />
        }
      >
        {/* Active In-Progress Hero Banner */}
        {activeEnrolled && (
          <NeuCard style={styles.activeCourseCard}>
            <View style={styles.activeCardHeader}>
              <View style={styles.activeTag}>
                <View style={styles.activePulseDot} />
                <Text style={styles.activeTagText}>En curso</Text>
              </View>
              <Text style={styles.activeProgressPercent}>
                {Math.round(activeEnrolled.progress_pct || 0)}%
              </Text>
            </View>

            <Text style={styles.activeCourseTitle} numberOfLines={2}>
              {activeEnrolled.course?.title || 'Curso actual'}
            </Text>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(5, Math.min(100, activeEnrolled.progress_pct || 0))}%` },
                ]}
              />
            </View>

            <View style={styles.activeFooter}>
              <Text style={styles.activeFooterLessons}>
                {activeEnrolled.completed_lessons || 0} de {activeEnrolled.course?.lessons_count || 0} lecciones
              </Text>
              <TouchableOpacity
                style={styles.continueBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  router.push(`/(tech)/escuela/${activeEnrolled.course?.slug}` as any);
                }}
              >
                <Text style={styles.continueBtnText}>Continuar</Text>
                <Ionicons name="arrow-forward" size={14} color={COLORS.onPrimary} />
              </TouchableOpacity>
            </View>
          </NeuCard>
        )}

        {/* Motivational Stats Row */}
        <View style={styles.statsRow}>
          <NeuWell style={styles.statBox}>
            <Ionicons name="ribbon-outline" size={20} color={COLORS.primaryLight} />
            <Text style={styles.statNum}>{myCourses.filter((c) => c.quiz_passed).length}</Text>
            <Text style={styles.statLabel}>Aprobados</Text>
          </NeuWell>
          <NeuWell style={styles.statBox}>
            <Ionicons name="book-outline" size={20} color={COLORS.blue} />
            <Text style={styles.statNum}>{courses.length}</Text>
            <Text style={styles.statLabel}>Disponibles</Text>
          </NeuWell>
          <NeuWell style={styles.statBox}>
            <Ionicons name="trophy-outline" size={20} color={COLORS.yellow} />
            <Text style={styles.statNum}>100%</Text>
            <Text style={styles.statLabel}>Rigor SENA</Text>
          </NeuWell>
        </View>

        {/* Category Horizontal Filter Pills */}
        <View style={styles.categorySection}>
          <Text style={styles.sectionHeaderTitle}>Especialidades</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => handleSelectCategory(cat.id)}
                  style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={cat.icon}
                    size={16}
                    color={isSelected ? COLORS.onPrimary : cat.color}
                  />
                  <Text style={[styles.categoryChipLabel, isSelected && styles.categoryChipLabelSelected]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Course Catalog List */}
        <View style={styles.catalogSection}>
          <View style={styles.catalogHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>Cursos Técnicos</Text>
            <Text style={styles.catalogCountText}>{filteredCourses.length} cursos</Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primaryLight} />
              <Text style={styles.loadingText}>Cargando catálogo técnico...</Text>
            </View>
          ) : filteredCourses.length === 0 ? (
            <NeuWell style={styles.emptyContainer}>
              <NeuIcon name="search-outline" size={56} color={COLORS.textMuted} inset />
              <Text style={styles.emptyTitle}>Sin cursos encontrados</Text>
              <Text style={styles.emptySubtitle}>
                No hay cursos disponibles para el filtro seleccionado.
              </Text>
            </NeuWell>
          ) : (
            filteredCourses.map((course) => {
              const diffConfig = DIFFICULTY_MAP[course.difficulty] || DIFFICULTY_MAP.beginner;
              const thumbUri = getThumbnailUri(course.thumbnail_url);

              return (
                <TouchableOpacity
                  key={course.id}
                  activeOpacity={0.88}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    router.push(`/(tech)/escuela/${course.slug}` as any);
                  }}
                >
                  <NeuCard style={styles.courseCard}>
                    {/* Thumbnail / Header Area */}
                    <View style={styles.courseThumbContainer}>
                      {thumbUri ? (
                        <Image source={{ uri: thumbUri }} style={styles.courseThumbImage} />
                      ) : (
                        <View style={styles.courseThumbFallback}>
                          <Ionicons name="hardware-chip-outline" size={36} color={COLORS.primaryLight} />
                        </View>
                      )}

                      {/* Overlaid Badges */}
                      <View style={styles.badgeOverlay}>
                        <View style={styles.categoryPill}>
                          <Text style={styles.categoryPillText}>{course.category.toUpperCase()}</Text>
                        </View>
                        <View style={[styles.diffPill, { borderColor: diffConfig.color }]}>
                          <Text style={[styles.diffPillText, { color: diffConfig.color }]}>
                            {diffConfig.label}
                          </Text>
                        </View>
                      </View>

                      {course.is_required_for_technicians && (
                        <View style={styles.requiredBadge}>
                          <Ionicons name="star" size={11} color="#15171D" />
                          <Text style={styles.requiredBadgeText}>Obligatorio SENA/Tec</Text>
                        </View>
                      )}
                    </View>

                    {/* Content Body */}
                    <View style={styles.courseCardBody}>
                      <Text style={styles.courseTitle} numberOfLines={2}>
                        {course.title}
                      </Text>

                      {course.description ? (
                        <Text style={styles.courseDesc} numberOfLines={2}>
                          {course.description}
                        </Text>
                      ) : null}

                      {/* Meta Info: Hours, Lessons, Points */}
                      <View style={styles.courseMetaRow}>
                        <View style={styles.metaItem}>
                          <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
                          <Text style={styles.metaText}>{course.estimated_hours}h</Text>
                        </View>
                        <View style={styles.metaDivider} />
                        <View style={styles.metaItem}>
                          <Ionicons name="book-outline" size={13} color={COLORS.textMuted} />
                          <Text style={styles.metaText}>{course.lessons_count} lecciones</Text>
                        </View>
                        <View style={styles.metaDivider} />
                        <View style={styles.metaItem}>
                          <Ionicons name="trophy-outline" size={13} color={COLORS.primaryLight} />
                          <Text style={[styles.metaText, { color: COLORS.primaryLight, fontWeight: '700' }]}>
                            +{course.rank_points_reward} pts
                          </Text>
                        </View>
                      </View>

                      {/* Bottom Action Row */}
                      <View style={styles.courseActionRow}>
                        {course.is_completed ? (
                          <View style={styles.completedBadge}>
                            <Ionicons name="checkmark-circle" size={15} color={COLORS.green} />
                            <Text style={styles.completedText}>Aprobado con 100%</Text>
                          </View>
                        ) : course.is_enrolled ? (
                          <View style={styles.enrolledRow}>
                            <View style={styles.enrolledTrack}>
                              <View
                                style={[
                                  styles.enrolledFill,
                                  { width: `${Math.max(8, course.progress_pct || 0)}%` },
                                ]}
                              />
                            </View>
                            <Text style={styles.enrolledPctText}>{Math.round(course.progress_pct || 0)}%</Text>
                          </View>
                        ) : (
                          <Text style={styles.freeAccessText}>
                            {course.is_paid ? `$${course.price.toLocaleString('es-CO')}` : 'Acceso gratuito'}
                          </Text>
                        )}

                        <View style={styles.openBtn}>
                          <Text style={styles.openBtnText}>
                            {course.is_completed ? 'Certificado' : course.is_enrolled ? 'Continuar' : 'Ver temario'}
                          </Text>
                          <Ionicons name="chevron-forward" size={14} color={COLORS.primaryLight} />
                        </View>
                      </View>
                    </View>
                  </NeuCard>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
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
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  filterRequiredBtn: {
    ...NEU.raisedSm,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRequiredBtnActive: {
    backgroundColor: 'rgba(251,191,36,0.12)',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  /* Active In-Progress Course */
  activeCourseCard: {
    padding: 16,
    borderRadius: RADIUS.xl,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  activeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52,211,153,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
  },
  activePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.green,
  },
  activeTagText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '700',
  },
  activeProgressPercent: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '800',
  },
  activeCourseTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.sunken,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  activeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeFooterLessons: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  continueBtn: {
    backgroundColor: COLORS.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
  },
  continueBtnText: {
    color: COLORS.onPrimary,
    fontSize: 13,
    fontWeight: '700',
  },

  /* Stats Row */
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    gap: 3,
  },
  statNum: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },

  /* Category Scroll */
  categorySection: {
    marginBottom: 20,
  },
  sectionHeaderTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  categoryScroll: {
    gap: 8,
  },
  categoryChip: {
    ...NEU.raisedSm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.surface,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.primaryDark,
  },
  categoryChipLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipLabelSelected: {
    color: COLORS.onPrimary,
    fontWeight: '700',
  },

  /* Catalog */
  catalogSection: {
    gap: 16,
  },
  catalogHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catalogCountText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    gap: 8,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },

  /* Course Card */
  courseCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  courseThumbContainer: {
    height: 120,
    width: '100%',
    backgroundColor: COLORS.sunken,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseThumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  courseThumbFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E212B',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryPill: {
    backgroundColor: 'rgba(15,17,23,0.82)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryPillText: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  diffPill: {
    backgroundColor: 'rgba(15,17,23,0.82)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  diffPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  requiredBadge: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.yellow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  requiredBadgeText: {
    color: '#15171D',
    fontSize: 10,
    fontWeight: '800',
  },

  courseCardBody: {
    padding: 16,
    gap: 10,
  },
  courseTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  courseDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  courseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.border,
  },
  courseActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  completedText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '700',
  },
  enrolledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 12,
  },
  enrolledTrack: {
    flex: 1,
    height: 5,
    backgroundColor: COLORS.sunken,
    borderRadius: 3,
    overflow: 'hidden',
  },
  enrolledFill: {
    height: '100%',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 3,
  },
  enrolledPctText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  freeAccessText: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: '700',
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  openBtnText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
});
