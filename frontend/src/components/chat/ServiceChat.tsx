"use client"

import { useEffect, useState, useRef } from "react"
import { Send, MessageSquare } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { fetchWithAuth } from "@/lib/api"
import { serviceWebSocket, WebSocketMessage } from "@/lib/websocket"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
    id: string
    service_id: string
    sender_id: string
    text: string
    created_at: string
    is_read: boolean
}

interface ServiceChatProps {
    serviceId: string
}

export function ServiceChat({ serviceId }: ServiceChatProps) {
    const { user } = useAuth()
    const [token, setToken] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [inputText, setInputText] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setToken(localStorage.getItem("access_token"))
    }, [])

    // Scroll to bottom whenever messages change
    useEffect(() => {
        if (scrollRef.current) {
            const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight
            }
        }
    }, [messages])

    // Load initial messages and mark as read
    useEffect(() => {
        if (!user || !token || !serviceId) return

        const loadMessages = async () => {
            try {
                const data = await fetchWithAuth(`/api/services/${serviceId}/messages?limit=100`)
                if (Array.isArray(data)) {
                    setMessages(data)
                }
                
                // Mark as read
                await fetchWithAuth(`/api/services/${serviceId}/messages/read`, {
                    method: 'POST'
                })
            } catch (error) {
                console.error("Failed to load chat history", error)
            } finally {
                setIsLoading(false)
            }
        }

        loadMessages()
    }, [user, token, serviceId])

    // WebSocket connection
    useEffect(() => {
        if (!user || !token || !serviceId) return

        // Ensure we are connected
        if (!serviceWebSocket.isConnected) {
            serviceWebSocket.connect(serviceId, token)
        }

        const handleMessage = (msg: WebSocketMessage) => {
            if (msg.type === "chat_message") {
                setMessages(prev => {
                    // Check if we already have it to avoid duplicates
                    if (prev.some(m => m.id === msg.data.id)) return prev
                    return [...prev, msg.data]
                })
                
                // If the message is from the other person, mark as read
                if (msg.data.sender_id !== user.id) {
                    fetchWithAuth(`/api/services/${serviceId}/messages/read`, {
                        method: 'POST'
                    }).catch(console.error)
                }
            }
        }

        const unsubscribe = serviceWebSocket.onMessage(handleMessage)

        return () => {
            unsubscribe()
        }
    }, [user, token, serviceId])

    const handleSend = () => {
        if (!inputText.trim()) return

        serviceWebSocket.sendChatMessage(inputText.trim())
        setInputText("")
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-light"></div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4 pb-4">
                    {messages.length === 0 ? (
                        <div className="text-center text-muted-foreground my-8 flex flex-col items-center">
                            <MessageSquare className="h-10 w-10 mb-2 opacity-20" />
                            <p>No hay mensajes aún.</p>
                            <p className="text-sm">Envía el primer mensaje para empezar.</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.sender_id === user?.id
                            
                            return (
                                <div
                                    key={msg.id}
                                    className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto' : 'mr-auto'}`}
                                >
                                    <div
                                        className={`px-4 py-2 rounded-2xl ${
                                            isMe 
                                                ? 'bg-brand text-white rounded-br-sm' 
                                                : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-bl-sm shadow-sm'
                                        }`}
                                    >
                                        <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                    <span className={`text-[10px] text-muted-foreground mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                                        {format(new Date(msg.created_at), "h:mm a", { locale: es })}
                                    </span>
                                </div>
                            )
                        })
                    )}
                </div>
            </ScrollArea>
            
            <div className="p-3 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
                <div className="flex gap-2">
                    <Input
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        className="rounded-full bg-slate-50 dark:bg-slate-900 border-none focus-visible:ring-1 focus-visible:ring-brand"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSend()
                            }
                        }}
                    />
                    <Button 
                        size="icon" 
                        onClick={handleSend}
                        disabled={!inputText.trim()}
                        className="rounded-full h-10 w-10 shrink-0 bg-brand hover:bg-brand-dark"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
