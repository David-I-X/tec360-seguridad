"use client";

import Script from "next/script";

interface AnalyticsProviderProps {
  gaId?: string;
  clarityId?: string;
}

/**
 * Proveedor de Analítica Ultraligera y Gratuita.
 * - Carga en modo 'afterInteractive' para no bloquear hidratación ni rendimiento.
 * - Usa 'beacon' para enviar datos en segundo plano sin consumo del servidor propio.
 * - Soporta Google Analytics 4 (estadísticas, rutas, conversiones) y Microsoft Clarity (mapas de calor y sesiones).
 */
export function AnalyticsProvider({
  gaId = process.env.NEXT_PUBLIC_GA_ID,
  clarityId = process.env.NEXT_PUBLIC_CLARITY_ID,
}: AnalyticsProviderProps) {
  return (
    <>
      {/* Google Analytics 4 */}
      {gaId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', {
                page_path: window.location.pathname,
                transport_type: 'beacon'
              });
            `}
          </Script>
        </>
      ) : null}

      {/* Microsoft Clarity */}
      {clarityId ? (
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityId}");
          `}
        </Script>
      ) : null}
    </>
  );
}
