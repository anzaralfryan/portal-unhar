import { useEffect, useState } from 'react'

/**
 * PwaInstallPrompt — menampilkan tombol "Install App" saat browser
 * mendeteksi aplikasi bisa di-install (event `beforeinstallprompt`).
 *
 * Tombol disembunyikan otomatis kalau:
 *  - User sudah install (app dijalankan dalam mode standalone)
 *  - User sudah menolak (disimpan di localStorage)
 *  - Browser tidak dukung
 */
export default function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [dismissed, setDismissed] = useState(
    typeof window !== 'undefined' && localStorage.getItem('pwa-install-dismissed') === '1'
  )

  useEffect(() => {
    // Jangan tampilkan kalau sudah dalam mode standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    if (isStandalone) return

    function onBeforeInstall(e) {
      e.preventDefault()
      setDeferred(e)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    function onInstalled() {
      setDeferred(null)
      localStorage.setItem('pwa-install-dismissed', '1')
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function handleInstall() {
    if (!deferred) return
    deferred.prompt()
    try {
      const choice = await deferred.userChoice
      if (choice.outcome === 'dismissed') {
        localStorage.setItem('pwa-install-dismissed', '1')
        setDismissed(true)
      }
    } catch { /* ignore */ }
    setDeferred(null)
  }

  function handleDismiss() {
    localStorage.setItem('pwa-install-dismissed', '1')
    setDismissed(true)
    setDeferred(null)
  }

  if (!deferred || dismissed) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9998,
      background: '#ffffff',
      borderRadius: 14,
      boxShadow: '0 10px 32px rgba(0,0,0,0.18)',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      maxWidth: 'calc(100vw - 32px)',
      minWidth: 280,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, background: '#0F9E7B',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 18, flexShrink: 0,
      }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1a3d33' }}>
          Install Portal UNHAR
        </p>
        <p style={{ margin: 0, fontSize: 11, color: '#6b7b73', marginTop: 1 }}>
          Akses lebih cepat dari home screen
        </p>
      </div>
      <button
        onClick={handleInstall}
        style={{
          background: '#0F9E7B', color: '#fff', border: 'none',
          padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', flexShrink: 0,
        }}>
        Install
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Tutup"
        style={{
          background: 'transparent', border: 'none', color: '#8ba198',
          fontSize: 18, cursor: 'pointer', padding: 0, width: 24, height: 24, flexShrink: 0,
        }}>
        ×
      </button>
    </div>
  )
}
