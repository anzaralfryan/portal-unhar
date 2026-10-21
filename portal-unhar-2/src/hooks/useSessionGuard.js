import { useState, useEffect, useRef } from 'react'

/**
 * useSessionGuard
 *
 * Hook opsional — mengembalikan sisa waktu (detik) sebelum sesi idle habis.
 * Bisa dipakai komponen manapun untuk menampilkan peringatan "Sesi akan berakhir".
 *
 * Cara pakai:
 *   const { secondsLeft, isWarning } = useSessionGuard()
 *   // isWarning = true saat sisa < 5 menit
 *
 * Catatan: Hook ini hanya menghitung ulang waktu, TIDAK melakukan logout sendiri.
 * Logout sudah ditangani sepenuhnya oleh AuthContext (idle timer + visibility check).
 */

const IDLE_TIMEOUT_MS  = 30 * 60 * 1000  // 30 menit (sama dengan AuthContext)
const WARNING_BEFORE_S = 5  * 60          // tampilkan warning 5 menit sebelum habis

export function useSessionGuard() {
  const [secondsLeft, setSecondsLeft] = useState(IDLE_TIMEOUT_MS / 1000)
  const lastActivityRef = useRef(Date.now())

  /* Reset timestamp saat ada aktivitas */
  useEffect(() => {
    const handleActivity = () => { lastActivityRef.current = Date.now() }
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(ev => window.addEventListener(ev, handleActivity, { passive: true }))
    return () => events.forEach(ev => window.removeEventListener(ev, handleActivity))
  }, [])

  /* Update countdown setiap detik */
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current
      const remaining = Math.max(0, IDLE_TIMEOUT_MS - elapsed)
      setSecondsLeft(Math.floor(remaining / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return {
    secondsLeft,
    isWarning: secondsLeft > 0 && secondsLeft <= WARNING_BEFORE_S,
    isExpired: secondsLeft === 0,
  }
}
