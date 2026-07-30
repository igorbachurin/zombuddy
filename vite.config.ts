import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor'
        }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.{svg,png}'],
      manifest: {
        name: 'zombuddy — Project Zomboid Run Companion',
        short_name: 'zombuddy',
        description: 'An offline field notebook for solo Project Zomboid runs.',
        theme_color: '#24261e',
        background_color: '#d9d0b8',
        display: 'standalone',
        start_url: '/#dashboard',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true
      },
      devOptions: {
        enabled: true,
        suppressWarnings: true
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: true,
    coverage: {
      reporter: ['text', 'html']
    }
  }
})
