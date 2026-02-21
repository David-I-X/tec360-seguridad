"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("Application error:", error)
    }, [error])

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Icon */}
                <div className="mx-auto w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-10 w-10 text-red-500" />
                </div>

                {/* Message */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">
                        Algo salió mal
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Ocurrió un error inesperado. Por favor intenta de nuevo.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Intentar de nuevo
                    </button>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground hover:bg-muted transition-colors font-medium"
                    >
                        <Home className="h-4 w-4" />
                        Ir al inicio
                    </Link>
                </div>

                {/* Error digest for debugging */}
                {error.digest && (
                    <p className="text-xs text-muted-foreground/60">
                        Código: {error.digest}
                    </p>
                )}
            </div>
        </div>
    )
}
