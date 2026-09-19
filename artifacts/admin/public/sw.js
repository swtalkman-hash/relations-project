const CACHE = "ounsa-admin-v1";
const SHELL = [
  "/admin/",
  "/admin/index.html",
  "/admin/manifest.webmanifest",
  "/admin/icon-192.png",
  "/admin/icon-512.png",
  "/admin/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => null))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never intercept API calls — always go to network
  if (url.pathname.startsWith("/api/")) return;

  // Network-first for admin JS/CSS bundles (always want fresh)
  if (url.pathname.match(/\.(js|css|ts)$/)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first for static assets (images, fonts)
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|webp|woff2?|ttf)$/)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // For navigation requests → serve cached shell or index.html
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .catch(() =>
          caches.match("/admin/index.html").then((c) => c ?? caches.match("/admin/"))
        )
    );
  }
});
