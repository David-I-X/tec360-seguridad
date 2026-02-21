import { Shield, Home, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Icon */}
                <div className="mx-auto w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Shield className="h-10 w-10 text-blue-500" />
                </div>

                {/* 404 */}
                <div className="space-y-2">
                    <p className="text-6xl font-bold text-blue-500">404</p>
                    <h1 className="text-2xl font-bold text-foreground">
                        Página no encontrada
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        La página que buscas no existe o fue movida.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
                    >
                        <Home className="h-4 w-4" />
                        Ir al inicio
                    </Link>
                    <Link
                        href="/servicios"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground hover:bg-muted transition-colors font-medium"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Mis Servicios
                    </Link>
                </div>
            </div>
        </div>
    )
}
