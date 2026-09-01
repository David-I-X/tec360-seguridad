import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const TERMS_SECTIONS = [
  {
    title: 'Identificación de las Partes',
    icon: 'business-outline' as const,
    items: [
      'Plataforma operada por TrackTec S.A.S., Medellín, Colombia',
      'Usuario: toda persona que se registre como Cliente o Técnico',
      'El uso de la plataforma implica aceptación de estos términos',
    ],
  },
  {
    title: 'Portal de Contacto',
    icon: 'globe-outline' as const,
    items: [
      'Tec360 actúa como intermediario tecnológico (Art. 53, Ley 1480 de 2011)',
      'Conectamos clientes con técnicos independientes certificados',
      'No somos empleadores ni contratantes directos de los técnicos',
    ],
  },
  {
    title: 'Autonomía de los Técnicos',
    icon: 'construct-outline' as const,
    items: [
      'Los técnicos son profesionales independientes',
      'Definen su disponibilidad, tarifas y área de cobertura',
      'Responden directamente por la calidad de su trabajo',
    ],
  },
  {
    title: 'Modelo Económico',
    icon: 'wallet-outline' as const,
    items: [
      'Comisión de plataforma del 18% sobre cada servicio',
      'IVA del 19% aplicable según normativa DIAN',
      'Billetera virtual para gestión de pagos y retiros',
      'Facturación electrónica conforme a la regulación colombiana',
    ],
  },
  {
    title: 'Auditoría Fotográfica',
    icon: 'camera-outline' as const,
    items: [
      'Protocolo obligatorio de evidencia: fotos antes, durante y al cierre',
      'Respaldo probatorio para garantías y reclamaciones',
      'Las fotos se almacenan de forma segura en la plataforma',
    ],
  },
  {
    title: 'Garantías y Retracto',
    icon: 'shield-outline' as const,
    items: [
      'Derecho de retracto según Art. 47, Ley 1480 de 2011',
      'Garantía sobre servicios prestados según la normativa vigente',
      'Procedimiento de reclamación disponible en la plataforma',
    ],
  },
  {
    title: 'Reversión del Pago',
    icon: 'card-outline' as const,
    items: [
      'Aplica según Art. 51, Ley 1480 y Dec. 587 de 2016',
      'Solicitudes procesadas en un plazo máximo de 15 días hábiles',
      'Requiere evidencia del incumplimiento o problema',
    ],
  },
  {
    title: 'Cancelaciones y Penalidades',
    icon: 'alert-circle-outline' as const,
    items: [
      'Cancelaciones sin cargo hasta 30 minutos antes del servicio',
      'Tabla de infracciones progresiva para técnicos y clientes',
      'Suspensión temporal o permanente por incumplimientos graves',
    ],
  },
  {
    title: 'Propiedad Intelectual',
    icon: 'ribbon-outline' as const,
    items: [
      'Marca, diseño y software son propiedad de TrackTec S.A.S.',
      'Prohibida la reproducción sin autorización expresa',
      'El contenido generado por usuarios se licencia para uso en la plataforma',
    ],
  },
  {
    title: 'Jurisdicción y Ley Aplicable',
    icon: 'scale-outline' as const,
    items: [
      'Ley colombiana aplica a todos los términos',
      'Jurisdicción: Medellín, Colombia',
      'Controversias se resuelven primero por mediación',
    ],
  },
];

export default function TermsScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#f0f0f5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Términos y Condiciones</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Ionicons name="document-text" size={48} color="#8b5cf6" />
        <Text style={styles.heroTitle}>Términos de Uso</Text>
        <Text style={styles.heroSub}>
          Plataforma Tec360 Seguridad • TrackTec S.A.S.
        </Text>
        <Text style={styles.heroDate}>Última actualización: Agosto 2026</Text>
      </View>

      {/* Sections */}
      {TERMS_SECTIONS.map((section, i) => (
        <View key={i} style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBox}>
              <Ionicons name={section.icon} size={18} color="#8b5cf6" />
            </View>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          {section.items.map((item, j) => (
            <View key={j} style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>
      ))}

      {/* Full terms link */}
      <TouchableOpacity
        style={styles.fullTermsBtn}
        onPress={() => Linking.openURL('https://tec-360.tech/terminos')}
        activeOpacity={0.7}
      >
        <Ionicons name="open-outline" size={16} color="#8b5cf6" />
        <Text style={styles.fullTermsBtnText}>Ver términos completos en la web</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        En cumplimiento de la Ley 1480 de 2011 y Ley 527 de 1999
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(10,14,28,0.8)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#f0f0f5', fontSize: 18, fontWeight: '700' },
  hero: { alignItems: 'center', paddingVertical: 30, marginHorizontal: 20, marginBottom: 24 },
  heroTitle: { color: '#f0f0f5', fontSize: 22, fontWeight: '800', marginTop: 16 },
  heroSub: { color: '#8b8fa3', fontSize: 13, textAlign: 'center', marginTop: 6 },
  heroDate: { color: '#555872', fontSize: 11, marginTop: 8 },
  sectionCard: { marginHorizontal: 20, marginBottom: 16, backgroundColor: 'rgba(10,14,28,0.85)', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: 'rgba(80,60,160,0.15)' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  sectionIconBox: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.1)', justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { color: '#f0f0f5', fontSize: 15, fontWeight: '700', flex: 1 },
  bulletRow: { flexDirection: 'row', gap: 10, marginBottom: 8, paddingLeft: 4 },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#8b5cf6', marginTop: 7 },
  bulletText: { color: '#8b8fa3', fontSize: 13, lineHeight: 20, flex: 1 },
  fullTermsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, marginTop: 8, marginBottom: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', backgroundColor: 'rgba(139,92,246,0.05)' },
  fullTermsBtnText: { color: '#8b5cf6', fontSize: 14, fontWeight: '600' },
  footer: { textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 8, marginBottom: 32 },
});
