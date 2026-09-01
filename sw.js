const CACHE_VERSION = "hermod-pwa-v3";
const scopeUrl = new URL("./", self.registration.scope);
const coreAssets = [
  scopeUrl.href,
  new URL("manifest.webmanifest", scopeUrl).href,
  new URL("data/model.json", scopeUrl).href,
  new URL("icons/hermod.svg", scopeUrl).href,
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(coreAssets)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(scopeUrl.href, copy));
        return response;
      })
      .catch(() => caches.match(scopeUrl.href)));
    return;
  }

  if (requestUrl.pathname.endsWith("/data/model.json")) {
    event.respondWith(fetch(event.request)
      .then((response) => {
        if (response.ok) caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, response.clone()));
        return response;
      })
      .catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => {
    const network = fetch(event.request).then((response) => {
      if (response.ok) caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, response.clone()));
      return response;
    });
    return cached ?? network;
  }));
});
