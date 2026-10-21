import { useState } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import { useFetch, useSubmit } from '../../hooks/useFetch'
import { jadwalServiceDosen, absensiServiceDosen } from '../../services/services'
import './AbsensiPage.css'

// Status enum persis dari backend schema (migration):
// hadir | absen | izin | sakit | online | belum
const STATUS_OPTIONS = [
  { v:'hadir',  l:'Hadir'  },
  { v:'absen',  l:'Absen'  },
  { v:'izin',   l:'Izin'   },
  { v:'sakit',  l:'Sakit'  },
  { v:'online', l:'Online' },
  { v:'belum',  l:'Belum'  },
]

function todayISO() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export default function AbsensiPage() {
  const [selJadwal,    setSelJadwal]    = useState(null)
  const [selPertemuan, setSelPertemuan] = useState(null)
  const [showBuka,     setShowBuka]     = useState(false)
  const [formBuka,     setFormBuka]     = useState({ tanggal: todayISO(), topik:'', dosen_masuk: true })
  const [toast,        setToast]        = useState(null)
  const [toastErr,     setToastErr]     = useState(false)

  // Jadwal dosen
  const { data: jadwalData, loading: loadJ } = useFetch(() => jadwalServiceDosen.getAll(), [])
  const jadwalArr = Array.isArray(jadwalData) ? jadwalData : jadwalData?.data || []

  // Absensi per jadwal
  const { data: absensiData, loading: loadA, refetch } = useFetch(
    () => selJadwal ? absensiServiceDosen.get(selJadwal.id) : Promise.resolve({ data: null }),
    [selJadwal?.id],
    { immediate: !!selJadwal }
  )
  // Backend return: { pertemuan: [{pertemuan, tanggal, topik, dosen_masuk, mahasiswa: [...] }] }
  const pertemuanList = absensiData?.pertemuan || []

  function showToast(msg, err = false) {
    setToast(msg); setToastErr(err)
    setTimeout(() => setToast(null), 2800)
  }

  // Buka pertemuan baru
  const { submit: bukaPertemuan, loading: opening } = useSubmit(
    (payload) => absensiServiceDosen.bukaPertemuan(selJadwal.id, payload),
    {
      onSuccess: (res) => {
        refetch()
        setShowBuka(false)
        setFormBuka({ tanggal: todayISO(), topik:'', dosen_masuk: true })
        setSelPertemuan(res?.pertemuan || null)
        showToast(res?.message || 'Pertemuan dibuka')
      },
      onError: (m) => showToast(m, true),
    }
  )

  // Update status absensi per mahasiswa
  const { submit: updateStatus } = useSubmit(
    ({ absensiId, status }) => absensiServiceDosen.updateStatus(absensiId, status),
    {
      onSuccess: () => refetch(),
      onError: (m) => showToast(m, true),
    }
  )

  // Currently selected pertemuan data (key = pertemuan number)
  const activePertemuan = pertemuanList.find(p => p.pertemuan === selPertemuan) || null
  const mahasiswaAbsensi = activePertemuan?.mahasiswa || []

  // Rekap summary
  const rekapHadir = mahasiswaAbsensi.filter(a => ['hadir','online'].includes(a.status)).length
  const rekapTotal = mahasiswaAbsensi.length

  return (
    <div className="page-root">
      {/* Panel: pilih jadwal */}
      <div className="page-panel">
        <div className="panel-section" style={{ flex:1 }}>
          <p className="panel-label">Mata Kuliah</p>
          {loadJ ? [1,2,3].map(i => <div key={i} className="abs-skeleton" style={{ marginBottom:6 }}/>) :
            jadwalArr.length === 0 ? <p style={{ fontSize:12, color:'var(--text3)' }}>Tidak ada jadwal.</p> :
            jadwalArr.map(j => (
              <button key={j.id}
                className={`panel-nav-btn ${selJadwal?.id === j.id ? 'active' : ''}`}
                onClick={() => { setSelJadwal(j); setSelPertemuan(null); setShowBuka(false) }}>
                <div style={{ flex:1 }}>
                  <span className="panel-nav-label">{j.matkul || '–'}</span>
                  <span style={{ display:'block', fontSize:10, color:'var(--text3)', marginTop:1 }}>
                    {j.hari} · Kelas {j.kelas_type || '–'}
                  </span>
                </div>
              </button>
            ))
          }
        </div>
      </div>

      {/* Main */}
      <div className="page-main">
        <PageHeader title="Absensi" subtitle="Kelola kehadiran mahasiswa per pertemuan"/>
        <div className="content-body">
          {toast && (
            <div style={{
              background: toastErr ? 'var(--red)' : 'var(--teal)',
              color:'#fff', padding:'10px 14px', borderRadius:8, marginBottom:12,
              fontSize:13, fontWeight:600
            }}>{toast}</div>
          )}

          {!selJadwal ? (
            <div className="abs-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
              <p>Pilih mata kuliah di panel kiri untuk mengelola absensi.</p>
            </div>
          ) : (
            <>
              {/* Action bar */}
              <div className="abs-action-bar">
                <h2 className="abs-matkul-title">{selJadwal.matkul || '–'}</h2>
                <button className="el-add-btn" onClick={() => setShowBuka(v => !v)}>
                  {showBuka ? 'Batal' : '+ Buka Pertemuan Baru'}
                </button>
              </div>

              {showBuka && (
                <div className="el-form-card">
                  <p style={{ fontSize:12, color:'var(--text3)', marginBottom:12 }}>
                    Sistem otomatis mengisi list mahasiswa dari KRS yang sudah dikunci Admin. Anda tinggal mengatur hadir/absen masing-masing mahasiswa setelah pertemuan dibuka.
                  </p>
                  <div className="el-form-row">
                    <label>Tanggal</label>
                    <input type="date" value={formBuka.tanggal}
                      onChange={e => setFormBuka(p => ({...p, tanggal: e.target.value}))}
                      className="el-input" style={{ width:180 }}/>
                  </div>
                  <div className="el-form-row">
                    <label>Topik / Materi</label>
                    <input type="text" value={formBuka.topik}
                      onChange={e => setFormBuka(p => ({...p, topik: e.target.value}))}
                      placeholder="Contoh: Flexbox dan Grid CSS" className="el-input"/>
                  </div>
                  <div className="el-form-row">
                    <label>Status Dosen</label>
                    <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:500 }}>
                      <input type="checkbox" checked={formBuka.dosen_masuk}
                        onChange={e => setFormBuka(p => ({...p, dosen_masuk: e.target.checked}))}/>
                      Saya (dosen) hadir di pertemuan ini
                    </label>
                  </div>
                  {!formBuka.dosen_masuk && (
                    <p style={{ fontSize:11, color:'var(--amber)', padding:'8px 10px', background:'#fef3c7', borderRadius:6, marginTop:6 }}>
                      ℹ Karena Anda tidak hadir, sistem akan mengirim notifikasi ke mahasiswa agar mereka bisa absen online sendiri.
                    </p>
                  )}
                  <button className="el-submit-btn" onClick={() => bukaPertemuan(formBuka)} disabled={opening || !formBuka.tanggal}>
                    {opening ? 'Membuka...' : 'Buka Pertemuan'}
                  </button>
                </div>
              )}

              {loadA ? (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[1,2,3].map(i => <div key={i} className="abs-skeleton" style={{ height:56 }}/>)}
                </div>
              ) : pertemuanList.length === 0 ? (
                <p className="el-empty-text" style={{ padding:30, textAlign:'center', color:'var(--text3)' }}>
                  Belum ada pertemuan. Buka pertemuan baru untuk mulai absensi.
                </p>
              ) : (
                <div className="abs-layout">
                  {/* Daftar pertemuan */}
                  <div className="abs-pertemuan-list">
                    <p className="panel-label" style={{ padding:'0 0 8px' }}>Daftar Pertemuan</p>
                    {pertemuanList.map(p => (
                      <button key={p.pertemuan}
                        className={`abs-ptm-btn ${selPertemuan === p.pertemuan ? 'active' : ''}`}
                        onClick={() => setSelPertemuan(p.pertemuan)}>
                        <div className="abs-ptm-num">P{p.pertemuan}</div>
                        <div style={{ flex:1 }}>
                          <span className="abs-ptm-topik">{p.topik || `Pertemuan ${p.pertemuan}`}</span>
                          <span className="abs-ptm-date">{p.tanggal || '–'}</span>
                        </div>
                        {p.dosen_masuk === false && (
                          <span className="badge badge-amber" style={{ fontSize:10 }}>Online</span>
                        )}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                      </button>
                    ))}
                  </div>

                  {/* Detail absensi pertemuan */}
                  <div className="abs-detail">
                    {!activePertemuan ? (
                      <div className="abs-empty" style={{ padding:'40px 0' }}>
                        <p style={{ fontSize:13 }}>Pilih pertemuan untuk melihat detail absensi.</p>
                      </div>
                    ) : (
                      <>
                        <div className="abs-detail-hdr">
                          <div>
                            <h3>Pertemuan {activePertemuan.pertemuan} — {activePertemuan.topik || '–'}</h3>
                            <p style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
                              {activePertemuan.tanggal || '–'}
                              {activePertemuan.dosen_masuk === false && ' · Dosen tidak hadir (absen online)'}
                            </p>
                          </div>
                          <div className="abs-rekap">
                            <span className="abs-rekap-val">{rekapHadir}/{rekapTotal}</span>
                            <span className="abs-rekap-lbl">Hadir</span>
                          </div>
                        </div>

                        <div className="card nil-table-card">
                          <div className="nil-tbl-hdr">
                            <span className="nil-col-no">No</span>
                            <span className="nil-col-nim">NIM</span>
                            <span style={{ flex:1 }}>Nama</span>
                            <span style={{ width:130, flexShrink:0, textAlign:'center' }}>Status</span>
                          </div>
                          {mahasiswaAbsensi.map((a, i) => (
                            <div key={a.absensi_id || i} className="nil-tbl-row">
                              <span className="nil-col-no">{i+1}</span>
                              <span className="nil-col-nim">{a.nim || '–'}</span>
                              <span style={{ flex:1, fontSize:13 }}>{a.nama || '–'}</span>
                              <span style={{ width:130, flexShrink:0, textAlign:'center' }}>
                                <select className="abs-status-select"
                                  value={a.status || 'belum'}
                                  onChange={e => updateStatus({ absensiId: a.absensi_id, status: e.target.value })}>
                                  {STATUS_OPTIONS.map(s => (
                                    <option key={s.v} value={s.v}>{s.l}</option>
                                  ))}
                                </select>
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
