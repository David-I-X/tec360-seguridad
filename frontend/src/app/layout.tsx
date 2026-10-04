import type React from "react"
import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { ServiceWorkerRegistration } from "@/components/pwa/sw-register"
import { PushAutoRegister } from "@/components/pwa/push-auto-register"
import { Navbar } from "@/components/navbar"
import { AnalyticsProvider } from "@/components/analytics/analytics-provider"
import "./globals.css"
// ✅ Viewport (Next.js 16 — export separado)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
}

// ✅ Metadata completa + SEO + PWA
export const metadata: Metadata = {
  metadataBase: new URL("https://tec-360.tech"),
  alternates: {
    canonical: "https://tec-360.tech",
  },
  title: {
    default: "Tec360 Seguridad - Instalación de GPS, Alarmas y Cámaras por Técnicos Certificados",
    template: "%s | Tec360 Seguridad"
  },
  description: "Servicio profesional de instalación de GPS vehicular, cámaras de seguridad y sistemas de alarmas en Colombia. Conecta con técnicos expertos y verificados por el SENA que llegan de inmediato al lugar de tu necesidad.",
  keywords: [
    "instalación de GPS", "GPS vehicular", "instalador de cámaras de seguridad", 
    "técnicos en seguridad electrónica", "técnicos SENA", "instalación de alarmas",
    "rastreo satelital", "Medellín", "Colombia", "servicios a domicilio",
    "mantenimiento cctv"
  ],
  authors: [{ name: "Tec360 Seguridad" }],
  creator: "Tec360",
  publisher: "Tec360 Seguridad",
  formatDetection: {
    email: false,
    address: false,
    telephone: true,
  },
  openGraph: {
    title: "Tec360 Seguridad - Especialistas en Instalación de GPS y Cámaras",
    description: "Servicio experto de instalación de Sistemas GPS y Cámaras. Técnicos certificados por el SENA a domicilio, rápidos y confiables en Medellín y toda Colombia.",
    url: "https://tec-360.tech",
    siteName: "Tec360 Seguridad",
    locale: "es_CO",
    type: "website",
    images: [
      {
        url: "/icons/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tec360 Seguridad - Plataforma Telemática y Técnicos Certificados SENA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tec360 Seguridad - Técnicos Certificados SENA",
    description: "Instalación y mantenimiento de sistemas de seguridad electrónica por técnicos certificados por el SENA.",
    creator: "@tec360",
    images: ["/icons/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    title: "Tec360",
    statusBarStyle: "black-translucent",
    capable: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png" },
    ],
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SecurityService",
  name: "Tec360 Seguridad",
  image: "https://tec-360.tech/icons/og-image.png",
  logo: "https://tec-360.tech/icons/icon-512x512.png",
  url: "https://tec-360.tech",
  telephone: "+573052156601",
  email: "tracktec.soporte@gmail.com",
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Medellín",
    addressRegion: "Antioquia",
    addressCountry: "CO"
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 6.2442,
    longitude: -75.5812
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "07:00",
      closes: "19:00"
    }
  ],
  description: "Servicio profesional de instalación de GPS vehicular, cámaras de seguridad y sistemas de alarmas en Colombia. Conecta con técnicos certificados por el SENA a domicilio."
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="font-sans antialiased"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {/* ✅ AuthProvider registrado globalmente */}
          <AuthProvider>
            <Navbar />
            {children}
            <PushAutoRegister />
          </AuthProvider>


          {/* ✅ PWA Service Worker */}
          <ServiceWorkerRegistration />

          {/* ✅ Analítica Ultraligera (GA4 + Microsoft Clarity) */}
          <AnalyticsProvider />
        </ThemeProvider>
      </body>
    </html>
  )
}
