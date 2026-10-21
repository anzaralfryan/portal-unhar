import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RoleRedirect() {
  const { isLoggedIn, role } = useAuth()
  // Belum login → tampilkan landing page
  if (!isLoggedIn) return <Navigate to="/beranda" replace />
  // Sudah login → arahkan ke dashboard sesuai role
  if (role === 'mahasiswa') return <Navigate to="/mahasiswa/dashboard" replace />
  if (role === 'dosen')     return <Navigate to="/dosen/dashboard" replace />
  if (role === 'admin')     return <Navigate to="/admin/dashboard" replace />
  return <Navigate to="/beranda" replace />
}
