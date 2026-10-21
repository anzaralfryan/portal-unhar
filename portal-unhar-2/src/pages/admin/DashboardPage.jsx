import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useFetch } from '../../hooks/useFetch'
import { adminService } from '../../services/services'
import '../mahasiswa/DashboardPage.css'
import './AdminDashboard.css'

const MENU = [
  {
    path:'/admin/mahasiswa', label:'Mahasiswa', sub:'Kelola data mahasiswa',
    d:'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
    iconBg:'#E0F2FE', iconColor:'#1a56db',
  },
  {
    path:'/admin/dosen', label:'Dosen', sub:'Kelola data dosen',
    d:'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8',
    iconBg:'#D1FAE5', iconColor:'#059669',
  },
  {
    path:'/admin/fakultas', label:'Akademik', sub:'Prodi & mata kuliah',
    d:'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    iconBg:'#FEF3C7', iconColor:'#d97706',
  },
  {
    path:'/admin/jadwal', label:'Jadwal', sub:'Atur jadwal kuliah',
    d:'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',
    iconBg:'#EDE9FE', iconColor:'#7c3aed',
  },
  {
    path:'/admin/krs', label:'Verifikasi KRS', sub:'Kelola KRS mahasiswa',
    d:'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
    iconBg:'#ECFDF5', iconColor:'#059669',
  },
  {
    path:'/admin/pembayaran', label:'Pembayaran', sub:'Tagihan & verifikasi',
    d:'M1 4h22v16H1zM1 10h22',
    iconBg:'#FEE2E2', iconColor:'#e53e3e',
  },
  {
    path:'/admin/landing', label:'Konten Landing', sub:'Kelola berita, pengumuman & hero',
    d:'M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM7 14l3-3 2 2 4-4',
    iconBg:'#E0F2FE', iconColor:'#0369a1',
  },
]

