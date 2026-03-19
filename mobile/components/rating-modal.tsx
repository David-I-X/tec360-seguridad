import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const STAR_LABELS = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];

interface RatingModalProps {
  visible: boolean;
  techName?: string;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}

export default function RatingModal({ visible, techName, onClose, onSubmit }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Selecciona una calificación', 'Toca las estrellas para calificar');
      return;
    }
    if (comment.trim().length > 0 && comment.trim().length < 10) {
      Alert.alert('Comentario muy corto', 'Si dejas un comentario, escribe al menos 10 caracteres');
      return;
    }

    setIsSending(true);
    try {
      await onSubmit(rating, comment.trim());
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo enviar la calificación');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.card}>
          {/* Close */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color="#8b8fa3" />
          </TouchableOpacity>

          {/* Header */}
          <Text style={styles.emoji}>⭐</Text>
          <Text style={styles.title}>Califica el servicio</Text>
          {techName && (
            <Text style={styles.subtitle}>¿Cómo fue tu experiencia con {techName}?</Text>
          )}

          {/* Stars */}
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
                  size={40}
                  color={star <= rating ? '#eab308' : '#334155'}
                />
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <Text style={styles.starLabel}>{STAR_LABELS[rating]}</Text>
          )}

          {/* Comment */}
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Escribe un comentario (opcional, mín. 10 caracteres)"
            placeholderTextColor="#555872"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={1000}
          />

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSending || rating === 0}
            activeOpacity={0.8}
            style={{ opacity: rating === 0 ? 0.5 : 1 }}
          >
            <LinearGradient
              colors={rating >= 4 ? ['#22c55e', '#16a34a'] : ['#8b5cf6', '#7c3aed']}
              style={styles.submitBtn}
            >
              {isSending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={styles.submitText}>Enviar calificación</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity onPress={onClose} style={styles.skipBtn}>
            <Text style={styles.skipText}>Omitir por ahora</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 20 },
  card: { width: '100%', maxWidth: 380, backgroundColor: '#0a0e1c', borderRadius: 28, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(80,60,160,0.3)' },
  closeBtn: { position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(80,60,160,0.15)', justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 48, marginBottom: 8 },
  title: { color: '#f0f0f5', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#8b8fa3', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  starTouch: { padding: 4 },
  starLabel: { color: '#eab308', fontSize: 14, fontWeight: '700', marginBottom: 16 },
  commentInput: { width: '100%', minHeight: 80, backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 16, padding: 14, color: '#f0f0f5', fontSize: 14, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)', marginBottom: 16, lineHeight: 20 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, width: '100%' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn: { marginTop: 14 },
  skipText: { color: '#555872', fontSize: 13, fontWeight: '600' },
});
