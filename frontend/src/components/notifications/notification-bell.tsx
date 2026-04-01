"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    type Notification
} from "@/lib/notifications"
import { useAuth } from "@/lib/auth-context"

export function NotificationBell() {
    const router = useRouter()
    const { user } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Fetch unread count on mount and periodically
    useEffect(() => {
        fetchUnreadCount()
        const interval = setInterval(fetchUnreadCount, 10000) // Every 10 seconds
        return () => clearInterval(interval)
    }, [])

    // Listen for live Push notifications from Service Worker
    useEffect(() => {
        const handleServiceWorkerMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === "PUSH_RECEIVED") {
                // Vibrate for haptic feedback
                if ("vibrate" in navigator) {
                    navigator.vibrate(200)
                }
                // Play notification sound
                try {
                    const audio = new Audio("/notification.mp3")
                    audio.volume = 0.3
                    audio.play().catch(() => {})
                } catch {}
                fetchUnreadCount()
                if (isOpen) {
                    fetchNotifications()
                }
            }
        }
        
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage)
            return () => {
                navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage)
            }
        }
    }, [isOpen])

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const fetchUnreadCount = async () => {
        const count = await getUnreadCount()
        setUnreadCount(count)
    }

    const fetchNotifications = async () => {
        setIsLoading(true)
        const notifs = await getNotifications(15)
        setNotifications(notifs)
        setIsLoading(false)
    }

    const handleToggle = async () => {
        if (!isOpen) {
            await fetchNotifications()
        }
        setIsOpen(!isOpen)
    }

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id)
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
        }

        // Navigate to service — role-aware routing
        if (notification.service_id) {
            const path = user?.role === "technician"
                ? `/tecnicos/servicio/${notification.service_id}`
                : `/servicios/${notification.service_id}`
            router.push(path)
            setIsOpen(false)
        }
    }

    const handleMarkAllRead = async () => {
        await markAllAsRead()
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
    }

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case "service": return "🔔"
            case "status": return "📋"
            case "alert": return "⚠️"
            default: return "ℹ️"
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={handleToggle}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium"
                    >
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </motion.span>
                )}
            </Button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed sm:absolute inset-x-2 sm:inset-x-auto top-16 sm:top-auto sm:right-0 sm:mt-2 sm:w-96 max-w-[calc(100vw-1rem)] bg-background border rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="font-semibold">Notificaciones</h3>
                            {unreadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs"
                                    onClick={handleMarkAllRead}
                                >
                                    <CheckCheck className="h-4 w-4 mr-1" />
                                    Marcar todo leído
                                </Button>
                            )}
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-[400px] overflow-y-auto">
                            {isLoading ? (
                                <div className="flex justify-center items-center p-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No tienes notificaciones</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <motion.div
                                        key={notification.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${!notification.is_read ? "bg-primary/5" : ""
                                            }`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="flex gap-3">
                                            <span className="text-xl">
                                                {getNotificationIcon(notification.notification_type)}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${!notification.is_read ? "font-semibold" : ""}`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {formatDistanceToNow(new Date(notification.created_at), {
                                                        addSuffix: true,
                                                        locale: es
                                                    })}
                                                </p>
                                            </div>
                                            {!notification.is_read && (
                                                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                                            )}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
