import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator,
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

export default function TechProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshUser, logout } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState({ completed: 0, total: 0 });
  const staticUrl = API_URL.replace(/\/api\/?$/, '');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth('/services?page_size=100');
        const data = await res.json();
        const list = data.services || data.items || [];
        setStats({
          total: list.length,
          completed: list.filter((s: any) => s.status === 'completed' || s.status === 'confirmed').length,
        });
      } catch (e) { console.error(e); }
    })();
  }, []);

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
    Alert.alert('Cerrar sesión', '¿Deseas salir de tu cuenta de técnico?', [
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>

      {/* Profile Card */}
      <View style={styles.avatarCard}>
        <TouchableOpacity onPress={handleChangeAvatar} activeOpacity={0.8} style={styles.avatarWrap}>
          {user?.avatar_url ? (
            <Image
              source={{ uri: user.avatar_url.startsWith('http') ? user.avatar_url : `${staticUrl}${user.avatar_url}` }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{user?.full_name?.[0] || 'T'}</Text>
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
        <Text style={styles.name} numberOfLines={1}>{user?.full_name || 'Técnico'}</Text>
        <Text style={styles.phone}>{user?.phone || 'Sin teléfono'}</Text>
        {user?.email && <Text style={styles.email} numberOfLines={1}>{user.email}</Text>}
      </View>

      {/* Stats Panel */}
      <View style={styles.statsPanel}>
        <View style={styles.statCell}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Servicios</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statNumber}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completados</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={COLORS.yellow} />
            <Text style={styles.statNumber}>{(user as any)?.average_rating?.toFixed(1) || '—'}</Text>
          </View>
          <Text style={styles.statLabel}>Calificación</Text>
        </View>
      </View>

      {/* Menu Items */}
      <Text style={styles.sectionTitle}>GESTIÓN</Text>
      <View style={styles.menuSection}>
        {renderMenuItem('person-outline', 'Editar perfil', () => router.push('/(tech)/edit-profile' as any))}
        {renderMenuItem('pricetags-outline', 'Mis cotizaciones', () => router.push('/(tech)/quotations' as any))}
        {renderMenuItem('help-circle-outline', 'Soporte técnico', () => router.push('/(tech)/support' as any))}
      </View>

      <Text style={styles.sectionTitle}>LEGAL Y CUENTA</Text>
      <View style={styles.menuSection}>
        {renderMenuItem('shield-checkmark-outline', 'Privacidad', () => router.push('/(client)/privacy' as any))}
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

  avatarCard: {
    ...NEU.raised,
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    paddingVertical: 22,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  avatarWrap: { ...NEU.raisedSm, width: 88, height: 88, borderRadius: 44, padding: 4, marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden' },
  avatarFallback: { backgroundColor: COLORS.primaryDark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.onPrimary, fontSize: 28, fontWeight: '800' },
  cameraIcon: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.surface,
  },
  name: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  phone: { color: COLORS.textSecondary, fontSize: 13, marginTop: 3 },
  email: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  statsPanel: {
    ...NEU.inset,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    paddingVertical: 18,
    marginBottom: 24,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 6 },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: COLORS.border },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statNumber: { color: COLORS.text, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLabel: { color: COLORS.textSecondary, fontSize: 12 },

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
