import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
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
  getCertificateDetails,
  CertificateInfo,
  API_URL,
} from '@/lib/api';

export default function CertificateScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cert, setCert] = useState<CertificateInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadCert = useCallback(async () => {
    if (!code) return;
    try {
      setIsLoading(true);
      const res = await getCertificateDetails(code);
      setCert(res);
    } catch (err: any) {
      console.error('Error cargando certificado:', err);
      Alert.alert('Error', 'No se pudo cargar el certificado solicitado.');
    } finally {
      setIsLoading(false);
    }
  }, [code]);

  useEffect(() => {
    loadCert();
  }, [loadCert]);

  const handleShare = async () => {
    if (!code) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await Share.share({
        title: 'Certificado Oficial Tec360',
        message: `He completado con éxito la certificación "${cert?.course_title || 'Técnico Especializado'}" en Tec360 Seguridad.\n\nPuedes verificar mi credencial oficial aquí: https://tec-360.tech/escuela/verificar?code=${code}`,
      });
    } catch (err) {
      console.error('Error al compartir:', err);
    }
  };

  const handleDownloadPdf = async () => {
    if (!code) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const downloadUrl = `${API_URL}/courses/certificates/${code}/download`;
    try {
      await WebBrowser.openBrowserAsync(downloadUrl);
    } catch (err) {
      console.error('Error abriendo descarga de PDF:', err);
    }
  };

  if (isLoading || !cert) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
        <Text style={styles.loadingText}>Cargando certificado oficial...</Text>
      </View>
    );
  }

  const dateFormatted = cert.completion_date
    ? new Date(cert.completion_date).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Reciente';

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
        <Text style={styles.headerTitle}>Credencial Oficial</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton} hitSlop={8}>
          <Ionicons name="share-outline" size={20} color={COLORS.primaryLight} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Certificate Plaque Card */}
        <NeuCard style={styles.certCard}>
          {/* Top Seal */}
          <View style={styles.sealWrapper}>
            <View style={styles.sealCircle}>
              <Ionicons name="shield-checkmark" size={32} color={COLORS.yellow} />
            </View>
          </View>

          <Text style={styles.institutionName}>TEC360 SEGURIDAD Y TELEMÁTICA</Text>
          <Text style={styles.certTypeTitle}>CERTIFICADO DE COMPETENCIA TÉCNICA</Text>

          <View style={styles.divider} />

          <Text style={styles.conferText}>Otorga el presente reconocimiento oficial a:</Text>
          <Text style={styles.studentName}>{cert.student_name}</Text>

          <Text style={styles.courseIntro}>Por haber aprobado con el 100% de rigor la especialización:</Text>
          <Text style={styles.courseTitle}>{cert.course_title}</Text>

          {/* Validation Code & Date Well */}
          <NeuWell style={styles.metaWell}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>CÓDIGO ÚNICO:</Text>
              <Text style={styles.metaCode}>{cert.certificate_code}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>FECHA DE EMISIÓN:</Text>
              <Text style={styles.metaValue}>{dateFormatted}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>CALIFICACIÓN:</Text>
              <Text style={[styles.metaValue, { color: COLORS.green, fontWeight: '800' }]}>
                {cert.score}% (PERFECTO)
              </Text>
            </View>
          </NeuWell>

          {/* Authentic Badge */}
          <View style={styles.authenticBadge}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
            <Text style={styles.authenticText}>Documento Verificado y Auténtico</Text>
          </View>

          {/* Signatures */}
          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureName}>{cert.instructor_name || 'Equipo Técnico Tec360'}</Text>
              <Text style={styles.signatureRole}>Instructor Especialista</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureName}>Tec360 Seguridad</Text>
              <Text style={styles.signatureRole}>Dirección Telemática</Text>
            </View>
          </View>
        </NeuCard>

        {/* Action Buttons */}
        <View style={styles.actionCol}>
          <NeuButton
            label="Descargar Diploma en PDF"
            icon="download-outline"
            onPress={handleDownloadPdf}
          />
          <NeuButton
            label="Compartir Certificado"
            icon="share-social-outline"
            tone="surface"
            onPress={handleShare}
          />
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
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
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  shareButton: {
    ...NEU.raisedSm,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    gap: 20,
  },

  /* Plaque */
  certCard: {
    padding: 24,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.25)',
  },
  sealWrapper: {
    marginBottom: 14,
  },
  sealCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(234,179,8,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(234,179,8,0.4)',
  },
  institutionName: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  certTypeTitle: {
    color: COLORS.yellow,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 4,
    textAlign: 'center',
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(234,179,8,0.3)',
    marginVertical: 16,
  },
  conferText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  studentName: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 6,
    textAlign: 'center',
  },
  courseIntro: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  courseTitle: {
    color: COLORS.primaryLight,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 22,
  },

  /* Meta Box */
  metaWell: {
    width: '100%',
    padding: 14,
    borderRadius: RADIUS.md,
    marginVertical: 18,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metaCode: {
    color: COLORS.yellow,
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  metaValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },

  /* Verified Badge */
  authenticBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52,211,153,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
    marginBottom: 18,
  },
  authenticText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '700',
  },

  /* Signatures */
  signatureRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  signatureBox: {
    alignItems: 'center',
  },
  signatureName: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
  },
  signatureRole: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },

  /* Action Col */
  actionCol: {
    gap: 12,
  },
});
