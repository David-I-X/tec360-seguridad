import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchWithAuth } from '../../lib/api';
import { COLORS } from '../../constants/theme';

type Question = {
  id: string;
  question_text: string;
  options: string[];
};

type QuizResult = {
  passed: boolean;
  score: number;
  total_questions: number;
  correct_answers: number;
  can_retry_after?: string;
};

export default function QuizScreen() {
  const params = useLocalSearchParams<{ specialization?: string }>();
  const specialization = params.specialization || 'gps_installation'; 
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null); 

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const res = await fetchWithAuth(`/verification/quiz/${specialization}`);
      if (!res.ok) {
        const errorData = await res.json();
        Alert.alert('Aviso', errorData.detail || 'No se pudo cargar el quiz');
        router.back();
        return;
      }
      const data = await res.json();
      setQuestions(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (index: number) => {
    setAnswers({
      ...answers,
      [questions[currentIndex].id]: index
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    try {
      setSubmitting(true);
      
      const payload = {
        answers: Object.entries(answers).map(([question_id, selected_option_index]) => ({
          question_id,
          selected_option_index
        }))
      };

      const res = await fetchWithAuth(`/verification/quiz/${specialization}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo enviar el quiz');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (result) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1a1025', '#050810']} style={StyleSheet.absoluteFill} />
        <View style={styles.resultContainer}>
          <Ionicons 
            name={result.passed ? "checkmark-circle" : "close-circle"} 
            size={80} 
            color={result.passed ? "#10b981" : "#ef4444"} 
          />
          <Text style={styles.resultTitle}>
            {result.passed ? "¡Quiz Aprobado!" : "Quiz Reprobado"}
          </Text>
          <Text style={styles.scoreText}>{result.score}%</Text>
          <Text style={styles.resultDesc}>
            Respondiste correctamente {result.correct_answers} de {result.total_questions} preguntas.
          </Text>
          
          {!result.passed && result.can_retry_after && (
            <Text style={styles.retryText}>
              Podrás reintentarlo después de: {new Date(result.can_retry_after).toLocaleDateString()}
            </Text>
          )}

          <TouchableOpacity 
            style={[styles.btn, result.passed ? styles.btnSuccess : styles.btnPrimary]}
            onPress={() => router.replace('/(auth)/verification')}
          >
            <Text style={styles.btnText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentQuestion = questions[currentIndex];
  const hasAnsweredCurrent = answers[currentQuestion.id] !== undefined;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1025', '#050810']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pregunta {currentIndex + 1} de {questions.length}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${((currentIndex + 1) / questions.length) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
        
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, idx) => {
            const isSelected = answers[currentQuestion.id] === idx;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.optionBtn, isSelected && styles.optionSelected]}
                onPress={() => handleSelectOption(idx)}
              >
                <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextBtn, !hasAnsweredCurrent && styles.nextBtnDisabled]}
          disabled={!hasAnsweredCurrent || submitting}
          onPress={handleNext}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextBtnText}>
              {currentIndex === questions.length - 1 ? "Finalizar Quiz" : "Siguiente"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050810' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  backBtn: { padding: 4 },
  headerTitle: { color: COLORS.text, fontSize: 16, fontWeight: '500' },
  progressBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', width: '100%' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary },
  scroll: { padding: 24 },
  questionText: { fontSize: 20, fontWeight: '600', color: '#fff', lineHeight: 28, marginBottom: 32 },
  optionsContainer: { gap: 16 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)' },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: 'rgba(139, 92, 246, 0.1)' },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.text, marginRight: 16, justifyContent: 'center', alignItems: 'center' },
  radioOuterSelected: { borderColor: COLORS.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  optionText: { flex: 1, fontSize: 16, color: '#fff', lineHeight: 22 },
  optionTextSelected: { fontWeight: '500' },
  footer: { padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  nextBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  // Result styles
  resultContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  resultTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 24, marginBottom: 8 },
  scoreText: { fontSize: 64, fontWeight: '900', color: '#fff', marginVertical: 16 },
  resultDesc: { fontSize: 16, color: COLORS.text, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  retryText: { fontSize: 14, color: '#ef4444', textAlign: 'center', marginBottom: 32, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 8 },
  btn: { width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnSuccess: { backgroundColor: '#10b981' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
