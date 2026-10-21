import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logounhar.png'

/**
 * MobileTopBar — fixed di atas layar untuk mahasiswa mobile.
 * Logo + nama portal di kiri, avatar → profil di kanan.
 */
export default function MobileTopBar() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const initials = (user?.name || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const fotoUrl = user?.mahasiswa?.foto_url

  return (
    <header className="mobile-topbar" role="banner">
      <div className="mobile-topbar-brand">
        <img src={logo} alt="UNHAR" className="mobile-topbar-logo" />
        <span className="mobile-topbar-title">Portal UNHAR</span>
      </div>
      <button
        className="mobile-topbar-avatar"
        onClick={() => navigate('/mahasiswa/profil')}
        aria-label="Buka Profil">
        {fotoUrl
          ? <img src={fotoUrl} alt="Foto profil" />
          : initials}
      </button>
    </header>
  )
}
