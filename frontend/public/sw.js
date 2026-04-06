const CACHE_NAME = "tec360-v1";

// Assets to cache on install
const PRECACHE_ASSETS = [
    "/",
    "/offline",
    "/icons/icon.svg",
    "/manifest.json",
];

// Install — precache critical assets
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate — clean old caches
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

// Fetch — Network First for pages/API, Cache First for static assets
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== "GET") return;

    // Skip cross-origin requests
    if (url.origin !== self.location.origin) return;

    // API calls — Network only (don't cache dynamic data)
    if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) {
        return;
    }

    // Static assets (JS, CSS, images, fonts) — Cache First
    if (
        url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|ico|woff2?|ttf|eot)$/) ||
        url.pathname.startsWith("/_next/static")
    ) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
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

    // Pages — Network First with offline fallback
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Cache successful page responses
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                }
                return response;
            })
            .catch(() => {
                // Try cache, then offline page
                return caches.match(request).then((cached) => {
                    return cached || caches.match("/offline");
                });
            })
    );
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
