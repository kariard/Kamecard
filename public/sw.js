'use strict'

const CACHE_VERSION = 'v1'
const SHELL_CACHE = 'kamecard-shell-' + CACHE_VERSION
const RUNTIME_CACHE = 'kamecard-runtime-' + CACHE_VERSION
const CACHE_PREFIX = 'kamecard-'
const MAX_RUNTIME_ENTRIES = 60
const APP_ROOT = self.registration.scope
const APP_PATH = new URL(APP_ROOT).pathname
const STATIC_SHELL = [
  new URL('manifest.webmanifest', APP_ROOT).href,
  new URL('icons/icon-192.svg', APP_ROOT).href,
  new URL('icons/icon-512.svg', APP_ROOT).href,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    cacheAppShell().then(() => self.skipWaiting()),
  )
})

async function cacheAppShell() {
  const cache = await caches.open(SHELL_CACHE)
  const pageResponse = await fetch(APP_ROOT, { cache: 'reload' })

  if (!pageResponse.ok) {
    throw new Error('Die App-Hülle konnte nicht geladen werden.')
  }

  const html = await pageResponse.clone().text()
  const discoveredAssets = Array.from(
    html.matchAll(/(?:src|href)=["']([^"'#]+)["']/g),
    (match) => new URL(match[1], APP_ROOT),
  )
    .filter(
      (url) =>
        url.origin === self.location.origin && url.pathname.startsWith(APP_PATH),
    )
    .map((url) => url.href)

  await cache.put(APP_ROOT, pageResponse)
  await cache.addAll(Array.from(new Set([...STATIC_SHELL, ...discoveredAssets])))
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith(CACHE_PREFIX) &&
                cacheName !== SHELL_CACHE &&
                cacheName !== RUNTIME_CACHE,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)
  const belongsToApp =
    url.origin === self.location.origin && url.pathname.startsWith(APP_PATH)

  if (!belongsToApp) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  event.respondWith(cacheFirst(request))
})

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE)

  try {
    const response = await fetch(request)

    if (response.ok) {
      try {
        await cache.put(request, response.clone())
      } catch {
        // Eine volle oder gesperrte Cache-Storage darf den Online-Aufruf nicht stören.
      }
    }

    return response
  } catch {
    const cachedPage =
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match(APP_ROOT))

    if (cachedPage) {
      return cachedPage
    }

    return new Response(
      '<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>KameCard offline</title><body><main><h1>KameCard ist offline</h1><p>Bitte stelle einmal eine Verbindung her und lade die App erneut.</p></main></body></html>',
      {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    )
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request)

  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const response = await fetch(request)

    if (response.ok && response.type === 'basic') {
      await rememberRuntimeResponse(request, response.clone())
    }

    return response
  } catch {
    return Response.error()
  }
}

async function rememberRuntimeResponse(request, response) {
  try {
    const cache = await caches.open(RUNTIME_CACHE)
    await cache.put(request, response)

    const keys = await cache.keys()
    while (keys.length > MAX_RUNTIME_ENTRIES) {
      const oldestRequest = keys.shift()
      if (oldestRequest) {
        await cache.delete(oldestRequest)
      }
    }
  } catch {
    // Offline-Fähigkeit ist eine Ergänzung; Cache-Fehler dürfen die App nicht blockieren.
  }
}
