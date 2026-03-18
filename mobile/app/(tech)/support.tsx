import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking,
  TextInput, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/auth-context';

export default function TechSupportScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [message, setMessage] = React.useState('');

  const handleSend = () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Escribe un mensaje antes de enviar');
      return;
    }
    const whatsappText = `Hola, soy el técnico ${user?.full_name || ''} (${user?.phone || ''}).\n\n${message.trim()}`;
    Linking.openURL(`https://wa.me/573001234567?text=${encodeURIComponent(whatsappText)}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#f0f0f5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Soporte</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.sectionTitle}>CANALES DE CONTACTO</Text>

      <TouchableOpacity style={styles.channelCard} onPress={() => Linking.openURL('https://wa.me/573001234567')} activeOpacity={0.7}>
        <View style={[styles.channelIcon, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
          <Ionicons name="logo-whatsapp" size={22} color="#22c55e" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.channelTitle}>WhatsApp</Text>
          <Text style={styles.channelSub}>Respuesta rápida</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#555872" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.channelCard} onPress={() => Linking.openURL('mailto:soporte@tec-360.tech')} activeOpacity={0.7}>
        <View style={[styles.channelIcon, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
          <Ionicons name="mail-outline" size={22} color="#3b82f6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.channelTitle}>Correo</Text>
          <Text style={styles.channelSub}>soporte@tec-360.tech</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#555872" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.channelCard} onPress={() => Linking.openURL('tel:+573001234567')} activeOpacity={0.7}>
        <View style={[styles.channelIcon, { backgroundColor: 'rgba(168,85,247,0.15)' }]}>
          <Ionicons name="call-outline" size={22} color="#a855f7" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.channelTitle}>Llamar</Text>
          <Text style={styles.channelSub}>Lun - Sáb, 7am - 6pm</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#555872" />
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>MENSAJE RÁPIDO</Text>
      <View style={styles.messageCard}>
        <TextInput
          style={styles.messageInput}
          value={message}
          onChangeText={setMessage}
          placeholder="Describe tu problema..."
          placeholderTextColor="#555872"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <TouchableOpacity onPress={handleSend} activeOpacity={0.8}>
          <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.sendBtn}>
            <Ionicons name="send" size={16} color="#fff" />
            <Text style={styles.sendBtnText}>Enviar por WhatsApp</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(10,14,28,0.8)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#f0f0f5', fontSize: 18, fontWeight: '700' },
  sectionTitle: { color: '#555872', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, paddingHorizontal: 24, marginBottom: 12, marginTop: 8 },
  channelCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 20, marginBottom: 10, backgroundColor: 'rgba(10,14,28,0.85)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(80,60,160,0.15)' },
  channelIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  channelTitle: { color: '#f0f0f5', fontSize: 15, fontWeight: '700' },
  channelSub: { color: '#8b8fa3', fontSize: 12, marginTop: 2 },
  messageCard: { marginHorizontal: 20, backgroundColor: 'rgba(10,14,28,0.85)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(80,60,160,0.15)' },
  messageInput: { color: '#f0f0f5', fontSize: 14, minHeight: 100, marginBottom: 14, lineHeight: 20 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14 },
  sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
