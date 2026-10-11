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
import { NeuCard, NeuWell, NeuButton } from '@/components/neu';
import {
  getCourseQuizQuestions,
  submitQuizAnswers,
  QuizQuestionItem,
  QuizEvaluationResult,
} from '@/lib/api';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export default function CourseQuizScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [questions, setQuestions] = useState<QuizQuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizEvaluationResult | null>(null);

  const loadQuiz = useCallback(async () => {
    if (!slug) return;
    try {
      setIsLoading(true);
      const res = await getCourseQuizQuestions(slug);
      setQuestions(res || []);
    } catch (err: any) {
      console.error('Error cargando quiz:', err);
      Alert.alert('Error', 'No se pudo cargar el cuestionario de certificación.');
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const currentQuestion = questions[currentIndex];
  const selectedOption = currentQuestion ? answers[currentQuestion.id] : undefined;
  const isAnswered = selectedOption !== undefined;
  const isLastQuestion = currentIndex === questions.length - 1;
  const totalAnswered = Object.keys(answers).length;

  const handleSelectOption = (optIdx: number) => {
    if (!currentQuestion) return;
    Haptics.selectionAsync().catch(() => {});
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optIdx,
    }));
  };

  const handleNext = () => {
    if (!isAnswered) {
      Alert.alert('Selección requerida', 'Por favor selecciona una respuesta para continuar.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!slug) return;
    if (totalAnswered < questions.length) {
      Alert.alert('Incompleto', 'Debes responder todas las preguntas antes de enviar la evaluación.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadAnswers = Object.entries(answers).map(([qId, optIdx]) => ({
        question_id: qId,
        selected_option_index: optIdx,
      }));

      const res = await submitQuizAnswers(slug, payloadAnswers);
      setResult(res);

      if (res.passed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo evaluar el cuestionario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
        <Text style={styles.loadingText}>Cargando evaluación de certificación...</Text>
      </View>
    );
  }

  // Result View (Passed or Failed)
  if (result) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
          <NeuCard style={[styles.resultCard, result.passed ? styles.resultCardPass : styles.resultCardFail]}>
            <View style={[styles.resultIconWrap, result.passed ? styles.resultIconPass : styles.resultIconFail]}>
              <Ionicons
                name={result.passed ? 'trophy' : 'alert-circle'}
                size={40}
                color={result.passed ? COLORS.yellow : COLORS.orange}
              />
            </View>

            <Text style={styles.resultTitle}>
              {result.passed ? '¡Certificación Aprobada!' : 'Evaluación no aprobada'}
            </Text>

            <Text style={styles.resultScoreText}>
              Puntaje: {result.score}% ({result.correct_answers} de {result.total_questions} correctas)
            </Text>

            <Text style={styles.resultMessage}>{result.message}</Text>

            {result.passed && result.certificate_code && (
              <NeuWell style={styles.certCodeBox}>
                <Text style={styles.certCodeLabel}>CÓDIGO DE CERTIFICACIÓN OFICIAL</Text>
                <Text style={styles.certCodeValue}>{result.certificate_code}</Text>
                {result.rank_points_awarded > 0 && (
                  <View style={styles.pointsAwardedRow}>
                    <Ionicons name="sparkles" size={14} color={COLORS.yellow} />
                    <Text style={styles.pointsAwardedText}>
                      +{result.rank_points_awarded} puntos sumados a tu rango
                    </Text>
                  </View>
                )}
              </NeuWell>
            )}

            <View style={styles.resultBtnCol}>
              {result.passed && result.certificate_code ? (
                <NeuButton
                  label="Ver Certificado Digital"
                  icon="shield-checkmark"
                  onPress={() => {
                    router.replace(`/(tech)/escuela/certificado/${result.certificate_code}` as any);
                  }}
                />
              ) : (
                <>
                  <NeuButton
                    label="Reintentar Evaluación"
                    icon="refresh-outline"
                    onPress={() => {
                      setResult(null);
                      setAnswers({});
                      setCurrentIndex(0);
                    }}
                  />
                  <TouchableOpacity
                    style={styles.reviewLessonsBtn}
                    onPress={() => router.replace(`/(tech)/escuela/${slug}` as any)}
                  >
                    <Text style={styles.reviewLessonsText}>Repasar temario del curso</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </NeuCard>
        </ScrollView>
      </View>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
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
          <Text style={styles.headerSubtitle}>Certificación Técnica</Text>
          <Text style={styles.headerTitle}>
            Pregunta {currentIndex + 1} de {questions.length}
          </Text>
        </View>
        <View style={styles.rigorBadge}>
          <Text style={styles.rigorBadgeText}>100% RIGOR</Text>
        </View>
      </View>

      {/* Stepper Progress Bar */}
      <View style={styles.stepperTrack}>
        <View style={[styles.stepperFill, { width: `${progressPercent}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Question Card */}
        <NeuCard style={styles.questionCard}>
          <Text style={styles.questionText}>{currentQuestion?.question_text}</Text>

          {/* Options List */}
          <View style={styles.optionsList}>
            {currentQuestion?.options.map((optionText, optIdx) => {
              const isSelected = selectedOption === optIdx;
              const letter = OPTION_LETTERS[optIdx] || String(optIdx + 1);

              return (
                <TouchableOpacity
                  key={optIdx}
                  activeOpacity={0.82}
                  onPress={() => handleSelectOption(optIdx)}
                  style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                >
                  <View style={[styles.optionLetterBox, isSelected && styles.optionLetterBoxSelected]}>
                    <Text style={[styles.optionLetterText, isSelected && styles.optionLetterTextSelected]}>
                      {letter}
                    </Text>
                  </View>
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {optionText}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </NeuCard>
      </ScrollView>

      {/* Bottom Navigation Controls */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.buttonRow}>
          {currentIndex > 0 ? (
            <TouchableOpacity style={styles.prevBtn} onPress={handlePrev} hitSlop={6}>
              <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : null}

          <View style={{ flex: 1 }}>
            {isLastQuestion ? (
              <NeuButton
                label={isSubmitting ? 'Evaluando...' : 'Finalizar y Calificar'}
                icon="checkmark-done"
                loading={isSubmitting}
                disabled={!isAnswered}
                onPress={handleSubmit}
              />
            ) : (
              <NeuButton
                label="Siguiente Pregunta"
                icon="arrow-forward"
                disabled={!isAnswered}
                onPress={handleNext}
              />
            )}
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
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  rigorBadge: {
    backgroundColor: 'rgba(234,179,8,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.3)',
  },
  rigorBadgeText: {
    color: COLORS.yellow,
    fontSize: 10,
    fontWeight: '800',
  },
  stepperTrack: {
    height: 4,
    backgroundColor: COLORS.sunken,
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  stepperFill: {
    height: '100%',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },

  /* Question Card */
  questionCard: {
    padding: 20,
    borderRadius: RADIUS.xl,
    gap: 20,
  },
  questionText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
  },
  optionsList: {
    gap: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.sunken,
    padding: 14,
    borderRadius: RADIUS.lg,
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionRowSelected: {
    backgroundColor: 'rgba(139,92,246,0.14)',
    borderColor: COLORS.primaryLight,
  },
  optionLetterBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterBoxSelected: {
    backgroundColor: COLORS.primaryDark,
  },
  optionLetterText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  optionLetterTextSelected: {
    color: COLORS.onPrimary,
  },
  optionText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: COLORS.text,
    fontWeight: '700',
  },

  /* Bottom Controls */
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
  buttonRow: {
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

  /* Result Screen */
  resultScroll: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  resultCard: {
    padding: 24,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    gap: 16,
  },
  resultCardPass: {
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.35)',
  },
  resultCardFail: {
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
  },
  resultIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultIconPass: {
    backgroundColor: 'rgba(234,179,8,0.15)',
  },
  resultIconFail: {
    backgroundColor: 'rgba(248,113,113,0.15)',
  },
  resultTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  resultScoreText: {
    color: COLORS.primaryLight,
    fontSize: 15,
    fontWeight: '700',
  },
  resultMessage: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  certCodeBox: {
    width: '100%',
    padding: 16,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    gap: 6,
  },
  certCodeLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  certCodeValue: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  pointsAwardedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  pointsAwardedText: {
    color: COLORS.yellow,
    fontSize: 12,
    fontWeight: '700',
  },
  resultBtnCol: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  reviewLessonsBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  reviewLessonsText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
});
