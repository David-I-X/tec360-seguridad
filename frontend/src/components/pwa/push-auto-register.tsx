"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth-context"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

/**
 * Auto-registers Web Push token when user is authenticated.
 * Mounted globally in the layout so it runs on every page.
 */
export function PushAutoRegister() {
    const { user, isAuthenticated } = useAuth()
    const hasRegistered = useRef(false)

    useEffect(() => {
        if (!isAuthenticated || !user || hasRegistered.current) return

        // Don't run on server
        if (typeof window === "undefined") return
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) {
            console.warn("[PushAutoRegister] Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY")
            return
        }

        // Only attempt if user already granted permission previously
        // (don't prompt — that's done in settings page)
        if (Notification.permission !== "granted") {
            console.log("[PushAutoRegister] Notification permission not granted yet, skipping auto-register")
            return
        }

        const register = async (retryCount = 0) => {
            try {
                const registration = await navigator.serviceWorker.ready
                
                // Check if already subscribed
                let subscription = await registration.pushManager.getSubscription()
                
                if (!subscription) {
                    // Subscribe with VAPID key
                    const convertedKey = urlBase64ToUint8Array(vapidKey)
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: convertedKey,
                    })
                    console.log("[PushAutoRegister] New push subscription created")
                }

                // Send token to backend
                const token = localStorage.getItem("access_token")
                if (!token) return

                // Detect platform for more accurate logging/analytics in backend
                let platform: "web_push" | "pwa_ios" | "pwa_android" = "web_push"
                const ua = window.navigator.userAgent.toLowerCase()
                if (/iphone|ipad|ipod/.test(ua)) {
                    platform = "pwa_ios"
                } else if (/android/.test(ua)) {
                    platform = "pwa_android"
                }

                const subscriptionJson = subscription.toJSON()
                const response = await fetch(`${API_URL}/users/me/push-tokens`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        token: JSON.stringify(subscriptionJson),
                        platform: platform,
                    }),
                })

                if (response.ok) {
                    hasRegistered.current = true
                    console.log("[PushAutoRegister] ✅ Push token registered with backend")
                } else {
                    const err = await response.text()
                    console.error("[PushAutoRegister] ❌ Failed to register token:", response.status, err)
                }
            } catch (error: any) {
                // Push errors (AbortError) are common in local/incognito testing or when FCM is unreachable
                if (retryCount < 3) {
                    const delay = Math.pow(2, retryCount) * 2000
                    console.warn(`[PushAutoRegister] Push error (${error.name}). Reintentando en ${delay}ms...`)
                    setTimeout(() => register(retryCount + 1), delay)
                } else {
                    console.warn("[PushAutoRegister] Omitido: no se pudo registrar web push después de varios reintentos.", error.message || error)
                }
            }
        }

        // Small delay to let SW finish registering
        const timeout = setTimeout(() => register(0), 2000)
        return () => clearTimeout(timeout)
    }, [isAuthenticated, user])

    return null
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding)
        .replace(/\-/g, "+")
        .replace(/_/g, "/")

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}
