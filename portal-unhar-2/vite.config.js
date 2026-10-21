import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // ── Strategi injectManifest ─────────────────────────────────────────
      // Kita tulis SW sendiri (src/sw.js) — Workbox hanya menyuntikkan
      // daftar precache (self.__WB_MANIFEST) ke dalamnya saat build.
      strategies  : 'injectManifest',
      srcDir      : 'src',
      filename    : 'sw.js',

      // SW didaftarkan otomatis oleh plugin (via virtual:pwa-register di PwaUpdatePrompt)
      registerType   : 'prompt',
      injectRegister : false,

      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'web-app-manifest-192x192.png',
        'web-app-manifest-512x512.png',
        'offline.html',
        'icon-192.png',
        'icon-512.png',
      ],

      manifest: {
        name       : 'Portal Universitas Harapan Medan',
        short_name : 'Portal UNHAR',
        description: 'Sistem Informasi Akademik Terpadu Universitas Harapan Medan — KRS, Nilai, Jadwal, E-Learning, Pembayaran.',
        start_url  : '/',
        scope      : '/',
        display    : 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color     : '#5D8736',
        lang       : 'id',
        categories : ['education', 'productivity'],
        icons: [
          { src: '/icon-192.png',                 sizes: '192x192', type: 'image/png', purpose: 'any'      },
          { src: '/icon-512.png',                 sizes: '512x512', type: 'image/png', purpose: 'any'      },
          { src: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-512-maskable.png',        sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [
          {
            src: '/icon-512.png',
            type: 'image/png',
            sizes: '512x512',
            form_factor: 'narrow', 
            label: 'Dashboard Mahasiswa',
          },
          // Tambahkan ini:
          {
            src: '/icon-512.png',
            type: 'image/png',
            sizes: '512x512',
            form_factor: 'wide', 
            label: 'Dashboard Mahasiswa Desktop',
          },
      ],
      },

      // ── Dev mode: aktifkan SW saat npm run dev ────────────────────────
      // Penting untuk testing fitur PWA tanpa perlu build dulu.
      devOptions: {
        enabled   : true,
        type      : 'module',
        navigateFallback: '/',
      },

      // injectManifest config — tentukan file mana yang di-precache
      injectManifest: {
        // Glob patterns file yang masuk precache list
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // Exclude sw.js sendiri dari precache
        globIgnores : ['sw.js', 'workbox-*.js'],
      },
    }),
  ],

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react'  : ['react', 'react-dom', 'react-router-dom'],
          'vendor-axios'  : ['axios'],
          'vendor-workbox': ['workbox-window'],
        },
      },
    },
    target              : 'es2017',
    minify              : 'terser',
    terserOptions       : { compress: { drop_console: true, drop_debugger: true } },
    chunkSizeWarningLimit: 600,
  },

  server : {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://portal-api.test',
        changeOrigin: true,
        // portal-api.test butuh Host header yang sesuai (Laragon virtual host)
        headers: { Host: 'portal-api.test' },
      },
    },
  },
  preview: {
    port: 4173,
    host: true,
    // Izinkan akses dari IP LAN (HP di WiFi yang sama) saat testing
    // npm run preview secara lokal. Tidak berpengaruh di hosting produksi,
    // karena di produksi file dist/ di-serve langsung oleh web server
    // (Apache/Nginx hosting), bukan oleh perintah ini.
    allowedHosts: 'all',
    proxy: {
      // Teruskan semua request /api/* ke backend Laravel lokal (Laragon)
      // saat testing npm run preview di komputer sendiri.
      '/api': {
        target: 'http://portal-api.test',
        changeOrigin: true,
        headers: { Host: 'portal-api.test' },
      },
    },
  },
})
