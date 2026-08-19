var CACHE = "fieldmarker-v8";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./piexif.js",
  "./jszip.min.js",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE).then(function(cache){ return cache.addAll(ASSETS); })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(event){
  event.respondWith(
    caches.match(event.request).then(function(cached){
      return cached || fetch(event.request).then(function(resp){
        var copy = resp.clone();
        caches.open(CACHE).then(function(cache){ cache.put(event.request, copy); });
        return resp;
      }).catch(function(){ return cached; });
    })
  );
});
