import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '@/lib/auth-context';
import { fetchWithAuth, API_URL } from '@/lib/api';

export default function TechProfileScreen() {
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
          completed: list.filter((s: any) => s.status === 'completed').length,
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
    Alert.alert('Cerrar sesión', '¿Deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <TouchableOpacity onPress={handleChangeAvatar} activeOpacity={0.8}>
          {user?.avatar_url ? (
            <Image
              source={{ uri: user.avatar_url.startsWith('http') ? user.avatar_url : `${staticUrl}${user.avatar_url}` }}
              style={styles.avatar}
            />
          ) : (
            <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.full_name?.[0] || 'T'}</Text>
            </LinearGradient>
          )}
          <View style={styles.cameraIcon}>
            {isUploading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={14} color="#fff" />}
          </View>
        </TouchableOpacity>
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
        {user?.email && <Text style={styles.email}>{user.email}</Text>}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="briefcase" size={22} color="#8b5cf6" />
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Servicios</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-done" size={22} color="#22c55e" />
          <Text style={styles.statNumber}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completados</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="star" size={22} color="#eab308" />
          <Text style={styles.statNumber}>{(user as any)?.average_rating?.toFixed(1) || '—'}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="person-outline" size={20} color="#8b8fa3" />
          <Text style={styles.menuText}>Editar Perfil</Text>
          <Ionicons name="chevron-forward" size={18} color="#555872" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="pricetags-outline" size={20} color="#8b8fa3" />
          <Text style={styles.menuText}>Mis Cotizaciones</Text>
          <Ionicons name="chevron-forward" size={18} color="#555872" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="help-circle-outline" size={20} color="#8b8fa3" />
          <Text style={styles.menuText}>Soporte</Text>
          <Ionicons name="chevron-forward" size={18} color="#555872" />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 10 },
  headerTitle: { color: '#f0f0f5', fontSize: 24, fontWeight: '800' },
  avatarContainer: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#050810' },
  name: { color: '#f0f0f5', fontSize: 22, fontWeight: '800', marginTop: 12 },
  phone: { color: '#8b8fa3', fontSize: 14, marginTop: 4 },
  email: { color: '#555872', fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: 'rgba(10,14,28,0.85)', borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  statNumber: { color: '#f0f0f5', fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#555872', fontSize: 11 },
  menuSection: { marginHorizontal: 20, backgroundColor: 'rgba(10,14,28,0.8)', borderRadius: 18, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(80,60,160,0.15)' },
  menuText: { flex: 1, color: '#f0f0f5', fontSize: 15, fontWeight: '600' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)' },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
});
