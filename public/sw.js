const CACHE_NAME = "mukkit-map-shell-v3";
const ASSET_VERSION = "20260512";

const CORE_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  `/mukkit-logo-character.png?v=${ASSET_VERSION}`,
  `/mukkit-logo-character-white.png?v=${ASSET_VERSION}`,
  `/mukkit-logo-horizontal.png?v=${ASSET_VERSION}`,
  `/mukkit-logo-horizontal-white.png?v=${ASSET_VERSION}`
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const dynamicPaths = ["/api/", "/auth", "/invite", "/projects"];
  if (dynamicPaths.some((path) => url.pathname.startsWith(path))) return;

  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request).then((cached) => cached || caches.match("/"))
    )
  );
});
