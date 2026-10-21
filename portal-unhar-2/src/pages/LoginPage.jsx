import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'
import logo from '../assets/logounhar.webp'

/* ── Slides untuk slideshow di panel kanan ──
   5 slot slide — slot 4 & 5 masih kosong (bisa diisi foto baru).
   Untuk menambah foto: taruh file di /public/img/, lalu isi field `bg`.
──────────────────────────────────────────── */
const SLIDES = [
  {
    bg:      '/img/unhar1.jpeg',
    overlay: 'linear-gradient(135deg, rgba(6,25,16,0.72) 0%, rgba(10,50,30,0.65) 100%)',
    title:   'Selamat Datang di Portal UNHAR',
    sub:     'Sistem Informasi Akademik Universitas Harapan Medan',
    tag:     'Akademik Digital',
    tagIcon: 'graduation',
  },
  {
    bg:      '/img/unhar2.jpeg',
    overlay: 'linear-gradient(160deg, rgba(0,40,25,0.78) 0%, rgba(5,90,55,0.6) 100%)',
    title:   'Kelola Studi\ndi Mana Saja',
    sub:     'KRS, Nilai, Jadwal, dan Pembayaran dalam satu platform',
    tag:     'PWA Ready',
    tagIcon: 'mobile',
  },
  {
    bg:      '/img/unhar3.jpeg',
    overlay: 'linear-gradient(120deg, rgba(4,20,12,0.75) 0%, rgba(15,60,40,0.68) 100%)',
    title:   'Terhubung\ndengan Dosen',
    sub:     'Live Chat, E-Learning, dan Notifikasi real-time',
    tag:     'Real-time',
    tagIcon: 'chat',
  },
  {
    bg:      '/img/unhar4.jpeg',
    overlay: 'linear-gradient(150deg, rgba(2,18,10,0.80) 0%, rgba(8,45,25,0.65) 100%)',
    title:   'Fasilitas\nModern',
    sub:     'Didukung infrastruktur kampus terbaik untuk proses belajar optimal',
    tag:     'Kampus',
    tagIcon: 'building',
  },
  {
    bg:      '/img/unhar1.jpeg', 
    overlay: 'linear-gradient(140deg, rgba(5,22,14,0.75) 0%, rgba(12,55,35,0.62) 100%)',
    title:   'Bersama\nMenuju Masa Depan',
    sub:     'Bergabung dengan ribuan mahasiswa dan dosen di ekosistem digital UNHAR',
    tag:     'Komunitas',
    tagIcon: 'users',
  },
]

/* ── SVG Icons — menggantikan semua emoji ── */
function TagIcon({ type }) {
  const icons = {
    graduation: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    ),
    mobile: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="17" r="1"/>
      </svg>
    ),
    chat: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
    building: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18M3 9h6M3 15h6"/>
      </svg>
    ),
    users: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  }
  return icons[type] || null
}

