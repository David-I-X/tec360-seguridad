/**
 * Tec360 — Design System (Mobile)
 * Dark Neumorphism: charcoal surfaces carved by paired light/dark shadows,
 * one violet accent for action and state. Elevation is declared ONCE per
 * element: relief shadow OR border, never both.
 *
 * Relief shadows use the RN `boxShadow` style (New Architecture, RN ≥ 0.76).
 * Raised surfaces are also a hair lighter than the page so they stay legible
 * even if a shadow fails to render.
 */

export const COLORS = {
  // ─── Surfaces (charcoal, cool tint) ────
  bg:           '#1A1C23',      // Page ground
  surface:      '#1F2129',      // Raised card / control
  surfaceHigh:  '#272A34',      // Active chip, selected row
  sunken:       '#15171D',      // Inset wells: inputs, tracks, search
  bgCard:       '#1F2129',      // (legacy key) = surface
  bgCardLight:  '#272A34',      // (legacy key) = surfaceHigh
  bgOverlay:    'rgba(14,15,20,0.92)',

  // ─── Primary (Tec360 violet) ───────────
  primary:      '#8b5cf6',
  primaryLight: '#a78bfa',
  primaryDark:  '#7c3aed',      // Fill for buttons with white labels (5.7:1)
  primaryMuted: 'rgba(139,92,246,0.14)',
  primaryBorder:'rgba(139,92,246,0.28)',

  // ─── Status ────────────────────────────
  green:        '#34d399',
  greenMuted:   'rgba(52,211,153,0.14)',
  greenBorder:  'rgba(52,211,153,0.28)',
  yellow:       '#fbbf24',
  orange:       '#fb923c',
  red:          '#f87171',
  redMuted:     'rgba(248,113,113,0.12)',
  blue:         '#60a5fa',

  // ─── Text (all ≥ 4.5:1 on bg) ──────────
  text:         '#ECEDF3',
  textSecondary:'#ABAEC2',
  textMuted:    '#8487A0',
  onPrimary:    '#FFFFFF',

  // ─── Hairlines (only where no relief) ──
  border:       'rgba(255,255,255,0.06)',
  borderLight:  'rgba(255,255,255,0.04)',
} as const;

/**
 * Relief recipes. Light comes from the top-left.
 * Spread these into a style: `{ ...NEU.raised }`.
 */
export const NEU = {
  /** Cards, list rows, panels */
  raised: {
    backgroundColor: COLORS.surface,
    boxShadow: '-5px -5px 12px rgba(255,255,255,0.035), 6px 6px 14px rgba(0,0,0,0.55)',
  },
  /** Small controls: chips, icon buttons, toggles */
  raisedSm: {
    backgroundColor: COLORS.surface,
    boxShadow: '-3px -3px 7px rgba(255,255,255,0.03), 4px 4px 9px rgba(0,0,0,0.5)',
  },
  /** Carved wells: inputs, search, progress tracks, pressed state */
  inset: {
    backgroundColor: COLORS.sunken,
    boxShadow: 'inset 3px 3px 7px rgba(0,0,0,0.6), inset -2px -2px 6px rgba(255,255,255,0.035)',
  },
  /** The single violet action: FAB and primary buttons */
  accent: {
    backgroundColor: COLORS.primaryDark,
    boxShadow: '0px 10px 22px rgba(124,58,237,0.42), -3px -3px 8px rgba(255,255,255,0.04)',
  },
  /** Floating tab bar pill */
  dock: {
    backgroundColor: COLORS.surface,
    boxShadow: '-6px -6px 16px rgba(255,255,255,0.03), 10px 12px 26px rgba(0,0,0,0.6)',
  },
} as const;

export const GRADIENTS = {
  primary:  ['#8b5cf6', '#6d28d9'] as [string, string],
  accent:   ['#7c3aed', '#8b5cf6'] as [string, string],
  success:  ['#10b981', '#34d399'] as [string, string],
  surface:  ['#22252E', '#1C1E26'] as [string, string],
} as const;

export const SHADOWS = {
  primary: {
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  round: 9999,
} as const;

export const FONTS = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    title: 30,
  },
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  }
} as const;

/** Bottom space screens must reserve so content clears the floating dock. */
export const DOCK_CLEARANCE = 112;
