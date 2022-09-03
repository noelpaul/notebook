const version = 1.049;
const staticCacheKey = `shell-assets-version-${version}`;
const dynamicCacheKey = `extra-assets-version-${version}`;
const dynamicCacheLimit = 15;
const shellAssets = [
  "/notebook/",
  "/notebook/react-ui.js",
  "/notebook/app.js",
  "/notebook/index.css",
  "https://unpkg.com/@babel/standalone/babel.min.js",
  "https://unpkg.com/react@17/umd/react.production.min.js",
  "https://unpkg.com/react-dom@17/umd/react-dom.production.min.js",
];

// cache size limit function
const limitCacheSize = (key, size) => {
  return caches.open(key).then((cache) => {
    return cache.keys().then((keys) => {
      if (keys.length > size) {
        return keys
          .filter((key, index) => index >= size)
          .map((key) => cache.delete(key));
      }
    });
  });
};

const clearAllCache = (escape) => {
  return caches.keys().then((keys) => {
    let keysToClear = keys;
    if (escape) {
      keysToClear = keys.filter((key) => !escape.includes(key));
    }
    return Promise.all(
      keysToClear.map(async (key) => await caches.delete(key))
    );
  });
};

const cacheShellAssets = (fresh) => {
  return caches
    .open(staticCacheKey)
    .then((cache) => {
      if (fresh) {
        return Promise.all(
          shellAssets.map(async (url) => {
            return await fetch(new Request(url, { cache: "reload" })).then(
              async (fetchRes) => await cache.put(url, fetchRes.clone())
            );
          })
        );
      } else cache.addAll(shellAssets);
    })
    .catch((error) => {
      console.error(error);
    });
};

const update = () => {
  cacheShellAssets(true).then(() => {
    clearAllCache([staticCacheKey, dynamicCacheKey]);
    self.skipWaiting();
  });
};

// listening for messages
self.addEventListener("message", async (event) => {
  const allClients = await self.clients.matchAll();
  switch (event.data.action) {
    case "update-available": {
      allClients.forEach((client) => {
        client.postMessage(event.data);
      });
      break;
    }
    case "update": {
      update();
      break;
    }
    case "reload-data": {
      allClients.forEach((client) => {
        if (event.source.id === client.id) return;
        client.postMessage(event.data);
      });
      break;
    }
    case "version": {
      allClients.forEach((client) => {
        if (event.source.id === client.id) {
          client.postMessage({ action: "version", version });
        }
      });
      break;
    }
  }
});

// install event
self.addEventListener("install", (event) => {
  console.log("install");
  event.waitUntil(
    caches.keys().then((keys) => {
      if (keys.length === 0) {
        cacheShellAssets();
        return self.skipWaiting();
      }
    })
  );
});

//activate event
self.addEventListener("activate", (event) => {
  console.log("activate");
  event.waitUntil(self.clients.claim());
});

// fetch events
self.addEventListener("fetch", (event) => {
  if (event.request.method != "GET") return;
  if (event.request.cache === "reload") return;

  event.respondWith(
    caches.match(event.request).then((cacheRes) => {
      return (
        cacheRes ||
        fetch(event.request).then((fetchRes) => {
          return caches.open(dynamicCacheKey).then((cache) => {
            cache.put(event.request.url, fetchRes.clone());

            // check cached items size
            limitCacheSize(dynamicCacheKey, dynamicCacheLimit);
            return fetchRes;
          });
        })
      );
    })
  );
});
