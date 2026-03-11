import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '@/lib/auth-context';
import { fetchWithAuth, API_URL } from '@/lib/api';

export default function ClientSettingsScreen() {
  const { user, refreshUser, logout } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const staticUrl = API_URL.replace(/\/api\/?$/, '');

  const handleChangeAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setIsUploading(true);
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 400 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const formData = new FormData();
      formData.append('file', { uri: compressed.uri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
      await fetchWithAuth('/uploads/avatar', { method: 'POST', body: formData });
      await refreshUser();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ajustes</Text>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <TouchableOpacity onPress={handleChangeAvatar} activeOpacity={0.8}>
          {user?.avatar_url ? (
            <Image
              source={{ uri: user.avatar_url.startsWith('http') ? user.avatar_url : `${staticUrl}${user.avatar_url}` }}
              style={styles.avatar}
            />
          ) : (
            <LinearGradient colors={['#3b82f6', '#6366f1']} style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.full_name?.[0] || 'U'}</Text>
            </LinearGradient>
          )}
          <View style={styles.cameraIcon}>
            {isUploading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={12} color="#fff" />}
          </View>
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.full_name}</Text>
          <Text style={styles.profilePhone}>{user?.phone}</Text>
          {user?.email && <Text style={styles.profileEmail}>{user.email}</Text>}
        </View>
      </View>

      {/* Settings Sections */}
      <Text style={styles.sectionTitle}>PREFERENCIAS</Text>
      <View style={styles.menuSection}>
        <View style={styles.menuItem}>
          <Ionicons name="notifications-outline" size={20} color="#94a3b8" />
          <Text style={styles.menuText}>Notificaciones</Text>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#334155', true: 'rgba(59,130,246,0.3)' }}
            thumbColor={notifications ? '#3b82f6' : '#64748b'}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>CUENTA</Text>
      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="person-outline" size={20} color="#94a3b8" />
          <Text style={styles.menuText}>Editar Perfil</Text>
          <Ionicons name="chevron-forward" size={18} color="#475569" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#94a3b8" />
          <Text style={styles.menuText}>Privacidad</Text>
          <Ionicons name="chevron-forward" size={18} color="#475569" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>SOPORTE</Text>
      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="help-circle-outline" size={20} color="#94a3b8" />
          <Text style={styles.menuText}>Centro de Ayuda</Text>
          <Ionicons name="chevron-forward" size={18} color="#475569" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="chatbubble-outline" size={20} color="#94a3b8" />
          <Text style={styles.menuText}>Contactar Soporte</Text>
          <Ionicons name="chevron-forward" size={18} color="#475569" />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.version}>Tec360 Seguridad v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 10 },
  headerTitle: { color: '#f8fafc', fontSize: 24, fontWeight: '800' },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 16, marginHorizontal: 20, backgroundColor: 'rgba(30,41,59,0.6)', borderRadius: 20, padding: 20, marginTop: 10, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(71,85,105,0.2)' },
  avatar: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  cameraIcon: { position: 'absolute', bottom: -2, right: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0f172a' },
  profileInfo: { flex: 1 },
  profileName: { color: '#f8fafc', fontSize: 18, fontWeight: '700' },
  profilePhone: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  profileEmail: { color: '#64748b', fontSize: 12, marginTop: 2 },
  sectionTitle: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, paddingHorizontal: 24, marginBottom: 8, marginTop: 8 },
  menuSection: { marginHorizontal: 20, backgroundColor: 'rgba(30,41,59,0.5)', borderRadius: 18, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(71,85,105,0.2)' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(71,85,105,0.15)' },
  menuText: { flex: 1, color: '#f8fafc', fontSize: 15, fontWeight: '600' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)', marginTop: 8 },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
  version: { textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 24 },
});