function BarChart({ data }) {
  if (!data || data.length === 0) return (
    <div style={{ padding:'24px 0', textAlign:'center', color:'var(--text3)', fontSize:13 }}>
      Belum ada data kunjungan.
    </div>
  )
  const max = Math.max(...data.map(d => d.total), 1)
  return (
    <div className="adm-chart">
      <div className="adm-chart-bars">
        {data.map((d, i) => (
          <div key={i} className="adm-chart-col">
            <div className="adm-chart-bar-wrap">
              <div className="adm-chart-bar-stack" style={{ height:`${(d.total/max)*100}%` }}>
                <div className="adm-bar-dosen" style={{ height:`${d.total>0?(d.dosen/d.total)*100:0}%` }} title={`Dosen: ${d.dosen}`}/>
                <div className="adm-bar-mhs"   style={{ height:`${d.total>0?(d.mahasiswa/d.total)*100:0}%` }} title={`Mahasiswa: ${d.mahasiswa}`}/>
              </div>
              <span className="adm-chart-val">{d.total > 0 ? d.total : ''}</span>
            </div>
            <span className="adm-chart-lbl">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="adm-chart-legend">
        <span className="adm-legend-item"><span className="adm-legend-dot adm-legend-dot--mhs"/>Mahasiswa</span>
        <span className="adm-legend-item"><span className="adm-legend-dot adm-legend-dot--dosen"/>Dosen</span>
      </div>
    </div>
  )
}

function OnlineDot() {
  return <span className="adm-online-dot"><span className="adm-online-dot-inner"/></span>
}

/* ── Daftar nama pengguna online per role ── */
function OnlineUserList({ users, role }) {
  if (!users || users.length === 0) return (
    <p className="adm-online-empty">Tidak ada {role} online</p>
  )
  return (
    <ul className="adm-online-namelist">
      {users.map((u, i) => (
        <li key={u.user_id ?? i} className="adm-online-nameitem">
          <span className="adm-online-avatar">
            {(u.name || '?').charAt(0).toUpperCase()}
          </span>
          <span className="adm-online-username">{u.name}</span>
        </li>
      ))}
    </ul>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  /* ── Polling tick setiap 30 detik ── */
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  /* ── Fetch data dashboard (statistik, KRS, tagihan, grafik) ── */
  const { data, refetch: refetchDash } = useFetch(() => adminService.getDashboard(), [])

  /* ── Fetch data online users (siapa saja yang aktif 5 menit terakhir) ── */
  const { data: onlineData, refetch: refetchOnline } = useFetch(
    () => adminService.getOnlineUsers(), []
  )

  /* Refresh keduanya setiap tick */
  useEffect(() => {
    if (tick > 0) {
      refetchDash()
      refetchOnline()
    }
  }, [tick])

  /* ── State tampilan detail online (collapsed / expanded per role) ── */
  const [showDetail, setShowDetail] = useState(false)

  const now  = new Date()
  const tgl  = now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const sapa = now.getHours() < 12 ? 'Selamat pagi' : now.getHours() < 17 ? 'Selamat siang' : 'Selamat malam'

  /* Data dari dashboard */
  const online      = data?.online_sekarang    ?? 0
  const onlineMhs   = data?.online_mahasiswa   ?? 0
  const onlineDosen = data?.online_dosen       ?? 0
  const onlineAdmin = data?.online_admin       ?? 0
  const kunjHari    = data?.kunjungan_hari_ini  ?? 0
  const kunjBulan   = data?.kunjungan_bulan_ini ?? 0
  const kunjTotal   = data?.kunjungan_total     ?? 0
  const grafik      = data?.grafik_7_hari       ?? []

  /* Data dari online-users endpoint */
  const onlineMhsList   = onlineData?.mahasiswa ?? []
  const onlineDosenList = onlineData?.dosen     ?? []
  const onlineAdminList = onlineData?.admin     ?? []

  return (
    <div className="dash-root">
      {/* ── Hero Banner ── */}
      <div className="dash-hero">
        <div className="dash-hero-ring dash-hero-ring-1" />
        <div className="dash-hero-ring dash-hero-ring-2" />
        <div className="dash-hero-accent" />
        <div className="dash-hero-sparkle"><span/><span/><span/><span/></div>
        <div className="dash-hero-inner">
          <div>
            <p className="dash-hero-tag">Portal Admin</p>
            <h1 className="dash-hero-greeting">
              {sapa}, {(user?.name || 'Admin').split(' ')[0]}
              <span className="dash-hero-wave">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:'middle',marginLeft:8,opacity:0.9}}>
                  <path d="M18 11V6a2 2 0 00-2-2v0a2 2 0 00-2 2v0M14 10V4a2 2 0 00-2-2v0a2 2 0 00-2 2v0M10 10.5V6a2 2 0 00-2-2v0a2 2 0 00-2 2v4"/>
                  <path d="M18 11a2 2 0 114 0v3a8 8 0 01-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 012.83-2.82L7 15"/>
                </svg>
              </span>
            </h1>
            <p className="dash-hero-date">{tgl}</p>
          </div>
          <div className="dash-hero-chip">Administrator</div>
        </div>
      </div>

      <div className="dash-content">
        {/* ── Stat Cards ── */}
        <div className="dash-stats">
          <div className="dash-stat">
            <div className="dash-stat-icon" style={{ background:'#F4FFC3', color:'#5D8736' }}>
              <OnlineDot />
            </div>
            <div className="dash-stat-body">
              <p className="dash-stat-val">{online}</p>
              <p className="dash-stat-lbl">Online Sekarang</p>
            </div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-icon" style={{ background:'#ddeab6', color:'#31511E' }}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
              </svg>
            </div>
            <div className="dash-stat-body">
              <p className="dash-stat-val">{kunjHari.toLocaleString('id-ID')}</p>
              <p className="dash-stat-lbl">Kunjungan Hari Ini</p>
            </div>
          </div>
          <div className={`dash-stat ${(data?.krs_diajukan ?? 0) > 0 ? 'dash-stat--alert' : ''}`}>
            <div className="dash-stat-icon" style={{ background:'#F6FCDF', color:'#809D3C' }}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div className="dash-stat-body">
              <p className="dash-stat-val">{data?.krs_diajukan ?? 0}</p>
              <p className="dash-stat-lbl">KRS Diajukan</p>
            </div>
          </div>
          <div className={`dash-stat ${(data?.tagihan_belum_lunas ?? 0) > 0 ? 'dash-stat--alert' : ''}`}>
            <div className="dash-stat-icon" style={{ background:'#fee2e2', color:'#e53e3e' }}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            </div>
            <div className="dash-stat-body">
              <p className="dash-stat-val">{data?.tagihan_belum_lunas ?? 0}</p>
              <p className="dash-stat-lbl">Tagihan Belum Lunas</p>
            </div>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="dash-grid">
          <div className="dash-col-main">

            {/* ── Online card — dengan daftar nama ── */}
            <div className="adm-online-card">
              <div className="adm-online-hdr">
                <OnlineDot/>
                <h3 className="adm-online-title">Pengguna Online Sekarang</h3>
                <span className="adm-online-refresh">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:3}}>
                    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                  </svg>
                  30s
                </span>
              </div>

              <div className="adm-online-count">{online}</div>

              {/* Breakdown angka per role */}
              <div className="adm-online-breakdown">
                {[['Mahasiswa', onlineMhs], ['Dosen', onlineDosen], ['Admin', onlineAdmin]].map(([lbl, val]) => (
                  <div key={lbl} className="adm-online-role">
                    <span className="adm-role-badge">{val}</span>
                    <span>{lbl}</span>
                  </div>
                ))}
              </div>

              {/* Toggle detail nama */}
              {online > 0 && (
                <button
                  className="adm-online-toggle"
                  onClick={() => setShowDetail(v => !v)}
                >
                  {showDetail ? 'Sembunyikan detail' : 'Lihat siapa yang online'}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ marginLeft:5, transform: showDetail ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              )}

              {/* Panel daftar nama — hanya tampil jika showDetail = true */}
              {showDetail && online > 0 && (
                <div className="adm-online-detail">
                  {onlineMhsList.length > 0 && (
                    <div className="adm-online-group">
                      <p className="adm-online-group-title">Mahasiswa ({onlineMhsList.length})</p>
                      <OnlineUserList users={onlineMhsList} role="mahasiswa" />
                    </div>
                  )}
                  {onlineDosenList.length > 0 && (
                    <div className="adm-online-group">
                      <p className="adm-online-group-title">Dosen ({onlineDosenList.length})</p>
                      <OnlineUserList users={onlineDosenList} role="dosen" />
                    </div>
                  )}
                  {onlineAdminList.length > 0 && (
                    <div className="adm-online-group">
                      <p className="adm-online-group-title">Admin ({onlineAdminList.length})</p>
                      <OnlineUserList users={onlineAdminList} role="admin" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Visit stats */}
            <div className="adm-visit-stats">
              {[
                { type:'today',  val: kunjHari,  lbl:'Hari Ini',   iconD:'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18' },
                { type:'month',  val: kunjBulan, lbl:'Bulan Ini',  iconD:'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18M8 14h8' },
                { type:'total',  val: kunjTotal, lbl:'Total',      iconD:'M18 20V10M12 20V4M6 20v-6' },
              ].map(({ type, val, lbl, iconD }) => (
                <div key={type} className="adm-visit-card">
                  <span className="adm-visit-icon-wrap">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={iconD}/>
                    </svg>
                  </span>
                  <div>
                    <p className="adm-visit-val">{val.toLocaleString('id-ID')}</p>
                    <p className="adm-visit-lbl">{lbl}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="adm-chart-wrap">
              <div className="adm-chart-header">
                <p className="adm-chart-title">Kunjungan 7 Hari Terakhir</p>
                <span className="adm-chart-sub">Kunjungan unik per hari</span>
              </div>
              <BarChart data={grafik}/>
            </div>

            {/* Menu Manajemen */}
            <p className="section-title">Menu Manajemen</p>
            <div className="adm-menu-grid">
              {MENU.map((m) => (
                <div
                  key={m.path}
                  className="adm-menu-card"
                  onClick={() => navigate(m.path)}
                >
                  <div className="adm-menu-icon" style={{ background: m.iconBg, color: m.iconColor }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={m.d}/>
                    </svg>
                  </div>
                  <div className="adm-menu-body">
                    <p className="adm-menu-label">{m.label}</p>
                    <p className="adm-menu-sub">{m.sub}</p>
                  </div>
                  <span className="adm-menu-arrow">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar kanan */}
          <div className="dash-col-side">
            <p className="section-title">Info Akun</p>
            <div className="dash-info-card">
              <div className="dash-info-body">
                {[['Nama', user?.name], ['Email', user?.email], ['Role', 'Administrator']].map(([k,v]) => (
                  <div key={k} className="dash-info-row">
                    <span className="dash-info-key">{k}</span>
                    <span className="dash-info-val">{v || '–'}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="section-title" style={{ marginTop:16 }}>Ringkasan</p>
            <div className="dash-info-card">
              <div className="dash-info-body">
                {[
                  { label:'KRS Diajukan',       val: data?.krs_diajukan        ?? 0, color:'#d97706' },
                  { label:'Tagihan Belum Lunas', val: data?.tagihan_belum_lunas ?? 0, color:'#e53e3e' },
                ].map(r => (
                  <div key={r.label} className="adm-summary-row">
                    <span className="adm-summary-label">{r.label}</span>
                    <span className="adm-summary-val" style={{ color: r.color }}>{r.val}</span>
                  </div>
                ))}
                <div className="adm-summary-row adm-summary-row--stacked">
                  <span className="adm-summary-label">Tahun Akademik Aktif</span>
                  <span className="adm-summary-val adm-summary-val--tahun" style={{ color:'#059669' }}>
                    {data?.tahun_aktif ?? '–'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
