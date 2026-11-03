const CACHE = "planberry-v10";
const FILES = [
  "./",
  "index.html",
  "landing.html",
  "login.html",
  "signup.html",
  "account.html",
  "style.css",
  "script.js",
  "auth.js",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(FILES);
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
});

// Tapping a reminder opens (or focuses) Planberry
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (windows) {
      for (const w of windows) {
        if ("focus" in w) return w.focus();
      }
      return self.clients.openWindow("./");
    })
  );
});

self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request);
    })
  );
});