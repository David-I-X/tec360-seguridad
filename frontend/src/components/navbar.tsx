"use client"

import { Button } from "@/components/ui/button"
import { Moon, Sun, LogOut, User } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { maskPhoneNumber } from "@/lib/validations"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Navbar() {
  const { theme, setTheme } = useTheme()
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-lg font-bold text-white">T</span>
          </div>
          <span className="text-xl font-semibold">Tec360</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm font-medium hover:text-blue-600 transition-colors">
            Inicio
          </Link>
          <Link href="/servicios" className="text-sm font-medium hover:text-blue-600 transition-colors">
            Servicios
          </Link>
          <Link href="/tecnicos" className="text-sm font-medium hover:text-blue-600 transition-colors">
            Técnicos
          </Link>
          <Link href="/mapa" className="text-sm font-medium hover:text-blue-600 transition-colors">
            Mapa
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {isAuthenticated ? (
            // Usuario autenticado
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {user?.full_name || maskPhoneNumber(user?.phone || "")}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  {user?.phone && maskPhoneNumber(user.phone)}
                </div>
                {user?.email && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {user.email}
                  </div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/servicios">
                    Mis Servicios
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/servicios/nuevo">
                    Solicitar Servicio
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
            // Usuario no autenticado
            <Link href="/auth/phone">
              <Button className="bg-blue-600 hover:bg-blue-700 font-semibold px-6">
                Comienza ya
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}