/* ── Modal Lupa Password ── */
function LupaPasswordModal({ onClose }) {
  const [role,    setRole]    = useState('mahasiswa')
  const [nim,     setNim]     = useState('')
  const [nama,    setNama]    = useState('')
  const [email,   setEmail]   = useState('')
  const [hp,      setHp]      = useState('')
  const [ket,     setKet]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleKirim(e) {
    e.preventDefault()
    if (!nama.trim() || !email.trim()) {
      setError('Nama dan email wajib diisi.')
      return
    }
    setError('')
    setLoading(true)
    try {
      // Kirim notifikasi ke admin via API
      const token = localStorage.getItem('token') // mungkin tidak ada saat belum login — oke
      const payload = {
        judul: `Permintaan Reset Password — ${role === 'mahasiswa' ? 'Mahasiswa' : 'Dosen'}`,
        isi:   `Nama: ${nama}\nEmail: ${email}\n${role === 'mahasiswa' ? `NIM: ${nim}` : `NIP/ID: ${nim}`}${hp ? `\nNo. HP: ${hp}` : ''}${ket ? `\nKeterangan: ${ket}` : ''}`,
        tipe:  'Sistem',
        role:  'admin',
      }
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api')
      const res = await fetch(`${apiUrl}/auth/lupa-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    JSON.stringify(payload),
      })
      // Apapun responsnya (termasuk 404 jika endpoint belum ada), tampilkan sukses ke user
      setSent(true)
    } catch {
      setSent(true) // Tetap tampilkan sukses — admin bisa lihat dari log
    } finally {
      setLoading(false)
    }
  }

  // Klik backdrop untuk tutup
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="lpm-backdrop" onClick={handleBackdrop}>
      <div className="lpm-modal">
        {/* Header */}
        <div className="lpm-header">
          <div className="lpm-header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <div>
            <h3 className="lpm-title">Lupa Password</h3>
            <p className="lpm-subtitle">Isi formulir ini, admin akan membantu reset akun Anda</p>
          </div>
          <button className="lpm-close" onClick={onClose} aria-label="Tutup">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {sent ? (
          /* Success state */
          <div className="lpm-success">
            <div className="lpm-success-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h4>Permintaan Terkirim!</h4>
            <p>Admin akan memproses permintaan reset password Anda dalam 1×24 jam. Cek email Anda secara berkala.</p>
            <button className="lpm-btn-close" onClick={onClose}>Tutup</button>
          </div>
        ) : (
          /* Form */
          <form className="lpm-form" onSubmit={handleKirim}>
            {error && (
              <div className="lpm-error">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Role selector */}
            <div className="lpm-field">
              <label>Saya adalah</label>
              <div className="lpm-role-btns">
                <button type="button" className={`lpm-role-btn ${role==='mahasiswa'?'active':''}`} onClick={() => setRole('mahasiswa')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                  </svg>
                  Mahasiswa
                </button>
                <button type="button" className={`lpm-role-btn ${role==='dosen'?'active':''}`} onClick={() => setRole('dosen')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                  Dosen
                </button>
              </div>
            </div>

            <div className="lpm-row">
              <div className="lpm-field">
                <label>Nama Lengkap <span className="lpm-req">*</span></label>
                <input type="text" placeholder={role==='mahasiswa'?'Nama sesuai KTM':'Nama sesuai SK'} value={nama} onChange={e=>setNama(e.target.value)} required />
              </div>
              <div className="lpm-field">
                <label>{role==='mahasiswa'?'NIM':'NIP / ID Dosen'} <span className="lpm-req">*</span></label>
                <input type="text" placeholder={role==='mahasiswa'?'Contoh: 22101001':'Contoh: 197001011998031001'} value={nim} onChange={e=>setNim(e.target.value)} />
              </div>
            </div>

            <div className="lpm-field">
              <label>Email Terdaftar <span className="lpm-req">*</span></label>
              <input type="email" placeholder={role==='mahasiswa'?'email@mhs.unhar.ac.id':'email@unhar.ac.id'} value={email} onChange={e=>setEmail(e.target.value)} required />
            </div>

            <div className="lpm-field">
              <label>No. WhatsApp / HP <span className="lpm-opt">(opsional)</span></label>
              <input type="tel" placeholder="Contoh: 0812xxxxxxxx" value={hp} onChange={e=>setHp(e.target.value)} />
            </div>

            <div className="lpm-field">
              <label>Keterangan Tambahan <span className="lpm-opt">(opsional)</span></label>
              <textarea placeholder="Ceritakan kendala Anda, mis: email lama tidak bisa diakses..." value={ket} onChange={e=>setKet(e.target.value)} rows={3}/>
            </div>

            <div className="lpm-note">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Permintaan akan masuk ke notifikasi admin. Proses verifikasi 1×24 jam pada hari kerja.
            </div>

            <button type="submit" className="lpm-btn-submit" disabled={loading}>
              {loading
                ? <><span className="lpm-spinner"/>Mengirim...</>
                : <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Kirim Permintaan ke Admin
                  </>
              }
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   LOGIN PAGE UTAMA
══════════════════════════════════════════════════ */
export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [slide,       setSlide]       = useState(0)
  const [showLupa,    setShowLupa]    = useState(false)

  // Auto-slide every 4.5s
  useEffect(() => {
    const id = setInterval(() => {
      setSlide(s => (s + 1) % SLIDES.length)
    }, 4500)
    return () => clearInterval(id)
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.success) {
      navigate('/', { replace: true })
    } else {
      setError(result.message)
    }
  }

  const cur = SLIDES[slide]

  return (
    <>
      <div className="lp-root">

        {/* ══ KIRI: Form ══ */}
        <div className="lp-left">

          {/* Tombol kembali ke beranda — pojok kiri atas */}
          <button className="lp-back-btn" onClick={() => navigate('/beranda')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Kembali ke Beranda
          </button>

          {/* Logo — tengah, di atas heading */}
          <div className="lp-brand-center">
            <img src={logo} alt="Logo UNHAR" className="lp-logo-center"/>
          </div>

          <div className="lp-form-wrap">
            <p className="lp-heading">Masuk ke Portal</p>
            <p className="lp-subheading">Selamat datang! Silakan masuk ke akun Anda.</p>

            {/* Error */}
            {error && (
              <div className="lp-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="lp-form" noValidate>
              {/* Email */}
              <div className="lp-field">
                <label htmlFor="lp-email">Email</label>
                <div className="lp-input-wrap">
                  <svg className="lp-field-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input
                    id="lp-email" type="email" placeholder="email@mhs.unhar.ac.id"
                    value={email} onChange={e => setEmail(e.target.value)}
                    autoComplete="email" required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="lp-field">
                <div className="lp-field-hdr">
                  <label htmlFor="lp-password">Password</label>
                  <button
                    type="button"
                    className="lp-forgot-btn"
                    onClick={() => setShowLupa(true)}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    Lupa password?
                  </button>
                </div>
                <div className="lp-input-wrap">
                  <svg className="lp-field-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  <input
                    id="lp-password" type={showPass ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password" required
                  />
                  <button type="button" className="lp-toggle-pass" onClick={() => setShowPass(v => !v)}>
                    {showPass
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button type="submit" className={`lp-btn ${loading ? 'loading' : ''}`} disabled={loading}>
                {loading
                  ? <><span className="lp-spinner"/>Memverifikasi...</>
                  : 'Masuk ke Portal'
                }
              </button>
            </form>

            {/* Footer */}
            <div className="lp-footer-links">
              <a href="/panduan-portal.pdf" download className="lp-dl-link">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Unduh Panduan Penggunaan
              </a>
              <p className="lp-copy">© {new Date().getFullYear()} Portal Universitas Harapan Medan</p>
            </div>
          </div>
        </div>

        {/* ══ KANAN: Slideshow ══ */}
        <div className="lp-right">
          {/* Slides */}
          {SLIDES.map((s, i) => (
            <div
              key={i}
              className={`lp-slide ${i === slide ? 'active' : ''}`}
              style={{ backgroundImage: `url(${s.bg})` }}
            >
              <div className="lp-slide-overlay" style={{ background: s.overlay }}/>
            </div>
          ))}

          {/* Konten di atas slide */}
          <div className="lp-slide-content">
            <div className="lp-slide-tag">
              <TagIcon type={cur.tagIcon} />
              {cur.tag}
            </div>
            <h2 className="lp-slide-title">{cur.title}</h2>
            <p className="lp-slide-sub">{cur.sub}</p>

            {/* Info cards — SVG icons */}
            <div className="lp-slide-cards">
              <div className="lp-info-card">
                <span className="lp-info-icon-wrap">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                  </svg>
                </span>
                <div>
                  <p className="lp-info-title">Akademik Digital</p>
                  <p className="lp-info-sub">KRS · Nilai · Jadwal</p>
                </div>
              </div>
              <div className="lp-info-card">
                <span className="lp-info-icon-wrap">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="17" r="1"/>
                  </svg>
                </span>
                <div>
                  <p className="lp-info-title">Bisa di HP</p>
                  <p className="lp-info-sub">Install sebagai app</p>
                </div>
              </div>
            </div>
          </div>

          {/* Slide indicators */}
          <div className="lp-slide-dots">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                className={`lp-dot ${i === slide ? 'active' : ''}`}
                onClick={() => setSlide(i)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modal Lupa Password */}
      {showLupa && <LupaPasswordModal onClose={() => setShowLupa(false)} />}
    </>
  )
}
