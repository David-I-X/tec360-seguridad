/**
 * Tec360 — Design System / Theme
 * Dark sci-fi purple theme with high contrast
 */

export const COLORS = {
  // ─── Backgrounds ───────────────────────
  bg:           '#050810',      // Deepest background
  bgCard:       'rgba(10,14,28,0.85)',
  bgCardLight:  'rgba(18,22,40,0.7)',
  bgOverlay:    'rgba(5,8,16,0.9)',

  // ─── Primary (Purple) ─────────────────
  primary:      '#8b5cf6',
  primaryLight: '#a78bfa',
  primaryDark:  '#7c3aed',
  primaryMuted: 'rgba(139,92,246,0.15)',
  primaryBorder:'rgba(139,92,246,0.25)',

  // ─── Accent ────────────────────────────
  green:        '#22c55e',
  greenMuted:   'rgba(34,197,94,0.15)',
  greenBorder:  'rgba(34,197,94,0.25)',
  yellow:       '#eab308',
  orange:       '#f97316',
  red:          '#ef4444',
  redMuted:     'rgba(239,68,68,0.1)',

  // ─── Text ──────────────────────────────
  text:         '#f0f0f5',
  textSecondary:'#8b8fa3',
  textMuted:    '#555872',

  // ─── Borders ───────────────────────────
  border:       'rgba(80,60,160,0.2)',
  borderLight:  'rgba(80,60,160,0.12)',
} as const;

export const GRADIENTS = {
  primary:  ['#7c3aed', '#a855f7'] as [string, string],
  accent:   ['#6d28d9', '#8b5cf6'] as [string, string],
  success:  ['#16a34a', '#22c55e'] as [string, string],
  surface:  ['rgba(139,92,246,0.12)', 'rgba(139,92,246,0.04)'] as [string, string],
} as const;

export const SHADOWS = {
  primary: {
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
