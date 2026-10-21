import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useFetch } from '../../hooks/useFetch'
import { dosenService, jadwalService } from '../../services/services'
import '../mahasiswa/DashboardPage.css'

const HARI_LABEL = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu']

const MENU_SVG = {
  jadwal:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  nilai:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  elearning: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L2 8l10 5 10-5-10-5zM2 16l10 5 10-5M2 12l10 5 10-5"/></svg>,
  notifikasi:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
}

const MENU = [
  { path:'/dosen/jadwal',    label:'Jadwal Mengajar', sub:'Jadwal kuliah Anda',   iconKey:'jadwal',    grad:'linear-gradient(135deg,#31511E,#5D8736)' },
  { path:'/dosen/nilai',     label:'Input Nilai',     sub:'Input & kelola nilai', iconKey:'nilai',     grad:'linear-gradient(135deg,#5D8736,#859F3D)' },
  { path:'/dosen/elearning', label:'E-Learning',      sub:'Materi, tugas & kuis', iconKey:'elearning', grad:'linear-gradient(135deg,#0A400C,#31511E)' },
  { path:'/dosen/notifikasi',label:'Notifikasi',      sub:'Pemberitahuan',        iconKey:'notifikasi',grad:'linear-gradient(135deg,#e53e3e,#fc8181)' },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: profil } = useFetch(() => dosenService.getProfil(), [])
  const { data: jadwal } = useFetch(() => jadwalService.getDosenJadwal(), [])

  const now  = new Date()
  const tgl  = now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const sapa = now.getHours() < 12 ? 'Selamat pagi' : now.getHours() < 17 ? 'Selamat siang' : 'Selamat malam'
  const nama = profil?.nama || user?.name || 'Dosen'

  const jadwalArr  = Array.isArray(jadwal) ? jadwal : jadwal?.data || []
  const hariNow    = HARI_LABEL[now.getDay() === 0 ? 6 : now.getDay() - 1]
  const matkulUnik = [...new Set(jadwalArr.map(j => j.matkul_id).filter(Boolean))].length

  const jadwalHariIni = useMemo(() =>
    jadwalArr
      .filter(j => (j.hari||'').toLowerCase() === hariNow.toLowerCase())
      .sort((a,b) => (a.jam_mulai||'').localeCompare(b.jam_mulai||'')),
    [jadwalArr, hariNow]
  )

  const nowStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
  const isNow  = (j) => j.jam_mulai <= nowStr && nowStr <= (j.jam_selesai || '23:59')
  const prodi  = profil?.prodi || user?.dosen?.prodi || '–'

  // Jadwal per hari untuk mini barchart
  const jadwalPerHari = HARI_LABEL.slice(0,5).map(h => ({
    hari: h.slice(0,3),
    count: jadwalArr.filter(j => (j.hari||'').toLowerCase() === h.toLowerCase()).length,
  }))
  const maxPerHari = Math.max(...jadwalPerHari.map(d => d.count), 1)

  return (
    <div className="dash-root">
      <div className="dash-hero">
        <div className="dash-hero-ring dash-hero-ring-1"/>
        <div className="dash-hero-ring dash-hero-ring-2"/>
        <div className="dash-hero-accent"/>
        <div className="dash-hero-sparkle"><span/><span/><span/><span/></div>
        <div className="dash-hero-inner">
          <div>
            <p className="dash-hero-tag">Portal Dosen</p>
            <h1 className="dash-hero-greeting">
              {sapa}, {nama.split(' ')[0]}
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:'middle',marginLeft:8,opacity:0.9}}>
                <path d="M18 11V6a2 2 0 00-2-2v0a2 2 0 00-2 2v0M14 10V4a2 2 0 00-2-2v0a2 2 0 00-2 2v0M10 10.5V6a2 2 0 00-2-2v0a2 2 0 00-2 2v4"/>
                <path d="M18 11a2 2 0 114 0v3a8 8 0 01-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 012.83-2.82L7 15"/>
              </svg>
            </h1>
            <p className="dash-hero-date">{tgl}</p>
          </div>
          <div className="dash-hero-chip">{prodi !== '–' ? prodi : 'Dosen'}</div>
        </div>
      </div>

      <div className="dash-content">
        {/* ── Stats Row ── */}
        <div className="bento-row1">
          {/* Mata Kuliah */}
          <div className="bcard bcard--green bcard--tall">
            <p className="bcard-label">Mata Kuliah</p>
            <p className="bcard-big">{matkulUnik || '–'}</p>
            <p className="bcard-sub">MK Diampu</p>
            {/* Mini bar chart jadwal per hari */}
            <div className="dosen-mini-chart">
              {jadwalPerHari.map(d => (
                <div key={d.hari} className="dmc-col">
                  <div className="dmc-bar" style={{ height: d.count > 0 ? `${(d.count/maxPerHari)*100}%` : '4%' }}/>
                  <span className="dmc-lbl">{d.hari}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Total Jadwal */}
          <div className="bcard bcard--blue bcard--tall">
            <p className="bcard-label">Total Jadwal</p>
            <p className="bcard-big">{jadwalArr.length || '–'}</p>
            <p className="bcard-sub">Kelas per minggu</p>
            <div style={{ marginTop:14 }}>
              {jadwalPerHari.filter(d => d.count > 0).map(d => (
                <div key={d.hari} className="dbc-mini-bar" style={{ marginBottom:5 }}>
                  <span className="dbc-mini-bar-label" style={{ textAlign:'left', width:28, color:'rgba(255,255,255,.6)', fontSize:9.5 }}>{d.hari}</span>
                  <div className="dbc-mini-bar-track">
                    <div className="dbc-mini-bar-fill" style={{ width:`${(d.count/maxPerHari)*100}%`, background:'rgba(255,255,255,0.85)' }}/>
                  </div>
                  <span style={{ fontSize:9.5, color:'rgba(255,255,255,.75)', width:12 }}>{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bcard bcard--dark">
            <p className="bcard-label" style={{ color:'rgba(255,255,255,0.55)' }}>Hari Ini</p>
            <p className="bcard-big" style={{ color:'#fff', fontSize:48 }}>{jadwalHariIni.length}</p>
            <p className="bcard-sub" style={{ color:'rgba(255,255,255,0.55)' }}>Kelas hari ini</p>
            <span className="bcard-badge green" style={{ marginTop:8 }}>
              {hariNow}
            </span>
          </div>

          {/* Prodi */}
          <div className="bcard bcard--subtle">
            <p className="bcard-label">Program Studi</p>
            <p style={{ fontFamily:'var(--font-heading)', fontSize:15, fontWeight:800, color:'var(--primary)', lineHeight:1.3, marginBottom:8 }}>
              {prodi}
            </p>
            <p className="bcard-sub" style={{ color:'var(--text3)', fontSize:11.5 }}>
              {profil?.jabatan || user?.dosen?.jabatan || 'Dosen'}
            </p>
            <span className="bcard-badge green" style={{ marginTop:10, color:'var(--primary)', background:'var(--primary-light)' }}>● Aktif</span>
          </div>
        </div>

        {/* ── Row 2 ── */}
        <div className="bento-row2">
          {/* Jadwal Hari Ini */}
          <div className="bcard bcard--white bcard--jadwal">
            <div className="bcard-jadwal-hdr">
              <div>
                <p className="bcard-label" style={{display:'flex',alignItems:'center',gap:6}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  Jadwal Mengajar Hari Ini
                </p>
                <p className="bcard-jadwal-hari">{hariNow}, {now.toLocaleDateString('id-ID',{day:'2-digit',month:'short'})}</p>
              </div>
              <button className="bcard-link" onClick={() => navigate('/dosen/jadwal')}>Semua →</button>
            </div>
            {jadwalHariIni.length === 0 ? (
              <div className="bcard-jadwal-empty"><span></span><p>Tidak ada kelas hari ini</p></div>
            ) : (
              <div className="bcard-jadwal-list">
                {jadwalHariIni.slice(0,4).map((j,i) => {
                  const colors = ['#2563eb','#7c3aed','#059669','#d97706']
                  const color = colors[i % 4]
                  return (
                    <div key={i} className={`dbc-jadwal-item ${isNow(j) ? 'active' : ''}`}>
                      <div className="dbc-jadwal-dot" style={{ background: color }}/>
                      <div className="dbc-jadwal-body">
                        <p className="dbc-jadwal-matkul">
                          {j.matkul?.nama || j.matkul_nama || '–'}
                          {isNow(j) && <span className="dbc-now-badge">Sekarang</span>}
                        </p>
                        <p className="dbc-jadwal-meta">
                          {(j.jam_mulai||'').slice(0,5)} – {(j.jam_selesai||'').slice(0,5)}
                          {j.kelas ? ` · Kelas ${j.kelas}` : ''}
                          {j.ruangan ? ` · ${j.ruangan}` : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Info Akun */}
          <div className="bcard bcard--white bcard--info">
            <p className="bcard-label"> Info Akun</p>
            <div className="bcard-info-grid">
              {[
                ['Nama',   profil?.nama  || user?.name],
                ['NIDN',    profil?.nidn || profil?.nip   || user?.dosen?.nip],
                ['Prodi',  prodi],
                ['Jabatan',profil?.jabatan || user?.dosen?.jabatan],
              ].map(([k,v]) => (
                <div key={k} className="bcard-info-row">
                  <span className="bcard-info-key">{k}</span>
                  <span className="bcard-info-val">{v || '–'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Menu ── */}
        <p className="dash-section-title">Menu Utama</p>
        <div className="bento-menu">
          {MENU.map((m,i) => (
            <div key={m.path}
              className={`bmenu-card ${i === 0 ? 'bmenu-card--wide' : ''}`}
              style={{ background: m.grad }}
              onClick={() => navigate(m.path)}>
              <div className="bmenu-icon">{MENU_SVG[m.iconKey] || null}</div>
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
