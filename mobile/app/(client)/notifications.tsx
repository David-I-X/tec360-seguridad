import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchWithAuth } from '@/lib/api';
import { COLORS, NEU, RADIUS } from '@/constants/theme';
import { NeuIcon } from '@/components/neu';

type IconName = keyof typeof Ionicons.glyphMap;

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  service_id?: string;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function getTypeConfig(type: string, title: string): { icon: IconName; color: string; label: string } {
  const titleLower = title.toLowerCase();
  if (type === 'service' || titleLower.includes('nueva solicitud') || titleLower.includes('disponible')) {
    return { icon: 'construct-outline', color: COLORS.primaryLight, label: 'Servicio' };
  }
  if (titleLower.includes('camino') || titleLower.includes('en_route')) {
    return { icon: 'car-outline', color: COLORS.blue, label: 'En camino' };
  }
  if (titleLower.includes('llegó') || titleLower.includes('arrived') || titleLower.includes('llegado')) {
    return { icon: 'location-outline', color: COLORS.green, label: 'En sitio' };
  }
  if (titleLower.includes('completado') || titleLower.includes('califica')) {
    return { icon: 'star-outline', color: COLORS.yellow, label: 'Finalizado' };
  }
  if (titleLower.includes('cancelado') || type === 'alert') {
    return { icon: 'alert-circle-outline', color: COLORS.red, label: 'Alerta' };
  }
  if (type === 'status') {
    return { icon: 'clipboard-outline', color: COLORS.blue, label: 'Estado' };
  }
  return { icon: 'notifications-outline', color: COLORS.primaryLight, label: 'Aviso' };
}

function NotifCard({ item, onPress, index }: { item: Notification; onPress: () => void; index: number }) {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 280, delay: Math.min(index * 40, 240), useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 240, delay: Math.min(index * 40, 240), useNativeDriver: true }),
    ]).start();
  }, []);

  const cfg = getTypeConfig(item.notification_type, item.title);

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }], opacity: opacityAnim }}>
      <TouchableOpacity
        style={[styles.card, !item.is_read && styles.cardUnread]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <NeuIcon name={cfg.icon} color={cfg.color} size={42} inset={item.is_read} />
        <View style={styles.cardContent}>
          <View style={styles.cardRow}>
            <Text style={[styles.cardTitle, !item.is_read && styles.cardTitleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.is_read && <View style={styles.dot} />}
          </View>
          <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>
          <View style={styles.cardMeta}>
            <View style={styles.typePill}>
              <Text style={[styles.typePillText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <Text style={styles.cardTime}>{timeAgo(item.created_at)}</Text>
          </View>
        </View>
        {item.service_id && (
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: 6 }} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/notifications/?limit=50');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error('[Notifications] fetch error:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handlePress = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await fetchWithAuth(`/notifications/${notification.id}/read`, { method: 'PUT' });
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      } catch (e) { /* ignore */ }
    }
    if (notification.service_id) {
      router.push(`/(client)/service/${notification.service_id}` as any);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetchWithAuth('/notifications/mark-all-read', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) { /* ignore */ }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Alertas</Text>
          <Text style={styles.headerSub}>
            {unreadCount > 0 ? `${unreadCount} sin leer` : 'Al día con tus servicios'}
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn} activeOpacity={0.8}>
            <Ionicons name="checkmark-done" size={14} color={COLORS.primaryLight} />
            <Text style={styles.markAllText}>Marcar leídas</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={notifications}
        renderItem={({ item, index }) => (
          <NotifCard item={item} onPress={() => handlePress(item)} index={index} />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 110, paddingHorizontal: 20, paddingTop: 4 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
            progressBackgroundColor={COLORS.surface}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <NeuIcon name="notifications-off-outline" color={COLORS.textSecondary} size={72} inset />
            <Text style={styles.emptyTitle}>Sin notificaciones</Text>
            <Text style={styles.emptyText}>Aquí verás las actualizaciones de tus servicios en tiempo real.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  headerTitle: { color: COLORS.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  markAllBtn: {
    ...NEU.raisedSm,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: RADIUS.round, paddingHorizontal: 12, paddingVertical: 8,
  },
  markAllText: { color: COLORS.primaryLight, fontSize: 12, fontWeight: '700' },

  card: {
    ...NEU.raised,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: RADIUS.xl, marginBottom: 12,
    padding: 14,
  },
  cardUnread: {
    backgroundColor: COLORS.surfaceHigh,
  },
  cardContent: { flex: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  cardTitle: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600', flex: 1 },
  cardTitleUnread: { color: COLORS.text, fontWeight: '700' },
  cardMessage: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typePill: {
    ...NEU.inset,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
  },
  typePillText: { fontSize: 11, fontWeight: '700' },
  cardTime: { color: COLORS.textMuted, fontSize: 11, fontVariant: ['tabular-nums'] },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primaryLight, marginLeft: 6 },

  emptyState: { alignItems: 'center', paddingTop: 64, gap: 8 },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginTop: 14 },
  emptyText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 18 },
});
