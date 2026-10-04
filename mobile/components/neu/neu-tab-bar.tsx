import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { COLORS, NEU, GRADIENTS } from '@/constants/theme';

type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];
type IconName = keyof typeof Ionicons.glyphMap;

export interface DockTab {
  /** Route name inside the Tabs navigator */
  name: string;
  /** Spoken label (the dock is icon-only, like the reference) */
  label: string;
  icon: IconName;
  iconActive: IconName;
}

export interface DockAction {
  label: string;
  icon: IconName;
  onPress: () => void;
  /** Shows a pulsing live dot on the action (e.g. a service in progress) */
  live?: boolean;
  /** Route that should light the action as "current" */
  activeRoute?: string;
}

interface NeuTabBarProps extends TabBarProps {
  /** Exactly the visible tabs, in order. Half go left of the action, half right. */
  tabs: DockTab[];
  action: DockAction;
}

const EASE = Easing.bezier(0.16, 1, 0.3, 1); // exponential ease-out

function tap() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/* ─── One dock slot: carved chip slides up under the focused icon ─── */
function DockItem({ tab, focused, onPress, onLongPress }: {
  tab: DockTab; focused: boolean; onPress: () => void; onLongPress: () => void;
}) {
  const p = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    p.value = withTiming(focused ? 1 : 0, { duration: 320, easing: EASE });
  }, [focused, p]);

  const chip = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scale: 0.82 + p.value * 0.18 }],
  }));

  const icon = useAnimatedStyle(() => ({
    transform: [{ translateY: -p.value * 1 }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: focused }}
      hitSlop={6}
      style={styles.item}
    >
      <Animated.View pointerEvents="none" style={[styles.chip, chip]} />
      <Animated.View style={icon}>
        <Ionicons
          name={focused ? tab.iconActive : tab.icon}
          size={22}
          color={focused ? COLORS.text : COLORS.textMuted}
        />
      </Animated.View>
      {focused && <View style={styles.dot} />}
    </Pressable>
  );
}

/* ─── The violet action in the middle of the dock ─── */
function DockActionButton({ action, current }: { action: DockAction; current: boolean }) {
  const press = useSharedValue(1);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (action.live) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: EASE }),
          withTiming(0, { duration: 900, easing: Easing.in(Easing.quad) }),
        ),
        -1,
      );
    } else {
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [action.live, pulse]);

  const btn = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const ring = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.9 }],
  }));

  return (
    <Pressable
      onPressIn={() => { press.value = withSpring(0.9, { damping: 16, stiffness: 320 }); }}
      onPressOut={() => { press.value = withSpring(1, { damping: 12, stiffness: 260 }); }}
      onPress={() => { tap(); action.onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      accessibilityState={{ selected: current }}
      hitSlop={8}
      style={styles.actionSlot}
    >
      <Animated.View style={[styles.actionShadow, btn]}>
        <LinearGradient colors={GRADIENTS.primary} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={styles.action}>
          <Ionicons name={action.icon} size={26} color={COLORS.onPrimary} />
        </LinearGradient>
        {action.live && (
          <View style={styles.liveWrap} pointerEvents="none">
            <Animated.View style={[styles.liveRing, ring]} />
            <View style={styles.liveDot} />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

/**
 * Floating neumorphic dock: an icon-only pill with a raised chip under the
 * focused tab and one violet action button at its centre.
 */
export function NeuTabBar({ state, navigation, descriptors, insets, tabs, action }: NeuTabBarProps) {
  const currentRoute = state.routes[state.index];
  const currentName = currentRoute?.name;
  const currentOptions = descriptors?.[currentRoute?.key]?.options;
  if ((currentOptions?.tabBarStyle as any)?.display === 'none') {
    return null;
  }

  const half = Math.ceil(tabs.length / 2);

  const renderTab = (tab: DockTab) => {
    const route = state.routes.find(r => r.name === tab.name);
    if (!route) return null;
    const focused = currentName === tab.name;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) {
        tap();
        navigation.navigate(route.name, route.params);
      }
    };
    const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

    return <DockItem key={tab.name} tab={tab} focused={focused} onPress={onPress} onLongPress={onLongPress} />;
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
      <View style={styles.dock}>
        {tabs.slice(0, half).map(renderTab)}
        <DockActionButton action={action} current={!!action.activeRoute && currentName === action.activeRoute} />
        {tabs.slice(half).map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.bg,
    paddingTop: 10,
    paddingHorizontal: 18,
  },
  dock: {
    ...NEU.dock,
    height: 70,
    borderRadius: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  item: {
    width: 60,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    ...StyleSheet.absoluteFill,
    ...NEU.raisedSm,
    backgroundColor: COLORS.surfaceHigh,
    borderRadius: 27,
  },
  dot: {
    position: 'absolute',
    bottom: 7,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primaryLight,
  },
  actionSlot: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionShadow: {
    width: 56,
    height: 56,
    borderRadius: 28,
    boxShadow: NEU.accent.boxShadow,
  },
  action: {
    flex: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveWrap: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.green,
  },
  liveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.green,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
});
