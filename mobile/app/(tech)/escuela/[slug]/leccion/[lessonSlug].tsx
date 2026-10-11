import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { COLORS, NEU, RADIUS } from '@/constants/theme';
import { NeuCard, NeuWell, NeuButton } from '@/components/neu';
import {
  getLessonDetailBySlug,
  completeLesson,
  LessonDetail,
} from '@/lib/api';

/** Renders technical markdown content formatted natively for mobile */
function NativeTechnicalGuide({ content }: { content?: string | null }) {
  if (!content) {
    return (
      <NeuWell style={styles.emptyGuide}>
        <Ionicons name="document-text-outline" size={32} color={COLORS.textMuted} />
        <Text style={styles.emptyGuideText}>
          Esta lección se enfoca principalmente en la demostración en video instructivo.
        </Text>
      </NeuWell>
    );
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'bullet' | 'number'; items: string[] } | null = null;

  const flushList = (key: string) => {
    if (!currentList) return;
    if (currentList.type === 'bullet') {
      elements.push(
        <View key={key} style={styles.listContainer}>
          {currentList.items.map((item, idx) => {
            const hasColon = item.includes(':');
            const parts = hasColon ? item.split(':') : [item];
            const titlePart = parts[0].replace(/\*\*/g, '').trim();
            const bodyPart = parts.slice(1).join(':').trim();
            const isAlert =
              titlePart.toLowerCase().includes('prohibid') ||
              titlePart.toLowerCase().includes('peligro') ||
              titlePart.toLowerCase().includes('advertencia');

            return (
              <View
                key={idx}
                style={[
                  styles.bulletItem,
                  isAlert && styles.alertBulletItem,
                ]}
              >
                <View style={styles.bulletIconCol}>
                  {isAlert ? (
                    <Ionicons name="warning" size={16} color={COLORS.red} />
                  ) : (
                    <View style={styles.bulletDot} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  {hasColon ? (
                    <Text style={styles.bulletText}>
                      <Text style={[styles.bulletTitleBold, isAlert && { color: COLORS.red }]}>
                        {titlePart}:{' '}
                      </Text>
                      {bodyPart}
                    </Text>
                  ) : (
                    <Text style={styles.bulletText}>{item.replace(/\*\*/g, '')}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      );
    } else {
      elements.push(
        <View key={key} style={styles.listContainer}>
          {currentList.items.map((item, idx) => {
            const hasColon = item.includes(':');
            const parts = hasColon ? item.split(':') : [item];
            const titlePart = parts[0].replace(/\*\*/g, '').trim();
            const bodyPart = parts.slice(1).join(':').trim();

            return (
              <View key={idx} style={styles.numberItem}>
                <View style={styles.numberBadge}>
                  <Text style={styles.numberBadgeText}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  {hasColon ? (
                    <>
                      <Text style={styles.stepTitleBold}>{titlePart}</Text>
                      <Text style={styles.stepBodyText}>{bodyPart}</Text>
                    </>
                  ) : (
                    <Text style={styles.stepBodyText}>{item.replace(/\*\*/g, '')}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      );
    }
    currentList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) {
      if (currentList) flushList(`list-${i}`);
      continue;
    }

    if (raw.startsWith('### ') || raw.startsWith('## ')) {
      if (currentList) flushList(`list-before-h-${i}`);
      const heading = raw.replace(/^#{2,3}\s+/, '');
      elements.push(
        <View key={`h-${i}`} style={styles.sectionHeadingWrap}>
          <View style={styles.sectionAccentBar} />
          <Text style={styles.sectionHeadingText}>{heading}</Text>
        </View>
      );
    } else if (raw.startsWith('#### ')) {
      if (currentList) flushList(`list-before-h4-${i}`);
      elements.push(
        <Text key={`h4-${i}`} style={styles.subHeadingText}>
          {raw.replace('#### ', '')}
        </Text>
      );
    } else if (raw.startsWith('- ') || raw.startsWith('* ')) {
      if (!currentList || currentList.type !== 'bullet') {
        if (currentList) flushList(`flush-before-bullet-${i}`);
        currentList = { type: 'bullet', items: [] };
      }
      currentList.items.push(raw.replace(/^[-*]\s+/, ''));
    } else if (/^\d+\.\s+/.test(raw)) {
      if (!currentList || currentList.type !== 'number') {
        if (currentList) flushList(`flush-before-num-${i}`);
        currentList = { type: 'number', items: [] };
      }
      currentList.items.push(raw.replace(/^\d+\.\s+/, ''));
    } else {
      if (currentList) flushList(`list-before-p-${i}`);
      elements.push(
        <Text key={`p-${i}`} style={styles.paragraphText}>
          {raw.replace(/\*\*/g, '')}
        </Text>
      );
    }
  }

  if (currentList) flushList('final-list');

  return <View style={styles.guideWrapper}>{elements}</View>;
}

export default function LessonViewerScreen() {
  const { slug, lessonSlug } = useLocalSearchParams<{ slug: string; lessonSlug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);

  const loadLesson = useCallback(async () => {
    if (!slug || !lessonSlug) return;
    try {
      setIsLoading(true);
      const res = await getLessonDetailBySlug(slug, lessonSlug);
      setLesson(res);
    } catch (err: any) {
      console.error('Error cargando lección:', err);
      Alert.alert('Error', 'No se pudo cargar el contenido de la lección.');
    } finally {
      setIsLoading(false);
    }
  }, [slug, lessonSlug]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  const handleOpenVideo = async () => {
    if (!lesson?.video_url) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await WebBrowser.openBrowserAsync(lesson.video_url, {
        toolbarColor: COLORS.surface,
        controlsColor: COLORS.primaryLight,
        showTitle: true,
      });
    } catch (err) {
      console.error('Error al abrir video:', err);
    }
  };

  const handleCompleteAndNext = async () => {
    if (!slug || !lesson) return;
    setIsCompleting(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const result = await completeLesson(slug, lesson.id);

      if (lesson.next_lesson_slug) {
        // Jump to next lesson
        router.replace(`/(tech)/escuela/${slug}/leccion/${lesson.next_lesson_slug}` as any);
      } else {
        // Last lesson reached!
        if (result.can_take_quiz) {
          Alert.alert(
            '¡Lecciones completadas!',
            'Has finalizado todo el temario técnico. Ahora puedes presentar la evaluación oficial para certificar.',
            [
              {
                text: 'Iniciar Evaluación',
                onPress: () => router.replace(`/(tech)/escuela/${slug}/quiz` as any),
              },
              {
                text: 'Ver Curso',
                onPress: () => router.replace(`/(tech)/escuela/${slug}` as any),
                style: 'cancel',
              },
            ]
          );
        } else {
          router.replace(`/(tech)/escuela/${slug}` as any);
        }
      }
    } catch (err: any) {
      Alert.alert('Aviso', err.message || 'No se pudo registrar la lección como completada');
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading || !lesson) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
        <Text style={styles.loadingText}>Cargando lección técnica...</Text>
      </View>
    );
  }

  const durationMin = Math.round(lesson.video_duration_seconds / 60) || 8;

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
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Lección #{lesson.sort_order}
          </Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {lesson.title}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Video Card Player Prompt */}
        {lesson.video_url ? (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleOpenVideo}
            style={styles.videoCardWrapper}
          >
            <NeuCard style={styles.videoCard}>
              <View style={styles.videoThumbnailBackdrop}>
                <View style={styles.videoPlayCircle}>
                  <Ionicons name="play" size={28} color={COLORS.onPrimary} style={{ marginLeft: 3 }} />
                </View>
                <View style={styles.videoDurationPill}>
                  <Ionicons name="time-outline" size={12} color="#fff" />
                  <Text style={styles.videoDurationText}>{durationMin} min HD</Text>
                </View>
              </View>
              <View style={styles.videoCardFooter}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.videoCardTitle}>Video Instructivo Oficial</Text>
                  <Text style={styles.videoCardSubtitle}>
                    Demostración práctica en banco de pruebas y vehículo real
                  </Text>
                </View>
                <Ionicons name="open-outline" size={18} color={COLORS.primaryLight} />
              </View>
            </NeuCard>
          </TouchableOpacity>
        ) : null}

        {/* Technical Guide Content */}
        <NeuCard style={styles.guideCard}>
          <View style={styles.guideCardHeader}>
            <Ionicons name="book-outline" size={18} color={COLORS.primaryLight} />
            <Text style={styles.guideCardHeaderTitle}>Guía Técnica y Protocolo</Text>
          </View>
          <NativeTechnicalGuide content={lesson.content_markdown} />
        </NeuCard>
      </ScrollView>

      {/* Fixed Bottom Action Dock */}
      <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.dockButtonRow}>
          {lesson.prev_lesson_slug ? (
            <TouchableOpacity
              style={styles.prevBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                router.replace(`/(tech)/escuela/${slug}/leccion/${lesson.prev_lesson_slug}` as any);
              }}
            >
              <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : null}

          <View style={{ flex: 1 }}>
            <NeuButton
              label={
                isCompleting
                  ? 'Guardando...'
                  : lesson.next_lesson_slug
                  ? 'Completar y Siguiente'
                  : 'Completar y Finalizar'
              }
              icon="checkmark-circle-outline"
              loading={isCompleting}
              onPress={handleCompleteAndNext}
            />
          </View>
        </View>
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
  headerSubtitle: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  content: {
    paddingHorizontal: 20,
    gap: 18,
  },

  /* Video Card */
  videoCardWrapper: {
    borderRadius: RADIUS.xl,
  },
  videoCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  videoThumbnailBackdrop: {
    height: 160,
    backgroundColor: '#12141A',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  videoPlayCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 8px 18px rgba(124,58,237,0.45)',
  },
  videoDurationPill: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15,17,23,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  videoDurationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  videoCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  videoCardTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  videoCardSubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  /* Technical Guide Card */
  guideCard: {
    padding: 18,
    borderRadius: RADIUS.xl,
    gap: 14,
  },
  guideCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  guideCardHeaderTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  guideWrapper: {
    gap: 12,
  },
  emptyGuide: {
    padding: 24,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    gap: 8,
  },
  emptyGuideText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Formatted Typography Elements */
  sectionHeadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  sectionAccentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: COLORS.primaryLight,
  },
  sectionHeadingText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  subHeadingText: {
    color: COLORS.primaryLight,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  paragraphText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  listContainer: {
    gap: 10,
    marginVertical: 4,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.sunken,
    padding: 12,
    borderRadius: RADIUS.md,
    gap: 10,
  },
  alertBulletItem: {
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.25)',
  },
  bulletIconCol: {
    marginTop: 3,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primaryLight,
  },
  bulletText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  bulletTitleBold: {
    color: COLORS.text,
    fontWeight: '700',
  },
  numberItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.sunken,
    padding: 12,
    borderRadius: RADIUS.md,
    gap: 12,
  },
  numberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadgeText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '800',
  },
  stepTitleBold: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  stepBodyText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  /* Bottom Dock */
  bottomDock: {
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
  dockButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prevBtn: {
    ...NEU.raisedSm,
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
