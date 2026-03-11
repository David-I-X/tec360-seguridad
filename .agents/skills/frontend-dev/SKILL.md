---
name: Frontend Development
description: How to add new pages, components, and features to the Next.js frontend.
---

# Frontend Development

## Adding a New Page

Location: `frontend/src/app/<route>/page.tsx`

Next.js App Router uses folder-based routing. Each folder with a `page.tsx` becomes a route.

```tsx
"use client"

import { ProtectedRoute } from "@/lib/auth-context"

function MyPageContent() {
    return (
        <div className="container pt-24 pb-8 px-4 max-w-4xl">
            <h1 className="text-2xl font-bold">Page Title</h1>
        </div>
    )
}

export default function MyPage() {
    return (
        <ProtectedRoute>
            <MyPageContent />
        </ProtectedRoute>
    )
}
```

> **Important**: Use `pt-24` on the main container to account for the fixed global Navbar (64px = 4rem + padding).

## Adding a New Component

Location: `frontend/src/components/<name>.tsx`

- Use existing UI primitives from `frontend/src/components/ui/` (Button, Badge, GlassCard, etc.)
- Import styles from the design system in `globals.css`
- Use `motion` from `framer-motion` for animations

## Making API Calls

Use the `fetchWithAuth` wrapper from `@/lib/api.ts`:

```typescript
import { fetchWithAuth } from "@/lib/api"

// GET
const data = await fetchWithAuth("/endpoint")

// POST
const result = await fetchWithAuth("/endpoint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
})
```

`fetchWithAuth` automatically:
- Adds the JWT access token
- Handles 401 errors by refreshing the token
- Retries the request after refresh
- Logs out if refresh fails

## Using WebSockets

```typescript
import { serviceWebSocket } from "@/lib/websocket"

// Connect
serviceWebSocket.connect(serviceId, token)

// Listen for messages
const unsubscribe = serviceWebSocket.onMessage((msg) => {
    if (msg.type === "status_update") { /* handle */ }
    if (msg.type === "location_update") { /* handle */ }
})

// Send location (technicians only)
serviceWebSocket.sendLocationUpdate(lat, lng)

// Cleanup
serviceWebSocket.disconnect()
unsubscribe()
```

## Image Compression

Before uploading any image, compress it client-side:

```typescript
function compressImage(file: File, maxWidth = 800, quality = 0.7): Promise<Blob> {
    return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement("canvas")
            const ratio = Math.min(maxWidth / img.width, 1)
            canvas.width = img.width * ratio
            canvas.height = img.height * ratio
            canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
            canvas.toBlob((blob) => resolve(blob!), "image/jpeg", quality)
        }
        img.src = URL.createObjectURL(file)
    })
}
```

## Auth Context

```typescript
import { useAuth } from "@/lib/auth-context"

const { user, isAuthenticated, logout } = useAuth()
// user: { id, phone, email?, full_name?, avatar_url?, role? }
```

## Key Conventions

- All pages are `"use client"` (client-side rendered)
- Protected routes wrap content in `<ProtectedRoute>`
- The `Navbar` is global (rendered in `app/layout.tsx`) — do NOT add it to individual pages
- Use `GlassCard` for card-like containers
- Dark mode is the default theme
- Use Lucide icons (`lucide-react`)
- Responsive: mobile-first, use `md:` and `lg:` breakpoints

## Building

```bash
cd frontend
npm run dev      # Development server on port 3000
npm run build    # Production build (validates TypeScript)
```
