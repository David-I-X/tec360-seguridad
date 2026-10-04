declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

export function trackEvent(
  action: string,
  params?: Record<string, string | number | boolean | undefined>
) {
  if (typeof window === "undefined") return;

  try {
    if (window.gtag) {
      window.gtag("event", action, params);
    }

    if (window.clarity) {
      window.clarity("event", action);
    }
  } catch {
    // Silently catch to prevent disruption
  }
}
