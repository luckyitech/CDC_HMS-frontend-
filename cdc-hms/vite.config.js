import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA — installable + offline app shell.
    // Clinical-safety notes:
    //  • Only the built app shell (same-origin JS/CSS/HTML/icons) is precached.
    //  • The API is a different origin (api.cdiabetescentre.com / :3000 in dev), and
    //    runtimeCaching is empty, so patient data and auth are NEVER cached — they
    //    always hit the network. navigateFallbackDenylist is a belt-and-braces guard.
    //  • autoUpdate keeps deployed versions fresh (activates on next load) so doctors
    //    don't get stuck on a stale build.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'favicon-48.png', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'CDC HMS — Comprehensive Diabetes Centre',
        short_name: 'CDC HMS',
        description: 'Hospital management system for the Comprehensive Diabetes Centre, Nairobi.',
        theme_color: '#0066CC',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [], // never cache API/patient data — always network
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
})
