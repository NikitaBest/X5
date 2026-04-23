/* eslint-disable no-restricted-globals */
// COI Service Worker: добавляет COOP/COEP к same-origin ответам.
// Нужен как fallback, когда серверные заголовки не применились (например, в некоторых WebView).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status === 0) return response

        const reqUrl = new URL(event.request.url)
        if (reqUrl.origin !== self.location.origin) return response

        const newHeaders = new Headers(response.headers)
        newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp')
        newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin')

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        })
      })
      .catch((error) => {
        console.error('COOP/COEP SW Error:', error)
        return fetch(event.request)
      }),
  )
})
