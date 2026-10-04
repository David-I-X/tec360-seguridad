import React from 'react';
import { View, ViewProps, StyleSheet, Pressable, PressableProps, Text, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, NEU, GRADIENTS, RADIUS } from '@/constants/theme';

export { NeuTabBar } from './neu-tab-bar';
export type { DockTab, DockAction } from './neu-tab-bar';

type IconName = keyof typeof Ionicons.glyphMap;

/** Raised neumorphic panel. Use for cards and grouped rows. */
export function NeuCard({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.card, style]} />;
}

/** Carved well. Use for inputs, search, tracks and empty-state badges. */
export function NeuWell({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.well, style]} />;
}

/** Round icon tile: raised by default, carved when `inset`. */
export function NeuIcon({ name, color = COLORS.primaryLight, size = 44, inset = false, style }: {
  name: IconName; color?: string; size?: number; inset?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[inset ? NEU.inset : NEU.raisedSm, { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Ionicons name={name} size={Math.round(size * 0.45)} color={color} />
    </View>
  );
}

/** Primary violet button (white label, 5.7:1). `tone="surface"` gives a raised neutral button. */
export function NeuButton({ label, icon, loading, tone = 'primary', style, disabled, ...rest }: PressableProps & {
  label: string; icon?: IconName; loading?: boolean; tone?: 'primary' | 'surface'; style?: StyleProp<ViewStyle>;
}) {
  const isPrimary = tone === 'primary';
  const fg = isPrimary ? COLORS.onPrimary : COLORS.text;
  const content = (
    <View style={styles.btnInner}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <Text style={[styles.btnLabel, { color: fg }]}>{label}</Text>
        </>
      )}
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      {...rest}
      style={({ pressed }) => [
        styles.btn,
        isPrimary ? { boxShadow: NEU.accent.boxShadow } : NEU.raisedSm,
        pressed && (isPrimary ? styles.btnPressedPrimary : NEU.inset),
        (disabled || loading) && styles.btnDisabled,
        style,
      ]}
    >
      {isPrimary ? (
        <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnFill}>
          {content}
        </LinearGradient>
      ) : content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { ...NEU.raised, borderRadius: RADIUS.lg },
  well: { ...NEU.inset, borderRadius: RADIUS.md },
  btn: { borderRadius: RADIUS.md, overflow: 'visible' },
  btnFill: { borderRadius: RADIUS.md },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, paddingHorizontal: 20 },
  btnLabel: { fontSize: 15, fontWeight: '700' },
  btnPressedPrimary: { transform: [{ scale: 0.98 }], boxShadow: '0px 4px 10px rgba(124,58,237,0.35)' },
  btnDisabled: { opacity: 0.5 },
});
