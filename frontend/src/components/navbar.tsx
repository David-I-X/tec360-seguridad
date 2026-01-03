"use client"

import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"

export function Navbar() {
  const { theme, setTheme } = useTheme()

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
          <Link href="/services" className="text-sm font-medium hover:text-blue-600 transition-colors">
            Servicios
          </Link>
          <Link href="/technicians" className="text-sm font-medium hover:text-blue-600 transition-colors">
            Técnicos
          </Link>
          <Link href="/about" className="text-sm font-medium hover:text-blue-600 transition-colors">
            Nosotros
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

          <Link href="/login">
            <Button variant="ghost" className="hidden sm:inline-flex">
              Iniciar Sesión
            </Button>
          </Link>

          <Link href="/register">
            <Button className="bg-blue-600 hover:bg-blue-700">Registrarse</Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
