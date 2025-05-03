/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope;

import { build, files, version } from '$service-worker';

const CACHE = `cache-${version}`;

// Add critical app files to ASSETS
const ASSETS = [
    ...build, // the app itself
    ...files, // everything in `static`
    '/', // explicitly cache the root route
    '/index', // explicitly cache the index route
];

// Add all critical API endpoints
const DATA_ROUTES = [
    '/index/__data.json',
    '/api/user',
    '/api/settings'
];

self.addEventListener('install', (event) => {
    async function addFilesToCache() {
        const cache = await caches.open(CACHE);
        await Promise.all(
            ASSETS.map(async (asset) => {
                try {
                    await cache.add(asset);
                } catch (error) {
                    console.warn(`Failed to cache asset: ${asset}`, error);
                }
            })
        );
    }
    event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
    async function deleteOldCaches() {
        for (const key of await caches.keys()) {
            if (key !== CACHE) await caches.delete(key);
        }
    }
    event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    async function respond() {
        const url = new URL(event.request.url);
        const cache = await caches.open(CACHE);

        // Check if this is a critical route that needs caching
        const isDataRoute = DATA_ROUTES.some(route => url.pathname.startsWith(route)) || 
                          url.pathname.endsWith('/__data.json');
        const isAssetRoute = ASSETS.some(route => url.pathname.startsWith(route));

        // Try cache first for assets and data routes
        if (isAssetRoute || isDataRoute) {
            const cachedResponse = await cache.match(event.request);
            if (cachedResponse) {
                return cachedResponse;
            }
        }

        try {
            const response = await fetch(event.request);

            // Cache successful responses
            if (response.status === 200) {
                if (isDataRoute || isAssetRoute) {
                    await cache.put(event.request, response.clone());
                }
            }

            return response;
        } catch (err) {
            // Check cache again for failed requests
            const cachedResponse = await cache.match(event.request);
            if (cachedResponse) {
                return cachedResponse;
            }

            // Return offline fallback for data routes
            if (isDataRoute) {
                const fallbackData = {
                    offline: true,
                    user: null,
                    settings: { notifications_enabled: false }
                };

                if (url.pathname === '/api/settings') {
                    return new Response(JSON.stringify({ 
                        offline: true,
                        settings: { notifications_enabled: false }
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                return new Response(JSON.stringify(fallbackData), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // For navigation requests, serve index
            if (event.request.mode === 'navigate') {
                const indexResponse = await cache.match('/');
                if (indexResponse) {
                    return indexResponse;
                }
            }

            // Return a proper error response
            return new Response(JSON.stringify({ error: 'Failed to fetch', offline: true }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    event.respondWith(respond());
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});