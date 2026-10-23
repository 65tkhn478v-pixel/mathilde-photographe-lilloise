import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const WORKER_DEV_URL = 'http://127.0.0.1:8787'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // En local (npm run dev:full), l'API est servie par `wrangler dev`.
    proxy: {
      '/api': {
        target: WORKER_DEV_URL,
        changeOrigin: true,
        // Le Worker exige que l'en-tête Origin corresponde à son propre hôte
        // (protection CSRF). En local seulement, une requête venant de la page
        // Vite elle-même est présentée comme venant du Worker ; toute autre
        // origine est transmise telle quelle (et refusée).
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (req.headers.origin === `http://${req.headers.host}`) proxyReq.setHeader('Origin', WORKER_DEV_URL)
          })
        },
      },
    },
  },
})
