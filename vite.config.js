import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Прокси картинок CDN под тем же origin, чтобы COEP require-corp не блокировал <img>. */
function mediaProxyPlugin() {
  const ALLOWED_HOST = 'tsx.x5static.net'

  function attach(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/api/media-proxy')) {
        return next()
      }
      const urlObj = new URL(req.url, 'http://127.0.0.1')
      const targetStr = urlObj.searchParams.get('url')
      if (!targetStr) {
        res.statusCode = 400
        res.end('Missing url')
        return
      }
      let target
      try {
        target = new URL(targetStr)
      } catch {
        res.statusCode = 400
        res.end('Bad url')
        return
      }
      if (target.hostname !== ALLOWED_HOST || target.protocol !== 'https:') {
        res.statusCode = 403
        res.end('Forbidden')
        return
      }
      try {
        const upstream = await fetch(target.toString(), {
          headers: { Accept: 'image/*,*/*' },
        })
        if (!upstream.ok) {
          res.statusCode = 502
          res.end('Bad gateway')
          return
        }
        const ct = upstream.headers.get('content-type') || 'image/jpeg'
        const ab = await upstream.arrayBuffer()
        res.setHeader('Content-Type', ct)
        res.setHeader('Cache-Control', 'public, max-age=86400')
        res.statusCode = 200
        res.end(Buffer.from(ab))
      } catch {
        res.statusCode = 502
        res.end('Fetch failed')
      }
    })
  }

  return {
    name: 'media-proxy',
    configureServer: attach,
    configurePreviewServer: attach,
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    mediaProxyPlugin(),
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(__dirname, 'node_modules/@biosensesignal/web-sdk/dist/**/*'),
          dest: '.',
          ignore: ['**/main.*'],
        },
      ],
    }),
  ],
  server: {
    host: true, // Разрешить доступ с любых хостов (для ngrok и других туннелей)
    allowedHosts: [
      '.ngrok-free.app',
      '.ngrok.app',
      '.ngrok.io',
      'localhost',
    ],
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
