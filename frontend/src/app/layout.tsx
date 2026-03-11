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

// ✅ Metadata completa + PWA
export const metadata: Metadata = {
  title: "Tec360 Seguridad - Técnicos Certificados SENA",
  description:
    "Conectamos clientes con técnicos certificados por el SENA para instalación y mantenimiento de sistemas de seguridad electrónica",
  generator: "Tec360",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tec360",
  },
  formatDetection: {
    telephone: true,
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
