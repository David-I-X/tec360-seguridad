/**
 * Helper ultraligero de analítica para Mobile (Expo/React Native)
 * - Cero dependencias pesadas
 * - Modo seguro: nunca bloquea la interfaz
 */

export function trackMobileEvent(event: string, properties?: Record<string, any>) {
  if (__DEV__) {
    console.log(`[Analytics Event] ${event}`, properties || '');
  }
  // En producción se puede conectar a endpoints ligeros o Measurement Protocol
}
