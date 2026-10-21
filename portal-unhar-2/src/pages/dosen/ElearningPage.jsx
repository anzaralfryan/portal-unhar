import { useState, useRef } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import { useFetch, useSubmit } from '../../hooks/useFetch'
import { jadwalServiceDosen, elearningServiceDosen, absensiServiceDosen } from '../../services/services'
import './ElearningPage.css'

const TABS = [
  { key:'materi', label:'Materi',
    icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { key:'tugas', label:'Tugas',
    icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg> },
  { key:'kuis', label:'Kuis',
    icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
  { key:'absensi', label:'Absensi',
    icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg> },
]


/* ── Tab Absensi (inline dari AbsensiPage) ── */
function TabAbsensi({ selJadwal }) {
  const [selPertemuan, setSelPertemuan] = useState(null)
  const [showBuka,     setShowBuka]     = useState(false)
  const [formBuka,     setFormBuka]     = useState({ tanggal: new Date().toISOString().slice(0,10), topik:'', dosen_masuk:true })
  const [toast,        setToast]        = useState(null)

  const { data: absensiData, loading, refetch } = useFetch(
    () => selJadwal ? absensiServiceDosen.get(selJadwal.id) : Promise.resolve({ data: null }),
    [selJadwal?.id], { immediate: !!selJadwal }
  )
  const pertemuanList = absensiData?.pertemuan || []

  function showToast(msg, err=false) { setToast({msg,err}); setTimeout(()=>setToast(null),2800) }

  const { submit: bukaPertemuan, loading: opening } = useSubmit(
    d => absensiServiceDosen.bukaPertemuan(selJadwal.id, d),
    { onSuccess:()=>{ setShowBuka(false); refetch(); showToast('Pertemuan dibuka!') },
      onError: m => showToast(m, true) }
  )

  const STATUS_OPTIONS = [
    {v:'hadir',l:'Hadir'},{v:'absen',l:'Absen'},{v:'izin',l:'Izin'},
    {v:'sakit',l:'Sakit'},{v:'online',l:'Online'},
  ]
  const STATUS_COLOR = {
    hadir:'#059669', absen:'#e53e3e', izin:'#d97706', sakit:'#7c3aed', online:'#0284c7', belum:'#9ca3af'
  }

  async function updateStatus(pertemuanId, mahasiswaId, status) {
    try {
      await absensiServiceDosen.updateStatus(pertemuanId, mahasiswaId, status)
      refetch()
    } catch {}
  }

  if (!selJadwal) return (
    <div className="el-empty">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>
      </svg>
      <p>Pilih mata kuliah untuk kelola absensi</p>
    </div>
  )

  return (
    <div>
      {toast && <div style={{background:toast.err?'#fee2e2':'#d1fae5',border:`1px solid ${toast.err?'#fca5a5':'#6ee7b7'}`,borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13,color:toast.err?'#991b1b':'#065f46'}}>{toast.msg}</div>}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h3 style={{fontFamily:'var(--font-heading)',fontSize:15,fontWeight:700,margin:0}}>Daftar Pertemuan</h3>
        <button onClick={()=>setShowBuka(true)}
          style={{padding:'8px 14px',borderRadius:9,background:'var(--primary)',color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:6}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Buka Pertemuan
        </button>
      </div>

      {showBuka && (
        <div style={{background:'#f8f9fb',border:'1.5px solid var(--border)',borderRadius:12,padding:16,marginBottom:16}}>
          <p style={{fontWeight:700,fontSize:13,marginBottom:10}}>Buka Pertemuan Baru</p>
          <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:8}}>
            <input type="date" value={formBuka.tanggal}
              onChange={e=>setFormBuka(p=>({...p,tanggal:e.target.value}))}
              style={{padding:'8px 10px',border:'1.5px solid var(--border)',borderRadius:8,fontSize:13}}/>
            <input type="text" placeholder="Topik pertemuan" value={formBuka.topik}
              onChange={e=>setFormBuka(p=>({...p,topik:e.target.value}))}
              style={{flex:1,padding:'8px 10px',border:'1.5px solid var(--border)',borderRadius:8,fontSize:13,minWidth:160}}/>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>bukaPertemuan(formBuka)} disabled={opening}
              style={{padding:'8px 16px',borderRadius:8,background:'var(--primary)',color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:600}}>
              {opening?'Membuka...':'Buka'}
            </button>
            <button onClick={()=>setShowBuka(false)}
              style={{padding:'8px 14px',borderRadius:8,border:'1.5px solid var(--border)',background:'#fff',fontSize:13,cursor:'pointer'}}>
              Batal
            </button>
          </div>
        </div>
      )}

      {loading ? <div style={{color:'var(--text3)',fontSize:13}}>Memuat...</div> :
       pertemuanList.length === 0 ? (
        <div style={{textAlign:'center',color:'var(--text3)',fontSize:13,padding:'32px 0'}}>Belum ada pertemuan. Buka pertemuan untuk mulai absensi.</div>
       ) : (
        pertemuanList.map((pt, pi) => (
          <div key={pi} style={{marginBottom:12,border:'1.5px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
            <div
              style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:selPertemuan===pi?'var(--primary-light)':'var(--bg)',cursor:'pointer',borderBottom:selPertemuan===pi?'1px solid var(--border)':'none'}}
              onClick={()=>setSelPertemuan(selPertemuan===pi?null:pi)}>
              <span style={{fontFamily:'var(--font-heading)',fontSize:12,fontWeight:700,color:'var(--primary)'}}>Pertemuan {pt.pertemuan||pi+1}</span>
              <span style={{fontSize:11,color:'var(--text3)'}}>{pt.tanggal}</span>
              {pt.topik && <span style={{fontSize:11,color:'var(--text2)',flex:1}}>{pt.topik}</span>}
              <span style={{fontSize:11,color:'var(--text3)',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8,padding:'1px 7px'}}>{pt.mahasiswa?.length||0} mahasiswa</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transform:selPertemuan===pi?'rotate(180deg)':'',transition:'transform 0.2s'}}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            {selPertemuan === pi && (
              <div>
                {(!pt.mahasiswa||pt.mahasiswa.length===0) ? (
                  <p style={{textAlign:'center',color:'var(--text3)',fontSize:13,padding:'16px'}}>Tidak ada mahasiswa terdaftar.</p>
                ) : pt.mahasiswa.map((mhs, mi) => (
                  <div key={mi} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',borderBottom:mi<pt.mahasiswa.length-1?'1px solid var(--border)':'none'}}>
                    <div style={{width:30,height:30,borderRadius:'50%',background:'var(--primary-light)',color:'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,flexShrink:0}}>
                      {(mhs.nama||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{margin:0,fontSize:12.5,fontWeight:600,color:'var(--text)'}}>{mhs.nama||'–'}</p>
                      <p style={{margin:0,fontSize:10.5,color:'var(--text3)'}}>{mhs.nim||'–'}</p>
                    </div>
                    <div style={{display:'flex',gap:4}}>
                      {STATUS_OPTIONS.map(s=>(
                        <button key={s.v} onClick={()=>updateStatus(pt.id, mhs.id, s.v)}
                          title={s.l}
                          style={{
                            padding:'3px 8px',borderRadius:6,border:'1.5px solid',fontSize:10,fontWeight:600,cursor:'pointer',
                            background: mhs.status===s.v ? STATUS_COLOR[s.v] : '#fff',
                            borderColor: STATUS_COLOR[s.v]||'#ccc',
                            color: mhs.status===s.v ? '#fff' : STATUS_COLOR[s.v]||'#666',
                          }}>
                          {s.l}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
       )
      }
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function ElearningPage() {
  const [selJadwal, setSelJadwal]   = useState(null)
  const [activeTab, setActiveTab]   = useState('materi')
  const [subView,   setSubView]     = useState(null)   // { type:'submissions', tugasId } | { type:'hasil', kuisId }

  const { data: jadwalData, loading: loadJ } = useFetch(() => jadwalServiceDosen.getAll(), [])
  const jadwalArr = Array.isArray(jadwalData) ? jadwalData : jadwalData?.data || []

  function selectJadwal(j) {
    setSelJadwal(j); setActiveTab('materi'); setSubView(null)
  }

  return (
    <div className="page-root">
      {/* Panel: pilih matkul */}
      <div className="page-panel">
        <div className="panel-section">
          <p className="panel-label">Mata Kuliah</p>
          {loadJ ? [1,2,3].map(i => <div key={i} className="el-skeleton" style={{ marginBottom:6 }}/>) :
            jadwalArr.length === 0 ? <p style={{ fontSize:12, color:'var(--text3)' }}>Tidak ada jadwal.</p> :
            jadwalArr.map(j => (
              <button key={j.id}
                className={`panel-nav-btn ${selJadwal?.id === j.id ? 'active' : ''}`}
                onClick={() => selectJadwal(j)}>
                <div style={{ flex:1 }}>
                  <span className="panel-nav-label">{j.matkul || j.nama_matkul}</span>
                  <span style={{ display:'block', fontSize:10, color:'var(--text3)', marginTop:1 }}>
                    {j.hari} · Kelas {j.kelas || '–'}
                  </span>
                </div>
              </button>
            ))
          }
        </div>
      </div>

      {/* Main */}
      <div className="page-main">
        <PageHeader title="E-Learning" subtitle="Kelola materi, tugas, dan kuis"/>
        <div className="content-body">
          {!selJadwal ? (
            <div className="el-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5"><path d="M12 3L2 8l10 5 10-5-10-5zM2 16l10 5 10-5M2 12l10 5 10-5"/></svg>
              <p>Pilih mata kuliah di panel kiri.</p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              {/* Batch 9b: nama matkul yang dipilih */}
              <div style={{ marginBottom:14, padding:'12px 16px', background:'var(--bg)',
                borderRadius:10, border:'1px solid var(--border)' }}>
                <p style={{ fontSize:11, color:'var(--text3)', margin:'0 0 3px',
                  textTransform:'uppercase', letterSpacing:'0.5px' }}>Mata Kuliah Dipilih</p>
                <p style={{ fontSize:15, fontWeight:700, color:'var(--text)', margin:0 }}>
                  {selJadwal.matkul || selJadwal.nama_matkul || '–'}
                </p>
                <p style={{ fontSize:12, color:'var(--text3)', margin:'2px 0 0' }}>
                  {selJadwal.hari || '–'} · Kelas {selJadwal.kelas || '–'}{selJadwal.ruangan ? ' · ' + selJadwal.ruangan : ''}
                </p>
              </div>

              <div className="el-tabs">
                {TABS.map(t => (
                  <button key={t.key}
                    className={`el-tab ${activeTab === t.key ? 'active' : ''}`}
                    onClick={() => { setActiveTab(t.key); setSubView(null) }}>
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>

              {activeTab === 'materi' && <TabMateri jadwal={selJadwal} />}
              {activeTab === 'tugas'  && <TabTugas  jadwal={selJadwal} subView={subView} setSubView={setSubView} />}
              {activeTab === 'kuis'   && <TabKuis   jadwal={selJadwal} subView={subView} setSubView={setSubView} />}
            </>
          )}
          {activeTab === 'absensi' && <TabAbsensi selJadwal={selJadwal} />}

        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   TAB MATERI
═══════════════════════════════════════════════════════════ */
function TabMateri({ jadwal }) {
  const fileRef = useRef()
  const [judul, setJudul]       = useState('')
  const [pertemuan, setPertemuan] = useState(1)
  const [file, setFile]         = useState(null)
  const [showForm, setShowForm] = useState(false)

  const { data, loading, refetch } = useFetch(() => elearningServiceDosen.getMateri(jadwal.id), [jadwal.id])
  const materiList = Array.isArray(data) ? data : data?.data || []

  const { submit: upload, loading: uploading, error: uploadErr } = useSubmit(
    (payload) => elearningServiceDosen.uploadMateri(payload),
    { onSuccess: () => { refetch(); setJudul(''); setPertemuan(1); setFile(null); if (fileRef.current) fileRef.current.value = ''; setShowForm(false) } }
  )

  const { submit: hapus } = useSubmit(
    (id) => elearningServiceDosen.deleteMateri(id),
    { onSuccess: () => refetch() }
  )

  async function handleUpload() {
    if (!judul.trim() || !file) return
    await upload({ jadwal_id: jadwal.id, judul, pertemuan, file })
  }

  return (
    <div>
      <div className="el-section-hdr">
        <h3>Materi Perkuliahan</h3>
        <button className="el-add-btn" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Batal' : '+ Upload Materi'}
        </button>
      </div>

      {showForm && (
        <div className="el-form-card">
          <div className="el-form-row">
            <label>Judul Materi</label>
            <input type="text" value={judul} onChange={e => setJudul(e.target.value)} placeholder="Masukkan judul materi" className="el-input"/>
          </div>
          <div className="el-form-row">
            <label>Pertemuan ke-</label>
            <select value={pertemuan} onChange={e => setPertemuan(Number(e.target.value))} className="el-input">
              {Array.from({ length: 16 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>Pertemuan {n}</option>
              ))}
            </select>
          </div>
          <div className="el-form-row">
            <label>File</label>
            <input ref={fileRef} type="file" onChange={e => setFile(e.target.files[0])} className="el-input-file"/>
          </div>
          {uploadErr && <p className="el-err">{uploadErr}</p>}
          <button className="el-submit-btn" onClick={handleUpload} disabled={uploading || !judul.trim() || !file}>
            {uploading ? 'Mengupload...' : 'Upload'}
          </button>
        </div>
      )}

      {loading ? <div className="el-skeleton" style={{ height:60 }}/> :
        materiList.length === 0 ? <p className="el-empty-text">Belum ada materi.</p> : (
        <div className="card">
          {materiList.map((m, i) => (
            <div key={m.id || i} className="list-item" style={{ borderBottom: i < materiList.length-1 ? '1px solid var(--border)' : 'none' }}>
              <div className="list-avatar" style={{ background:'#e0f2fe', color:'#1a56db' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div className="list-body">
                <h4>{m.judul || m.nama || '–'}</h4>
                <p>{m.created_at ? new Date(m.created_at).toLocaleDateString('id-ID') : '–'}{m.file_size ? ` · ${m.file_size}` : ''}</p>
              </div>
              <button className="el-del-btn" onClick={() => { if(confirm('Hapus materi ini?')) hapus(m.id) }} title="Hapus">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   TAB TUGAS
═══════════════════════════════════════════════════════════ */
function TabTugas({ jadwal, subView, setSubView }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ judul:'', deskripsi:'', deadline:'' })

  const { data, loading, refetch } = useFetch(() => elearningServiceDosen.getTugas(jadwal.id), [jadwal.id])
  const tugasList = Array.isArray(data) ? data : data?.data || []

  const { submit: buat, loading: creating, error: createErr } = useSubmit(
    (payload) => elearningServiceDosen.buatTugas(payload),
    { onSuccess: () => { refetch(); setForm({ judul:'', deskripsi:'', deadline:'' }); setShowForm(false) } }
  )

  // Sub-view: submissions
  if (subView?.type === 'submissions') {
    return <SubmissionView tugasId={subView.tugasId} tugasNama={subView.nama} onBack={() => setSubView(null)} />
  }

  return (
    <div>
      <div className="el-section-hdr">
        <h3>Tugas</h3>
        <button className="el-add-btn" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Batal' : '+ Buat Tugas'}
        </button>
      </div>

      {showForm && (
        <div className="el-form-card">
          <div className="el-form-row">
            <label>Judul Tugas</label>
            <input type="text" value={form.judul} onChange={e => setForm(p => ({...p, judul:e.target.value}))} placeholder="Masukkan judul" className="el-input"/>
          </div>
          <div className="el-form-row">
            <label>Deskripsi</label>
            <textarea value={form.deskripsi} onChange={e => setForm(p => ({...p, deskripsi:e.target.value}))} placeholder="Deskripsi tugas..." className="el-textarea" rows={3}/>
          </div>
          <div className="el-form-row">
            <label>Deadline</label>
            <input type="datetime-local" value={form.deadline} onChange={e => setForm(p => ({...p, deadline:e.target.value}))} className="el-input"/>
          </div>
          {createErr && <p className="el-err">{createErr}</p>}
          <button className="el-submit-btn" onClick={() => buat({ jadwal_id: jadwal.id, ...form })} disabled={creating || !form.judul.trim()}>
            {creating ? 'Menyimpan...' : 'Buat Tugas'}
          </button>
        </div>
      )}

      {loading ? <div className="el-skeleton" style={{ height:60 }}/> :
        tugasList.length === 0 ? <p className="el-empty-text">Belum ada tugas.</p> : (
        <div className="card">
          {tugasList.map((t, i) => (
            <div key={t.id || i} className="list-item" style={{ cursor:'pointer', borderBottom: i < tugasList.length-1 ? '1px solid var(--border)' : 'none' }}
              onClick={() => setSubView({ type:'submissions', tugasId:t.id, nama:t.judul })}>
              <div className="list-avatar" style={{ background:'#fef3c7', color:'#d97706' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
              </div>
              <div className="list-body">
                <h4>{t.judul || '–'}</h4>
                <p>Deadline: {t.deadline ? new Date(t.deadline).toLocaleString('id-ID') : '–'}</p>
              </div>
              <div style={{ textAlign:'right' }}>
                <span className="badge badge-blue">{t.submission_count ?? '–'} submission</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Submission sub-view ── */
function SubmissionView({ tugasId, tugasNama, onBack }) {
  const [grading, setGrading] = useState({}) // { subId: nilai }

  const { data, loading, refetch } = useFetch(() => elearningServiceDosen.getSubmission(tugasId), [tugasId])
  const subs = Array.isArray(data) ? data : data?.data || []

  const { submit: nilaiSub, loading: saving } = useSubmit(
    ({ subId, nilai }) => elearningServiceDosen.nilaiTugas(subId, { nilai }),
    { onSuccess: () => refetch() }
  )

  return (
    <div>
      <button className="el-back-btn" onClick={onBack}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
        Kembali ke daftar tugas
      </button>
      <h3 className="el-sub-title">Submission — {tugasNama}</h3>

      {loading ? <div className="el-skeleton" style={{ height:60 }}/> :
        subs.length === 0 ? <p className="el-empty-text">Belum ada submission.</p> : (
        <div className="card nil-table-card">
          <div className="nil-tbl-hdr">
            <span className="nil-col-no">No</span>
            <span className="nil-col-nim">NIM</span>
            <span style={{ flex:1 }}>Nama</span>
            <span style={{ width:120, flexShrink:0 }}>File</span>
            <span style={{ width:140, flexShrink:0 }}>Waktu Submit</span>
            <span className="nil-col-angka">Nilai</span>
            <span style={{ width:70, flexShrink:0, textAlign:'center' }}>Aksi</span>
          </div>
          {subs.map((s, i) => (
            <div key={s.id || i} className="nil-tbl-row">
              <span className="nil-col-no">{i+1}</span>
              <span className="nil-col-nim">{s.mahasiswa?.nim || s.nim || '–'}</span>
              <span style={{ flex:1, fontSize:13 }}>{s.mahasiswa?.nama || s.nama || '–'}</span>
              <span style={{ width:120, flexShrink:0 }}>
                {s.file_url
                  ? <a href={s.file_url} target="_blank" rel="noopener noreferrer"
                      title={s.file_name}
                      style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11,
                        padding:'4px 8px', background:'#e0f2fe', color:'#1a56db',
                        borderRadius:6, textDecoration:'none', fontWeight:600, maxWidth:110,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      {s.file_name
                        ? (s.file_name.length > 12 ? s.file_name.slice(0,12) + '…' : s.file_name)
                        : 'Unduh'}
                    </a>
                  : <span style={{fontSize:11,color:'var(--text3)'}}>–</span>}
              </span>
              <span style={{ width:140, flexShrink:0, fontSize:11, color:'var(--text3)' }}>
                {s.submitted_at || '–'}
              </span>
              <span className="nil-col-angka">
                <input type="number" min="0" max="100" className="nil-input"
                  value={grading[s.id] ?? s.nilai ?? ''}
                  onChange={e => setGrading(p => ({...p, [s.id]: e.target.value}))}
                  placeholder="0–100"/>
              </span>
              <span style={{ width:70, flexShrink:0, textAlign:'center' }}>
                <button className="el-grade-btn"
                  disabled={saving || grading[s.id] == null}
                  onClick={() => nilaiSub({ subId: s.id, nilai: Number(grading[s.id]) })}>
                  Nilai
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   TAB KUIS — dengan soal-builder lengkap (multiple choice)
═══════════════════════════════════════════════════════════ */
function emptySoal() {
  return { pertanyaan: '', opsi: ['', '', '', ''], jawaban_benar: 0 }
}

function TabKuis({ jadwal, subView, setSubView }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ judul:'', durasi:30, deadline:'' })
  const [soal, setSoal]         = useState([emptySoal()])

  const { data, loading, refetch } = useFetch(() => elearningServiceDosen.getKuis(jadwal.id), [jadwal.id])
  const kuisList = Array.isArray(data) ? data : data?.data || []

  const { submit: buat, loading: creating, error: createErr } = useSubmit(
    (payload) => elearningServiceDosen.buatKuis(payload),
    {
      onSuccess: () => {
        refetch()
        setForm({ judul:'', durasi:30, deadline:'' })
        setSoal([emptySoal()])
        setShowForm(false)
      }
    }
  )

  function updateSoal(idx, field, val) {
    setSoal(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s))
  }
  function updateOpsi(idx, opsiIdx, val) {
    setSoal(prev => prev.map((s, i) => i === idx ? { ...s, opsi: s.opsi.map((o, j) => j === opsiIdx ? val : o) } : s))
  }
  function tambahSoal()    { setSoal(prev => [...prev, emptySoal()]) }
  function hapusSoal(idx)  { if (soal.length > 1) setSoal(prev => prev.filter((_, i) => i !== idx)) }

  function handleSubmit() {
    // Validasi sederhana sebelum kirim
    if (!form.judul.trim()) return alert('Judul kuis wajib diisi')
    for (let i = 0; i < soal.length; i++) {
      const s = soal[i]
      if (!s.pertanyaan.trim())       return alert(`Pertanyaan soal ${i+1} kosong`)
      if (s.opsi.some(o => !o.trim())) return alert(`Ada opsi kosong di soal ${i+1}`)
    }
    buat({ jadwal_id: jadwal.id, ...form, soal })
  }

  if (subView?.type === 'hasil') {
    return <HasilKuisView kuisId={subView.kuisId} kuisNama={subView.nama} onBack={() => setSubView(null)} />
  }

  return (
    <div>
      <div className="el-section-hdr">
        <h3>Kuis</h3>
        <button className="el-add-btn" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Batal' : '+ Buat Kuis'}
        </button>
      </div>

      {showForm && (
        <div className="el-form-card">
          <div className="el-form-row">
            <label>Judul Kuis</label>
            <input type="text" value={form.judul} onChange={e => setForm(p => ({...p, judul:e.target.value}))} placeholder="Masukkan judul" className="el-input"/>
          </div>
          <div className="el-form-row">
            <label>Durasi (menit)</label>
            <input type="number" min="5" max="180" value={form.durasi} onChange={e => setForm(p => ({...p, durasi:Number(e.target.value)}))} className="el-input"/>
          </div>
          <div className="el-form-row">
            <label>Deadline (opsional)</label>
            <input type="datetime-local" value={form.deadline} onChange={e => setForm(p => ({...p, deadline:e.target.value}))} className="el-input"/>
          </div>

          <div style={{ marginTop:16, paddingTop:16, borderTop:'1px dashed var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <strong style={{ fontSize:13 }}>Soal Pilihan Ganda</strong>
              <span style={{ fontSize:11, color:'var(--text3)' }}>{soal.length} soal</span>
            </div>

            {soal.map((s, idx) => (
              <div key={idx} style={{ background:'#fafafa', border:'1px solid var(--border)', borderRadius:8, padding:12, marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <strong style={{ fontSize:12, color:'var(--text2)' }}>Soal {idx+1}</strong>
                  {soal.length > 1 && (
                    <button onClick={() => hapusSoal(idx)} style={{ background:'transparent', border:'none', color:'#dc2626', fontSize:11, cursor:'pointer' }}>Hapus</button>
                  )}
                </div>

                <textarea
                  value={s.pertanyaan}
                  onChange={e => updateSoal(idx, 'pertanyaan', e.target.value)}
                  placeholder="Tulis pertanyaan..."
                  className="el-textarea"
                  rows={2}
                  style={{ marginBottom:8 }}
                />

                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6 }}>Pilih jawaban yang benar dengan radio button di kiri:</div>
                {['A','B','C','D'].map((label, opsiIdx) => (
                  <div key={opsiIdx} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <input
                      type="radio"
                      name={`benar-${idx}`}
                      checked={s.jawaban_benar === opsiIdx}
                      onChange={() => updateSoal(idx, 'jawaban_benar', opsiIdx)}
                      style={{ flexShrink:0 }}
                    />
                    <span style={{ fontSize:12, fontWeight:600, width:14 }}>{label}.</span>
                    <input
                      type="text"
                      value={s.opsi[opsiIdx]}
                      onChange={e => updateOpsi(idx, opsiIdx, e.target.value)}
                      placeholder={`Opsi ${label}`}
                      className="el-input"
                      style={{ flex:1 }}
                    />
                  </div>
                ))}
              </div>
            ))}

            <button onClick={tambahSoal} className="el-add-btn" style={{ width:'100%', marginTop:4 }}>
              + Tambah Soal
            </button>
          </div>

          {createErr && <p className="el-err" style={{ marginTop:12 }}>{createErr}</p>}
          <button className="el-submit-btn" onClick={handleSubmit} disabled={creating || !form.judul.trim()} style={{ marginTop:12 }}>
            {creating ? 'Menyimpan...' : `Buat Kuis (${soal.length} soal)`}
          </button>
        </div>
      )}

      {loading ? <div className="el-skeleton" style={{ height:60 }}/> :
        kuisList.length === 0 ? <p className="el-empty-text">Belum ada kuis.</p> : (
        <div className="card">
          {kuisList.map((k, i) => (
            <div key={k.id || i} className="list-item" style={{ cursor:'pointer', borderBottom: i < kuisList.length-1 ? '1px solid var(--border)' : 'none' }}
              onClick={() => setSubView({ type:'hasil', kuisId:k.id, nama:k.judul })}>
              <div className="list-avatar" style={{ background:'#ede9fe', color:'#7c3aed' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div className="list-body">
                <h4>{k.judul || '–'}</h4>
                <p>Durasi: {k.durasi || '–'} menit · {k.jumlah_soal ?? 0} soal{k.deadline ? ` · Deadline ${new Date(k.deadline).toLocaleDateString('id-ID')}` : ''}</p>
              </div>
              <div style={{ textAlign:'right' }}>
                <span className="badge badge-purple">{k.peserta_count ?? 0} peserta</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Hasil kuis sub-view ── */
function HasilKuisView({ kuisId, kuisNama, onBack }) {
  const { data, loading } = useFetch(() => elearningServiceDosen.hasilKuis(kuisId), [kuisId])
  const hasil = Array.isArray(data) ? data : data?.data || []

  return (
    <div>
      <button className="el-back-btn" onClick={onBack}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
        Kembali ke daftar kuis
      </button>
      <h3 className="el-sub-title">Hasil Kuis — {kuisNama}</h3>

      {loading ? <div className="el-skeleton" style={{ height:60 }}/> :
        hasil.length === 0 ? <p className="el-empty-text">Belum ada peserta.</p> : (
        <div className="card nil-table-card">
          <div className="nil-tbl-hdr">
            <span className="nil-col-no">No</span>
            <span className="nil-col-nim">NIM</span>
            <span style={{ flex:1 }}>Nama</span>
            <span style={{ width:80, textAlign:'center', flexShrink:0 }}>Skor</span>
            <span style={{ width:140, flexShrink:0 }}>Waktu Selesai</span>
          </div>
          {hasil.map((h, i) => (
            <div key={h.id || i} className="nil-tbl-row">
              <span className="nil-col-no">{i+1}</span>
              <span className="nil-col-nim">{h.mahasiswa?.nim || h.nim || '–'}</span>
              <span style={{ flex:1, fontSize:13 }}>{h.mahasiswa?.nama || h.nama || '–'}</span>
              <span style={{ width:80, textAlign:'center', flexShrink:0 }}>
                <span className="badge badge-green" style={{ fontSize:13, fontWeight:700 }}>{h.nilai ?? h.skor ?? '–'}</span>
              </span>
              <span style={{ width:140, flexShrink:0, fontSize:11, color:'var(--text3)' }}>
                {h.selesai_at ? new Date(h.selesai_at).toLocaleString('id-ID') : '–'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
