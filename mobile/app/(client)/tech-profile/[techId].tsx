import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchWithAuth, API_URL } from '@/lib/api';

export default function TechPublicProfileScreen() {
  const router = useRouter();
  const { techId } = useLocalSearchParams<{ techId: string }>();
  const [tech, setTech] = useState<any>(null);
  const [ratings, setRatings] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const staticUrl = API_URL.replace(/\/api\/?$/, '');

  useEffect(() => {
    (async () => {
      try {
        const [profileRes, ratingsRes, statsRes] = await Promise.all([
          fetchWithAuth(`/technicians/${techId}/public`),
          fetchWithAuth(`/ratings/technicians/${techId}?page_size=5`),
          fetchWithAuth(`/ratings/technicians/${techId}/stats`),
        ]);
        const profileData = await profileRes.json();
        setTech(profileData);
        const ratingsData = await ratingsRes.json();
        setRatings(ratingsData.ratings || []);
        const statsData = await statsRes.json();
        setStats(statsData);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [techId]);

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#8b5cf6" /></View>;
  }

  if (!tech) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: '#8b8fa3', fontSize: 16 }}>Perfil no disponible</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#8b5cf6', fontSize: 15, fontWeight: '600' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const avgRating = stats?.average_rating ? Number(stats.average_rating).toFixed(1) : '—';
  const totalRatings = stats?.total_ratings || 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#f0f0f5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil del Técnico</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        {tech.avatar_url ? (
          <Image source={{ uri: tech.avatar_url.startsWith('http') ? tech.avatar_url : `${staticUrl}${tech.avatar_url}` }} style={styles.avatar} />
        ) : (
          <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.avatar}>
            <Text style={styles.avatarText}>{tech.full_name?.[0] || 'T'}</Text>
          </LinearGradient>
        )}
        <Text style={styles.name}>{tech.full_name}</Text>
        {tech.is_verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#3b82f6" />
            <Text style={styles.verifiedText}>Técnico verificado</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="star" size={20} color="#eab308" />
          <Text style={styles.statNumber}>{avgRating}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="chatbubble" size={20} color="#3b82f6" />
          <Text style={styles.statNumber}>{totalRatings}</Text>
          <Text style={styles.statLabel}>Reseñas</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-done" size={20} color="#22c55e" />
          <Text style={styles.statNumber}>{tech.completed_services || 0}</Text>
          <Text style={styles.statLabel}>Servicios</Text>
        </View>
      </View>

      {/* Specializations */}
      {tech.specializations && tech.specializations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ESPECIALIDADES</Text>
          <View style={styles.tagsRow}>
            {tech.specializations.map((spec: string, i: number) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{spec.replace(/_/g, ' ')}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Rating Distribution */}
      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DISTRIBUCIÓN</Text>
          {[5, 4, 3, 2, 1].map(star => {
            const count = stats.rating_distribution?.[String(star)] || 0;
            const pct = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
            return (
              <View key={star} style={styles.distRow}>
                <Text style={styles.distStar}>{star}★</Text>
                <View style={styles.distBar}>
                  <View style={[styles.distFill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.distCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Reviews */}
      {ratings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RESEÑAS RECIENTES</Text>
          {ratings.map((r, i) => (
            <View key={i} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewName}>{r.client_name || 'Cliente'}</Text>
                <View style={styles.reviewStars}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Ionicons key={s} name={s <= r.rating ? 'star' : 'star-outline'} size={12} color="#eab308" />
                  ))}
                </View>
              </View>
              {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
              <Text style={styles.reviewDate}>
                {new Date(r.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  centered: { flex: 1, backgroundColor: '#050810', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(10,14,28,0.8)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#f0f0f5', fontSize: 18, fontWeight: '700' },
  profileCard: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 3, borderColor: 'rgba(139,92,246,0.3)' },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '800' },
  name: { color: '#f0f0f5', fontSize: 24, fontWeight: '800', marginTop: 14 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: 'rgba(59,130,246,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' },
  verifiedText: { color: '#3b82f6', fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: 'rgba(10,14,28,0.85)', borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(80,60,160,0.2)' },
  statNumber: { color: '#f0f0f5', fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#555872', fontSize: 11 },
  section: { marginHorizontal: 20, marginBottom: 20 },
  sectionTitle: { color: '#555872', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: 'rgba(139,92,246,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' },
  tagText: { color: '#a855f7', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  distStar: { color: '#eab308', fontSize: 12, fontWeight: '700', width: 24 },
  distBar: { flex: 1, height: 6, backgroundColor: 'rgba(80,60,160,0.2)', borderRadius: 3, overflow: 'hidden' },
  distFill: { height: '100%', backgroundColor: '#eab308', borderRadius: 3 },
  distCount: { color: '#8b8fa3', fontSize: 11, width: 20, textAlign: 'right' },
  reviewCard: { backgroundColor: 'rgba(10,14,28,0.85)', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(80,60,160,0.15)' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewName: { color: '#f0f0f5', fontSize: 14, fontWeight: '700' },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewComment: { color: '#8b8fa3', fontSize: 13, lineHeight: 18, marginBottom: 6 },
  reviewDate: { color: '#334155', fontSize: 11 },
});
