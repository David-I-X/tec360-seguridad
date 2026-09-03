const CACHE_NAME = "tec360-v2.6.1";

// Assets to cache on install (only static offline shell, NEVER the main page)
const PRECACHE_ASSETS = [
    "/offline",
    "/icons/icon.svg",
    "/manifest.json",
];

// Install — precache critical offline assets
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate — wipe all previous caches to prevent chunk mismatch across builds
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch — Network only for pages and API, Cache for offline shell and icons
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== "GET") return;

    // Skip cross-origin requests
    if (url.origin !== self.location.origin) return;

    // API & Auth calls — Network only (never cache)
    if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth") || url.pathname.startsWith("/ws")) {
        return;
    }

    // HTML Navigation requests — ALWAYS Network First, never store stale HTML in Cache Storage
    if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
        event.respondWith(
            fetch(request).catch(() => {
                return caches.match("/offline");
            })
        );
        return;
    }

    // Static assets (images, icons, offline assets) — Network First, Cache Fallback
    if (url.pathname.startsWith("/_next/static")) {
        // Let browser handle Next.js chunk caching natively via HTTP headers
        return;
    }

    // Other static files (icons, manifest)
    if (url.pathname.match(/\.(png|svg|ico|json)$/)) {
        event.respondWith(
            caches.match(request).then((cached) => {
                return cached || fetch(request).then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }
});

// ============================================
// WEB PUSH NOTIFICATIONS
// ============================================

self.addEventListener("push", (event) => {
    let data = {};
    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch(e) {
        console.warn("Push event data is not JSON");
        data = { title: "Tec360 Seguridad", message: event.data.text() };
    }
    
    const title = data.title || "Notificación de Tec360";
    const options = {
        body: data.message || data.body || "Tienes una nueva actualización",
        icon: "/icons/icon.svg", 
        badge: "/icons/icon.svg",
        data: data,
        vibrate: [100, 50, 100],
    };

    event.waitUntil(
        Promise.all([
            self.registration.showNotification(title, options),
            self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
                for (const client of clientList) {
                    client.postMessage({ type: "PUSH_RECEIVED", notification: data });
                }
            })
        ])
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    
    // Define target URL from notification payload or default to index
    const urlToOpen = event.notification.data?.service_id 
        ? `/servicios/${event.notification.data.service_id}`
        : "/servicios";

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
            // Focus if open
            const matchingClient = windowClients.find((c) => {
                return c.url === new URL(urlToOpen, self.location.origin).href;
            });
            if (matchingClient) {
                return matchingClient.focus();
            }
            // Open new window otherwise
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});
