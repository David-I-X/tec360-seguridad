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
  Building2,
  Users,
  Zap,
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
  const [activeQueryTab, setActiveQueryTab] = useState<string | null>(null)
  const pathname = usePathname()
  const isLanding = pathname === "/"
  const userOrg = (user as any)?.organization

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    setIsMobileMenuOpen(false)
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search)
      setActiveQueryTab(sp.get("tab"))
    }
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

    if (user.role === "company_admin") {
      return [
        { href: "/taller/dashboard", label: "Panel Taller", icon: Building2 },
        { href: "/taller/dashboard?tab=team", label: "Subcuentas y Cupos", icon: Users },
        { href: "/taller/dashboard?tab=dispatch", label: "Despacho", icon: Zap },
        { href: "/taller/dashboard?tab=wallet", label: "Billetera Taller", icon: Wallet },
        { href: "/escuela", label: "Escuela Tec", icon: GraduationCap },
        { href: "/configuracion", label: "Configuración", icon: Settings },
      ]
    }

    if (user.role === "technician" || user.role === "reaction_team") {
      const links = [
        { href: "/tecnicos/dashboard", label: "Dashboard", icon: Wrench },
        { href: "/tecnicos/mis-cotizaciones", label: "Cotizaciones", icon: FileText },
        {
          href: "/tecnicos/billetera",
          label: userOrg ? "Billetera (Cupo)" : "Billetera",
          icon: Wallet,
        },
        { href: "/escuela", label: "Escuela Tec", icon: GraduationCap },
      ]
      if (userOrg?.org_role === "manager") {
        links.unshift({ href: "/taller/dashboard", label: "Mi Taller", icon: Building2 })
      }
      links.push({ href: "/configuracion", label: "Configuración", icon: Settings })
      return links
    }

    return [
      { href: "/servicios", label: "Mis Servicios", icon: ClipboardList },
      { href: "/servicios/nuevo", label: "Nuevo Servicio", icon: Shield },
      { href: "/descargar-app", label: "Descargar App", icon: Download },
      { href: "/configuracion", label: "Configuración", icon: Settings },
    ]
  }

  const navLinks = getNavLinks()

  const isLinkActive = (href: string) => {
    const [basePath, qs] = href.split("?")
    if (pathname !== basePath) return false
    if (!qs) {
      return !activeQueryTab
    }
    const targetTab = new URLSearchParams(qs).get("tab")
    return activeQueryTab === targetTab
  }

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
      technician: {
        label: userOrg ? "Técnico de Taller" : "Técnico Certificado",
        color: "bg-emerald-500",
      },
      company_admin: { label: "Taller / Empresa", color: "bg-cyan-600" },
      admin: { label: "Admin", color: "bg-purple-500" },
    }
    const role = roleMap[user.role]
    if (!role) return null
    return (
      <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${role.color}`}>
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
          <div className="hidden lg:flex items-center gap-2">
            {isLanding && !isAuthenticated ? (
              <div className="flex items-center gap-6">
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
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full bg-[#050810]/70 border border-slate-800/80 px-2 py-1">
                {navLinks.map((link) => {
                  const active = isLinkActive(link.href)
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => {
                        const [, qs] = link.href.split("?")
                        setActiveQueryTab(qs ? new URLSearchParams(qs).get("tab") : null)
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all",
                        active
                          ? "bg-[#131B2E] text-[#00F0FF] border border-[#00F0FF]/40 shadow-[0_0_12px_rgba(0,240,255,0.12)]"
                          : isLanding
                            ? "text-[#B4B0C8] hover:text-[#F8FAFC] hover:bg-white/[0.06]"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <link.icon className={cn("h-3.5 w-3.5", active && "text-[#00F0FF]")} />
                      {link.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated && user?.role === "company_admin" && (
              <Link
                href="/taller/dashboard?tab=wallet"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#131B2E] border border-[#00F0FF]/35 text-[11px] font-mono font-bold text-[#00F0FF] hover:border-[#00F0FF] transition-colors"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>TALLER • BONO $200.000</span>
              </Link>
            )}

            {isAuthenticated && user?.role === "technician" && userOrg?.name && (
              <Link
                href="/tecnicos/billetera"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#131B2E] border border-violet-500/35 text-[11px] font-mono font-bold text-[#00F0FF] hover:border-[#00F0FF] transition-colors"
              >
                <Building2 className="h-3.5 w-3.5 text-violet-400" />
                <span className="truncate max-w-[160px]">{userOrg.name}</span>
              </Link>
            )}

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
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="flex items-center justify-between gap-2">
                    <span>Mi Cuenta</span>
                    {getRoleBadge()}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {user?.full_name && <div className="font-medium text-foreground">{user.full_name}</div>}
                    {user?.phone && <div className="text-xs">{maskPhoneNumber(user.phone)}</div>}
                    {user?.email && <div className="text-xs">{user.email}</div>}
                    {userOrg?.name && (
                      <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono font-semibold text-cyan-400">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate max-w-[180px]">{userOrg.name}</span>
                      </div>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  {user?.role === "company_admin" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/taller/dashboard" className="cursor-pointer font-semibold text-cyan-400">
                          <Building2 className="mr-2 h-4 w-4" />
                          Consola de Taller
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/taller/dashboard?tab=team" className="cursor-pointer">
                          <Users className="mr-2 h-4 w-4" />
                          Subcuentas y Cupos
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/taller/dashboard?tab=dispatch" className="cursor-pointer">
                          <Zap className="mr-2 h-4 w-4" />
                          Despacho de Servicios
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/taller/dashboard?tab=wallet" className="cursor-pointer text-emerald-400">
                          <Wallet className="mr-2 h-4 w-4" />
                          Billetera Única ($200.000)
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
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
                      {userOrg?.org_role === "manager" && (
                        <DropdownMenuItem asChild>
                          <Link href="/taller/dashboard" className="cursor-pointer font-semibold text-cyan-400">
                            <Building2 className="mr-2 h-4 w-4" />
                            Consola de Mi Taller
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link href="/tecnicos/dashboard" className="cursor-pointer">
                          <Wrench className="mr-2 h-4 w-4" />
                          Dashboard de Trabajos
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
                          {userOrg ? "Billetera (Cupo de Taller)" : "Billetera"}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/escuela" className="cursor-pointer">
                          <GraduationCap className="mr-2 h-4 w-4" />
                          Escuela Tec360
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
                    {user?.role === "company_admin" && (
                      <div className="mb-2 px-3.5 py-2.5 rounded-xl bg-[#131B2E] border border-[#00F0FF]/30">
                        <div className="text-[10px] font-mono font-bold text-[#00F0FF] uppercase tracking-wider">
                          Cuenta Empresa • Taller
                        </div>
                        <div className="text-xs font-semibold text-slate-200 mt-0.5">
                          Billetera Única + Subcuentas
                        </div>
                      </div>
                    )}
                    {navLinks.map((link) => {
                      const active = isLinkActive(link.href)
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => {
                            const [, qs] = link.href.split("?")
                            setActiveQueryTab(qs ? new URLSearchParams(qs).get("tab") : null)
                            setIsMobileMenuOpen(false)
                          }}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors",
                            active
                              ? "bg-[#131B2E] text-[#00F0FF] border border-[#00F0FF]/40 font-semibold"
                              : isLanding
                                ? "hover:bg-white/[0.06] text-[#F8FAFC]"
                                : "hover:bg-muted/50"
                          )}
                        >
                          <link.icon
                            className={cn(
                              "h-5 w-5",
                              active ? "text-[#00F0FF]" : "text-muted-foreground"
                            )}
                          />
                          {link.label}
                        </Link>
                      )
                    })}
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
