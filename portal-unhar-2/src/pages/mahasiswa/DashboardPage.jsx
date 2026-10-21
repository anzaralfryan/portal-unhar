import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useFetch } from '../../hooks/useFetch'
import { mahasiswaService, nilaiService, pembayaranService, jadwalService } from '../../services/services'
import './DashboardPage.css'

/* ── Konstanta ── */
const SKS_TARGET  = 144   // SKS lulus S1
const IPK_MAX     = 4.00
const HARI_IDX    = { Senin:1, Selasa:2, Rabu:3, Kamis:4, Jumat:5, Sabtu:6, Minggu:0 }
const HARI_LABEL  = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu']

/* ── Ikon menu — JSX element, bukan string ── */
const MENU_ICONS = {
  jadwal:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  nilai:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  krs:       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>,
  elearning: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  pembayaran:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  chat:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
}

const MENU = [
  { path:'/mahasiswa/jadwal',     label:'Jadwal',      sub:'Jadwal kuliah',       iconKey:'jadwal',     grad:'linear-gradient(135deg,#31511E,#5D8736)' },
  { path:'/mahasiswa/nilai',      label:'Nilai',       sub:'Transkrip & IPK',     iconKey:'nilai',      grad:'linear-gradient(135deg,#5D8736,#859F3D)' },
  { path:'/mahasiswa/krs',        label:'KRS',         sub:'Kartu Rencana Studi', iconKey:'krs',        grad:'linear-gradient(135deg,#809D3C,#A9C46C)' },
  { path:'/mahasiswa/elearning',  label:'E-Learning',  sub:'Materi & tugas',      iconKey:'elearning',  grad:'linear-gradient(135deg,#0A400C,#31511E)' },
  { path:'/mahasiswa/pembayaran', label:'Pembayaran',  sub:'Tagihan & riwayat',   iconKey:'pembayaran', grad:'linear-gradient(135deg,#e53e3e,#fc8181)' },
  { path:'/mahasiswa/chat',       label:'Live Chat',   sub:'Chat dengan dosen',   iconKey:'chat',       grad:'linear-gradient(135deg,#859F3D,#A9C46C)' },
]

/* ── SVG Arc Progress (IPK) ── */
function ArcProgress({ value, max = 4, size = 80, stroke = 7 }) {
  const r   = (size - stroke * 2) / 2
  const cx  = size / 2
  const circ = 2 * Math.PI * r
  const pct  = Math.min((value / max), 1)
  const dash = circ * pct
  const gap  = circ - dash
  const startAngle = -140
  const rad  = (startAngle * Math.PI) / 180
  const endAngle = startAngle + 280 * pct
  const endRad = (endAngle * Math.PI) / 180

  // arc path
  const x1 = cx + r * Math.cos(rad)
  const y1 = cx + r * Math.sin(rad)
  const x2 = cx + r * Math.cos(endRad)
  const y2 = cx + r * Math.sin(endRad)
  const large = (280 * pct) > 180 ? 1 : 0

  const bg1x = cx + r * Math.cos(rad)
  const bg1y = cx + r * Math.sin(rad)
  const bg2x = cx + r * Math.cos((-140 + 280) * Math.PI / 180)
  const bg2y = cx + r * Math.sin((-140 + 280) * Math.PI / 180)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow:'visible' }}>
      {/* Track */}
      <path
        d={`M ${bg1x} ${bg1y} A ${r} ${r} 0 1 1 ${bg2x} ${bg2y}`}
        fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={stroke}
        strokeLinecap="round"
      />
      {/* Value arc */}
      {value > 0 && (
        <path
          d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      )}
      <defs>
        <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#a7f3d0"/>
          <stop offset="100%" stopColor="#ffffff"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

/* ── Mini Bar Chart (SKS per semester, approx) ── */
function MiniBar({ value, max, color = '#fff', label }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="dbc-mini-bar">
      <div className="dbc-mini-bar-track">
        <div className="dbc-mini-bar-fill" style={{ width:`${pct}%`, background: color }}/>
      </div>
      <span className="dbc-mini-bar-label">{label}</span>
    </div>
  )
}

