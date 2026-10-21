import { useState, useMemo } from 'react'
import { useFetch } from '../../hooks/useFetch'
import { jadwalServiceDosen } from '../../services/services'
import './JadwalPage.css'

const HARI_ORDER = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']

/* 8 palet warna */
const PALETTES = [
  { bg:'#EDE9FE', border:'#7C3AED', text:'#5B21B6', light:'#DDD6FE' },
  { bg:'#DBEAFE', border:'#2563EB', text:'#1D4ED8', light:'#BFDBFE' },
  { bg:'#D1FAE5', border:'#059669', text:'#065F46', light:'#A7F3D0' },
  { bg:'#FEF3C7', border:'#D97706', text:'#92400E', light:'#FDE68A' },
  { bg:'#FCE7F3', border:'#DB2777', text:'#9D174D', light:'#FBCFE8' },
  { bg:'#E0F2FE', border:'#0284C7', text:'#0C4A6E', light:'#BAE6FD' },
  { bg:'#F0FDF4', border:'#16A34A', text:'#14532D', light:'#BBF7D0' },
  { bg:'#FFF7ED', border:'#EA580C', text:'#7C2D12', light:'#FED7AA' },
]
function getPalette(str = '') {
  let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return PALETTES[h % PALETTES.length]
}

function fmtJam(j = '') { return (j||'').substring(0,5) }
function durasi(mulai, selesai) {
  const [hm,mm] = mulai.split(':').map(Number)
  const [hs,ms] = selesai.split(':').map(Number)
  const d = (hs*60+ms) - (hm*60+mm)
  if (d <= 0) return ''
  return d >= 60 ? `${Math.floor(d/60)} jam${d%60 > 0 ? ' '+d%60+'m' : ''}`.trim() : `${d} mnt`
}
function toMin(j='') { const [h,m]=j.split(':').map(Number); return h*60+(m||0) }

