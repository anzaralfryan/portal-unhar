import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFetch } from '../hooks/useFetch'
import { notifikasiService, notifikasiServiceDosen, adminService } from '../services/services'
import './AppSidebar.css'
import logo from '../assets/logounhar.webp'

const ICONS = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/></svg>,
  jadwal:    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  nilai:     <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  krs:       <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  elearning: <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L2 8l10 5 10-5-10-5zM2 16l10 5 10-5M2 12l10 5 10-5"/></svg>,
  pembayaran:<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  absensi:   <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>,
  notifikasi:<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  profil:    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  users:     <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  building:  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h6M3 15h6"/></svg>,
  book:      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  calendar2: <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  check2:    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  send:      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  chat:      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  landing:   <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="12" rx="2"/><path d="M3 9h18M9 21h6M12 15v6"/></svg>,
}

const NAV = {
  mahasiswa: [
    ['dashboard','Beranda'],['jadwal','Jadwal'],['nilai','Nilai'],['krs','KRS'],
    ['elearning','E-Learning'],['pembayaran','Pembayaran'],['notifikasi','Notifikasi'],['profil','Profil'],
  ],
  dosen: [
    ['dashboard','Beranda'],['jadwal','Jadwal Mengajar'],['nilai','Input Nilai'],
    ['elearning','E-Learning'],['notifikasi','Notifikasi'],['profil','Profil'],
  ],
  admin: [
    ['dashboard','Beranda'],['mahasiswa','Mahasiswa'],['dosen','Dosen'],
    ['fakultas','Akademik'],
    ['jadwal','Jadwal'],['tahun','Tahun Akademik'],['krs','Verifikasi KRS'],
    ['pembayaran','Pembayaran'],['chat','Live Chat'],['landing','Konten Landing'],['notifikasi','Notifikasi'],['profil','Profil'],
  ],
}

export default function AppSidebar({ isOpen, onToggle }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role, logout } = useAuth()
  const items = NAV[role] || []
  const prefix = `/${role}`
  const active = location.pathname.split('/')[2] || 'dashboard'
  const initials = (user?.name || 'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

  // Polling notifikasi setiap 15 detik — untuk badge unread real-time
  // Polling notifikasi — hanya jika role sudah tersedia
  const notifFn = role === 'mahasiswa' ? notifikasiService.get
                : role === 'dosen'     ? notifikasiServiceDosen.get
                : role === 'admin'     ? adminService.getNotifikasi
                : null

  const { data: notifData } = useFetch(
    // Jika role belum ada atau null, kirim fungsi yang return data kosong (tidak hit API)
    notifFn ? () => notifFn() : () => Promise.resolve({ data: [] }),
    [role],
    { interval: 15000, immediate: !!role }  // jangan fetch jika role belum ada
  )

  // Hitung unread — API notifikasi return { unread: N, list: [...] }
  // useFetch unwrap: res.data.data = { unread, list } → notifData = { unread, list }
  // Prioritas: pakai field `unread` langsung dari response, fallback hitung manual dari list
  const unreadCount = typeof notifData?.unread === 'number'
    ? notifData.unread
    : Array.isArray(notifData?.list)
      ? notifData.list.filter(n => !n.is_read).length
      : Array.isArray(notifData) ? notifData.filter(n => !n.is_read).length
      : 0
  const fotoUrl   = role==='mahasiswa' ? user?.mahasiswa?.foto_url
                  : role==='dosen'     ? user?.dosen?.foto_url
                  : null
  const title = role==='admin'?'Portal Admin':role==='dosen'?'Portal Dosen':'Portal Mahasiswa'
  const subInfo = role==='admin'?'Administrator':role==='dosen'
    ? `${user?.dosen?.prodi || 'Dosen'}${user?.dosen?.nidn ? ' · NIDN '+user.dosen.nidn : (user?.dosen?.nip ? ' · '+user.dosen.nip : '')}`
    : `${user?.mahasiswa?.prodi || 'Mahasiswa'}${user?.mahasiswa?.semester ? ' · Sem '+user.mahasiswa.semester : ''}`

  async function handleLogout() { await logout(); navigate('/login', { replace:true }) }

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <div className="asb-topbar">
        <button className="asb-hamburger" onClick={onToggle} aria-label="Toggle menu navigasi"><span/><span/><span/></button>
        {isOpen && (
          <div className="asb-logo">
            <img src={logo} alt="Logo" className="asb-logo-img"/>
            <div><p className="asb-logo-title">{title}</p><p className="asb-logo-sub">Univ. Harapan Medan</p></div>
          </div>
        )}
      </div>
      {isOpen && (
        <div className="asb-user">
          <div className="asb-avatar" style={{overflow:'hidden',padding:fotoUrl?0:undefined}}>
            {fotoUrl
              ? <img
                  src={fotoUrl}
                  alt={initials}
                  style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}
                  onError={e => {
                    // Foto gagal load — sembunyikan img, tampilkan inisial
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.parentElement.textContent = initials
                  }}
                />
              : initials}
          </div>
          <div className="asb-user-text">
            <p className="asb-user-name">{user?.name || '–'}</p>
            <p className="asb-user-info">{subInfo}</p>
          </div>
        </div>
      )}
      <nav className="asb-nav">
        {isOpen && <p className="asb-nav-label">Menu</p>}
        {items.map(([key,label]) => (
          <button key={key}
            className={`asb-nav-item ${active === key ? 'active' : ''} ${!isOpen ? 'icon-only' : ''}`}
            onClick={() => navigate(`${prefix}/${key}`)} title={!isOpen ? label : ''}
            style={{ position:'relative' }}>
            <span className="asb-nav-icon">{ICONS[role==='admin'?({mahasiswa:'users',dosen:'users',fakultas:'building',prodi:'building',matkul:'book',tahun:'calendar2',krs:'check2',broadcast:'send',landing:'landing'}[key]||key):key]}</span>
            {isOpen && <span className="asb-nav-label-text">{label}</span>}
            {key === 'notifikasi' && unreadCount > 0 && (
              <span style={{
                position:'absolute', top:6, right:isOpen?8:4,
                background:'#e53e3e', color:'#fff',
                fontSize:9, fontWeight:700, lineHeight:1,
                padding:'2px 5px', borderRadius:20,
                minWidth:16, textAlign:'center'
              }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="asb-footer">
        <button className={`asb-logout ${!isOpen ? 'icon-only' : ''}`} onClick={handleLogout} title={!isOpen ? 'Keluar' : ''}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          {isOpen && 'Keluar'}
        </button>
        {isOpen && <p className="asb-footer-copy">© {new Date().getFullYear()} Portal Unhar</p>}
      </div>
    </aside>
  )
}
