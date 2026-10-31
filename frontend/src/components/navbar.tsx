"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Moon,
  Sun,
  LogOut,
  User,
  Menu,
  X,
  Shield,
  Wrench,
  FileText,
  Home,
  ClipboardList,
  Settings,
  Download,
  Wallet,
  GraduationCap,
  ArrowUpRight,
} from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { maskPhoneNumber } from "@/lib/validations"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn, getAvatarUrl } from "@/lib/utils"
import { Tec360Logo } from "@/components/brand/tec360-logo"

const landingSections = [
  { href: "#anatomia", label: "Anatomía 360°" },
  { href: "#servicios", label: "Servicios" },
  { href: "#ecosistema", label: "Ecosistema" },
  { href: "#respaldo", label: "Respaldo" },
  { href: "#contacto", label: "Central 24/7" },
]

export function Navbar() {
  const { theme, setTheme } = useTheme()
  const { user, isAuthenticated, logout } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const isLanding = pathname === "/"

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const getNavLinks = () => {
    if (!isAuthenticated || !user) {
      return [
        { href: "/", label: "Inicio", icon: Home },
        { href: "/descargar-app", label: "Descargar App", icon: Download },
      ]
    }

    if (user.role === "admin") {
      return [
        { href: "/admin", label: "Dashboard Admin.", icon: Shield },
        { href: "/descargar-app", label: "Descargar App", icon: Download },
        { href: "/configuracion", label: "Configuración", icon: Settings },
      ]
    }

    if (user.role === "technician" || user.role === "reaction_team") {
      return [
        { href: "/tecnicos/dashboard", label: "Dashboard", icon: Wrench },
        { href: "/tecnicos/mis-cotizaciones", label: "Cotizaciones", icon: FileText },
        { href: "/tecnicos/billetera", label: "Billetera", icon: Wallet },
        { href: "/escuela", label: "Escuela Tec", icon: GraduationCap },
        { href: "/descargar-app", label: "Descargar App", icon: Download },
        { href: "/configuracion", label: "Configuración", icon: Settings },
      ]
    }

    return [
      { href: "/servicios", label: "Mis Servicios", icon: ClipboardList },
      { href: "/servicios/nuevo", label: "Nuevo Servicio", icon: Shield },
      { href: "/descargar-app", label: "Descargar App", icon: Download },
      { href: "/configuracion", label: "Configuración", icon: Settings },
    ]
  }

  const navLinks = getNavLinks()

  const getUserInitials = () => {
    if (!user?.full_name) return "U"
    const parts = user.full_name.split(" ")
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0][0].toUpperCase()
  }

  const getRoleBadge = () => {
    if (!user?.role) return null
    const roleMap: Record<string, { label: string; color: string }> = {
      client: { label: "Cliente", color: "bg-blue-500" },
      technician: { label: "Técnico", color: "bg-emerald-500" },
      admin: { label: "Admin", color: "bg-purple-500" },
    }
    const role = roleMap[user.role]
    if (!role) return null
    return (
      <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full ${role.color}`}>
        {role.label}
      </span>
    )
  }

  return (
    <>
      <nav
        className={cn(
          "left-0 right-0 z-50 transition-all duration-300",
          isLanding
            ? cn(
                "fixed top-0",
                isScrolled
                  ? "border-b border-violet-500/20 bg-[#050810]/85 backdrop-blur-xl"
                  : "border-b border-white/[0.06] bg-[#050810]/55 backdrop-blur-md"
              )
            : cn(
                "sticky top-0",
                isScrolled
                  ? "border-b border-border bg-background/90 backdrop-blur-xl shadow-sm"
                  : "border-b border-transparent bg-background/50 backdrop-blur-md"
              )
        )}
      >
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          {/* Official Squircle Logo + Horizontal Brand Lockup */}
          <Link href="/" className="flex items-center group py-1 shrink-0" aria-label="Tec360 Seguridad — Inicio">
            <Tec360Logo size="sm" adaptive={!isLanding} />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            {isLanding && !isAuthenticated ? (
              <>
                {landingSections.map((section) => (
                  <a
                    key={section.href}
                    href={section.href}
                    className="t360-hairline-link text-sm font-medium text-[#B4B0C8] hover:text-[#F8FAFC] transition-colors py-1"
                  >
                    <span>{section.label}</span>
                  </a>
                ))}
                <Link
                  href="/descargar-app"
                  className="t360-hairline-link text-sm font-medium text-[#00F0FF] hover:text-[#F8FAFC] transition-colors py-1"
                >
                  <span>App Móvil</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </>
            ) : (
              navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all",
                    isLanding
                      ? "text-[#B4B0C8] hover:text-[#F8FAFC] hover:bg-white/[0.06]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated && <NotificationBell />}

            {/* Theme Toggle only on inner routes — Landing is 100% Dark Immersive */}
            {!isLanding && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-full h-9 w-9"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Cambiar tema</span>
              </Button>
            )}

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "gap-2 pl-2 pr-3 h-9",
                      isLanding && "text-[#F8FAFC] hover:bg-white/[0.08] hover:text-[#F8FAFC]"
                    )}
                  >
                    {user?.avatar_url ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full overflow-hidden border border-border/50">
                        <img
                          src={getAvatarUrl(user.avatar_url)}
                          alt={user.full_name || "Usuario"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full gradient-brand text-[11px] font-bold text-white">
                        {getUserInitials()}
                      </div>
                    )}
                    <span className="hidden sm:inline text-sm font-medium">
                      {user?.full_name?.split(" ")[0] || maskPhoneNumber(user?.phone || "")}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Mi Cuenta</span>
                    {getRoleBadge()}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {user?.full_name && <div className="font-medium text-foreground">{user.full_name}</div>}
                    {user?.phone && <div className="text-xs">{maskPhoneNumber(user.phone)}</div>}
                    {user?.email && <div className="text-xs">{user.email}</div>}
                  </div>
                  <DropdownMenuSeparator />
                  {user?.role === "client" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/servicios" className="cursor-pointer">
                          <ClipboardList className="mr-2 h-4 w-4" />
                          Mis Servicios
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/servicios/nuevo" className="cursor-pointer">
                          <Shield className="mr-2 h-4 w-4" />
                          Solicitar Servicio
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {user?.role === "technician" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/tecnicos/dashboard" className="cursor-pointer">
                          <Wrench className="mr-2 h-4 w-4" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/tecnicos/mis-cotizaciones" className="cursor-pointer">
                          <FileText className="mr-2 h-4 w-4" />
                          Mis Cotizaciones
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/tecnicos/billetera" className="cursor-pointer">
                          <Wallet className="mr-2 h-4 w-4" />
                          Billetera
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {user?.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4 outline-none" />
                        Panel de Control
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/configuracion" className="cursor-pointer text-slate-600 dark:text-slate-300">
                      <Settings className="mr-2 h-4 w-4" />
                      Configuración
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : isLanding ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center px-3.5 h-9 rounded-xl text-sm font-medium text-[#B4B0C8] hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-colors"
                >
                  Ingresar
                </Link>
                <Link
                  href="/servicios/nuevo?tipo=instalacion"
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-sm font-semibold bg-[#7C3AED] hover:bg-[#8B5CF6] text-[#F8FAFC] border border-violet-400/30 transition-colors"
                >
                  <span>Agendar</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#00F0FF]" />
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] text-[#F8FAFC] border border-violet-400/30 font-semibold px-3 sm:px-4 h-8.5 sm:h-9 text-xs sm:text-sm transition-colors"
              >
                <span className="sm:hidden">Ingresar</span>
                <span className="hidden sm:inline">Iniciar Sesión</span>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "lg:hidden h-9 w-9",
                isLanding && "text-[#F8FAFC] hover:bg-white/[0.08] hover:text-[#F8FAFC]"
              )}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/70 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              key="panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className={cn(
                "fixed top-16 right-0 z-40 w-72 h-[calc(100vh-4rem)] border-l lg:hidden",
                isLanding
                  ? "bg-[#0B0F19] border-violet-500/20 text-[#F8FAFC]"
                  : "bg-background border-border shadow-xl"
              )}
            >
              <div className="flex flex-col p-5 gap-1.5">
                {isLanding && !isAuthenticated ? (
                  <>
                    {landingSections.map((section) => (
                      <a
                        key={section.href}
                        href={section.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between px-3.5 py-3 text-sm font-medium rounded-xl text-[#F8FAFC] hover:bg-white/[0.06] transition-colors"
                      >
                        <span>{section.label}</span>
                        <ArrowUpRight className="h-4 w-4 text-[#00F0FF]" />
                      </a>
                    ))}
                    <Link
                      href="/descargar-app"
                      className="flex items-center justify-between px-3.5 py-3 text-sm font-medium rounded-xl text-[#00F0FF] hover:bg-white/[0.06] transition-colors"
                    >
                      <span>Descargar App Móvil</span>
                      <Download className="h-4 w-4" />
                    </Link>
                    <div className="border-t border-white/10 mt-3 pt-4 flex flex-col gap-2.5">
                      <Link
                        href="/servicios/nuevo?tipo=instalacion"
                        className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl bg-[#7C3AED] text-[#F8FAFC]"
                      >
                        <span>Agendar Instalación</span>
                        <ArrowUpRight className="h-4 w-4 text-[#00F0FF]" />
                      </Link>
                      <Link
                        href="/login"
                        className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl border border-white/15 text-[#F8FAFC]"
                      >
                        <User className="h-4 w-4" />
                        <span>Iniciar Sesión</span>
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                          isLanding ? "hover:bg-white/[0.06] text-[#F8FAFC]" : "hover:bg-muted/50"
                        )}
                      >
                        <link.icon className="h-5 w-5 text-muted-foreground" />
                        {link.label}
                      </Link>
                    ))}
                    <div className="border-t border-border mt-3 pt-3">
                      {!isAuthenticated && (
                        <Link
                          href="/login"
                          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#8B5CF6]"
                        >
                          <User className="h-5 w-5" />
                          Iniciar Sesión
                        </Link>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
