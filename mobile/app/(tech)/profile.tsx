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

const RANK_TIERS: Record<string, { label: string; next: string | null; target: number; color: string }> = {
  bronze: { label: 'Bronce', next: 'Plata', target: 50, color: '#cd7f32' },
  silver: { label: 'Plata', next: 'Oro', target: 150, color: '#94a3b8' },
  gold:   { label: 'Oro', next: 'Élite', target: 300, color: '#eab308' },
  elite:  { label: 'Élite', next: null, target: 300, color: '#8b5cf6' },
};

export default function TechProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshUser, logout } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState({ completed: 0, total: 0 });
  const [techProfile, setTechProfile] = useState<any>(null);
  const staticUrl = API_URL.replace(/\/api\/?$/, '');

  useEffect(() => {
    (async () => {
      try {
        const [res, techRes] = await Promise.all([
          fetchWithAuth('/services?page_size=100'),
          fetchWithAuth('/technicians/me').catch(() => null),
        ]);
        const data = await res.json();
        const list = data.services || data.items || [];
        setStats({
          total: list.length,
          completed: list.filter((s: any) => s.status === 'completed' || s.status === 'confirmed').length,
        });

        if (techRes && techRes.ok) {
          const tData = await techRes.json();
          setTechProfile(tData);
        }
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

      {/* Rank & Escuela Tec Motivation Banner */}
      {(() => {
        const currentRank = techProfile?.rank || 'bronze';
        const rankConfig = RANK_TIERS[currentRank] || RANK_TIERS.bronze;
        const currentPoints = techProfile?.rank_points || 0;

        return (
          <TouchableOpacity
            style={styles.rankBanner}
            activeOpacity={0.85}
            onPress={() => router.push('/(tech)/escuela' as any)}
          >
            <View style={styles.rankBannerHeader}>
              <View style={styles.rankBadge}>
                <Ionicons name="trophy" size={14} color={rankConfig.color} />
                <Text style={[styles.rankBadgeText, { color: rankConfig.color }]}>
                  Rango {rankConfig.label}
                </Text>
              </View>
              <Text style={styles.rankPointsText}>{currentPoints} pts</Text>
            </View>

            {rankConfig.next ? (
              <>
                <View style={styles.rankTrack}>
                  <View
                    style={[
                      styles.rankFill,
                      {
                        width: `${Math.min(100, Math.max(8, (currentPoints / rankConfig.target) * 100))}%`,
                        backgroundColor: rankConfig.color,
                      },
                    ]}
                  />
                </View>
                <View style={styles.rankNextRow}>
                  <Text style={styles.rankNextText}>
                    Faltan {Math.max(0, rankConfig.target - currentPoints)} pts para {rankConfig.next}
                  </Text>
                  <Text style={styles.rankActionText}>Escuela Tec →</Text>
                </View>
              </>
            ) : (
              <Text style={styles.rankMaxText}>👑 ¡Máximo rango alcanzado en Tec360!</Text>
            )}
          </TouchableOpacity>
        );
      })()}

      {/* Menu Items */}
      <Text style={styles.sectionTitle}>GESTIÓN</Text>
      <View style={styles.menuSection}>
        {renderMenuItem('school-outline', 'Escuela Tec', () => router.push('/(tech)/escuela' as any), COLORS.primaryLight)}
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
    marginBottom: 20,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 6 },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: COLORS.border },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statNumber: { color: COLORS.text, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLabel: { color: COLORS.textSecondary, fontSize: 12 },

  rankBanner: {
    ...NEU.raised,
    borderRadius: RADIUS.xl,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.22)',
    gap: 10,
  },
  rankBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(234,179,8,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  rankPointsText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  rankTrack: {
    height: 6,
    backgroundColor: COLORS.sunken,
    borderRadius: 3,
    overflow: 'hidden',
  },
  rankFill: {
    height: '100%',
    borderRadius: 3,
  },
  rankNextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankNextText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  rankActionText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },
  rankMaxText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

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