/* ── Jadwal Item ── */
function JadwalItem({ j, isNow }) {
  const color = ['#2563eb','#7c3aed','#059669','#d97706','#e53e3e','#0891b2'][
    Math.abs(String(j.matkul?.kode || j.matkul_kode || '').split('').reduce((h,c)=>h*31+c.charCodeAt(0),0)) % 6
  ]
  return (
    <div className={`dbc-jadwal-item ${isNow ? 'active' : ''}`}>
      <div className="dbc-jadwal-dot" style={{ background: color }}/>
      <div className="dbc-jadwal-body">
        <p className="dbc-jadwal-matkul">
          {j.matkul?.nama || j.matkul_nama || j.nama_matkul || '–'}
          {isNow && <span className="dbc-now-badge">Sekarang</span>}
        </p>
        <p className="dbc-jadwal-meta">
          {(j.jam_mulai||'').slice(0,5)} – {(j.jam_selesai||'').slice(0,5)}
          {j.ruangan ? ` · ${j.ruangan}` : ''}
        </p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user }  = useAuth()

  const { data: profil }    = useFetch(() => mahasiswaService.getProfil(), [])
  const { data: nilaiData } = useFetch(() => nilaiService.getAll(), [])
  const { data: bayarData } = useFetch(() => pembayaranService.get(), [])
  const { data: jadwalRaw } = useFetch(() => jadwalService.getMahasiswaJadwal(), [])

  const now  = new Date()
  const tgl  = now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const sapa = now.getHours() < 12 ? 'Selamat pagi' : now.getHours() < 17 ? 'Selamat siang' : 'Selamat malam'
  const nama = profil?.nama || user?.name || 'Mahasiswa'

  const ipk        = parseFloat(nilaiData?.ipk) || 0
  const ipkStr     = nilaiData?.ipk || '–'
  const sksLulus   = parseInt(nilaiData?.sks_lulus) || 0
  const semester   = profil?.semester || user?.mahasiswa?.semester || 1
  const tagihanAktif = bayarData?.tagihan_aktif ? true : false

  // Jadwal hari ini
  const jadwalArr = useMemo(() => {
    const arr = Array.isArray(jadwalRaw) ? jadwalRaw : jadwalRaw?.data || []
    return arr
  }, [jadwalRaw])

  const hariNow = HARI_LABEL[now.getDay() === 0 ? 6 : now.getDay() - 1]
  const jadwalHariIni = useMemo(() =>
    jadwalArr
      .filter(j => (j.hari || '').toLowerCase() === hariNow.toLowerCase())
      .sort((a,b) => (a.jam_mulai||'').localeCompare(b.jam_mulai||'')),
    [jadwalArr, hariNow]
  )

  // Deteksi kelas yang sedang berlangsung
  const nowStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
  const isNow  = (j) => j.jam_mulai <= nowStr && nowStr <= (j.jam_selesai || '23:59')

  // SKS progress
  const sksPct = Math.round(Math.min((sksLulus / SKS_TARGET) * 100, 100))

  return (
    <div className="dash-root">
      {/* ── Hero ── */}
      <div className="dash-hero">
        <div className="dash-hero-ring dash-hero-ring-1"/>
        <div className="dash-hero-ring dash-hero-ring-2"/>
        <div className="dash-hero-accent"/>
        <div className="dash-hero-sparkle"><span/><span/><span/><span/></div>
        <div className="dash-hero-inner">
          <div>
            <p className="dash-hero-tag">Portal Mahasiswa</p>
            <h1 className="dash-hero-greeting">{sapa}, {nama.split(' ')[0]} <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:'middle',marginLeft:8,opacity:0.9}}>
        <path d="M18 11V6a2 2 0 00-2-2v0a2 2 0 00-2 2v0M14 10V4a2 2 0 00-2-2v0a2 2 0 00-2 2v0M10 10.5V6a2 2 0 00-2-2v0a2 2 0 00-2 2v4"/>
        <path d="M18 11a2 2 0 114 0v3a8 8 0 01-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 012.83-2.82L7 15"/>
      </svg></h1>
            <p className="dash-hero-date">{tgl}</p>
          </div>
          <div className="dash-hero-chip">Semester {semester}</div>
        </div>
      </div>

      <div className="dash-content">

        {/* ════ BENTO ROW 1 — Stat Cards ════ */}
        <div className="bento-row1">

          {/* IPK Card — arc progress */}
          <div className="bcard bcard--green bcard--tall">
            <p className="bcard-label">IPK Kumulatif</p>
            <div className="bcard-arc-wrap">
              <ArcProgress value={ipk} max={4}/>
              <div className="bcard-arc-center">
                <p className="bcard-big">{ipkStr}</p>
                <p className="bcard-sub">/ 4.00</p>
              </div>
            </div>
            <div className="bcard-foot">
              <span className={`bcard-badge ${ipk >= 3.5 ? 'green' : ipk >= 3 ? 'yellow' : 'red'}`}>
                {ipk >= 3.5 ? '· Cum Laude' : ipk >= 3 ? '▲ Baik' : ipk > 0 ? '◆ Cukup' : '–'}
              </span>
            </div>
          </div>

          {/* SKS Card — progress bar */}
          <div className="bcard bcard--blue bcard--tall">
            <p className="bcard-label">SKS Ditempuh</p>
            <p className="bcard-big bcard-big--sm">{sksLulus}</p>
            <p className="bcard-sub" style={{ marginBottom:14 }}>dari {SKS_TARGET} SKS target</p>
            <div className="bcard-prog-track">
              <div className="bcard-prog-fill" style={{ width:`${sksPct}%` }}/>
            </div>
            <div className="bcard-prog-labels">
              <span>{sksPct}% selesai</span>
              <span>{SKS_TARGET - sksLulus} SKS lagi</span>
            </div>
            <div className="bcard-mini-bars">
              <MiniBar value={Math.min(sksLulus, 24)} max={24} label="Teori" color="rgba(255,255,255,0.9)"/>
              <MiniBar value={Math.max(sksLulus-24, 0)} max={12} label="Praktik" color="rgba(255,255,255,0.6)"/>
            </div>
          </div>

          {/* Semester Card */}
          <div className="bcard bcard--dark">
            <p className="bcard-label" style={{ color:'rgba(255,255,255,0.55)' }}>Status Akademik</p>
            <p className="bcard-big" style={{ color:'#fff', fontSize:42 }}>Sem {semester}</p>
            <p className="bcard-sub" style={{ color:'rgba(255,255,255,0.55)' }}>
              {profil?.prodi || user?.mahasiswa?.prodi || 'Program Studi'}
            </p>
            <span className="bcard-badge green" style={{ marginTop:8 }}>● Aktif</span>
          </div>

          {/* Tagihan Card */}
          <div className={`bcard ${tagihanAktif ? 'bcard--red' : 'bcard--subtle'}`}>
            <p className="bcard-label">Tagihan</p>
            <p className="bcard-big" style={{ fontSize:40 }}>
              {tagihanAktif
                ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              }
            </p>
            <p className="bcard-sub" style={{ marginBottom:8 }}>
              {tagihanAktif ? 'Ada tagihan aktif' : 'Lunas'}
            </p>
            <button
              className="bcard-action-btn"
              onClick={() => navigate('/mahasiswa/pembayaran')}
            >
              {tagihanAktif ? 'Bayar Sekarang →' : 'Lihat Riwayat →'}
            </button>
          </div>
        </div>

        {/* ════ BENTO ROW 2 — Jadwal + Info ════ */}
        <div className="bento-row2">

          {/* Jadwal Hari Ini */}
          <div className="bcard bcard--white bcard--jadwal">
            <div className="bcard-jadwal-hdr">
              <div>
                <p className="bcard-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      </svg> Jadwal Hari Ini</p>
                <p className="bcard-jadwal-hari">{hariNow}, {now.toLocaleDateString('id-ID', { day:'2-digit', month:'short' })}</p>
              </div>
              <button className="bcard-link" onClick={() => navigate('/mahasiswa/jadwal')}>
                Semua →
              </button>
            </div>
            {jadwalHariIni.length === 0 ? (
              <div className="bcard-jadwal-empty">
                <span className="bcard-jadwal-zero">0</span>
                <p>Tidak ada kelas hari ini</p>
              </div>
            ) : (
              <div className="bcard-jadwal-list">
                {jadwalHariIni.slice(0,4).map((j,i) => (
                  <JadwalItem key={i} j={j} isNow={isNow(j)}/>
                ))}
                {jadwalHariIni.length > 4 && (
                  <p style={{ fontSize:11, color:'var(--text3)', textAlign:'center', marginTop:4 }}>
                    +{jadwalHariIni.length - 4} kelas lainnya
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Info Akun */}
          <div className="bcard bcard--white bcard--info">
            <p className="bcard-label"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg> Info Akun</p>
            <div className="bcard-info-grid">
              {[
                ['Nama',     profil?.nama    || user?.name],
                ['NIM',      profil?.nim     || user?.mahasiswa?.nim],
                ['Prodi',    profil?.prodi   || user?.mahasiswa?.prodi],
                ['Kelas',    profil?.kelas   || user?.mahasiswa?.kelas],
                ['Semester', profil?.semester || user?.mahasiswa?.semester],
              ].map(([k,v]) => (
                <div key={k} className="bcard-info-row">
                  <span className="bcard-info-key">{k}</span>
                  <span className="bcard-info-val">{v || '–'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════ MENU GRID ════ */}
        <p className="dash-section-title">Menu Utama</p>
        <div className="bento-menu">
          {MENU.map((m, i) => (
            <div
              key={m.path}
              className={`bmenu-card ${i === 0 ? 'bmenu-card--wide' : ''}`}
              style={{ background: m.grad }}
              onClick={() => navigate(m.path)}
            >
              <div className="bmenu-icon">{MENU_ICONS[m.iconKey]}</div>
              <div className="bmenu-body">
                <p className="bmenu-label">{m.label}</p>
                <p className="bmenu-sub">{m.sub}</p>
              </div>
              <span className="bmenu-arrow">→</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
