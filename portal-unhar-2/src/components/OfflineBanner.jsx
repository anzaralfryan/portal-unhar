import { useEffect, useState } from 'react'

/**
 * OfflineBanner — banner merah tipis di atas layar saat koneksi hilang,
 * dan banner hijau singkat saat koneksi kembali.
 */
export default function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [justReconnected, setJustReconnected] = useState(false)

  useEffect(() => {
    function handleOnline() {
      setOnline(true)
      setJustReconnected(true)
      setTimeout(() => setJustReconnected(false), 2500)
    }
    function handleOffline() {
      setOnline(false)
      setJustReconnected(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (online && !justReconnected) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 10000,
        padding: '8px 14px',
        background: online ? '#059669' : '#dc2626',
        color: '#fff',
        fontSize: 12.5,
        fontWeight: 600,
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
      {online
        ? '✓ Koneksi kembali. Data akan disegarkan.'
        : '⚠ Kamu sedang offline. Beberapa halaman yang pernah dibuka masih bisa diakses.'}
    </div>
  )
}
