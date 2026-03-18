import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const PRIVACY_SECTIONS = [
  {
    title: 'Datos que recopilamos',
    icon: 'document-text-outline' as const,
    items: [
      'Nombre completo y número de teléfono al registrarte',
      'Dirección del servicio para enviar al técnico',
      'Ubicación GPS solo durante servicios activos',
      'Fotos de vehículos para identificación del servicio',
    ],
  },
  {
    title: 'Cómo usamos tu información',
    icon: 'shield-checkmark-outline' as const,
    items: [
      'Conectarte con técnicos certificados cercanos',
      'Seguimiento en vivo de servicios activos',
      'Mejorar la experiencia del usuario',
      'Comunicaciones sobre tus servicios',
    ],
  },
  {
    title: 'Protección de datos',
    icon: 'lock-closed-outline' as const,
    items: [
      'Toda la comunicación es cifrada (HTTPS/TLS)',
      'Sesiones almacenadas de forma segura en tu dispositivo',
      'No compartimos datos con terceros',
      'Los datos de ubicación se eliminan al completar el servicio',
    ],
  },
  {
    title: 'Tus derechos',
    icon: 'person-outline' as const,
    items: [
      'Puedes solicitar la eliminación de tu cuenta',
      'Puedes actualizar tus datos desde "Editar Perfil"',
      'Puedes revocar permisos de ubicación en cualquier momento',
      'Puedes contactarnos para consultas de privacidad',
    ],
  },
];

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#f0f0f5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacidad</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Ionicons name="shield-checkmark" size={48} color="#8b5cf6" />
        <Text style={styles.heroTitle}>Tu privacidad importa</Text>
        <Text style={styles.heroSub}>En Tec360 protegemos tu información personal</Text>
      </View>

      {/* Sections */}
      {PRIVACY_SECTIONS.map((section, i) => (
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

      <Text style={styles.footer}>Última actualización: Marzo 2026</Text>
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
  sectionCard: { marginHorizontal: 20, marginBottom: 16, backgroundColor: 'rgba(10,14,28,0.85)', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: 'rgba(80,60,160,0.15)' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  sectionIconBox: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.1)', justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { color: '#f0f0f5', fontSize: 15, fontWeight: '700', flex: 1 },
  bulletRow: { flexDirection: 'row', gap: 10, marginBottom: 8, paddingLeft: 4 },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#8b5cf6', marginTop: 7 },
  bulletText: { color: '#8b8fa3', fontSize: 13, lineHeight: 20, flex: 1 },
  footer: { textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 16, marginBottom: 32 },
});
