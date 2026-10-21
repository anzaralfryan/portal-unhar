import { useState, useRef } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import { useFetch, useSubmit } from '../../hooks/useFetch'
import { elearningService, absensiService } from '../../services/services'
import api, { getErrorMessage } from '../../services/api'
import './ElearningPage.css'

const TIPE_COLOR = { PDF:'#fee2e2', DOCX:'#dbeafe', PPTX:'#fef3c7', VIDEO:'#ede9fe', ZIP:'#fce7f3', LAINNYA:'#f3f4f6' }
const TIPE_ICON = {
  PDF:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  DOCX:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  PPTX:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  VIDEO:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M17 7h5M2 17h5M17 17h5"/></svg>,
  ZIP:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9.5V4a2 2 0 012-2h3.9a2 2 0 011.69.9l.81 1.2a2 2 0 001.67.9H20a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2v-1"/></svg>,
  LAINNYA:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>,
}

/* ═══════════════════════════════════════════════════════════
   TAB MATERI
═══════════════════════════════════════════════════════════ */
function TabMateri({ jadwalId }) {
  const { data, loading, error } = useFetch(() => elearningService.getMateri(jadwalId), [jadwalId])
  const materi = Array.isArray(data) ? data : data?.data || []

  async function download(m) {
  try {
    const res = await api.get(`/mahasiswa/elearning/materi/${m.id}/download`, { responseType: 'blob' })
    
    // 1. Ambil tipe MIME dari header response agar browser tahu pasti formatnya (PDF/Gambar/dll)
    const contentType = res.headers['content-type']
    const blob = new Blob([res.data], { type: contentType })

    // 2. Tentukan nama file yang WAJIB memiliki ekstensi (.pdf, .png, dll)
    // Cek apakah 'm' punya nama file asli (misal m.file_name/m.file_path), 
    // jika tidak ada, kita ekstrak ekstensinya dari path file
    const extension = m.file_path ? m.file_path.split('.').pop() : 'pdf'
    
    // Gabungkan judul dengan ekstensinya (Contoh: "Pertemuan 1 - Pengantar.pdf")
    const fileNameWithExt = m.file_name || `${m.judul}.${extension}`

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', fileNameWithExt) // <--- Sekarang sudah ada ekstensinya
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (e) {
    alert('Gagal mengunduh: ' + (e?.response?.data?.message || e.message))
  }
}

  if (loading) return <div className="el-tab"><div style={{padding:20,color:'var(--text3)'}}>Memuat materi...</div></div>
  if (error) return <div className="el-tab"><div className="el-error">{error}</div></div>

  return (
    <div className="el-tab">
      {materi.length === 0 ? (
        <div className="el-empty">
          <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg></span>
          <p>Belum ada materi</p>
          <small>Dosen belum mengunggah materi untuk mata kuliah ini.</small>
        </div>
      ) : materi.map(m => (
        <div key={m.id} className="el-row">
          <div className="el-row-icon" style={{ background: TIPE_COLOR[m.tipe] || TIPE_COLOR.LAINNYA }}>
            {TIPE_ICON[m.tipe] || TIPE_ICON.LAINNYA}
          </div>
          <div className="list-body">
            <h4>{m.judul}</h4>
            <p>Pertemuan {m.pertemuan} · {m.tipe} · {m.ukuran || '–'}</p>
          </div>
          <button className="el-dl-btn" onClick={() => download(m)} title="Unduh">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   TAB TUGAS
═══════════════════════════════════════════════════════════ */
function TabTugas({ jadwalId }) {
  const { data, loading, error, refetch } = useFetch(() => elearningService.getTugas(jadwalId), [jadwalId])
  const tugas = Array.isArray(data) ? data : data?.data || []

  const [uploadId, setUploadId] = useState(null)
  const [file, setFile] = useState(null)
  const [toast, setToast] = useState(null)
  const [toastErr, setToastErr] = useState(false)
  const fileRef = useRef()

  const { submit: upload, loading: uploading } = useSubmit(
    (tugasId) => elearningService.submitTugas(tugasId, file),
    {
      onSuccess: () => {
        setUploadId(null); setFile(null); refetch()
        showToast('Tugas berhasil dikirim')
      },
      onError: (m) => showToast(m, true),
    }
  )

  function showToast(msg, err = false) {
    setToast(msg); setToastErr(err)
    setTimeout(() => setToast(null), 2600)
  }

  if (loading) return <div className="el-tab"><div style={{padding:20,color:'var(--text3)'}}>Memuat tugas...</div></div>
  if (error) return <div className="el-tab"><div className="el-error">{error}</div></div>

  return (
    <div className="el-tab">
      {toast && <div className={`el-toast ${toastErr ? '' : 'el-toast--green'}`}>{toast}</div>}
      {tugas.length === 0 ? (
        <div className="el-empty">
          <span>✅</span>
          <p>Tidak ada tugas</p>
          <small>Dosen belum memberikan tugas untuk mata kuliah ini.</small>
        </div>
      ) : tugas.map(t => (
        <div key={t.id} className="el-tugas-card">
          <div className="el-tugas-top">
            <div className="el-row-icon" style={{ background:'#fef3c7' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
            <div className="list-body">
              <h4>{t.judul}</h4>
              <p>Deadline: {t.deadline}{t.is_lewat ? ' · ⚠ terlambat' : ''}</p>
            </div>
            {t.status === 'submitted'
              ? <span className="badge badge-green">Terkirim</span>
              : <span className="badge badge-amber">Belum</span>}
          </div>
          <p className="el-tugas-desc">{t.deskripsi}</p>

          {t.status === 'submitted' ? (
            <div className="el-submitted">
              <div style={{ fontSize:12 }}>
                ✓ File: <strong>{t.file_kirim}</strong>
                {t.submitted_at && <span style={{color:'var(--text3)'}}> · {t.submitted_at}</span>}
              </div>
              {t.nilai != null && (
                <div style={{ marginTop:6, fontSize:12 }}>
                  Nilai: <strong style={{ color:'var(--green)' }}>{t.nilai}</strong>
                  {t.catatan && <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>Catatan: {t.catatan}</div>}
                </div>
              )}
            </div>
          ) : uploadId === t.id ? (
            <div className="el-upload-area">
              <div className="el-upload-box" onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.zip,.rar" style={{ display:'none' }}
                  onChange={e => setFile(e.target.files?.[0] || null)}/>
                {file ? <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> {file.name}</span> : <span>Klik untuk pilih file (PDF, DOCX, ZIP)</span>}
              </div>
              <div className="el-upload-actions">
                <button className="el-btn-ghost" onClick={() => { setUploadId(null); setFile(null) }}>Batal</button>
                <button className="el-btn-submit" disabled={!file || uploading} onClick={() => upload(t.id)}>
                  {uploading ? <span className="spinner-sm"/> : 'Kirim Tugas'}
                </button>
              </div>
            </div>
          ) : (
            <button className="el-btn-upload" onClick={() => setUploadId(t.id)} disabled={t.is_lewat}>
              {t.is_lewat ? 'Deadline terlewat' : 'Unggah Tugas'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   TAB KUIS
═══════════════════════════════════════════════════════════ */
function TabKuis({ jadwalId }) {
  const { data, loading, error, refetch } = useFetch(() => elearningService.getKuis(jadwalId), [jadwalId])
  const kuisList = Array.isArray(data) ? data : data?.data || []

  const [aktifId, setAktifId] = useState(null)
  const [soalData, setSoalData] = useState(null)
  const [jawaban, setJawaban] = useState({})
  const [loadingSoal, setLoadingSoal] = useState(false)
  const [toast, setToast] = useState(null)
  const [toastErr, setToastErr] = useState(false)

  const { submit: submitKuis, loading: submitting } = useSubmit(
    (id) => elearningService.submitKuis(id, jawaban),
    {
      onSuccess: (res) => {
        showToast(`Kuis selesai! Nilai: ${res.nilai}`)
        setAktifId(null); setSoalData(null); setJawaban({}); refetch()
      },
      onError: (m) => showToast(m, true),
    }
  )

  function showToast(msg, err = false) {
    setToast(msg); setToastErr(err)
    setTimeout(() => setToast(null), 3000)
  }

  async function mulaiKuis(k) {
    setLoadingSoal(true)
    try {
      const res = await elearningService.getSoalKuis(k.id)
      setSoalData(res.data?.data || res.data)
      setAktifId(k.id); setJawaban({})
    } catch (e) {
      showToast(e?.response?.data?.message || 'Gagal memuat soal', true)
    } finally {
      setLoadingSoal(false)
    }
  }

  if (loading) return <div className="el-tab"><div style={{padding:20,color:'var(--text3)'}}>Memuat kuis...</div></div>
  if (error) return <div className="el-tab"><div className="el-error">{error}</div></div>

  // Mode kerjakan kuis
  if (aktifId && soalData) {
    const soalArr = soalData.soal || []
    const total = soalArr.length
    const dijawab = Object.keys(jawaban).length
    return (
      <div className="el-tab">
        <div className="el-kuis-topbar">
          <button className="el-back-btn" onClick={() => { setAktifId(null); setSoalData(null); setJawaban({}) }}>← Kembali</button>
          <div>
            <h3 className="el-kuis-title">{soalData.judul}</h3>
            <p className="el-kuis-meta">{total} soal · {soalData.durasi} menit</p>
          </div>
          <span className="el-kuis-prog">{dijawab}/{total}</span>
        </div>
        <div className="el-soal-grid">
          {soalArr.map((s, i) => (
            <div key={s.id} className="el-soal-card">
              <p className="el-soal-num">Soal {i+1}</p>
              <p className="el-soal-teks">{s.pertanyaan}</p>
              <div className="el-opsi-list">
                {(s.opsi || []).map((op, j) => (
                  <button key={j}
                    className={`el-opsi-btn ${jawaban[s.id] === j ? 'selected' : ''}`}
                    onClick={() => setJawaban(p => ({ ...p, [s.id]: j }))}>
                    <span className="el-opsi-huruf">{String.fromCharCode(65+j)}</span>{op}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button className="el-btn-submit el-btn-full"
          disabled={dijawab < total || submitting}
          onClick={() => submitKuis(aktifId)}>
          {submitting ? 'Mengirim...' : `Kumpulkan (${dijawab}/${total})`}
        </button>
      </div>
    )
  }

  // Mode list kuis
  return (
    <div className="el-tab">
      {toast && <div className={`el-toast ${toastErr ? '' : 'el-toast--green'}`}>{toast}</div>}
      {loadingSoal && <div style={{padding:10,fontSize:12,color:'var(--text3)'}}>Memuat soal...</div>}
      {kuisList.length === 0 ? (
        <div className="el-empty">
          <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
          <p>Belum ada kuis</p>
          <small>Dosen belum membuat kuis untuk mata kuliah ini.</small>
        </div>
      ) : kuisList.map(k => (
        <div key={k.id} className="el-row">
          <div className="el-row-icon" style={{ background:'#ede9fe' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 017 7c0 3.87-3.13 7-7 7S5 12.87 5 9a7 7 0 017-7z"/><path d="M5.45 11.45L3 13.91M18.55 11.45L21 13.91M12 19v3"/></svg></div>
          <div className="list-body">
            <h4>{k.judul}</h4>
            <p>{k.jumlah_soal} soal · {k.durasi} menit</p>
          </div>
          {k.status === 'selesai' ? (
            <div style={{ textAlign:'right' }}>
              <span className="badge badge-green">Selesai</span>
              <p style={{ fontSize:12, color:'var(--green)', marginTop:4, fontWeight:600 }}>Nilai: {k.nilai}</p>
            </div>
          ) : (
            <button className="el-btn-upload" onClick={() => mulaiKuis(k)}>Mulai Kuis</button>
          )}
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
const TABS = [
  { key:'materi',  label:'Materi'  },
  { key:'tugas',   label:'Tugas'   },
  { key:'kuis',    label:'Kuis'    },
  { key:'absensi', label:'Absensi' },
]

export default function ElearningPage() {
  const { data, loading, error } = useFetch(() => elearningService.getMatkul(), [])
  const matkul = Array.isArray(data) ? data : data?.data || []

  const [selId, setSelId] = useState(null)
  const [tab, setTab] = useState('materi')

  const sel = matkul.find(m => m.jadwal_id === selId)

  if (loading) {
    return (
      <div className="page-single">
        <PageHeader title="E-Learning" subtitle="Memuat..."/>
        <div className="content-body" style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>Memuat mata kuliah...</div>
      </div>
    )
  }

  if (matkul.length === 0) {
    return (
      <div className="page-single">
        <PageHeader title="E-Learning" subtitle="Belum ada mata kuliah"/>
        <div className="content-body">
          <div className="card" style={{ padding:40, textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg></div>
            <h3 style={{ fontSize:15, marginBottom:8 }}>E-Learning masih kosong</h3>
            <p style={{ fontSize:13, color:'var(--text3)', maxWidth:380, margin:'0 auto', lineHeight:1.6 }}>
              E-Learning akan tersedia setelah Anda memilih mata kuliah di KRS dan KRS dikunci oleh Admin Prodi. Silakan buka menu <strong>KRS</strong>.
            </p>
            {error && <p style={{ color:'var(--red)', fontSize:12, marginTop:12 }}>{error}</p>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-root">
      {/* Panel kiri: daftar matkul */}
      <div className="page-panel">
        <div className="panel-section" style={{ flex:1 }}>
          <p className="panel-label">Mata Kuliah</p>
          {matkul.map(m => (
            <button key={m.jadwal_id}
              className={`panel-nav-btn ${selId === m.jadwal_id ? 'active' : ''}`}
              onClick={() => { setSelId(m.jadwal_id); setTab('materi') }}>
              <div style={{ flex:1 }}>
                <span className="panel-nav-label">{m.matkul}</span>
                <span style={{ display:'block', fontSize:10, color:'var(--text3)', marginTop:1 }}>
                  {m.kode} · {m.dosen || '–'}
                </span>
              </div>
              {m.badge > 0 && (
                <span className="panel-nav-meta" style={{ background:'var(--red)', color:'#fff' }}>
                  {m.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="page-main">
        <PageHeader
          title="E-Learning"
          subtitle={sel ? `${sel.matkul} · ${sel.dosen || '–'}` : 'Pilih mata kuliah'}
        />
        <div className="content-body">
          {!sel ? (
            <div className="el-empty">
              <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg></span>
              <p>Pilih mata kuliah di panel kiri</p>
            </div>
          ) : (
            <>
              <div className="el-tabs">
                {TABS.map(t => (
                  <button key={t.key}
                    className={`el-tab-btn ${tab === t.key ? 'active' : ''}`}
                    onClick={() => setTab(t.key)}>
                    {t.label}
                    {t.key === 'tugas' && sel.tugas_belum > 0 && (
                      <span className="el-tab-badge">{sel.tugas_belum}</span>
                    )}
                    {t.key === 'kuis' && sel.kuis_belum > 0 && (
                      <span className="el-tab-badge">{sel.kuis_belum}</span>
                    )}
                  </button>
                ))}
              </div>
              {tab === 'materi' && <TabMateri jadwalId={sel.jadwal_id}/>}
              {tab === 'tugas'  && <TabTugas  jadwalId={sel.jadwal_id}/>}
              {tab === 'kuis'    && <TabKuis    jadwalId={sel.jadwal_id}/>}
              {tab === 'absensi' && <TabAbsensi jadwalId={sel.jadwal_id}/>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   TAB ABSENSI
   Fitur:
   1. Lihat ringkasan & riwayat kehadiran
   2. Tandai Hadir sendiri (pertemuan hari ini, dosen hadir)
   3. Absen Online (dosen tidak hadir)
   4. Ajukan Izin / Sakit dengan alasan — SELALU tersedia
══════════════════════════════════════════════════════════ */
const STATUS_BADGE = {
  hadir:  { bg:'#d1fae5', color:'#065f46', label:'Hadir'  },
  online: { bg:'#dbeafe', color:'#1e40af', label:'Online' },
  absen:  { bg:'#fee2e2', color:'#991b1b', label:'Absen'  },
  izin:   { bg:'#fef3c7', color:'#92400e', label:'Izin'   },
  sakit:  { bg:'#ede9fe', color:'#5b21b6', label:'Sakit'  },
  belum:  { bg:'#f3f4f6', color:'#6b7280', label:'Belum'  },
}

function TabAbsensi({ jadwalId }) {
  const { data, loading, error, refetch } = useFetch(() => absensiService.get(jadwalId), [jadwalId])
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast]                 = useState(null)

  // Modal ajukan izin/sakit
  const [showKetModal, setShowKetModal] = useState(false)
  const [ketTipe,      setKetTipe]      = useState('izin')   // 'izin' | 'sakit'
  const [ketAlasan,    setKetAlasan]    = useState('')
  const [ketPertemuan, setKetPertemuan] = useState('')       // kosong = otomatis

  const ringkasan = data?.ringkasan || {}
  const pertemuan = data?.pertemuan || []

  // Hanya pertemuan HARI INI dengan dosen hadir & belum diisi
  const pertemuanHariIni = pertemuan.find(p =>
    p.status === 'belum' && p.dosen_masuk
  )
  // Pertemuan dosen tidak hadir & belum diisi
  const pertemuanOnline  = pertemuan.find(p =>
    p.status === 'belum' && !p.dosen_masuk
  )
  // Ada pertemuan yang belum diisi (untuk ajukan izin/sakit)
  const adaBelum = pertemuan.some(p => p.status === 'belum')

  function showToast(msg, ok) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3200)
  }

  async function handleCheckIn() {
    setActionLoading(true)
    try {
      const res = await absensiService.checkIn(jadwalId)
      refetch()
      showToast(res.data?.message || 'Berhasil menandai hadir!', true)
    } catch(e) { showToast(getErrorMessage(e), false) }
    finally    { setActionLoading(false) }
  }

  async function handleAbsenOnline() {
    setActionLoading(true)
    try {
      const res = await absensiService.absenOnline(jadwalId)
      refetch()
      showToast(res.data?.message || 'Absen online berhasil!', true)
    } catch(e) { showToast(getErrorMessage(e), false) }
    finally    { setActionLoading(false) }
  }

  async function handleAjukanKeterangan() {
    if (!ketAlasan.trim()) { showToast('Isi alasan terlebih dahulu.', false); return }
    setActionLoading(true)
    try {
      const payload = {
        keterangan: ketTipe,
        alasan:     ketAlasan.trim(),
        ...(ketPertemuan ? { pertemuan: Number(ketPertemuan) } : {}),
      }
      const res = await absensiService.ajukanKeterangan(jadwalId, payload)
      refetch()
      setShowKetModal(false); setKetAlasan(''); setKetPertemuan('')
      showToast(res.data?.message || `${ketTipe === 'izin' ? 'Izin' : 'Sakit'} berhasil dicatat.`, true)
    } catch(e) { showToast(getErrorMessage(e), false) }
    finally    { setActionLoading(false) }
  }

  if (loading) return (
    <div className="el-tab">
      <div style={{ padding:20, color:'var(--text3)' }}>Memuat data absensi...</div>
    </div>
  )
  if (error) return (
    <div className="el-tab">
      <div className="el-error">{error}</div>
    </div>
  )

  const persen    = ringkasan.persen ?? 0
  const amanColor = persen >= 75 ? '#059669' : persen >= 50 ? '#d97706' : '#e53e3e'
  const belumList = pertemuan.filter(p => p.status === 'belum')

  return (
    <div className="el-tab">
      {/* Toast */}
      {toast && (
        <div style={{
          background: toast.ok ? 'var(--teal, #0F9E7B)' : 'var(--red, #e53e3e)',
          color:'#fff', padding:'10px 14px', borderRadius:8,
          marginBottom:12, fontSize:13, fontWeight:600,
        }}>
          {toast.msg}
        </div>
      )}

      {/* Ringkasan */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:14 }}>
        {[
          { label:'Hadir',  val: ringkasan.hadir  ?? 0, bg:'#d1fae5', color:'#065f46' },
          { label:'Online', val: ringkasan.online  ?? 0, bg:'#dbeafe', color:'#1e40af' },
          { label:'Absen',  val: ringkasan.absen   ?? 0, bg:'#fee2e2', color:'#991b1b' },
        ].map(s => (
          <div key={s.label} style={{ flex:1, minWidth:80, background:s.bg, borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
            <p style={{ fontSize:22, fontWeight:800, color:s.color, margin:0 }}>{s.val}</p>
            <p style={{ fontSize:11, color:s.color, margin:0, opacity:0.8 }}>{s.label}</p>
          </div>
        ))}
        <div style={{ flex:1, minWidth:80, background:'#f0fdf4', border:'2px solid '+amanColor, borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
          <p style={{ fontSize:22, fontWeight:800, color:amanColor, margin:0 }}>{persen}%</p>
          <p style={{ fontSize:11, color:amanColor, margin:0 }}>{persen >= 75 ? '✓ Aman' : '⚠ Kurang'}</p>
        </div>
      </div>

      {/* ── CTA 1: Tandai Hadir (dosen hadir, hari ini) ── */}
      {pertemuanHariIni && (
        <div style={{ background:'#f0fdf4', border:'1.5px solid #86efac', borderRadius:12,
          padding:'14px 16px', marginBottom:12,
          display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'#065f46', margin:0 }}>
              📋 Pertemuan {pertemuanHariIni.pertemuan} aktif hari ini
            </p>
            <p style={{ fontSize:11, color:'#059669', margin:'3px 0 0' }}>
              {pertemuanHariIni.topik ? `Topik: ${pertemuanHariIni.topik}` : 'Klik tombol untuk menandai kehadiran.'}
            </p>
          </div>
          <button onClick={handleCheckIn} disabled={actionLoading}
            style={{ background:'#059669', color:'#fff', border:'none', borderRadius:8,
              padding:'9px 20px', fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
            {actionLoading ? 'Memproses...' : '✓ Tandai Hadir'}
          </button>
        </div>
      )}

      {/* ── CTA 2: Absen Online (dosen tidak hadir) ── */}
      {pertemuanOnline && (
        <div style={{ background:'#fffbeb', border:'1.5px solid #fbbf24', borderRadius:12,
          padding:'14px 16px', marginBottom:12,
          display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'#92400e', margin:0 }}>
              ⚠ Pertemuan {pertemuanOnline.pertemuan} — Dosen tidak hadir
            </p>
            <p style={{ fontSize:11, color:'#b45309', margin:'3px 0 0' }}>
              Lakukan absen online sebagai pengganti kehadiran.
            </p>
          </div>
          <button onClick={handleAbsenOnline} disabled={actionLoading}
            style={{ background:'#d97706', color:'#fff', border:'none', borderRadius:8,
              padding:'9px 20px', fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
            {actionLoading ? 'Memproses...' : 'Absen Online'}
          </button>
        </div>
      )}

      {/* ── CTA 3: Ajukan Izin / Sakit — SELALU tampil jika ada pertemuan belum ── */}
      {adaBelum && (
        <div style={{ background:'#faf5ff', border:'1.5px solid #c4b5fd', borderRadius:12,
          padding:'14px 16px', marginBottom:12,
          display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'#5b21b6', margin:0 }}>
              📝 Ajukan Izin / Sakit
            </p>
            <p style={{ fontSize:11, color:'#7c3aed', margin:'3px 0 0' }}>
              Jika kamu tidak bisa hadir karena izin atau sakit, ajukan di sini.
            </p>
          </div>
          <button onClick={() => setShowKetModal(true)}
            style={{ background:'#7c3aed', color:'#fff', border:'none', borderRadius:8,
              padding:'9px 20px', fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
            Ajukan Keterangan
          </button>
        </div>
      )}

      {/* Tidak ada pertemuan sama sekali */}
      {pertemuan.length === 0 && (
        <div style={{ background:'#f8fafc', border:'1px dashed #e2e8f0', borderRadius:12,
          padding:'14px 16px', marginBottom:12,
          display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:24 }}>ℹ️</div>
          <div>
            <p style={{ fontSize:13, fontWeight:600, color:'#374151', margin:0 }}>
              Belum ada pertemuan yang dibuka
            </p>
            <p style={{ fontSize:11, color:'#9baab8', margin:'3px 0 0' }}>
              Data absensi akan muncul setelah dosen membuka pertemuan. Tombol aksi akan aktif saat ada pertemuan dengan status <strong>Belum</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Riwayat kehadiran */}
      {pertemuan.length > 0 && (
        <>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--text3)',
            textTransform:'uppercase', letterSpacing:'0.5px', margin:'8px 0 8px' }}>
            Riwayat Kehadiran
          </p>
          <div className="card">
            {pertemuan.map((p, i) => {
              const badge   = STATUS_BADGE[p.status] || STATUS_BADGE.belum
              const isAktif = p.status === 'belum'
              return (
                <div key={p.id ?? i} className="list-item"
                  style={{ borderBottom: i < pertemuan.length-1 ? '1px solid var(--border)' : 'none',
                    background: isAktif ? '#fafffe' : 'transparent' }}>
                  <div className="list-avatar"
                    style={{ background: isAktif ? '#d1fae5' : '#e0f2fe',
                      color: isAktif ? '#065f46' : '#1a56db', fontSize:13, fontWeight:700 }}>
                    {p.pertemuan}
                  </div>
                  <div className="list-body">
                    <h4>
                      Pertemuan {p.pertemuan}
                      {isAktif && (
                        <span style={{ marginLeft:8, fontSize:10, background:'#d1fae5',
                          color:'#065f46', padding:'2px 7px', borderRadius:20, fontWeight:600 }}>
                          BELUM
                        </span>
                      )}
                    </h4>
                    <p>{p.tanggal || '–'}{p.topik ? ' · '+p.topik : ''}</p>
                    {!p.dosen_masuk && (
                      <p style={{ fontSize:11, color:'#d97706', marginTop:2 }}>Dosen tidak hadir</p>
                    )}
                    {p.alasan && (
                      <p style={{ fontSize:11, color:'#5b21b6', marginTop:2 }}>
                        Alasan: {p.alasan}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20,
                    background:badge.bg, color:badge.color, fontWeight:600, whiteSpace:'nowrap' }}>
                    {badge.label}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Modal Ajukan Keterangan ── */}
      {showKetModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(5,15,5,0.52)',
          backdropFilter:'blur(4px)', display:'flex', alignItems:'center',
          justifyContent:'center', padding:20, zIndex:1200 }}
          onClick={e => e.target === e.currentTarget && setShowKetModal(false)}>
          <div style={{ background:'#fff', borderRadius:18, width:'100%', maxWidth:460,
            boxShadow:'0 20px 60px rgba(0,0,0,0.22)', animation:'fadeIn .2s ease' }}>

            {/* Header */}
            <div style={{ padding:'18px 22px 14px', borderBottom:'1.5px solid #e5e9f0',
              display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:'#0a1628' }}>
                Ajukan Izin / Sakit
              </h3>
              <button onClick={() => setShowKetModal(false)}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#9baab8', lineHeight:1 }}>
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:14 }}>

              {/* Pilih tipe */}
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>
                  Jenis Keterangan
                </label>
                <div style={{ display:'flex', gap:8 }}>
                  {['izin','sakit'].map(t => (
                    <button key={t} type="button"
                      onClick={() => setKetTipe(t)}
                      style={{
                        flex:1, padding:'10px', borderRadius:10,
                        border: `2px solid ${ketTipe===t ? '#7c3aed' : '#e5e9f0'}`,
                        background: ketTipe===t ? '#faf5ff' : '#fff',
                        cursor:'pointer', fontSize:13, fontWeight:700,
                        color: ketTipe===t ? '#5b21b6' : '#6b7a8d',
                        transition:'all .15s',
                      }}>
                      {t === 'izin' ? '📋 Izin' : '🤒 Sakit'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pilih pertemuan (opsional) */}
              {belumList.length > 1 && (
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>
                    Pertemuan <span style={{ fontWeight:400, color:'#9baab8' }}>(opsional, biarkan kosong = pertemuan terdekat)</span>
                  </label>
                  <select value={ketPertemuan} onChange={e => setKetPertemuan(e.target.value)}
                    style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e5e9f0',
                      borderRadius:9, fontSize:13, outline:'none', fontFamily:'inherit' }}>
                    <option value="">Otomatis (pertemuan terdekat)</option>
                    {belumList.map(p => (
                      <option key={p.pertemuan} value={p.pertemuan}>
                        Pertemuan {p.pertemuan} {p.tanggal ? `— ${p.tanggal}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Alasan */}
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>
                  Alasan <span style={{ color:'#e53e3e' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  value={ketAlasan}
                  onChange={e => setKetAlasan(e.target.value)}
                  placeholder={ketTipe === 'izin'
                    ? 'Contoh: Ada acara keluarga yang tidak bisa ditinggalkan.'
                    : 'Contoh: Demam tinggi dan sudah ke dokter.'}
                  style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e5e9f0',
                    borderRadius:9, fontSize:13, resize:'vertical', fontFamily:'inherit', outline:'none' }}
                />
              </div>

              {/* Info */}
              <p style={{ fontSize:11.5, color:'#6b7a8d', background:'#f8fafc',
                padding:'9px 12px', borderRadius:8, margin:0, lineHeight:1.55 }}>
                ℹ️ Pengajuan ini akan dicatat otomatis. Dosen tetap berwenang mengubah status absensi kapan saja.
              </p>
            </div>

            {/* Footer */}
            <div style={{ padding:'14px 22px', borderTop:'1.5px solid #e5e9f0',
              display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => { setShowKetModal(false); setKetAlasan(''); setKetPertemuan('') }}
                style={{ padding:'9px 18px', borderRadius:9, border:'1.5px solid #e5e9f0',
                  background:'#f8fafc', fontSize:13, fontWeight:600, cursor:'pointer', color:'#6b7a8d' }}>
                Batal
              </button>
              <button onClick={handleAjukanKeterangan} disabled={actionLoading || !ketAlasan.trim()}
                style={{ padding:'9px 22px', borderRadius:9, border:'none',
                  background: !ketAlasan.trim() ? '#c4b5fd' : '#7c3aed',
                  color:'#fff', fontSize:13, fontWeight:700,
                  cursor: !ketAlasan.trim() ? 'not-allowed' : 'pointer' }}>
                {actionLoading ? 'Mengirim...' : 'Kirim Keterangan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
