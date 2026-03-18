import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Custom purple drop pin for service destination
 */
export function ServicePinMarker() {
  return (
    <View style={pinStyles.container}>
      {/* Outer glow */}
      <View style={pinStyles.outerGlow} />
      {/* Pin body */}
      <View style={pinStyles.pinBody}>
        <LinearGradient
          colors={['#8b5cf6', '#7c3aed']}
          style={pinStyles.pinGradient}
        >
          <Ionicons name="location" size={18} color="#fff" />
        </LinearGradient>
      </View>
      {/* Pin tail */}
      <View style={pinStyles.pinTail} />
      {/* Shadow dot */}
      <View style={pinStyles.shadowDot} />
    </View>
  );
}

/**
 * Custom blue glowing dot for technician position
 */
export function TechnicianPinMarker({ label }: { label?: string }) {
  return (
    <View style={techStyles.container}>
      {/* Outer pulse ring */}
      <View style={techStyles.pulseRing} />
      {/* Middle ring */}
      <View style={techStyles.middleRing} />
      {/* Core dot */}
      <LinearGradient
        colors={['#3b82f6', '#2563eb']}
        style={techStyles.coreDot}
      >
        <View style={techStyles.innerDot} />
      </LinearGradient>
      {/* Label */}
      {label && (
        <View style={techStyles.labelContainer}>
          <Text style={techStyles.labelText} numberOfLines={1}>{label}</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Custom green dot for "my location" (technician's own view)
 */
export function MyLocationMarker() {
  return (
    <View style={myLocStyles.container}>
      <View style={myLocStyles.pulseRing} />
      <View style={myLocStyles.middleRing} />
      <LinearGradient
        colors={['#22c55e', '#16a34a']}
        style={myLocStyles.coreDot}
      >
        <View style={myLocStyles.innerDot} />
      </LinearGradient>
    </View>
  );
}

const pinStyles = StyleSheet.create({
  container: { alignItems: 'center', width: 48, height: 60 },
  outerGlow: {
    position: 'absolute', top: 2, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(139,92,246,0.2)',
  },
  pinBody: { zIndex: 2 },
  pinGradient: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
  },
  pinTail: {
    width: 0, height: 0, zIndex: 1,
    borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 12,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: '#7c3aed', marginTop: -2,
  },
  shadowDot: {
    width: 10, height: 4, borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.2)', marginTop: 1,
  },
});

const techStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', width: 44, height: 55 },
  pulseRing: {
    position: 'absolute', width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)',
  },
  middleRing: {
    position: 'absolute', width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(59,130,246,0.25)',
  },
  coreDot: {
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 6, elevation: 6,
  },
  innerDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  labelContainer: {
    marginTop: 4, backgroundColor: 'rgba(10,14,28,0.9)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)',
  },
  labelText: { color: '#3b82f6', fontSize: 10, fontWeight: '700' },
});

const myLocStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', width: 40, height: 40 },
  pulseRing: {
    position: 'absolute', width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  middleRing: {
    position: 'absolute', width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(34,197,94,0.25)',
  },
  coreDot: {
    width: 16, height: 16, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#22c55e', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 6, elevation: 6,
  },
  innerDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff' },
});
