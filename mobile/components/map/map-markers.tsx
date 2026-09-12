import React from 'react';
import { View, Text, StyleSheet, Platform, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Exact anchor for positioning markers so coordinates align with the icon center
 * rather than the space between the icon and floating label.
 */
export const MARKER_ANCHOR = { x: 0.5, y: 0.38 };
export const DESTINATION_ANCHOR = MARKER_ANCHOR;
export const ORIGIN_ANCHOR = MARKER_ANCHOR;

/**
 * Origin / Technician Moving Unit Marker (Halo with directional arrow)
 * Matches the user reference image:
 * - Concentric glowing translucent peach/amber aura rings.
 * - Crisp floating white disc with drop shadow.
 * - Vibrant coral core with directional navigation arrow.
 * - Clean floating uppercase typography (no pill badge container).
 */
interface OriginHaloMarkerProps {
  heading?: number;
  isDark?: boolean;
  label?: string;
}

export function OriginHaloMarker({ heading = 45, isDark, label }: OriginHaloMarkerProps) {
  const systemColorScheme = useColorScheme();
  const effectiveDark = isDark ?? (systemColorScheme === 'dark');

  return (
    <View style={originStyles.wrapper}>
      {/* Icon with Concentric Warm Aura */}
      <View style={originStyles.iconContainer}>
        {/* Layer 1: Outer Translucent Bloom */}
        <View style={originStyles.outerAura} />
        {/* Layer 2: Middle Glow */}
        <View style={originStyles.middleAura} />
        {/* Layer 3: Inner Warm Core Aura */}
        <View style={originStyles.innerAura} />

        {/* Center Floating White Disc */}
        <View style={originStyles.whiteDisc}>
          {/* Coral / Amber Directional Core */}
          <View style={originStyles.coralCore}>
            <View style={{ transform: [{ rotate: `${heading || 45}deg` }] }}>
              <Ionicons name="navigate" size={10} color="#ffffff" />
            </View>
          </View>
        </View>
      </View>

      {/* Clean Floating Label (No Pill Badge Container) */}
      {label ? (
        <Text
          style={[
            originStyles.floatingLabel,
            effectiveDark ? originStyles.labelDark : originStyles.labelLight,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Destination / Service Stop Marker (Squircle with target square)
 * Matches the user reference image (e.g. "MENTENG ATAS"):
 * - Concentric glowing translucent peach/amber aura rings.
 * - Floating crisp white squircle card with rounded corners & drop shadow.
 * - Amber rounded square with centered white target square.
 * - Clean floating uppercase typography with drop shadow (no pill badge container).
 */
interface DestinationSquircleMarkerProps {
  isDark?: boolean;
  label?: string;
}

export function DestinationSquircleMarker({ isDark, label }: DestinationSquircleMarkerProps) {
  const systemColorScheme = useColorScheme();
  const effectiveDark = isDark ?? (systemColorScheme === 'dark');

  return (
    <View style={destStyles.wrapper}>
      {/* Icon with Concentric Warm Aura */}
      <View style={destStyles.iconContainer}>
        {/* Layer 1: Outer Translucent Bloom */}
        <View style={destStyles.outerAura} />
        {/* Layer 2: Middle Glow */}
        <View style={destStyles.middleAura} />
        {/* Layer 3: Inner Warm Core Aura */}
        <View style={destStyles.innerAura} />

        {/* Center Floating White Squircle Card */}
        <View style={destStyles.whiteCard}>
          {/* Amber Squircle Container */}
          <View style={destStyles.amberSquircle}>
            {/* White Target Center Square */}
            <View style={destStyles.whiteCenterSquare} />
          </View>
        </View>
      </View>

      {/* Clean Floating Label (No Pill Badge Container) */}
      {label ? (
        <Text
          style={[
            destStyles.floatingLabel,
            effectiveDark ? destStyles.labelDark : destStyles.labelLight,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────
const originStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 90,
  },
  iconContainer: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerAura: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
  },
  middleAura: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(251, 146, 60, 0.28)',
  },
  innerAura: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(251, 146, 60, 0.45)',
  },
  whiteDisc: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  coralCore: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingLabel: {
    marginTop: 3,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  labelDark: {
    color: '#f8fafc',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
  },
  labelLight: {
    color: '#334155',
    textShadowColor: 'rgba(255, 255, 255, 0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

const destStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 90,
  },
  iconContainer: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerAura: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
  },
  middleAura: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(251, 146, 60, 0.28)',
  },
  innerAura: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(251, 146, 60, 0.45)',
  },
  whiteCard: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  amberSquircle: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteCenterSquare: {
    width: 5,
    height: 5,
    borderRadius: 1.2,
    backgroundColor: '#ffffff',
  },
  floatingLabel: {
    marginTop: 3,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  labelDark: {
    color: '#f8fafc',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
  },
  labelLight: {
    color: '#334155',
    textShadowColor: 'rgba(255, 255, 255, 0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

/**
 * Classic Drop Pin for Location Picking & Creation (Anchor: { x: 0.5, y: 1 })
 */
export function ServicePinMarker({ isDark = false }: { isDark?: boolean }) {
  return (
    <View style={pinStyles.container}>
      <View style={[pinStyles.outerGlow, isDark && { backgroundColor: 'rgba(139,92,246,0.3)' }]} />
      <View style={pinStyles.pinBody}>
        <LinearGradient
          colors={['#8b5cf6', '#6d28d9']}
          style={pinStyles.pinGradient}
        >
          <Ionicons name="location" size={18} color="#fff" />
        </LinearGradient>
      </View>
      <View style={pinStyles.pinTail} />
      <View style={pinStyles.shadowDot} />
    </View>
  );
}

/**
 * Fleet Marker for Overview Map
 */
export function FleetMarker({ color, isSelected, isDark = false }: { color: string; isSelected?: boolean; isDark?: boolean }) {
  return (
    <View
      style={[
        fleetStyles.pin,
        { borderColor: color },
        isSelected && fleetStyles.pinSelected,
        isDark ? fleetStyles.pinDark : fleetStyles.pinLight,
      ]}
    >
      <View style={[fleetStyles.core, { backgroundColor: color }]} />
    </View>
  );
}

const pinStyles = StyleSheet.create({
  container: { alignItems: 'center', width: 48, height: 58 },
  outerGlow: {
    position: 'absolute',
    top: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(139,92,246,0.18)',
  },
  pinBody: { zIndex: 2 },
  pinGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  pinTail: {
    width: 0,
    height: 0,
    zIndex: 1,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#6d28d9',
    marginTop: -2,
  },
  shadowDot: {
    width: 10,
    height: 4,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.25)',
    marginTop: 1,
  },
});

const fleetStyles = StyleSheet.create({
  pin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinLight: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  pinDark: {
    backgroundColor: '#0f172a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  pinSelected: {
    transform: [{ scale: 1.25 }],
    borderWidth: 3.5,
  },
  core: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
