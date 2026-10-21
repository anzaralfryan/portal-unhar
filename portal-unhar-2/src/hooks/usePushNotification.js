import { useEffect, useRef, useState, useCallback } from 'react'
import { pushService } from '../services/services'

/**
 * usePushNotification — Batch 9a
 * Fix: tunggu SW ready dengan timeout, pesan error spesifik Brave/Chrome
 */
export function usePushNotification() {
  const [subscribed,  setSubscribed]  = useState(false)
  const [permission,  setPermission]  = useState('default')
  const [supported,   setSupported]   = useState(false)
  const [swReady,     setSwReady]     = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const registrationRef = useRef(null)

  useEffect(() => {
    const ok = 'serviceWorker' in navigator
             && 'PushManager'  in window
             && 'Notification' in window
    setSupported(ok)
    if (!ok) return

    setPermission(Notification.permission)

    let cancelled = false
    // Timeout 5 detik agar banner tidak menunggu selamanya
    const timeout = setTimeout(() => {
      if (!cancelled) setSwReady(true)
    }, 5000)

    navigator.serviceWorker.ready
      .then(async (reg) => {
        if (cancelled) return
        clearTimeout(timeout)
        registrationRef.current = reg
        setSwReady(true)
        const existing = await reg.pushManager.getSubscription()
        setSubscribed(!!existing)
      })
      .catch(() => {
        clearTimeout(timeout)
        setSwReady(true)
      })

    return () => { cancelled = true; clearTimeout(timeout) }
  }, [])

  const requestPermission = useCallback(async () => {
    if (!supported) return
    setLoading(true)
    setError(null)

    try {
      // Cek apakah di localhost (push butuh HTTPS di production)
      const isLocalhost = ['localhost', '127.0.0.1'].some(h => location.hostname.startsWith(h))
      if (isLocalhost) {
        setError(
          'Push notification hanya bekerja di HTTPS (production). ' +
          'Di localhost/preview, tombol ini tidak bisa diaktifkan. ' +
          'Push akan berfungsi setelah portal di-deploy ke hosting dengan HTTPS.'
        )
        return
      }

      const result = await Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') {
        setError(
          result === 'denied'
            ? 'Izin ditolak. Brave: Settings → Privacy → "Use Google services for push messaging" → ON lalu refresh. Chrome: klik ikon kunci di address bar → Notifications → Allow.'
            : 'Izin notifikasi tidak diberikan.'
        )
        return
      }

      // Ambil VAPID key dari backend
      let vapidKey
      try {
        const keyRes = await pushService.getVapidKey()
        vapidKey = keyRes.data?.public_key
        if (!vapidKey) throw new Error('VAPID key kosong')
      } catch {
        throw new Error('Gagal mengambil konfigurasi notifikasi. Pastikan backend sudah dikonfigurasi.')
      }

      const reg = registrationRef.current || await navigator.serviceWorker.ready
      registrationRef.current = reg

      // Unsubscribe lama jika ada
      const existing = await reg.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      await pushService.subscribe(subscription.toJSON())
      setSubscribed(true)
      setError(null)
    } catch (err) {
      console.error('[Push] Subscribe gagal:', err)
      setError(err.message || 'Gagal mengaktifkan notifikasi. Coba lagi nanti.')
    } finally {
      setLoading(false)
    }
  }, [supported])

  const unsubscribe = useCallback(async () => {
    try {
      const reg = registrationRef.current || await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return
      await sub.unsubscribe()
      await pushService.unsubscribe(sub.endpoint)
      setSubscribed(false)
    } catch (err) {
      console.error('[Push] Unsubscribe gagal:', err)
    }
  }, [])

  return { subscribed, permission, supported, swReady, loading, error, requestPermission, unsubscribe }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
