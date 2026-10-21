/**
 * sw.js — Service Worker Kustom Portal UNHAR
 * =============================================
 * Strategi: injectManifest (vite-plugin-pwa)
 *
 * File ini di-build oleh Workbox:
 * - self.__WB_MANIFEST = daftar aset yang di-precache (diisi otomatis saat build)
 * - import workbox-* berjalan saat build (di-bundle oleh Rollup)
 *
 * Fitur:
 * 1. Precaching semua aset statis (JS, CSS, HTML, gambar)
 * 2. Runtime caching: API NetworkFirst, gambar CacheFirst
 * 3. Offline fallback ke /offline.html
 * 4. Web Push Notification handler
 * 5. Background Sync untuk KRS draft
 */

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute }                                     from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate }                     from 'workbox-strategies'
import { ExpirationPlugin }                                                   from 'workbox-expiration'
import { CacheableResponsePlugin }                                            from 'workbox-cacheable-response'

// ── 1. Precache semua aset build (diisi otomatis oleh Workbox saat build) ──
precacheAndRoute(self.__WB_MANIFEST)

// Hapus cache versi lama
cleanupOutdatedCaches()

// ── 2. Offline fallback untuk navigasi SPA ─────────────────────────────────
// Semua request navigasi (GET halaman) dilayani dari cache index.html (SPA shell)
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    // Jangan intercept aset statis
    denylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
  })
)

// ── 3. Runtime caching API — NetworkFirst ──────────────────────────────────
// Data dari API selalu coba ambil dari network, fallback ke cache jika offline
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache-v1',
    networkTimeoutSeconds: 8,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
)

// ── 4. Runtime caching gambar — CacheFirst ─────────────────────────────────
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
)

// ── 5. Runtime caching font Google ─────────────────────────────────────────
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-v1',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
)

// ── 6. Skip waiting — aktif segera saat ada update ─────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ── 7. Web Push Notification ───────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) {
    event.waitUntil(
      self.registration.showNotification('Portal UNHAR', {
        body : 'Ada pembaruan baru.',
        icon : '/icon-192.png',
        badge: '/icon-192.png',
      })
    )
    return
  }

  let payload
  try   { payload = event.data.json() }
  catch { payload = { judul: 'Portal UNHAR', isi: event.data.text(), url: '/' } }

  event.waitUntil(
    self.registration.showNotification(payload.judul || 'Portal UNHAR', {
      body              : payload.isi  || 'Ada pembaruan baru.',
      icon              : payload.icon || '/icon-192.png',
      badge             : '/icon-192.png',
      data              : { url: payload.url || '/' },
      vibrate           : [100, 50, 100],
      requireInteraction: false,
      tag               : payload.tag || 'portal-notif',   // cegah notif ganda
      actions           : [
        { action: 'buka',  title: 'Buka Portal' },
        { action: 'tutup', title: 'Tutup'        },
      ],
    })
  )
})

// ── 8. Klik notifikasi ─────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'tutup') return

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Kalau ada tab yang sudah buka portal — fokus ke sana
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(targetUrl)
          return
        }
      }
      // Tidak ada tab terbuka — buka tab baru
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

// ── 9. Background Sync — Offline KRS Draft ─────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-krs-draft') {
    event.waitUntil(syncKrsDraft())
  }
})

async function syncKrsDraft() {
  const token = await getTokenFromDB()
  if (!token) return

  const db     = await openPortalDB()
  const drafts = await getAllFromStore(db, 'krs_draft')
  if (!drafts.length) return

  // Fix Revbatch 9 (Bug 2):
  // URL API tidak boleh hardcoded 'http://localhost:8000/api' karena service worker
  // selalu berjalan di origin yang sama dengan frontend yang meregistrasinya.
  // Gunakan self.location.origin agar background sync otomatis menyesuaikan
  // environment (localhost, staging, atau domain produksi).
  // PENTING: ini mengasumsikan frontend & backend di-deploy 1 origin yang sama
  // (Laravel serve React build, atau reverse-proxy /api ke Laravel). Kalau
  // backend dipisah ke subdomain sendiri (api.domainkamu.com), baris ini
  // perlu diubah supaya tidak menembak origin frontend.
  const apiBase = self.location.origin + '/api'
  const failed  = []

  for (const draft of drafts) {
    try {
      const res = await fetch(`${apiBase}/mahasiswa/krs/matkul`, {
        method : 'POST',
        headers: {
          'Content-Type' : 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept'       : 'application/json',
        },
        body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch {
      failed.push(draft)
    }
  }

  // Hapus yang berhasil, simpan yang gagal
  const tx = db.transaction('krs_draft', 'readwrite')
  tx.objectStore('krs_draft').clear()
  for (const f of failed) tx.objectStore('krs_draft').put(f)
}

// ── Helper IndexedDB ──────────────────────────────────────────────────────
function openPortalDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('portal-unhar-db', 1)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('krs_draft')) {
        db.createObjectStore('krs_draft', { keyPath: 'clientId' })
      }
      if (!db.objectStoreNames.contains('auth')) {
        db.createObjectStore('auth', { keyPath: 'key' })
      }
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror   = (e) => reject(e.target.error)
  })
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror   = () => reject(req.error)
  })
}

async function getTokenFromDB() {
  try {
    const db = await openPortalDB()
    return await new Promise((resolve) => {
      const tx  = db.transaction('auth', 'readonly')
      const req = tx.objectStore('auth').get('token')
      req.onsuccess = () => resolve(req.result?.value || null)
      req.onerror   = () => resolve(null)
    })
  } catch { return null }
}
