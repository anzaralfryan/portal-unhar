import { useState, useEffect } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import { adminService } from '../../services/services'
import { getErrorMessage } from '../../services/api'
import './AdminCrud.css'

const KELAS  = ['pagi','sore','karyawan']
const STATUS = ['aktif','cuti','lulus','keluar']
const TH     = new Date().getFullYear()

/* ══════════════════════════════════════════════════════
   NPM Generator — format 9 digit:
   2 digit tahun masuk + "2370" + 3 digit nomor urut pendaftar
   Contoh: 222370066 → angkatan 2022, pendaftar ke-066
   Contoh: 272370001 → angkatan 2027, pendaftar ke-001
══════════════════════════════════════════════════════ */
function generateNPM(angkatan, existingList = []) {
  const yr = String(angkatan).slice(-2)  // 2022 → "22", 2027 → "27"
  // Cari nomor urut tertinggi yang sudah ada untuk angkatan ini
  const existing = existingList
    .map(m => m.nim || '')
    .filter(nim => nim.startsWith(yr + '2370'))
    .map(nim => parseInt(nim.slice(-3), 10))
    .filter(n => !isNaN(n))
  const maxUrut  = existing.length > 0 ? Math.max(...existing) : 0
  const nextUrut = String(maxUrut + 1).padStart(3, '0')
  return yr + '2370' + nextUrut
}