/* ── Satu kartu kelas (terinspirasi referensi) ── */
function KelasCard({ j }) {
  const nama  = j.matkul || j.nama_matkul || j.matkul?.nama || '–'
  const kode  = j.kode_matkul || j.matkul?.kode || ''
  const sks   = j.sks || j.matkul?.sks || ''
  const ruang = j.ruang || j.ruangan || '–'
  const kelas = j.kelas_type || j.kelas || ''
  const pal   = getPalette(nama)

  const nowStr = (() => { const n=new Date(); return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}` })()
  const isBerlangsung = fmtJam(j.jam_mulai) <= nowStr && nowStr <= fmtJam(j.jam_selesai)

  return (
    <div className="jdw-kelas-card" style={{ borderLeft:`4px solid ${pal.border}`, background: pal.bg }}>
      {/* Jam & durasi */}
      <div className="jdw-kelas-time-col">
        <span className="jdw-kelas-jam" style={{ color: pal.text }}>{fmtJam(j.jam_mulai)}</span>
        <div className="jdw-kelas-time-line" style={{ background: pal.border }}/>
        <span className="jdw-kelas-jam jdw-kelas-jam--end" style={{ color: pal.text }}>{fmtJam(j.jam_selesai)}</span>
      </div>

      {/* Konten utama */}
      <div className="jdw-kelas-body">
        <div className="jdw-kelas-header">
          <h4 className="jdw-kelas-nama" style={{ color: pal.text }}>{nama}</h4>
          {isBerlangsung && (
            <span className="jdw-kelas-live">
              <span className="jdw-kelas-live-dot"/>
              Berlangsung
            </span>
          )}
        </div>

        {/* Chips info */}
        <div className="jdw-kelas-chips">
          {kode && (
            <span className="jdw-kelas-chip" style={{ background: pal.light, color: pal.text }}>
              {kode}
            </span>
          )}
          {sks && (
            <span className="jdw-kelas-chip" style={{ background: pal.light, color: pal.text }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              {sks} SKS
            </span>
          )}
          {kelas && (
            <span className="jdw-kelas-chip" style={{ background: pal.light, color: pal.text }}>
              Kelas {kelas.charAt(0).toUpperCase()+kelas.slice(1)}
            </span>
          )}
        </div>

        {/* Footer: ruang + mahasiswa */}
        <div className="jdw-kelas-footer">
          <span className="jdw-kelas-meta">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            {ruang}
          </span>
          {j.jumlah_mahasiswa != null && (
            <span className="jdw-kelas-meta">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
              {j.jumlah_mahasiswa} mahasiswa
            </span>
          )}
        </div>
      </div>

      {/* Kolom kanan: ruangan badge besar */}
      <div className="jdw-kelas-ruang-col">
        <span className="jdw-kelas-ruang-badge" style={{ background: pal.border, color:'#fff' }}>
          {ruang}
        </span>
      </div>
    </div>
  )
}

/* ── Grup satu hari ── */
function HariGroup({ hari, items, isToday }) {
  const sorted   = [...items].sort((a,b) => toMin(a.jam_mulai)-toMin(b.jam_mulai))
  const totalSks = items.reduce((s,j) => s+(Number(j.sks||j.matkul?.sks)||0), 0)
  const nowStr   = (() => { const n=new Date(); return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}` })()

  return (
    <div className={`jdw-hari-group ${isToday?'jdw-hari-group--today':''}`}>
      <div className="jdw-hari-hdr">
        <div className="jdw-hari-hdr-left">
          <h3 className="jdw-hari-nama">{hari}</h3>
          {isToday && <span className="jdw-hari-today-badge">Hari Ini</span>}
        </div>
        <div className="jdw-hari-hdr-right">
          {sorted.length > 0 && (
            <span className="jdw-hari-range">
              {fmtJam(sorted[0].jam_mulai)} – {fmtJam(sorted[sorted.length-1].jam_selesai)}
            </span>
          )}
          {totalSks > 0 && <span className="jdw-hari-sks">{totalSks} SKS</span>}
          <span className="jdw-hari-count">{sorted.length} kelas</span>
        </div>
      </div>
      <div className="jdw-hari-cards">
        {sorted.map((j,i) => <KelasCard key={j.id||i} j={j}/>)}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════ */
export default function JadwalPage() {
  const [filterHari, setFilterHari] = useState('Semua')

  const { data, loading, error } = useFetch(() => jadwalServiceDosen.getAll(), [])
  const jadwalArr = Array.isArray(data) ? data : data?.data || []

  const hariIni = new Date().toLocaleDateString('id-ID', { weekday:'long' })
  const hariIniKey = HARI_ORDER.find(h => h.toLowerCase() === hariIni.toLowerCase()) || ''

  const grouped = useMemo(() => {
    const filtered = filterHari==='Semua' ? jadwalArr : jadwalArr.filter(j=>j.hari===filterHari)
    const map = {}
    filtered.forEach(j => {
      const h = j.hari||'Lainnya'
      if (!map[h]) map[h] = []
      map[h].push(j)
    })
    return map
  }, [jadwalArr, filterHari])

  const sortedHari = HARI_ORDER.filter(h => grouped[h]?.length > 0)

  const totalKelas  = jadwalArr.length
  const totalMatkul = [...new Set(jadwalArr.map(j=>j.matkul_id||j.matkul?.id).filter(Boolean))].length
  const totalSksAll = jadwalArr.reduce((s,j)=>s+(Number(j.sks||j.matkul?.sks)||0),0)

  return (
    <div className="page-root">
      {/* ── Panel kiri ── */}
      <div className="page-panel">
        <div className="panel-section">
          <p className="panel-label">Filter Hari</p>
          {['Semua',...HARI_ORDER].map(h => (
            <button key={h}
              className={`panel-nav-btn ${filterHari===h?'active':''}`}
              onClick={() => setFilterHari(h)}>
              <span className="panel-nav-label">{h}</span>
              {h !== 'Semua' && (
                <span className="panel-nav-meta">{jadwalArr.filter(j=>j.hari===h).length||0}</span>
              )}
            </button>
          ))}
        </div>

        <div className="panel-section">
          <p className="panel-label">Ringkasan</p>
          <div className="jdw-summary-v2">
            {[
              { val: totalKelas, lbl: 'Total Kelas', icon: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18' },
              { val: totalMatkul, lbl: 'Mata Kuliah', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
              { val: totalSksAll, lbl: 'Total SKS', icon: 'M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4L12 14.01 9 11.01l-7 7' },
            ].map(({ val, lbl, icon }) => (
              <div key={lbl} className="jdw-sum-v2">
                <div className="jdw-sum-v2-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={icon}/>
                  </svg>
                </div>
                <div>
                  <span className="jdw-sum-val">{val}</span>
                  <span className="jdw-sum-lbl">{lbl}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Konten kanan ── */}
      <div className="page-main">
        <div className="jdw-main-header">
          <div>
            <h2 className="jdw-main-title">Jadwal Mengajar</h2>
            <p className="jdw-main-sub">Jadwal kuliah yang Anda ampu · {totalKelas} kelas per minggu</p>
          </div>
          {hariIniKey && (
            <div className="jdw-today-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Hari ini: {hariIniKey}
            </div>
          )}
        </div>

        <div className="content-body">
          {error && <div className="jdw-error">{error}</div>}
          {loading ? (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {[1,2,3].map(i=><div key={i} className="jdw-skeleton" style={{height:100}}/>)}
            </div>
          ) : sortedHari.length === 0 ? (
            <div className="jdw-empty">
              <div style={{width:60,height:60,borderRadius:16,background:'var(--bg)',border:'1.5px dashed var(--border)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
              </div>
              <p>Tidak ada jadwal{filterHari!=='Semua'?` untuk hari ${filterHari}`:''}.</p>
            </div>
          ) : (
            sortedHari.map(hari => (
              <HariGroup
                key={hari}
                hari={hari}
                items={grouped[hari]}
                isToday={hari === hariIniKey}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
