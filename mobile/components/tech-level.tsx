import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RANK_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  bronze: { label: 'Bronce', emoji: '🥉', color: '#cd7f32', bg: 'rgba(205,127,50,0.12)', border: 'rgba(205,127,50,0.3)' },
  silver: { label: 'Plata', emoji: '🥈', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)' },
  gold:   { label: 'Oro',   emoji: '🥇', color: '#eab308', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)' },
  elite:  { label: 'Élite', emoji: '👑', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)' },
};

interface TechLevelProps {
  rank?: string;
  points?: number;
  rating?: number;
  totalServices?: number;
  size?: 'sm' | 'md';
  showPoints?: boolean;
  showStars?: boolean;
}

export default function TechLevel({
  rank = 'bronze',
  points = 0,
  rating = 0,
  totalServices = 0,
  size = 'md',
  showPoints = false,
  showStars = true,
}: TechLevelProps) {
  const config = RANK_CONFIG[rank] || RANK_CONFIG.bronze;
  const fontSize = size === 'sm' ? 10 : 12;

  return (
    <View style={styles.container}>
      {/* Rank badge */}
      <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }]}>
        <Text style={{ fontSize: fontSize }}>{config.emoji}</Text>
        <Text style={[styles.badgeLabel, { color: config.color, fontSize }]}>{config.label}</Text>
      </View>

      {/* Stars */}
      {showStars && rating > 0 && (
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map(s => (
            <Ionicons
              key={s}
              name={s <= Math.round(rating) ? 'star' : 'star-outline'}
              size={size === 'sm' ? 10 : 12}
              color={s <= Math.round(rating) ? '#eab308' : '#334155'}
            />
          ))}
          <Text style={[styles.ratingNum, { fontSize: size === 'sm' ? 9 : 11 }]}>
            {rating.toFixed(1)}
          </Text>
        </View>
      )}

      {/* Points */}
      {showPoints && (
        <Text style={[styles.points, { color: config.color, fontSize: size === 'sm' ? 9 : 11 }]}>
          {points} pts
        </Text>
      )}

      {/* Services */}
      {totalServices > 0 && (
        <Text style={[styles.services, { fontSize: size === 'sm' ? 9 : 11 }]}>
          · {totalServices} serv.
        </Text>
      )}
    </View>
  );
}

/** Returns the border color for avatar ring based on rank */
export function getRankBorderColor(rank?: string): string {
  switch (rank) {
    case 'elite': return '#8b5cf6';
    case 'gold': return '#eab308';
    case 'silver': return '#94a3b8';
    default: return '#cd7f32';
  }
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  badgeLabel: { fontWeight: '700' },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  ratingNum: { color: '#8b8fa3', fontWeight: '600', marginLeft: 3 },
  points: { fontWeight: '700', fontFamily: 'monospace' },
  services: { color: '#555872' },
});
