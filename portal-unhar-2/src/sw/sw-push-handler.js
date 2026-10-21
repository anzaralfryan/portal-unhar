/**
 * sw-push-handler.js — Batch 8
 * Handler event PUSH dan NOTIFICATIONCLICK untuk Service Worker.
 *
 * File ini TIDAK di-import langsung — isinya di-copy ke dalam Service Worker
 * yang di-generate oleh vite-plugin-pwa (via injectManifest atau additionalManifestEntries).
 *
 * Cara pakai: lihat PANDUAN.md bagian "Integrasi SW"
 */

// ── Terima push dari server ──────────────────────────────
self.addEventListener('push', (event) => {
  // Jika tidak ada payload, tampilkan notifikasi default
  if (!event.data) {
    event.waitUntil(
      self.registration.showNotification('Portal UNHAR', {
        body: 'Ada pembaruan baru.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
      })
    );
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { judul: 'Portal UNHAR', isi: event.data.text(), url: '/' };
  }

  const options = {
    body:              payload.isi   || 'Ada pembaruan baru.',
    icon:              payload.icon  || '/icon-192.png',
    badge:             '/icon-192.png',
    data:              { url: payload.url || '/' },
    vibrate:           [100, 50, 100],
    requireInteraction: false,
    // Tombol aksi opsional
    actions: [
      { action: 'buka',  title: 'Buka Portal' },
      { action: 'tutup', title: 'Tutup' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.judul || 'Portal UNHAR', options)
  );
});

// ── Klik notifikasi ──────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'tutup') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Kalau portal sudah terbuka di tab — fokus + navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Kalau belum ada tab — buka baru
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ── Background Sync — Offline KRS Draft ─────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-krs-draft') {
    event.waitUntil(syncKrsDraft());
  }
});

async function syncKrsDraft() {
  // Baca draft KRS dari IndexedDB (ditulis oleh usePushNotification hook)
  const db = await openKrsDb();
  const tx = db.transaction('krs_draft', 'readonly');
  const store = tx.objectStore('krs_draft');
  const drafts = await getAllFromStore(store);

  if (!drafts.length) return;

  // Kirim setiap draft ke server
  const token = await getTokenFromDB();
  if (!token) return; // belum login

  const apiBase = self.__API_BASE__ || 'http://localhost:8000/api';
  const failed = [];

  for (const draft of drafts) {
    try {
      const res = await fetch(`${apiBase}/mahasiswa/krs`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept':        'application/json',
        },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      failed.push(draft);
    }
  }

  // Hapus draft yang berhasil dikirim dari IndexedDB
  if (failed.length < drafts.length) {
    const txW = db.transaction('krs_draft', 'readwrite');
    txW.objectStore('krs_draft').clear();
    if (failed.length > 0) {
      for (const f of failed) {
        txW.objectStore('krs_draft').put(f);
      }
    }
  }
}

// Helper IndexedDB
function openKrsDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('portal-krs-db', 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('krs_draft', { keyPath: 'clientId' });
      e.target.result.createObjectStore('auth', { keyPath: 'key' });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror  = (e) => reject(e.target.error);
  });
}
function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror   = () => reject(req.error);
  });
}
async function getTokenFromDB() {
  try {
    const db    = await openKrsDb();
    const tx    = db.transaction('auth', 'readonly');
    const store = tx.objectStore('auth');
    return await new Promise((resolve) => {
      const req = store.get('token');
      req.onsuccess = () => resolve(req.result?.value || null);
      req.onerror   = () => resolve(null);
    });
  } catch { return null; }
}
