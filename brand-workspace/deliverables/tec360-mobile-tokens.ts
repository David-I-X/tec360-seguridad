/**
 * Tec360 Seguridad — Tokens Oficiales de Marca v3.0 (Compartidos Web + Mobile Expo)
 * Auto-generado desde brand-workspace/deliverables/brand-tokens.json.
 * Estándar humano exclusivo: técnicos certificados (cero alusiones a entidades terceras).
 */

export const BRAND_COLORS = {
  void: "#050810",
  obsidian: "#0B0F19",
  elevated: "#111827",
  alertSurface: "#190812",
  violetCore: "#7C3AED",
  electricViolet: "#8B5CF6",
  violetDeep: "#5B21B6",
  quantumBlue: "#3B82F6",
  telemetryCyan: "#00F0FF",
  tacticalAmber: "#F59E0B",
  armedEmerald: "#10B981",
  alertCrimson: "#FF2A55",
  textPrimary: "#F8FAFC",
  textBodyTinted: "#B4B0C8",
  textDisplayDual: "#A39EB8",
  borderVioletGlass: "rgba(139, 92, 246, 0.24)",
  borderHairline: "rgba(255, 255, 255, 0.08)",
} as const;

export const SERVICE_PILLARS = {
  instalacion: {
    id: "instalacion",
    title: "Instalaciones Vehiculares",
    scope: "Motos · Automóviles · Carga Pesada",
    accent: BRAND_COLORS.electricViolet,
    ctaBg: BRAND_COLORS.violetCore,
    ctaText: BRAND_COLORS.textPrimary,
  },
  recuperacion: {
    id: "recuperacion",
    title: "Equipo de Reacción & Recuperación 24/7",
    scope: "Respuesta Inmediata 24/7 · Cobertura Nacional",
    accent: BRAND_COLORS.telemetryCyan,
    ctaBg: BRAND_COLORS.telemetryCyan,
    ctaText: BRAND_COLORS.void,
  },
  mecanica: {
    id: "mecanica",
    title: "Mecánica Básica a Domicilio",
    scope: "Asistencia Express · En Casa, Oficina o Vía",
    accent: BRAND_COLORS.tacticalAmber,
    ctaBg: BRAND_COLORS.tacticalAmber,
    ctaText: BRAND_COLORS.void,
  },
} as const;
