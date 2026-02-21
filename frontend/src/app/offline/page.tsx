"use client"

import { useEffect } from "react"

export default function OfflinePage() {
    useEffect(() => {
        // Check connectivity periodically
        const interval = setInterval(() => {
            if (navigator.onLine) {
                window.location.href = "/"
            }
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                color: "#e2e8f0",
                fontFamily: "system-ui, -apple-system, sans-serif",
                padding: "2rem",
                textAlign: "center",
            }}
        >
            {/* Icon */}
            <div
                style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: "rgba(6, 182, 212, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1.5rem",
                }}
            >
                <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                    <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
                    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                    <line x1="12" y1="20" x2="12.01" y2="20" />
                </svg>
            </div>

            <h1
                style={{
                    fontSize: "1.75rem",
                    fontWeight: 700,
                    marginBottom: "0.75rem",
                    color: "#f1f5f9",
                }}
            >
                Sin conexión
            </h1>

            <p
                style={{
                    fontSize: "1rem",
                    color: "#94a3b8",
                    maxWidth: 400,
                    lineHeight: 1.6,
                    marginBottom: "2rem",
                }}
            >
                No tienes conexión a internet. Verifica tu Wi-Fi o datos móviles y
                vuelve a intentar.
            </p>

            <button
                onClick={() => window.location.reload()}
                style={{
                    padding: "0.75rem 2rem",
                    background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "0.75rem",
                    fontSize: "1rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    boxShadow: "0 4px 14px rgba(6, 182, 212, 0.3)",
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)"
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(6, 182, 212, 0.4)"
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)"
                    e.currentTarget.style.boxShadow = "0 4px 14px rgba(6, 182, 212, 0.3)"
                }}
            >
                Reintentar conexión
            </button>

            <p
                style={{
                    marginTop: "3rem",
                    fontSize: "0.8rem",
                    color: "#64748b",
                }}
            >
                Tec360 Seguridad — Reconectando automáticamente...
            </p>
        </div>
    )
}
