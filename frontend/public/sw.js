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