function generateEmail(namaLengkap) {
  if (!namaLengkap) return ''
  const firstName = namaLengkap.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${firstName}@mhs.unhar.ac.id`
}

/* ── Ikon SVG Aksi (tidak pakai emoji) ── */
const IcoEdit  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IcoReset = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
const IcoDel   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
const IcoCheck = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>

/* ── Grup semester component ── */
function SemesterGroup({ semester, items, onEdit, onReset, onDel, onForceDelete, onActivate, showInactive, page, pageSize, offset }) {
  const [open, setOpen] = useState(true)
  const filtered = showInactive ? items : items.filter(m => m.user?.is_active !== false)
  if (filtered.length === 0) return null
  return (
    <div className="adm-sem-group">
      <div className="adm-sem-header" onClick={() => setOpen(v => !v)}>
        <span className="adm-sem-label">Semester {semester}</span>
        <span className="adm-sem-count">{filtered.length} mahasiswa</span>
        <svg className={`adm-sem-chevron ${open ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {open && (
        <div className="adm-sem-body">
          {filtered.map((m, i) => (
            <div key={m.id || i} className="adm-trow">
              <span className="c-no">{offset + i + 1}</span>
              <span className="c-nim">{m.nim || '–'}</span>
              <span className="c-nama">
                {m.user?.name || '–'}
                {m.user?.is_active === false && <span className="status-badge-inactive" style={{marginLeft:8}}>Nonaktif</span>}
              </span>
              <span className="c-email">{m.user?.email || '–'}</span>
              <span className="c-prodi">{m.prodi?.nama || '–'}</span>
              <span className="c-act">
                <button className="adm-btn-edit"  onClick={() => onEdit(m)}  title="Edit"><IcoEdit/></button>
                <button className="adm-btn-reset" onClick={() => onReset(m)} title="Reset Password"><IcoReset/></button>
                {m.user?.is_active === false ? (
                  <>
                    <button className="adm-btn-activate" onClick={() => onActivate(m)} title="Aktifkan kembali"><IcoCheck/></button>
                    <button className="adm-btn-del" onClick={() => onForceDelete(m)} title="Hapus Permanen"><IcoDel/></button>
                  </>
                ) : (
                  <button className="adm-btn-del" onClick={() => onDel(m)} title="Nonaktifkan">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MahasiswaPage() {
  const [list,      setList]      = useState([])
  const [prodiList, setProdiList] = useState([])
  const [dosenList, setDosenList] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [search,    setSearch]    = useState('')
  const [showForm,  setShowForm]  = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState({})
  const [saving,    setSaving]    = useState(false)
  const [formErr,   setFormErr]   = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [filterProdi,  setFilterProdi]  = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await adminService.getMahasiswa({ search, limit: 200 })
      const d   = res.data?.data || res.data
      setList(Array.isArray(d) ? d : (d?.data || d?.items || []))
    } catch(e) { setError(getErrorMessage(e)) } finally { setLoading(false) }
  }

  async function loadProdi() {
    try { const r = await adminService.getProdi(); setProdiList(Array.isArray(r.data?.data) ? r.data.data : []) } catch {}
  }
  async function loadDosen() {
    try { const r = await adminService.getDosen(); const d = r.data?.data || r.data; setDosenList(Array.isArray(d) ? d : (d?.data || [])) } catch {}
  }

  useEffect(() => { loadProdi(); loadDosen() }, [])
  useEffect(() => { load() }, [])
  useEffect(() => {
    const t = setTimeout(() => load(), 400)
    return () => clearTimeout(t)
  }, [search])

  function openAdd() {
    const angkatan = TH
    const npm = generateNPM(angkatan, list)
    setEditing(null)
    setForm({ name:'', email:'', nim: npm, prodi_id:'', angkatan, semester:1, kelas:'pagi', password: npm })
    setFormErr(''); setShowForm(true)
  }

  function openEdit(m) {
    setEditing(m)
    setForm({ name: m.user?.name || '', semester: m.semester || 1, kelas: m.kelas || 'pagi', status: m.status || 'aktif', prodi_id: m.prodi_id || m.prodi?.id || '', dosen_pa_id: m.dosen_pa_id || '' })
    setFormErr(''); setShowForm(true)
  }

  function handleNameChange(val) {
    setForm(p => {
      const next = { ...p, name: val }
      if (!editing && (p.email === '' || p.email === generateEmail(p.name))) next.email = generateEmail(val)
      return next
    })
  }

  function handleAngkatanChange(val) {
    const npm = generateNPM(val, list)
    setForm(p => ({ ...p, angkatan: val, nim: npm, password: npm }))
  }

  function regenNPM() {
    const npm = generateNPM(form.angkatan || TH, list)
    setForm(p => ({ ...p, nim: npm, password: npm }))
  }

  async function handleSave() {
    setSaving(true); setFormErr('')
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      if (editing) await adminService.updateMahasiswa(editing.id, payload)
      else await adminService.storeMahasiswa(payload)
      setShowForm(false); load()
    } catch(e) { setFormErr(getErrorMessage(e)) } finally { setSaving(false) }
  }

  async function handleDel(m)         { if (!confirm('Nonaktifkan ' + (m.user?.name||m.nim) + '?')) return; try { await adminService.deleteMahasiswa(m.id); load() } catch(e) { alert(getErrorMessage(e)) } }
  async function handleReset(m)       { if (!confirm('Reset password ' + (m.user?.name||m.nim) + ' ke NPM?')) return; try { const r = await adminService.resetPwMahasiswa(m.id); alert(r?.data?.message||'Password direset.') } catch(e) { alert(getErrorMessage(e)) } }
  async function handleActivate(m)    { if (!confirm('Aktifkan kembali ' + (m.user?.name||m.nim) + '?')) return; try { await adminService.activateMahasiswa(m.id); load() } catch(e) { alert(getErrorMessage(e)) } }
  async function handleForceDelete(m) {
    if (!confirm('HAPUS PERMANEN: ' + (m.user?.name||m.nim) + '?\n\nTidak bisa dibatalkan.')) return
    const k = prompt('Ketik HAPUS untuk konfirmasi:')
    if (k !== 'HAPUS') { alert('Dibatalkan.'); return }
    try { await adminService.forceDeleteMahasiswa(m.id); load() } catch(e) { alert(getErrorMessage(e)) }
  }

  const sel = { padding:'10px 12px', border:'1.5px solid var(--border)', borderRadius:9, fontSize:13, background:'#fff', outline:'none', width:'100%' }

  // Kelompokkan per semester
  const filtered = list.filter(m => {
    const matchSearch = !search || (m.user?.name||'').toLowerCase().includes(search.toLowerCase()) || (m.nim||'').includes(search)
    const matchProdi  = !filterProdi || String(m.prodi_id || m.prodi?.id) === filterProdi
    return matchSearch && matchProdi
  })

  const bySemester = {}
  filtered.forEach(m => {
    const sem = m.semester || 0
    if (!bySemester[sem]) bySemester[sem] = []
    bySemester[sem].push(m)
  })
  const semesterKeys = Object.keys(bySemester).map(Number).sort((a,b) => a - b)

  let counter = 0

  return (
    <div className="page-single">
      <PageHeader title="Manajemen Mahasiswa" subtitle={`Total: ${filtered.length} mahasiswa`}/>
      <div className="content-body">
        <div className="adm-toolbar">
          <input className="adm-search" placeholder="Cari nama atau NPM..." value={search} onChange={e => setSearch(e.target.value)}/>
          <select value={filterProdi} onChange={e => setFilterProdi(e.target.value)}
            style={{padding:'8px 12px',border:'1.5px solid var(--border)',borderRadius:9,fontSize:12.5,background:'#fff',outline:'none'}}>
            <option value="">Semua Prodi</option>
            {prodiList.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text2)',cursor:'pointer',userSelect:'none'}}>
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)}/>
            Tampilkan Nonaktif
          </label>
          <button className="adm-add-btn" onClick={openAdd}>+ Tambah Mahasiswa</button>
        </div>
        {error && <div className="adm-error">{error}</div>}

        {/* Header tabel */}
        <div className="card adm-table">
          <div className="adm-thead">
            <span className="c-no">No</span>
            <span className="c-nim">NPM</span>
            <span className="c-nama">Nama</span>
            <span className="c-email">Email</span>
            <span className="c-prodi">Prodi</span>
            <span className="c-act">Aksi</span>
          </div>

          {loading ? (
            <div className="adm-loading">Memuat...</div>
          ) : semesterKeys.length === 0 ? (
            <div className="adm-loading">Tidak ada data mahasiswa.</div>
          ) : (
            semesterKeys.map(sem => {
              const items = bySemester[sem]
              const offset = counter
              counter += (showInactive ? items : items.filter(m => m.user?.is_active !== false)).length
              return (
                <SemesterGroup
                  key={sem}
                  semester={sem === 0 ? '–' : sem}
                  items={items}
                  onEdit={openEdit}
                  onReset={handleReset}
                  onDel={handleDel}
                  onForceDelete={handleForceDelete}
                  onActivate={handleActivate}
                  showInactive={showInactive}
                  offset={offset}
                />
              )
            })
          )}
        </div>
      </div>

      {/* Modal Tambah/Edit */}
      {showForm && (
        <div className="adm-modal-bg" onClick={() => setShowForm(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hdr">
              <h3>{editing ? 'Edit Mahasiswa' : 'Tambah Mahasiswa Baru'}</h3>
              <button className="adm-modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="adm-modal-body">
              {formErr && <div className="adm-error">{formErr}</div>}

              <div className="adm-field">
                <label>Nama Lengkap</label>
                <input type="text" value={form.name||''} placeholder="Nama Lengkap Mahasiswa"
                  onChange={e => handleNameChange(e.target.value)}/>
              </div>

              {!editing && <>
                <div className="adm-field">
                  <label>
                    NPM <span style={{fontWeight:400,color:'var(--text3)',fontSize:11}}>(otomatis)</span>
                  </label>
                  <div style={{display:'flex',gap:8}}>
                    <input type="text" value={form.nim||''} readOnly style={{background:'#f8f9fb',flex:1,fontFamily:'monospace',letterSpacing:'0.5px'}}/>
                    <button type="button" onClick={regenNPM}
                      style={{padding:'8px 14px',borderRadius:8,border:'1.5px solid var(--border)',background:'#fff',cursor:'pointer',fontSize:13,whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:6}}>
                      <IcoReset/> Ulang
                    </button>
                  </div>
                  <p style={{fontSize:11,color:'var(--text3)',marginTop:4}}>
                    Format: <code style={{fontFamily:'monospace',background:'#f3f4f6',padding:'1px 5px',borderRadius:4}}>{form.angkatan?.toString().slice(-2)||TH.toString().slice(-2)}2370XXX</code>
                    — 2 digit tahun + 2370 + nomor urut pendaftar
                  </p>
                </div>
                <div className="adm-field">
                  <label>Email <span style={{fontWeight:400,color:'var(--text3)',fontSize:11}}>(otomatis dari nama)</span></label>
                  <input type="email" value={form.email||''} placeholder="otomatis dari nama pertama"
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}/>
                </div>
                <div className="adm-field">
                  <label>Angkatan (Tahun Masuk)</label>
                  <input type="number" min="2000" max="2099" value={form.angkatan||TH}
                    onChange={e => handleAngkatanChange(e.target.value)}/>
                </div>
              </>}

              <div className="adm-field">
                <label>Program Studi</label>
                <select value={form.prodi_id||''} style={sel} onChange={e => setForm(p => ({ ...p, prodi_id: e.target.value }))}>
                  <option value="">— Pilih Program Studi —</option>
                  {prodiList.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
                </select>
              </div>
              <div className="adm-field">
                <label>Semester</label>
                <input type="number" min="1" max="14" value={form.semester||1}
                  onChange={e => setForm(p => ({ ...p, semester: e.target.value }))}/>
              </div>
              <div className="adm-field">
                <label>Kelas</label>
                <select value={form.kelas||'pagi'} style={sel} onChange={e => setForm(p => ({ ...p, kelas: e.target.value }))}>
                  {KELAS.map(k => <option key={k} value={k}>{k[0].toUpperCase()+k.slice(1)}</option>)}
                </select>
              </div>

              {editing && <>
                <div className="adm-field">
                  <label>Status</label>
                  <select value={form.status||'aktif'} style={sel} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    {STATUS.map(s => <option key={s} value={s}>{s[0].toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </div>
                <div className="adm-field">
                  <label>Dosen Wali</label>
                  <select value={form.dosen_pa_id||''} style={sel} onChange={e => setForm(p => ({ ...p, dosen_pa_id: e.target.value }))}>
                    <option value="">— Belum ada Dosen Wali —</option>
                    {dosenList.map(d => <option key={d.id} value={d.id}>{d.user?.name||d.nidn}{d.jabatan?' — '+d.jabatan:''}</option>)}
                  </select>
                </div>
              </>}

              {!editing && (
                <div className="adm-field">
                  <label>Password <span style={{fontWeight:400,color:'var(--text3)',fontSize:11}}>(default = NPM, bisa diubah)</span></label>
                  <input type="text" value={form.password||''} placeholder="Minimal 8 karakter"
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}/>
                  <p style={{fontSize:11,color:'var(--text3)',marginTop:4}}>Mahasiswa bisa mengubah password setelah login pertama.</p>
                </div>
              )}
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn-cancel" onClick={() => setShowForm(false)}>Batal</button>
              <button className="adm-btn-save" onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
