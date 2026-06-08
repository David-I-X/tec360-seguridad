import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchWithAuth } from '../../lib/api';
import { COLORS } from '../../constants/theme';

export default function VerificationScreen() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string>('incomplete');
  const [docsCount, setDocsCount] = useState(0);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await fetchWithAuth('/verification/status');
      const data = await res.json();
      setStatus(data.status);
      setDocsCount(data.documents?.length || 0);

      if (data.status === 'verified') {
        router.replace('/(tech)/dashboard');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const pickAndUploadDocument = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setUploading(true);
        // En una app real, subiríamos la imagen a S3 y enviaríamos la URL.
        // Aquí simulamos enviando el base64 temporalmente.
        const imageUrl = `data:image/jpeg;base64,${result.assets[0].base64}`;

        const res = await fetchWithAuth('/verification/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_type: docsCount === 0 ? 'id_front' : 'id_back',
            document_url: imageUrl,
          }),
        });

        if (res.ok) {
          Alert.alert('Éxito', 'Documento subido correctamente');
          loadStatus();
        } else {
          Alert.alert('Error', 'No se pudo subir el documento');
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Ocurrió un error al subir el documento');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const renderStep = (title: string, desc: string, isCompleted: boolean, isCurrent: boolean, action?: () => void, btnText?: string) => (
    <View style={[styles.stepContainer, isCompleted && styles.stepCompleted, isCurrent && styles.stepCurrent]}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIcon, isCompleted && styles.stepIconCompleted]}>
          {isCompleted ? (
            <Ionicons name="checkmark" size={16} color="#fff" />
          ) : (
            <Ionicons name="ellipse" size={8} color={isCurrent ? COLORS.primary : COLORS.textMuted} />
          )}
        </View>
        <Text style={[styles.stepTitle, isCompleted && styles.stepTitleCompleted]}>{title}</Text>
      </View>
      <Text style={styles.stepDesc}>{desc}</Text>
      
      {isCurrent && action && btnText && (
        <TouchableOpacity style={styles.actionBtn} onPress={action} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.actionBtnText}>{btnText}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1025', '#050810']} style={StyleSheet.absoluteFill} />
      
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={48} color={COLORS.primary} />
          <Text style={styles.title}>Verificación de Técnico</Text>
          <Text style={styles.subtitle}>
            Para garantizar la seguridad de nuestros clientes, necesitamos verificar tu identidad y conocimientos antes de que puedas cotizar.
          </Text>
        </View>

        <View style={styles.stepsWrapper}>
          {/* Paso 1: Perfil (Asumimos completado si llegó aquí) */}
          {renderStep(
            'Completar Perfil',
            'Información básica y especializaciones seleccionadas.',
            true,
            false
          )}

          {/* Paso 2: Documentos */}
          {renderStep(
            'Documentos de Identidad',
            status === 'pending_review' 
              ? 'Documentos en revisión por el equipo de Tec360. Te notificaremos cuando sean aprobados.'
              : status === 'documents_rejected'
              ? 'Tus documentos fueron rechazados. Por favor, súbelos nuevamente.'
              : 'Sube una foto legible de tu cédula por ambos lados.',
            status === 'documents_approved' || status === 'quiz_available' || status === 'verified',
            status === 'incomplete' || status === 'documents_rejected',
            pickAndUploadDocument,
            docsCount === 0 ? 'Subir Frente de Cédula' : 'Subir Reverso de Cédula'
          )}

          {/* Paso 3: Quiz */}
          {renderStep(
            'Quiz de Conocimiento',
            'Prueba técnica de 10 preguntas sobre tu especialización. Necesitas 70% para aprobar.',
            status === 'verified',
            status === 'quiz_available',
            () => router.push('/(auth)/quiz'),
            'Comenzar Quiz'
          )}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050810',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050810',
  },
  scroll: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  stepsWrapper: {
    gap: 16,
  },
  stepContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  stepCompleted: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  stepCurrent: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  stepIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIconCompleted: {
    backgroundColor: '#10b981',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  stepTitleCompleted: {
    color: '#10b981',
  },
  stepDesc: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginLeft: 36,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
    marginLeft: 36,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  logoutBtn: {
    marginTop: 40,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
