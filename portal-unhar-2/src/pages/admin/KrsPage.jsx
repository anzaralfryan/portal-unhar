import { useState, useEffect } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import api, { getErrorMessage } from '../../services/api'
import { adminService, krsService } from '../../services/services'
import './AdminCrud.css'

const STATUS_BADGE = {
  draft:     { bg:'#f3f4f6', fg:'#6b7280', l:'Draft (diisi)' },
  disetujui: { bg:'#dcfce7', fg:'#16a34a', l:'Disetujui' },
  locked:    { bg:'#dbeafe', fg:'#1d4ed8', l:'✓ Terkunci Otomatis' },
}

/* ═══════════════════════════════════════════════════════════
   DETAIL KRS MODAL — admin lihat/ubah matkul mahasiswa
═══════════════════════════════════════════════════════════ */
function DetailKrsModal({ krsId, onClose, onChanged }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [toast, setToast]     = useState(null)
  const [toastErr, setToastErr] = useState(false)
  const [busy, setBusy]       = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await krsService.adminDetail(krsId)
      setData(res.data?.data || res.data)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [krsId])

  function showToast(msg, err = false) {
    setToast(msg); setToastErr(err)
    setTimeout(() => setToast(null), 2600)
  }

  async function addMatkul(jadwalId) {
    if (busy) return
    setBusy(true)
    try {
      const res = await krsService.adminAddMatkul(krsId, jadwalId)
      await load(); onChanged?.()
      showToast(res.data?.message || 'Matkul ditambahkan')
    } catch (e) {
      showToast(getErrorMessage(e), true)
    } finally {
      setBusy(false)
    }
  }

  async function removeMatkul(jadwalId, namaMatkul) {
    if (!confirm(`Hapus "${namaMatkul}" dari KRS mahasiswa?`)) return
    if (busy) return
    setBusy(true)
    try {
      const res = await krsService.adminRemoveMatkul(krsId, jadwalId)
      await load(); onChanged?.()
      showToast(res.data?.message || 'Matkul dihapus')
    } catch (e) {
      showToast(getErrorMessage(e), true)
    } finally {
      setBusy(false)
    }
  }

  const krs      = data?.krs
  const dipilih  = krs?.matkul || []
  const tersedia = data?.tersedia || []
  const totalSks = krs?.total_sks || 0

  return (
    <div className="adm-modal-bg" onClick={onClose}>
      <div className="adm-modal" style={{ maxWidth:780 }} onClick={e => e.stopPropagation()}>
        <div className="adm-modal-hdr">
          <div>
            <h3>Detail KRS Mahasiswa</h3>
            {krs && (
              <p style={{ fontSize:12, color:'var(--text3)', margin:0, marginTop:2 }}>
                {krs.mahasiswa?.nama} · {krs.mahasiswa?.nim} · {krs.tahun_akademik}
              </p>
            )}
          </div>
          <button className="adm-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="adm-modal-body" style={{ maxHeight:'70vh', overflowY:'auto' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:30, color:'var(--text3)' }}>Memuat detail...</div>
          ) : error ? (
            <div className="adm-error">{error}</div>
          ) : (
            <>
              {toast && (
                <div style={{
                  background: toastErr ? 'var(--red)' : 'var(--teal)',
                  color:'#fff', padding:'8px 12px', borderRadius:6, marginBottom:10,
                  fontSize:12, fontWeight:600,
                }}>{toast}</div>
              )}

              {krs?.is_locked && (
                <div style={{
                  background:'#dbeafe', color:'#1e40af', padding:'12px 14px',
                  borderRadius:8, marginBottom:14, fontSize:12, lineHeight:1.6,
                  border:'1px solid #93c5fd',
                }}>
                  <strong>✓ KRS Terkunci Otomatis</strong> — KRS ini dikunci oleh sistem saat mahasiswa menyimpan.
                  Anda tetap bisa menambah/hapus matkul di sini kapan saja (intervensi admin).
                  Mahasiswa akan mendapat notifikasi setiap ada perubahan.
                </div>
              )}
              {!krs?.is_locked && (
                <div style={{
                  background:'#f0fdf4', color:'#166534', padding:'10px 12px',
                  borderRadius:8, marginBottom:14, fontSize:12, lineHeight:1.5,
                  border:'1px solid #86efac',
                }}>
                  <strong>Draft</strong> — KRS masih bisa diubah oleh mahasiswa. Akan terkunci otomatis saat mahasiswa mengklik "Kunci KRS".
                </div>
              )}

              {/* Matkul yang sudah dipilih */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <h4 style={{ fontSize:13, fontWeight:700, margin:0 }}>
                  Mata Kuliah Dipilih
                  <span style={{ fontSize:11, color:'var(--text3)', marginLeft:8, fontWeight:500 }}>
                    {dipilih.length} matkul · {totalSks} SKS
                  </span>
                </h4>
                <button className="adm-add-btn" style={{ fontSize:12, padding:'6px 12px' }} onClick={() => setShowAdd(v => !v)}>
                  {showAdd ? '− Tutup' : '+ Tambah Matkul'}
                </button>
              </div>

              {dipilih.length === 0 ? (
                <p style={{ fontSize:12, color:'var(--text3)', padding:14, textAlign:'center', border:'1px dashed var(--border)', borderRadius:8 }}>
                  Belum ada mata kuliah di KRS ini.
                </p>
              ) : (
                <div className="card" style={{ marginBottom:14 }}>
                  {dipilih.map((m, i) => (
                    <div key={m.jadwal_id} className="list-item" style={{ borderBottom: i < dipilih.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{
                        background:'#dbeafe', color:'#1e40af', padding:'3px 8px',
                        borderRadius:8, fontSize:11, fontWeight:700, flexShrink:0,
                      }}>{m.sks} SKS</span>
                      <div className="list-body">
                        <h4>{m.nama}</h4>
                        <p>{m.kode} · {m.dosen || '–'} · {m.hari} {m.jam_mulai?.slice(0,5)}–{m.jam_selesai?.slice(0,5)}</p>
                      </div>
                      <button
                        onClick={() => removeMatkul(m.jadwal_id, m.nama)}
                        disabled={busy}
                        title="Hapus dari KRS"
                        style={{
                          background:'#fee2e2', color:'var(--red)', border:'none',
                          width:30, height:30, borderRadius:6, cursor:'pointer', fontSize:14,
                        }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Form tambah matkul */}
              {showAdd && (
                <>
                  <h4 style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>
                    Mata Kuliah Tersedia
                    <span style={{ fontSize:11, color:'var(--text3)', marginLeft:8, fontWeight:500 }}>
                      {tersedia.length} tersedia · sisa kuota: {24 - totalSks} SKS
                    </span>
                  </h4>
                  {tersedia.length === 0 ? (
                    <p style={{ fontSize:12, color:'var(--text3)', padding:14, textAlign:'center' }}>
                      Tidak ada jadwal lain di tahun akademik ini.
                    </p>
                  ) : (
                    <div className="card">
                      {tersedia.map((j, i) => {
                        const bisaTambah = (j.sks || 0) <= (24 - totalSks)
                        return (
                          <div key={j.jadwal_id} className="list-item" style={{ borderBottom: i < tersedia.length - 1 ? '1px solid var(--border)' : 'none', opacity: bisaTambah ? 1 : 0.5 }}>
                            <span style={{
                              background:'#f3f4f6', color:'#4b5563', padding:'3px 8px',
                              borderRadius:8, fontSize:11, fontWeight:700, flexShrink:0,
                            }}>{j.sks} SKS</span>
                            <div className="list-body">
                              <h4>{j.nama}</h4>
                              <p>{j.kode} · {j.dosen || '–'} · {j.hari} {j.jam_mulai?.slice(0,5)}–{j.jam_selesai?.slice(0,5)}</p>
                            </div>
                            <button
                              onClick={() => addMatkul(j.jadwal_id)}
                              disabled={busy || !bisaTambah}
                              style={{
                                background: bisaTambah ? 'var(--teal)' : '#f3f4f6',
                                color: bisaTambah ? '#fff' : 'var(--text3)',
                                border:'none', padding:'6px 10px', borderRadius:6,
                                cursor: bisaTambah ? 'pointer' : 'not-allowed', fontSize:11, fontWeight:600,
                              }}>
                              {bisaTambah ? '+ Tambah' : 'Over SKS'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
        <div className="adm-modal-footer">
          <button className="adm-btn-cancel" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN ADMIN KRS PAGE
═══════════════════════════════════════════════════════════ */
export default function KrsPage() {
  const [list, setList]             = useState([])
  const [tahunList, setTahunList]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [filterTahun, setFilterTahun]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [detailId, setDetailId]     = useState(null)

  async function load() {
    setLoading(true); setError('')
    try {
      const q = {}
      if (filterTahun) q.tahun_id = filterTahun
      if (filterStatus) q.status = filterStatus
      const res = await api.get('/admin/krs', { params: q })
      const d = res.data?.data || res.data
      setList(Array.isArray(d) ? d : (d?.data || []))
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }
  async function loadTahun() {
    try {
      const r = await adminService.getTahun()
      const d = r.data?.data || r.data
      setTahunList(Array.isArray(d) ? d : [])
    } catch {}
  }

  useEffect(() => { loadTahun() }, [])
  useEffect(() => { load() }, [filterTahun, filterStatus])

  async function lock(k) {
    if (!confirm('Kunci KRS ini secara manual?')) return
    try { await api.put(`/admin/krs/${k.id}/lock`); load() } catch (e) { alert(getErrorMessage(e)) }
  }
  async function unlock(k) {
    if (!confirm('Buka kunci KRS ini?')) return
    try { await api.put(`/admin/krs/${k.id}/unlock`); load() } catch (e) { alert(getErrorMessage(e)) }
  }

  const sel = { padding:'8px 12px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:13, background:'#fff', minWidth:160 }

  return (
    <div className="page-single">
      <PageHeader title="Kelola KRS Mahasiswa" subtitle={`Total: ${list.length} KRS · KRS terkunci otomatis saat mahasiswa simpan · klik baris untuk kelola matkul`}/>
      <div className="content-body">
        <div className="adm-toolbar">
          <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} style={sel}>
            <option value="">Semua Tahun</option>
            {tahunList.map(t => <option key={t.id} value={t.id}>{t.tahun} {t.semester}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={sel}>
            <option value="">Semua Status</option>
            <option value="draft">Draft (sedang diisi)</option>
            <option value="locked">Terkunci Otomatis</option>
            <option value="disetujui">Disetujui</option>
          </select>
          <div style={{ flex:1 }}/>
        </div>
        {error && <div className="adm-error">{error}</div>}

        <div className="card adm-table">
          <div className="adm-thead">
            <span className="c-no">No</span>
            <span className="c-nim">NIM</span>
            <span className="c-nama">Mahasiswa</span>
            <span className="c-prodi">Tahun Akademik</span>
            <span className="c-sem">Matkul</span>
            <span className="c-sem">Status</span>
            <span className="c-act">Aksi</span>
          </div>
          {loading ? (
            <div className="adm-loading">Memuat...</div>
          ) : list.length === 0 ? (
            <div className="adm-loading">Tidak ada data KRS.</div>
          ) : (
            list.map((k, i) => {
              const badge = STATUS_BADGE[k.status] || STATUS_BADGE.draft
              const matkulCount = Array.isArray(k.detail) ? k.detail.length : 0
              return (
                <div key={k.id} className="adm-trow" style={{ cursor:'pointer' }} onClick={() => setDetailId(k.id)}>
                  <span className="c-no">{i+1}</span>
                  <span className="c-nim">{k.mahasiswa?.nim || '–'}</span>
                  <span className="c-nama">{k.mahasiswa?.user?.name || '–'}</span>
                  <span className="c-prodi">{k.tahun_akademik ? `${k.tahun_akademik.tahun} ${k.tahun_akademik.semester}` : '–'}</span>
                  <span className="c-sem">{matkulCount} matkul</span>
                  <span className="c-sem">
                    <span style={{ background:badge.bg, color:badge.fg, padding:'3px 10px', borderRadius:10, fontSize:11, fontWeight:600 }}>{badge.l}</span>
                  </span>
                  <span className="c-act" onClick={e => e.stopPropagation()}>
                    <button className="adm-btn-edit" onClick={() => setDetailId(k.id)} title="Kelola matkul">✏</button>
                    {k.status === 'locked'
                      ? <button className="adm-btn-reset" onClick={() => unlock(k)} title="Buka kunci"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg></button>
                      : <button className="adm-btn-edit" onClick={() => lock(k)} title="Kunci" style={{background:"#ede9fe",color:"#7c3aed"}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></button>}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {detailId && (
        <DetailKrsModal
          krsId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={load}
        />
      )}
    </div>
  )
}
