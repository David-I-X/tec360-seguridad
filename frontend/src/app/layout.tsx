import type React from "react"
import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { ServiceWorkerRegistration } from "@/components/pwa/sw-register"
import { PushAutoRegister } from "@/components/pwa/push-auto-register"
import { Navbar } from "@/components/navbar"
import "./globals.css"
// ✅ Viewport (Next.js 16 — export separado)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
}

// ✅ Metadata completa + SEO + PWA
export const metadata: Metadata = {
  metadataBase: new URL("https://tec-360.tech"),
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
  },
  twitter: {
    card: "summary_large_image",
    title: "Tec360 Seguridad - Técnicos Certificados SENA",
    description: "Instalación y mantenimiento de sistemas de seguridad electrónica por técnicos certificados por el SENA.",
    creator: "@tec360", // Replace with actual Twitter handle if exists
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
      {
        url: "/icons/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/icons/icon.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
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
        </ThemeProvider>
      </body>
    </html>
  )
}
