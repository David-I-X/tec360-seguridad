import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '@/lib/auth-context';
import { fetchWithAuth, API_URL } from '@/lib/api';
import { COLORS, NEU, RADIUS } from '@/constants/theme';
import { NeuIcon } from '@/components/neu';

type IconName = keyof typeof Ionicons.glyphMap;

export default function ClientSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    Alert.alert('Cerrar sesión', '¿Deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  };

  const renderMenuItem = (
    icon: IconName,
    title: string,
    onPress: () => void,
    color: string = COLORS.textSecondary,
    destructive: boolean = false,
  ) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <NeuIcon name={icon} color={color} size={36} inset />
      <Text style={[styles.menuText, destructive && { color: COLORS.red }]}>{title}</Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ajustes</Text>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <TouchableOpacity onPress={handleChangeAvatar} activeOpacity={0.8} style={styles.avatarWrap}>
          {user?.avatar_url ? (
            <Image
              source={{ uri: user.avatar_url.startsWith('http') ? user.avatar_url : `${staticUrl}${user.avatar_url}` }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{user?.full_name?.[0] || 'U'}</Text>
            </View>
          )}
          <View style={styles.cameraIcon}>
            {isUploading ? (
              <ActivityIndicator size="small" color={COLORS.onPrimary} />
            ) : (
              <Ionicons name="camera" size={13} color={COLORS.onPrimary} />
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName} numberOfLines={1}>{user?.full_name || 'Mi Perfil'}</Text>
          <Text style={styles.profilePhone}>{user?.phone || 'Sin teléfono'}</Text>
          {user?.email && <Text style={styles.profileEmail} numberOfLines={1}>{user.email}</Text>}
        </View>
      </View>

      {/* Preferencias */}
      <Text style={styles.sectionTitle}>PREFERENCIAS</Text>
      <View style={styles.menuSection}>
        <View style={styles.menuItem}>
          <NeuIcon name="notifications-outline" color={COLORS.textSecondary} size={36} inset />
          <Text style={styles.menuText}>Notificaciones push</Text>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: COLORS.sunken, true: 'rgba(139,92,246,0.35)' }}
            thumbColor={notifications ? COLORS.primary : COLORS.textMuted}
            ios_backgroundColor={COLORS.sunken}
          />
        </View>
      </View>

      {/* Cuenta */}
      <Text style={styles.sectionTitle}>CUENTA</Text>
      <View style={styles.menuSection}>
        {renderMenuItem('person-outline', 'Editar perfil', () => router.push('/(client)/edit-profile' as any))}
        {renderMenuItem('shield-checkmark-outline', 'Privacidad y datos', () => router.push('/(client)/privacy' as any))}
        {renderMenuItem('document-text-outline', 'Términos y condiciones', () => router.push('/(client)/terms' as any))}
        {renderMenuItem('trash-outline', 'Eliminar cuenta', () => {
          Alert.alert(
            'Eliminar cuenta',
            'Esta acción borrará tus datos permanentemente y no se puede deshacer.',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await fetchWithAuth('/auth/me', { method: 'DELETE' });
                    Alert.alert('Cuenta eliminada', 'Tus datos han sido eliminados.');
                    logout();
                  } catch (e: any) {
                    Alert.alert('Error', e.message || 'No se pudo eliminar la cuenta');
                  }
                },
              },
            ],
          );
        }, COLORS.red, true)}
      </View>

      {/* Soporte */}
      <Text style={styles.sectionTitle}>SOPORTE</Text>
      <View style={styles.menuSection}>
        {renderMenuItem('help-circle-outline', 'Centro de ayuda', () => router.push('/(client)/help' as any))}
        {renderMenuItem('chatbubble-outline', 'Contactar soporte técnico', () => router.push('/(client)/support' as any))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={18} color={COLORS.red} />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Tec360 Seguridad · v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 110, paddingHorizontal: 20 },
  header: { marginBottom: 18 },
  headerTitle: { color: COLORS.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },

  profileCard: {
    ...NEU.raised,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: RADIUS.xl,
    padding: 18,
    marginBottom: 24,
  },
  avatarWrap: { ...NEU.raisedSm, width: 66, height: 66, borderRadius: 33, padding: 3 },
  avatar: { width: 60, height: 60, borderRadius: 30, overflow: 'hidden' },
  avatarFallback: { backgroundColor: COLORS.primaryDark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.onPrimary, fontSize: 22, fontWeight: '800' },
  cameraIcon: {
    position: 'absolute', bottom: -2, right: -2,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.surface,
  },
  profileInfo: { flex: 1 },
  profileName: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  profilePhone: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  profileEmail: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  menuSection: {
    ...NEU.raised,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuText: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: '600' },

  logoutButton: {
    ...NEU.raisedSm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    marginTop: 4,
  },
  logoutText: { color: COLORS.red, fontSize: 15, fontWeight: '700' },
  version: { textAlign: 'center', color: COLORS.textMuted, fontSize: 11, marginTop: 20 },
});
