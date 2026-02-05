import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
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
