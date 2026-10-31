import type React from "react"
import type { Metadata, Viewport } from "next"
import { Archivo, Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { ServiceWorkerRegistration } from "@/components/pwa/sw-register"
import { PushAutoRegister } from "@/components/pwa/push-auto-register"
import { Navbar } from "@/components/navbar"
import { AnalyticsProvider } from "@/components/analytics/analytics-provider"
import "./globals.css"

const archivoFont = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
})

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050810",
}

export const metadata: Metadata = {
  metadataBase: new URL("https://tec-360.tech"),
  alternates: {
    canonical: "https://tec-360.tech",
  },
  title: {
    default: "Tec360 Seguridad - Instalación GPS, Equipo de Reacción y Mecánica Básica",
    template: "%s | Tec360 Seguridad",
  },
  description:
    "Servicio profesional de instalación de GPS vehicular, cámaras de seguridad, alarmas, equipo de reacción 24/7 y mecánica básica a domicilio en Colombia con técnicos certificados.",
  keywords: [
    "instalación de GPS",
    "GPS vehicular",
    "instalador de cámaras de seguridad",
    "técnicos en seguridad electrónica",
    "técnicos certificados",
    "mecánica básica a domicilio",
    "equipo de reacción vehicular",
    "rastreo satelital",
    "Medellín",
    "Colombia",
    "servicios a domicilio",
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
    title: "Tec360 Seguridad - Instalación GPS, Equipo de Reacción y Mecánica Básica",
    description:
      "Instalación de sistemas GPS y cámaras, equipo de reacción 24/7 y mecánica básica a domicilio con técnicos certificados en Medellín y toda Colombia.",
    url: "https://tec-360.tech",
    siteName: "Tec360 Seguridad",
    locale: "es_CO",
    type: "website",
    images: [
      {
        url: "/icons/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tec360 Seguridad - Plataforma Telemática y Técnicos Certificados",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tec360 Seguridad - Técnicos Certificados a Domicilio",
    description:
      "Instalación telemática, equipo de reacción 24/7 y mecánica básica vehicular por técnicos certificados.",
    creator: "@tec360",
    images: ["/icons/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
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
    apple: [{ url: "/icons/icon-192x192.png" }],
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
    addressCountry: "CO",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 6.2442,
    longitude: -75.5812,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      opens: "07:00",
      closes: "19:00",
    },
  ],
  description:
    "Servicio profesional de instalación de GPS vehicular, cámaras de seguridad, equipo de reacción 24/7 y mecánica básica a domicilio en Colombia con técnicos certificados.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${archivoFont.variable} ${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <Navbar />
            {children}
            <PushAutoRegister />
          </AuthProvider>
          <ServiceWorkerRegistration />
          <AnalyticsProvider />
        </ThemeProvider>
      </body>
    </html>
  )
}
