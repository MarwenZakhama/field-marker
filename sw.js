var VERSION = "v12";
var CACHE = "fieldmarker-" + VERSION;
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
    caches.open(CACHE).then(function(cache){
      // cache: "reload" forces these to come from the network rather than
      // the browser's own HTTP cache — without it an updated index.html can
      // get re-cached as the old stale copy.
      return Promise.all(ASSETS.map(function(url){
        return fetch(new Request(url, { cache: "reload" }))
          .then(function(resp){ return cache.put(url, resp); })
          .catch(function(){ /* keep installing even if one asset fails */ });
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; })
        .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

// Let the page ask what version is running, and ask us to activate at once.
self.addEventListener("message", function(event){
  if(!event.data) return;
  if(event.data.type === "GET_VERSION" && event.source){
    event.source.postMessage({ type: "VERSION", version: VERSION });
  }
  if(event.data.type === "SKIP_WAITING"){
    self.skipWaiting();
  }
});

self.addEventListener("fetch", function(event){
  var req = event.request;
  if(req.method !== "GET") return;

  var url = new URL(req.url);
  var isHTML = req.mode === "navigate" ||
    (req.headers.get("accept") || "").indexOf("text/html") !== -1 ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("index.html");

  if(isHTML){
    // Network-first for the page itself: when there's any connection the
    // newest version always wins, so an update can never get stuck behind
    // a stale cached copy. Falls back to cache instantly when offline,
    // which is the whole point of the app.
    event.respondWith(
      fetch(new Request(req, { cache: "no-cache" })).then(function(resp){
        var copy = resp.clone();
        caches.open(CACHE).then(function(cache){ cache.put(req, copy); });
        return resp;
      }).catch(function(){
        return caches.match(req).then(function(cached){
          return cached || caches.match("./index.html");
        });
      })
    );
    return;
  }

  // Cache-first for the static libraries and icons — these only change
  // when the cache version changes, so serving them instantly is correct.
  event.respondWith(
    caches.match(req).then(function(cached){
      return cached || fetch(req).then(function(resp){
        var copy = resp.clone();
        caches.open(CACHE).then(function(cache){ cache.put(req, copy); });
        return resp;
      }).catch(function(){ return cached; });
    })
  );
});
