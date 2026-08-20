import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '@/lib/auth-context';
import { fetchWithAuth, API_URL } from '@/lib/api';
import { COLORS, SPACING, RADIUS, FONTS } from '@/constants/theme';

export default function ClientSettingsScreen() {
  const router = useRouter();
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
            <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.avatar}>
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
          <Ionicons name="notifications-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.menuText}>Notificaciones</Text>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#334155', true: 'rgba(139,92,246,0.3)' }}
            thumbColor={notifications ? COLORS.primary : COLORS.textMuted}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>CUENTA</Text>
      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(client)/edit-profile' as any)}>
          <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.menuText}>Editar Perfil</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(client)/privacy' as any)}>
          <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.menuText}>Privacidad</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            Alert.alert(
              'Eliminar Cuenta',
              '¿Estás seguro de que deseas eliminar tu cuenta permanentemente? Esta acción borrará tus datos y no se puede deshacer.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Eliminar',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await fetchWithAuth('/auth/me', { method: 'DELETE' });
                      Alert.alert('Cuenta Eliminada', 'Tu cuenta y datos han sido eliminados.');
                      logout();
                    } catch (e: any) {
                      Alert.alert('Error', e.message || 'No se pudo eliminar la cuenta');
                    }
                  },
                },
              ]
            );
          }}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.red} />
          <Text style={[styles.menuText, { color: COLORS.red }]}>Eliminar Cuenta</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>SOPORTE</Text>
      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(client)/help' as any)}>
          <Ionicons name="help-circle-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.menuText}>Centro de Ayuda</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(client)/support' as any)}>
          <Ionicons name="chatbubble-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.menuText}>Contactar Soporte</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.red} />
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.version}>Tec360 Seguridad v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 60, paddingHorizontal: SPACING.lg, paddingBottom: 10 },
  headerTitle: { color: COLORS.text, fontSize: FONTS.sizes.xxl, fontWeight: '800' },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg, marginHorizontal: SPACING.lg, backgroundColor: COLORS.bgCard, borderRadius: 20, padding: SPACING.lg, marginTop: 10, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  avatar: { width: 64, height: 64, borderRadius: RADIUS.round, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  cameraIcon: { position: 'absolute', bottom: -2, right: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.bg },
  profileInfo: { flex: 1 },
  profileName: { color: COLORS.text, fontSize: FONTS.sizes.lg, fontWeight: '700' },
  profilePhone: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  profileEmail: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm, marginTop: SPACING.sm },
  menuSection: { marginHorizontal: SPACING.lg, backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 18, overflow: 'hidden', marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  menuText: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: '600' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, marginHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: COLORS.redMuted, marginTop: SPACING.sm },
  logoutText: { color: COLORS.red, fontSize: 15, fontWeight: '700' },
  version: { textAlign: 'center', color: '#334155', fontSize: FONTS.sizes.xs, marginTop: SPACING.lg },
});
