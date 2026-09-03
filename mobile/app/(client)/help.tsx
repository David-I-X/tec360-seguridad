import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const FAQ_ITEMS = [
  {
    q: '¿Cómo solicito un servicio?',
    a: 'Ve a la pestaña "Nuevo", selecciona el tipo de servicio, añade la dirección y datos del vehículo, y envía tu solicitud. Los técnicos disponibles te enviarán cotizaciones.',
    icon: 'add-circle-outline' as const,
  },
  {
    q: '¿Cómo funciona el seguimiento en vivo?',
    a: 'Cuando un técnico acepta tu servicio y está en camino, podrás ver su ubicación en tiempo real desde el mapa de la app.',
    icon: 'navigate-outline' as const,
  },
  {
    q: '¿Puedo cancelar un servicio?',
    a: 'Puedes cancelar un servicio en estado "Pendiente" o "Cotizado". Una vez asignado, contacta al soporte para gestionar la cancelación.',
    icon: 'close-circle-outline' as const,
  },
  {
    q: '¿Cómo califico a un técnico?',
    a: 'Al finalizar el servicio, recibirás la opción de calificar al técnico con estrellas y dejar un comentario sobre tu experiencia.',
    icon: 'star-outline' as const,
  },
  {
    q: '¿Mis datos están seguros?',
    a: 'Sí, toda la información se transmite de forma cifrada (HTTPS) y tu sesión se almacena de manera segura en tu dispositivo.',
    icon: 'shield-checkmark-outline' as const,
  },
  {
    q: '¿Qué métodos de pago aceptan?',
    a: 'Actualmente el pago se realiza directamente con el técnico. Estamos trabajando en integrar pagos digitales próximamente.',
    icon: 'card-outline' as const,
  },
];

export default function HelpScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#f0f0f5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Centro de Ayuda</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <LinearGradient colors={['rgba(139,92,246,0.15)', 'rgba(99,102,241,0.05)']} style={styles.heroGradient}>
          <Text style={styles.heroEmoji}>💡</Text>
          <Text style={styles.heroTitle}>¿En qué podemos ayudarte?</Text>
          <Text style={styles.heroSub}>Encuentra respuestas a las preguntas más comunes</Text>
        </LinearGradient>
      </View>

      {/* FAQ */}
      <Text style={styles.sectionTitle}>PREGUNTAS FRECUENTES</Text>
      {FAQ_ITEMS.map((item, i) => (
        <View key={i} style={styles.faqCard}>
          <View style={styles.faqHeader}>
            <View style={styles.faqIconBox}>
              <Ionicons name={item.icon} size={18} color="#8b5cf6" />
            </View>
            <Text style={styles.faqQuestion}>{item.q}</Text>
          </View>
          <Text style={styles.faqAnswer}>{item.a}</Text>
        </View>
      ))}

      {/* Contact */}
      <Text style={styles.sectionTitle}>¿NO ENCUENTRAS LO QUE BUSCAS?</Text>
      <TouchableOpacity
        style={styles.contactCard}
        onPress={() => Linking.openURL('https://wa.me/573052156601?text=Hola,%20necesito%20ayuda%20con%20Tec360')}
        activeOpacity={0.7}
      >
        <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.contactGradient}>
          <Ionicons name="logo-whatsapp" size={22} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.contactTitle}>Escríbenos por WhatsApp</Text>
            <Text style={styles.contactSub}>Respondemos en menos de 1 hora</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(10,14,28,0.8)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#f0f0f5', fontSize: 18, fontWeight: '700' },
  hero: { marginHorizontal: 20, marginBottom: 24, borderRadius: 22, overflow: 'hidden' },
  heroGradient: { padding: 24, alignItems: 'center', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' },
  heroEmoji: { fontSize: 40, marginBottom: 12 },
  heroTitle: { color: '#f0f0f5', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  heroSub: { color: '#8b8fa3', fontSize: 13, textAlign: 'center', marginTop: 6 },
  sectionTitle: { color: '#555872', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, paddingHorizontal: 24, marginBottom: 12, marginTop: 8 },
  faqCard: { marginHorizontal: 20, marginBottom: 12, backgroundColor: 'rgba(10,14,28,0.85)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(80,60,160,0.15)' },
  faqHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  faqIconBox: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.1)', justifyContent: 'center', alignItems: 'center' },
  faqQuestion: { color: '#f0f0f5', fontSize: 14, fontWeight: '700', flex: 1 },
  faqAnswer: { color: '#8b8fa3', fontSize: 13, lineHeight: 20, paddingLeft: 46 },
  contactCard: { marginHorizontal: 20, borderRadius: 18, overflow: 'hidden', marginTop: 4 },
  contactGradient: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 18 },
  contactTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  contactSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
});
