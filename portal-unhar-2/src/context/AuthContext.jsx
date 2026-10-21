import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { authService } from '../services/services'

const AuthContext = createContext(null)

/* ─── Konstanta sesi ──────────────────────────────────────────
   IDLE_TIMEOUT_MS : lama tidak aktif sebelum auto-logout (30 menit)
   SESSION_KEY     : key localStorage untuk waktu kadaluarsa token
──────────────────────────────────────────────────────────── */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000   // 30 menit
const SESSION_KEY     = 'token_expires_at'

/* ── Helper: baca waktu kadaluarsa token ── */
function getTokenExpiry() {
  const raw = localStorage.getItem(SESSION_KEY)
  return raw ? parseInt(raw, 10) : null
}

/* ── Helper: token masih valid secara waktu? ── */
function isTokenFresh() {
  const exp = getTokenExpiry()
  if (!exp) return false
  return Date.now() < exp
}

/* ── Helper: simpan waktu kadaluarsa saat login ── */
function saveTokenExpiry(expiresInSeconds) {
  const expiresAt = Date.now() + expiresInSeconds * 1000
  localStorage.setItem(SESSION_KEY, String(expiresAt))
}

/* ── Helper: hapus semua data sesi dari localStorage ── */
function clearSession() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem(SESSION_KEY)
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [loading, setLoading] = useState(false)
  const [ready,   setReady]   = useState(false)

  /* Ref untuk idle timer — tidak perlu trigger re-render */
  const idleTimerRef = useRef(null)

  /* ── Logout (bisa dipanggil dari mana saja) ── */
  const logout = useCallback(async (callApi = true) => {
    if (callApi) {
      try { await authService.logout() } catch { /* abaikan — token mungkin sudah tidak valid */ }
    }
    clearSession()
    setUser(null)
  }, [])

  /* ── Reset idle timer setiap ada aktivitas user ── */
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      // Idle terlalu lama → logout tanpa panggil API (mungkin token sudah expired)
      logout(false)
    }, IDLE_TIMEOUT_MS)
  }, [logout])

  /* ── Pasang dan lepas event listener untuk idle detection ── */
  useEffect(() => {
    if (!user) return // Hanya aktif saat user sudah login

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(ev => window.addEventListener(ev, resetIdleTimer, { passive: true }))
    resetIdleTimer() // Mulai timer sejak user login

    return () => {
      events.forEach(ev => window.removeEventListener(ev, resetIdleTimer))
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [user, resetIdleTimer])

  /* ── Cek token saat tab kembali aktif (visibility change) ── */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      if (!localStorage.getItem('token')) return

      // Cek apakah token sudah melewati waktu kadaluarsa
      if (!isTokenFresh()) {
        logout(false)
        return
      }

      // Verifikasi ke server (token mungkin di-invalidate dari sisi server)
      authService.me()
        .then(res => setUser(res.data.data))
        .catch(() => logout(false))
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [logout])

  /* ── Cek token tersimpan saat pertama kali app dibuka ── */
  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      setReady(true)
      return
    }

    // Cek apakah token sudah melewati waktu kadaluarsa secara lokal
    if (!isTokenFresh()) {
      clearSession()
      setUser(null)
      setReady(true)
      return
    }

    // Token masih fresh → verifikasi ke server
    authService.me()
      .then(res => setUser(res.data.data))
      .catch(() => {
        clearSession()
        setUser(null)
      })
      .finally(() => setReady(true))
  }, [])

  /* ── Login ── */
  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const res  = await authService.login(email, password)
      const data = res.data.data

      localStorage.setItem('token', data.token)
      localStorage.setItem('user',  JSON.stringify(data.user))
      // Simpan waktu kadaluarsa — backend kirim expires_in dalam detik
      saveTokenExpiry(data.expires_in ?? 86400) // fallback 24 jam jika tidak ada
      setUser(data.user)

      return { success: true, user: data.user }
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Email atau password salah.',
      }
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Update sebagian data user (misal: setelah update profil) ── */
  const updateUser = useCallback((partial) => {
    setUser(prev => {
      const next = { ...prev, ...partial }
      localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }, [])

  const value = {
    user,
    loading,
    ready,
    isLoggedIn:  !!user,
    role:         user?.role || null,
    isMahasiswa:  user?.role === 'mahasiswa',
    isDosen:      user?.role === 'dosen',
    isAdmin:      user?.role === 'admin',
    login,
    logout,
    updateUser,
  }

  // Spinner saat cek token awal
  if (!ready) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100dvh' }}>
      <div style={{ width:32, height:32, border:'3px solid #e8ecf2', borderTopColor:'#5D8736', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider')
  return ctx
}
