import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { ServiceWorkerRegistration } from "@/components/pwa/sw-register"
import { Navbar } from "@/components/navbar"
import "./globals.css"

// ✅ Configurar fuentes (se mantienen)
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

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
    default: "Tec360 Seguridad - Técnicos Certificados SENA",
    template: "%s | Tec360 Seguridad"
  },
  description: "Conectamos clientes con técnicos certificados por el SENA para instalación, mantenimiento y revisión de sistemas de seguridad electrónica, GPS y cámaras.",
  keywords: [
    "seguridad electrónica", "GPS vehicular", "cámaras de seguridad", 
    "instalación de alarmas", "técnicos SENA", "medellín", "colombia",
    "rastreo satelital", "mantenimiento cctv", "seguridad vehicular"
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
    title: "Tec360 Seguridad - Técnicos Certificados SENA",
    description: "Conectamos clientes con técnicos certificados por el SENA para instalación y mantenimiento de sistemas de seguridad electrónica y GPS.",
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
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
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
          </AuthProvider>


          {/* ✅ PWA Service Worker */}
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </body>
    </html>
  )
}
