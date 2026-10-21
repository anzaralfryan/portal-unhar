import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Proteksi route — redirect ke /login jika belum login.
 * Opsional: cek role (roles=['mahasiswa'] → hanya mahasiswa yang boleh masuk).
 */
export default function ProtectedRoute({ children, roles = [] }) {
  const { isLoggedIn, role } = useAuth()

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  if (roles.length > 0 && !roles.includes(role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
