import axios from 'axios'

/* ── Base URL ───────────────────────────────────────────────
   Ambil dari .env → VITE_API_URL=http://localhost:8000/api
   Fallback ke localhost jika tidak ada.
─────────────────────────────────────────────────────────── */
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
  timeout: 15000, // 15 detik (upload pakai apiUpload dengan timeout 60s)
})

/* ── Request interceptor — sisipkan JWT token ── */
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

/* ── Response interceptor — tangani error global ── */
api.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status

    // 401 → token expired/invalid → hapus semua data sesi dan redirect ke login
    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('token_expires_at') // bersihkan expiry juga
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api

/* ── Helpers untuk upload file (multipart) ──
   PENTING: jangan set Content-Type manual untuk multipart!
   Axios harus infer sendiri agar boundary parameter ter-include otomatis.
   Kalau di-set 'multipart/form-data' tanpa boundary, server tidak bisa parse $_FILES. */
export function apiUpload(url, formData) {
  return api.post(url, formData, {
    headers: {
      // Override default 'application/json' dengan undefined → axios pakai FormData detection
      'Content-Type': undefined,
    },
    timeout: 60000, // Upload file butuh waktu lebih lama dari request biasa (60 detik)
  })
}

/* ── Format pesan error dari response Laravel ── */
export function getErrorMessage(error) {
  const data = error.response?.data

  console.warn('[API Error]', {
    status: error.response?.status,
    url:    error.config?.url,
    method: error.config?.method,
    data,
    raw:    error.message,
  })

  if (data?.errors) {
    // Validasi Laravel — ambil pesan error pertama
    const firstKey = Object.keys(data.errors)[0]
    return data.errors[firstKey][0]
  }

  if (data?.message) return data.message

  // Network error / timeout — pesan axios mentah
  if (error.code === 'ECONNABORTED') return 'Request timeout. Cek koneksi atau server backend.'
  if (error.message === 'Network Error') return 'Tidak bisa terhubung ke server. Pastikan backend Laravel berjalan.'

  return 'Terjadi kesalahan. Coba lagi.'
}
