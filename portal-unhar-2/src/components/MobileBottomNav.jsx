import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// 5 tab di bawah — 4 utama + "Lainnya" (drawer)
const MAIN_TABS = [
  { key:'dashboard',  label:'Beranda',    icon:'home'     },
  { key:'jadwal',     label:'Jadwal',     icon:'calendar' },
  { key:'krs',        label:'KRS',        icon:'book'     },
  { key:'elearning',  label:'E-Learning', icon:'graduate' },
]

// Sisanya masuk drawer "Lainnya"
const MORE_TABS = [
  { key:'nilai',      label:'Nilai',      icon:'star'   },
  { key:'pembayaran', label:'Pembayaran', icon:'wallet' },
  { key:'notifikasi', label:'Notifikasi', icon:'bell'   },
  { key:'profil',     label:'Profil',     icon:'user'   },
]

const ICON = {
  home:     <svg viewBox="0 0 24 24"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>,
  calendar: <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  book:     <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  graduate: <svg viewBox="0 0 24 24"><path d="M12 3L2 8l10 5 10-5-10-5zM2 16l10 5 10-5M2 12l10 5 10-5"/></svg>,
  more:     <svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>,
  star:     <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  wallet:   <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  bell:     <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  user:     <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  logout:   <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
}

export default function MobileBottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const active = location.pathname.split('/')[2] || 'dashboard'

  // "Lainnya" tampil active jika page aktif ada di MORE_TABS
  const moreActive = MORE_TABS.some(t => t.key === active)

  function go(key) {
    setDrawerOpen(false)
    navigate(`/mahasiswa/${key}`)
  }

  function handleLogout() {
    setDrawerOpen(false)
    if (confirm('Yakin ingin keluar dari portal?')) logout()
  }

  return (
    <>
      <nav className="mobile-bottomnav" role="navigation" aria-label="Menu utama">
        {MAIN_TABS.map(t => (
          <button
            key={t.key}
            className={`mobile-bn-btn ${active === t.key ? 'active' : ''}`}
            onClick={() => go(t.key)}
            aria-label={t.label}
            aria-current={active === t.key ? 'page' : undefined}>
            {ICON[t.icon]}
            <span>{t.label}</span>
          </button>
        ))}
        <button
          className={`mobile-bn-btn ${moreActive ? 'active' : ''}`}
          onClick={() => setDrawerOpen(true)}
          aria-label="Menu Lainnya"
          aria-haspopup="true"
          aria-expanded={drawerOpen}>
          {ICON.more}
          <span>Lainnya</span>
        </button>
      </nav>

      {drawerOpen && (
        <div className="mobile-drawer-bg" onClick={() => setDrawerOpen(false)}>
          <div className="mobile-drawer" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="mobile-drawer-handle" />
            <p className="mobile-drawer-title">Menu Lainnya</p>
            {MORE_TABS.map(t => (
              <button
                key={t.key}
                className={`mobile-drawer-item ${active === t.key ? 'active' : ''}`}
                onClick={() => go(t.key)}>
                {ICON[t.icon]}
                <span>{t.label}</span>
              </button>
            ))}
            <button className="mobile-drawer-item mobile-drawer-logout" onClick={handleLogout}>
              {ICON.logout}
              <span>Keluar</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
