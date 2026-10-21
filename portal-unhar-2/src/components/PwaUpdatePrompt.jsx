import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

/**
 * PwaUpdatePrompt — banner muncul di bawah saat ada versi aplikasi baru yang
 * sudah siap aktif (Service Worker fase "waiting"). User bisa tekan "Muat Ulang"
 * untuk aktifkan versi baru.
 *
 * Juga mendaftarkan event 'offline-ready' → toast hijau singkat.
 */
export default function PwaUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const [updateSW, setUpdateSW] = useState(() => () => {})

  useEffect(() => {
    // Register SW lewat virtual module dari vite-plugin-pwa
    const update = registerSW({
      onNeedRefresh() { setNeedRefresh(true) },
      onOfflineReady() {
        setOfflineReady(true)
        setTimeout(() => setOfflineReady(false), 3500)
      },
      onRegisterError(err) {
        // eslint-disable-next-line no-console
        console.warn('SW register error:', err)
      },
    })
    setUpdateSW(() => update)
  }, [])

  function handleReload() {
    updateSW(true)    // skipWaiting + reload page
  }
  function handleClose() {
    setNeedRefresh(false)
  }

  return (
    <>
      {offlineReady && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          background: '#0F9E7B', color: '#fff', padding: '10px 16px',
          borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
        }}>
          ✓ Aplikasi siap digunakan offline
        </div>
      )}

      {needRefresh && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: '#1a3d33', color: '#fff',
          padding: '12px 16px', borderRadius: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', gap: 12,
          maxWidth: 'calc(100vw - 32px)', minWidth: 300,
        }}>
          <span style={{ fontSize: 18 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg></span>
          <div style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>
            <strong style={{ display: 'block' }}>Versi baru tersedia</strong>
            <span style={{ opacity: 0.85, fontSize: 11 }}>Muat ulang untuk memakai versi terbaru.</span>
          </div>
          <button onClick={handleReload} style={{
            background: '#5DCAA5', color: '#0a2d22', border: 'none',
            padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
            Muat Ulang
          </button>
          <button onClick={handleClose} aria-label="Tutup" style={{
            background: 'transparent', border: 'none', color: '#fff',
            fontSize: 18, cursor: 'pointer', padding: 0, width: 24, height: 24, opacity: 0.7,
          }}>
            ×
          </button>
        </div>
      )}
    </>
  )
}
