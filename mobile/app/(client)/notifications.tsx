import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `Hace ${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function getIcon(type: string): string {
  switch (type) {
    case 'service': return 'notifications';
    case 'status': return 'clipboard';
    case 'alert': return 'warning';
    default: return 'information-circle';
  }
}

function getIconColor(type: string): string {
  switch (type) {
    case 'service': return '#8b5cf6';
    case 'status': return '#3b82f6';
    case 'alert': return '#eab308';
    default: return '#8b8fa3';
  }
}

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

  // Poll every 15 seconds for new notifications
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handlePress = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      try {
        await fetchWithAuth(`/notifications/${notification.id}/read`, { method: 'PUT' });
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      } catch (e) { /* ignore */ }
    }

    // Navigate to service if applicable
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

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notifCard, !item.is_read && styles.notifUnread]}
      onPress={() => handlePress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: `${getIconColor(item.notification_type)}15` }]}>
        <Ionicons name={getIcon(item.notification_type) as any} size={20} color={getIconColor(item.notification_type)} />
      </View>
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, !item.is_read && styles.notifTitleUnread]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.notifMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.notifTime}>{timeAgo(item.created_at)}</Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <Ionicons name="checkmark-done" size={16} color="#8b5cf6" />
            <Text style={styles.markAllText}>Marcar todo leído</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Ionicons name="notifications" size={14} color="#8b5cf6" />
          <Text style={styles.unreadBannerText}>
            {unreadCount} {unreadCount === 1 ? 'notificación sin leer' : 'notificaciones sin leer'}
          </Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
            tintColor="#8b5cf6"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color="#555872" />
            <Text style={styles.emptyTitle}>Sin notificaciones</Text>
            <Text style={styles.emptyText}>Cuando recibas alertas de servicios, aparecerán aquí.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  centered: { flex: 1, backgroundColor: '#050810', justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12,
  },
  headerTitle: { color: '#f0f0f5', fontSize: 24, fontWeight: '800' },
  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
  },
  markAllText: { color: '#8b5cf6', fontSize: 11, fontWeight: '700' },

  unreadBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)',
  },
  unreadBannerText: { color: '#a78bfa', fontSize: 12, fontWeight: '600' },

  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: 'rgba(10,14,28,0.6)', borderRadius: 16,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(80,60,160,0.1)',
  },
  notifUnread: {
    backgroundColor: 'rgba(139,92,246,0.06)',
    borderColor: 'rgba(139,92,246,0.2)',
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  notifContent: { flex: 1 },
  notifTitle: { color: '#c0c4d6', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  notifTitleUnread: { color: '#f0f0f5', fontWeight: '700' },
  notifMessage: { color: '#8b8fa3', fontSize: 13, lineHeight: 18, marginBottom: 4 },
  notifTime: { color: '#555872', fontSize: 11 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#8b5cf6',
    marginTop: 6,
  },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { color: '#8b8fa3', fontSize: 16, fontWeight: '700' },
  emptyText: { color: '#555872', fontSize: 13, textAlign: 'center', maxWidth: 240 },
});
