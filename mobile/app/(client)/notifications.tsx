import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { fetchWithAuth } from '@/lib/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  service_id?: string;
  created_at: string;
}

// ────────────────────────── helpers ──────────────────────────
function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Ahora mismo';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `Hace ${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

interface TypeConfig {
  icon: string;
  color: string;
  gradient: [string, string];
  accentColor: string;
  label: string;
}

function getTypeConfig(type: string, title: string): TypeConfig {
  const titleLower = title.toLowerCase();
  if (type === 'service' || titleLower.includes('nueva solicitud') || titleLower.includes('disponible')) {
    return { icon: 'construct', color: '#8b5cf6', gradient: ['#4c1d95', '#6d28d9'], accentColor: '#8b5cf6', label: 'Solicitud' };
  }
  if (titleLower.includes('camino') || titleLower.includes('en_route')) {
    return { icon: 'car', color: '#3b82f6', gradient: ['#1e3a8a', '#1d4ed8'], accentColor: '#3b82f6', label: 'En camino' };
  }
  if (titleLower.includes('llegó') || titleLower.includes('arrived') || titleLower.includes('llegado')) {
    return { icon: 'location', color: '#10b981', gradient: ['#064e3b', '#059669'], accentColor: '#10b981', label: 'Llegada' };
  }
  if (titleLower.includes('completado') || titleLower.includes('califica')) {
    return { icon: 'star', color: '#f59e0b', gradient: ['#78350f', '#b45309'], accentColor: '#f59e0b', label: 'Completado' };
  }
  if (titleLower.includes('cancelado') || type === 'alert') {
    return { icon: 'warning', color: '#ef4444', gradient: ['#7f1d1d', '#b91c1c'], accentColor: '#ef4444', label: 'Alerta' };
  }
  if (type === 'status') {
    return { icon: 'clipboard', color: '#06b6d4', gradient: ['#164e63', '#0e7490'], accentColor: '#06b6d4', label: 'Estado' };
  }
  return { icon: 'notifications', color: '#8b5cf6', gradient: ['#1e1b4b', '#312e81'], accentColor: '#8b5cf6', label: 'Info' };
}

// ────────────────────────── animated card ──────────────────────────
function NotifCard({ item, onPress, index }: { item: Notification; onPress: () => void; index: number }) {
  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const cfg = getTypeConfig(item.notification_type, item.title);

  return (
    <Animated.View style={{ transform: [{ translateX: slideAnim }], opacity: opacityAnim }}>
      <TouchableOpacity
        style={[styles.card, !item.is_read && styles.cardUnread]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: cfg.accentColor }]} />

        {/* Icon with gradient circle */}
        <LinearGradient
          colors={cfg.gradient}
          style={styles.iconCircle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={cfg.icon as any} size={18} color="#fff" />
        </LinearGradient>

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardRow}>
            <Text style={[styles.cardTitle, !item.is_read && styles.cardTitleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.is_read && <View style={[styles.dot, { backgroundColor: cfg.accentColor }]} />}
          </View>
          <Text style={styles.cardMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <View style={styles.cardMeta}>
            <View style={[styles.typePill, { backgroundColor: `${cfg.accentColor}18` }]}>
              <Text style={[styles.typePillText, { color: cfg.accentColor }]}>{cfg.label}</Text>
            </View>
            <Text style={styles.cardTime}>{timeAgo(item.created_at)}</Text>
          </View>
        </View>

        {/* Arrow hint for tappable */}
        {item.service_id && (
          <Ionicons name="chevron-forward" size={14} color="#3a3f5c" style={{ marginLeft: 4 }} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ────────────────────────── main screen ──────────────────────────
export default function NotificationsScreen() {
  const router = useRouter();
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
    const interval = setInterval(fetchNotifications, 15000);
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
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#0a0e1c', '#050810']} style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notificaciones</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSub}>{unreadCount} sin leer</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <Ionicons name="checkmark-done" size={14} color="#8b5cf6" />
            <Text style={styles.markAllText}>Todo leído</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Unread banner */}
      {unreadCount > 0 && (
        <LinearGradient
          colors={['rgba(139,92,246,0.12)', 'rgba(139,92,246,0.04)']}
          style={styles.unreadBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="notifications" size={13} color="#a78bfa" />
          <Text style={styles.unreadBannerText}>
            {unreadCount} {unreadCount === 1 ? 'notificación nueva' : 'notificaciones nuevas'}
          </Text>
        </LinearGradient>
      )}

      {/* List */}
      <FlatList
        data={notifications}
        renderItem={({ item, index }) => (
          <NotifCard item={item} onPress={() => handlePress(item)} index={index} />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16, paddingTop: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
            tintColor="#8b5cf6"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <LinearGradient colors={['#1e1b4b', '#0f0d2c']} style={styles.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={36} color="#6d28d9" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>Sin notificaciones</Text>
            <Text style={styles.emptyText}>Cuando recibas alertas de servicios, aparecerán aquí.</Text>
          </View>
        }
      />
    </View>
  );
}

// ────────────────────────── styles ──────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  centered: { flex: 1, backgroundColor: '#050810', justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(80,60,160,0.15)',
  },
  headerTitle: { color: '#f0f0f5', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { color: '#8b5cf6', fontSize: 12, fontWeight: '600', marginTop: 2 },
  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(139,92,246,0.12)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)',
  },
  markAllText: { color: '#8b5cf6', fontSize: 11, fontWeight: '700' },

  unreadBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
  },
  unreadBannerText: { color: '#a78bfa', fontSize: 12, fontWeight: '600' },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(10,14,28,0.85)',
    borderRadius: 18, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(50,45,90,0.4)',
    paddingRight: 14, paddingVertical: 14,
    overflow: 'hidden',
  },
  cardUnread: {
    backgroundColor: 'rgba(16,12,36,0.95)',
    borderColor: 'rgba(139,92,246,0.3)',
  },
  accentBar: {
    width: 3, alignSelf: 'stretch', borderRadius: 4, marginRight: 12, marginLeft: 0,
  },
  iconCircle: {
    width: 42, height: 42, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, flexShrink: 0,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4, marginLeft: 6, flexShrink: 0,
  },
  cardContent: { flex: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  cardTitle: { color: '#b0b4cc', fontSize: 14, fontWeight: '600', flex: 1 },
  cardTitleUnread: { color: '#f0f0f5', fontWeight: '700' },
  cardMessage: { color: '#6e7491', fontSize: 13, lineHeight: 18, marginBottom: 7 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typePill: {
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  typePillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  cardTime: { color: '#3a3f5c', fontSize: 11, fontWeight: '500' },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: { color: '#8b8fa3', fontSize: 17, fontWeight: '700' },
  emptyText: { color: '#3a3f5c', fontSize: 13, textAlign: 'center', maxWidth: 240, lineHeight: 20 },
});
