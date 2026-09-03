"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (
            typeof window !== "undefined" &&
            "serviceWorker" in navigator &&
            process.env.NODE_ENV === "production"
        ) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    console.log("SW registered:", registration.scope)

                    // Check for updates immediately on load
                    registration.update()

                    // Check for updates periodically
                    setInterval(() => {
                        registration.update()
                    }, 15 * 60 * 1000)
                })
                .catch((error) => {
                    console.error("SW registration failed:", error)
                })
        }
    }, [])

    return null
}
