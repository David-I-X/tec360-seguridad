"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Moon, Sun, LogOut, User, Menu, X, Shield, Wrench, FileText, Bell, Home, ClipboardList, Settings, Download, Wallet } from "lucide-react"
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

export function Navbar() {
  const { theme, setTheme } = useTheme()
  const { user, isAuthenticated, logout } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // UX #12: Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Role-based navigation links
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
        { href: "/descargar-app", label: "Descargar App", icon: Download },
        { href: "/configuracion", label: "Configuración", icon: Settings },
      ]
    }

    // Client
    return [
      { href: "/servicios", label: "Mis Servicios", icon: ClipboardList },
      { href: "/servicios/nuevo", label: "Nuevo Servicio", icon: Shield },
      { href: "/descargar-app", label: "Descargar App", icon: Download },
      { href: "/configuracion", label: "Configuración", icon: Settings },
    ]
  }

  const navLinks = getNavLinks()

  // User initials for avatar
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
          "sticky top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "border-b border-border bg-background/90 backdrop-blur-xl shadow-sm"
            : "border-b border-transparent bg-background/50 backdrop-blur-md"
        )}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-none">Tec360</span>
              <span className="text-[10px] text-muted-foreground leading-none mt-0.5">Seguridad</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-all"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            {isAuthenticated && <NotificationBell />}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full h-9 w-9"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {isAuthenticated ? (
              /* User Menu */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 pl-2 pr-3 h-9">
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
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer">
                          <Shield className="mr-2 h-4 w-4 outline-none" />
                          Panel de Control
                        </Link>
                      </DropdownMenuItem>
                    </>
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
            ) : (
              /* Auth Buttons */
              <Link href="/login">
                <Button className="gradient-brand hover:opacity-90 font-semibold px-5 h-9 text-sm text-white shadow-lg shadow-blue-500/20">
                  Iniciar Sesión
                </Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              key="panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed top-16 right-0 z-40 w-64 h-[calc(100vh-4rem)] bg-background border-l border-border shadow-xl md:hidden"
            >
              <div className="flex flex-col p-4 gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <link.icon className="h-5 w-5 text-muted-foreground" />
                    {link.label}
                  </Link>
                ))}
                <div className="border-t border-border mt-3 pt-3">
                  {!isAuthenticated && (
                    <Link
                      href="/login"
                      className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-blue-500"
                    >
                      <User className="h-5 w-5" />
                      Iniciar Sesión
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}