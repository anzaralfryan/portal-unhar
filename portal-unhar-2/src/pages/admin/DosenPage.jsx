import { useState, useEffect } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import { adminService } from '../../services/services'
import { getErrorMessage } from '../../services/api'
import './AdminCrud.css'

const PAGE_SIZE = 50

/* ══════════════════════════════════════════════════════
   NIDN — 10 digit dengan makna:
   [01/02][TGL][BLN][TH_LAHIR 2 digit][NO_URUT 2 digit]
   Contoh: 0115038603
   → 01 = aktif mengajar
   → 15 = tanggal lahir
   → 03 = bulan lahir
   → 86 = tahun lahir (1986)
   → 03 = nomor urut NIDN ke-3
══════════════════════════════════════════════════════ */
function generateNIDN({ statusKode = '01', tglLahir = '', bulanLahir = '', tahunLahir = '', noUrut = '' }) {
  const kode  = statusKode || '01'
  const tgl   = String(tglLahir   || Math.floor(Math.random()*28)+1).padStart(2,'0')
  const bln   = String(bulanLahir || Math.floor(Math.random()*12)+1).padStart(2,'0')
  const thn   = String(tahunLahir || (new Date().getFullYear()-30)).slice(-2)
  const urut  = String(noUrut     || Math.floor(Math.random()*9)+1).padStart(2,'0')
  return kode + tgl + bln + thn + urut
}

function generateEmailDosen(namaLengkap) {
  if (!namaLengkap) return ''
  const firstName = namaLengkap.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'')
  return `${firstName}@unhar.ac.id`
}

/* Jabatan default — bisa ditambah dari UI */
const JABATAN_DEFAULT = ['Asisten Ahli','Lektor','Lektor Kepala','Guru Besar / Profesor','Dosen Tetap','Dosen Luar Biasa','Instruktur']

/* ── Ikon SVG Aksi ── */
const IcoEdit  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IcoReset = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
const IcoDel   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
const IcoCheck = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>

/* ── Grup per prodi ── */
function ProdiGroup({ prodi, items, onEdit, onReset, onDel, onForceDelete, onActivate, showInactive, offset }) {
  const [open, setOpen] = useState(true)
  const filtered = showInactive ? items : items.filter(d => d.user?.is_active !== false)
  if (filtered.length === 0) return null
  return (
    <div className="adm-sem-group">
      <div className="adm-sem-header" onClick={() => setOpen(v => !v)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--primary)',flexShrink:0}}>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        <span className="adm-sem-label">{prodi}</span>
        <span className="adm-sem-count">{filtered.length} dosen</span>
        <svg className={`adm-sem-chevron ${open ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {open && (
        <div className="adm-sem-body">
          {filtered.map((d, i) => (
            <div key={d.id || i} className="adm-trow">
              <span className="c-no">{offset + i + 1}</span>
              <span className="c-nim" style={{fontFamily:'monospace',fontSize:11.5}}>{d.nidn || d.nip || '–'}</span>
              <span className="c-nama">
                {d.user?.name || '–'}
                {d.user?.is_active === false && <span className="status-badge-inactive" style={{marginLeft:8}}>Nonaktif</span>}
              </span>
              <span className="c-email">{d.user?.email || '–'}</span>
              <span className="c-sem">{d.jabatan || '–'}</span>
              <span className="c-act">
                <button className="adm-btn-edit"  onClick={() => onEdit(d)}  title="Edit"><IcoEdit/></button>
                <button className="adm-btn-reset" onClick={() => onReset(d)} title="Reset Password"><IcoReset/></button>
                {d.user?.is_active === false ? (
                  <>
                    <button className="adm-btn-activate" onClick={() => onActivate(d)} title="Aktifkan"><IcoCheck/></button>
                    <button className="adm-btn-del" onClick={() => onForceDelete(d)} title="Hapus Permanen"><IcoDel/></button>
                  </>
                ) : (
                  <button className="adm-btn-del" onClick={() => onDel(d)} title="Nonaktifkan">
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

export default function DosenPage() {
  const [list,         setList]         = useState([])
  const [prodiList,    setProdiList]    = useState([])
  const [jabatanList,  setJabatanList]  = useState([...JABATAN_DEFAULT])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [search,       setSearch]       = useState('')
  const [showForm,     setShowForm]     = useState(false)
  const [editing,      setEditing]      = useState(null)
  const [form,         setForm]         = useState({})
  const [saving,       setSaving]       = useState(false)
  const [formErr,      setFormErr]      = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [filterProdi,  setFilterProdi]  = useState('')
  /* NIDN builder state */
  const [nidnBuilder, setNidnBuilder]  = useState({ statusKode:'01', tglLahir:'', bulanLahir:'', tahunLahir:'', noUrut:'' })
  /* Tambah jabatan baru */
  const [showAddJabatan, setShowAddJabatan] = useState(false)
  const [jabatanBaru,    setJabatanBaru]    = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await adminService.getDosen({ search, limit: 200 })
      const d   = res.data?.data || res.data
      setList(Array.isArray(d) ? d : (d?.data || d?.items || []))
    } catch(e) { setError(getErrorMessage(e)) } finally { setLoading(false) }
  }

  async function loadProdi() {
    try { const r = await adminService.getProdi(); setProdiList(Array.isArray(r.data?.data) ? r.data.data : []) } catch {}
  }

  useEffect(() => { loadProdi() }, [])
  useEffect(() => { load() }, [])
  useEffect(() => { const t = setTimeout(() => load(), 400); return () => clearTimeout(t) }, [search])

  function buildAndSetNIDN(newBuilder) {
    const nb = { ...nidnBuilder, ...newBuilder }
    setNidnBuilder(nb)
    const nidn = generateNIDN(nb)
    setForm(p => ({ ...p, nidn, password: p.password === p.nidn || !p.password ? nidn : p.password }))
  }

  function openAdd() {
    const nb = { statusKode:'01', tglLahir:'', bulanLahir:'', tahunLahir:'', noUrut:'' }
    setNidnBuilder(nb)
    const nidn = generateNIDN(nb)
    setEditing(null)
    setForm({ name:'', email:'', nidn, prodi_id:'', jabatan:'', password: nidn })
    setFormErr(''); setShowForm(true)
  }

  function openEdit(d) {
    setEditing(d)
    setForm({ name: d.user?.name||'', jabatan: d.jabatan||'', prodi_id: d.prodi_id||d.prodi?.id||'' })
    setFormErr(''); setShowForm(true)
  }

  function handleNameChange(val) {
    setForm(p => {
      const next = { ...p, name: val }
      if (!editing && (p.email==='' || p.email===generateEmailDosen(p.name))) next.email = generateEmailDosen(val)
      return next
    })
  }

  function addJabatanBaru() {
    if (!jabatanBaru.trim()) return
    const j = jabatanBaru.trim()
    setJabatanList(prev => prev.includes(j) ? prev : [...prev, j])
    setForm(p => ({ ...p, jabatan: j }))
    setJabatanBaru(''); setShowAddJabatan(false)
  }

  async function handleSave() {
    setSaving(true); setFormErr('')
    try {
      const payload = { ...form }
      // Kirim sebagai `nip` ke backend (field lama) — alias NIDN
      if (!editing) payload.nip = payload.nidn
      if (!payload.password) delete payload.password
      if (editing) await adminService.updateDosen(editing.id, payload)
      else await adminService.storeDosen(payload)
      setShowForm(false); load()
    } catch(e) { setFormErr(getErrorMessage(e)) } finally { setSaving(false) }
  }

  async function handleDel(d)         { if (!confirm('Nonaktifkan ' + (d.user?.name||d.nidn||d.nip) + '?')) return; try { await adminService.deleteDosen(d.id); load() } catch(e) { alert(getErrorMessage(e)) } }
  async function handleReset(d)       { if (!confirm('Reset password ' + (d.user?.name||d.nidn) + ' ke NIDN?')) return; try { const r = await adminService.resetPwDosen(d.id); alert(r?.data?.message||'Password direset ke NIDN.') } catch(e) { alert(getErrorMessage(e)) } }
  async function handleActivate(d)    { if (!confirm('Aktifkan ' + (d.user?.name||d.nidn) + '?')) return; try { await adminService.activateDosen(d.id); load() } catch(e) { alert(getErrorMessage(e)) } }
  async function handleForceDelete(d) {
    if (!confirm('HAPUS PERMANEN: ' + (d.user?.name||d.nidn) + '?')) return
    const k = prompt('Ketik HAPUS untuk konfirmasi:')
    if (k !== 'HAPUS') { alert('Dibatalkan.'); return }
    try { await adminService.forceDeleteDosen(d.id); load() } catch(e) { alert(getErrorMessage(e)) }
  }

  const sel = { padding:'10px 12px', border:'1.5px solid var(--border)', borderRadius:9, fontSize:13, background:'#fff', outline:'none', width:'100%' }

  // Filter & kelompokkan per prodi
  const filtered = list.filter(d => {
    const matchSearch = !search || (d.user?.name||'').toLowerCase().includes(search.toLowerCase()) || (d.nidn||d.nip||'').includes(search)
    const matchProdi  = !filterProdi || String(d.prodi_id||d.prodi?.id) === filterProdi
    return matchSearch && matchProdi
  })

  const byProdi = {}
  filtered.forEach(d => {
    const prodi = d.prodi?.nama || 'Prodi Tidak Diketahui'
    if (!byProdi[prodi]) byProdi[prodi] = []
    byProdi[prodi].push(d)
  })
  const prodiKeys = Object.keys(byProdi).sort()
  let counter = 0

  return (
    <div className="page-single">
      <PageHeader title="Manajemen Dosen" subtitle={`Total: ${filtered.length} dosen`}/>
      <div className="content-body">
        <div className="adm-toolbar">
          <input className="adm-search" placeholder="Cari nama atau NIDN..." value={search} onChange={e => setSearch(e.target.value)}/>
          <select value={filterProdi} onChange={e => setFilterProdi(e.target.value)}
            style={{padding:'8px 12px',border:'1.5px solid var(--border)',borderRadius:9,fontSize:12.5,background:'#fff',outline:'none'}}>
            <option value="">Semua Prodi</option>
            {prodiList.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text2)',cursor:'pointer',userSelect:'none'}}>
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)}/>
            Tampilkan Nonaktif
          </label>
          <button className="adm-add-btn" onClick={openAdd}>+ Tambah Dosen</button>
        </div>
        {error && <div className="adm-error">{error}</div>}

        <div className="card adm-table">
          <div className="adm-thead">
            <span className="c-no">No</span>
            <span className="c-nim">NIDN</span>
            <span className="c-nama">Nama</span>
            <span className="c-email">Email</span>
            <span className="c-sem">Jabatan</span>
            <span className="c-act">Aksi</span>
          </div>

          {loading ? (
            <div className="adm-loading">Memuat...</div>
          ) : prodiKeys.length === 0 ? (
            <div className="adm-loading">Tidak ada data dosen.</div>
          ) : (
            prodiKeys.map(prodi => {
              const items = byProdi[prodi]
              const offset = counter
              counter += (showInactive ? items : items.filter(d => d.user?.is_active !== false)).length
              return (
                <ProdiGroup
                  key={prodi}
                  prodi={prodi}
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

      {/* Modal Form */}
      {showForm && (
        <div className="adm-modal-bg" onClick={() => setShowForm(false)}>
          <div className="adm-modal" style={{maxWidth:540}} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hdr">
              <h3>{editing ? 'Edit Data Dosen' : 'Tambah Dosen Baru'}</h3>
              <button className="adm-modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="adm-modal-body">
              {formErr && <div className="adm-error">{formErr}</div>}

              <div className="adm-field">
                <label>Nama Lengkap + Gelar</label>
                <input type="text" value={form.name||''} placeholder="Contoh: Dr. Budi Santoso, M.Kom."
                  onChange={e => handleNameChange(e.target.value)}/>
              </div>

              {!editing && <>
                {/* ── NIDN Builder ── */}
                <div className="adm-field">
                  <label>
                    NIDN <span style={{fontWeight:400,color:'var(--text3)',fontSize:11}}>(Nomor Induk Dosen Nasional — 10 digit)</span>
                  </label>
                  <div style={{background:'#f8f9fb',border:'1.5px solid var(--border)',borderRadius:10,padding:'12px 14px',marginBottom:6}}>
                    <p style={{fontSize:11,color:'var(--text3)',marginBottom:8}}>
                      Format: <code style={{fontFamily:'monospace',background:'#e8f5e8',padding:'1px 5px',borderRadius:3,color:'var(--primary)'}}>
                        {nidnBuilder.statusKode||'01'}{String(nidnBuilder.tglLahir||'TT').padStart(2,'0')}{String(nidnBuilder.bulanLahir||'BB').padStart(2,'0')}{String(nidnBuilder.tahunLahir||'TH').slice(-2)}{String(nidnBuilder.noUrut||'NN').padStart(2,'0')}
                      </code>
                    </p>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:8}}>
                      <div>
                        <label style={{fontSize:10.5,fontWeight:600,color:'var(--text3)',display:'block',marginBottom:4}}>Tgl Lahir</label>
                        <input type="number" min="1" max="31" value={nidnBuilder.tglLahir} placeholder="TT"
                          onChange={e => buildAndSetNIDN({ tglLahir: e.target.value })}
                          style={{width:'100%',padding:'6px 8px',border:'1.5px solid var(--border)',borderRadius:7,fontSize:13}}/>
                      </div>
                      <div>
                        <label style={{fontSize:10.5,fontWeight:600,color:'var(--text3)',display:'block',marginBottom:4}}>Bln Lahir</label>
                        <input type="number" min="1" max="12" value={nidnBuilder.bulanLahir} placeholder="BB"
                          onChange={e => buildAndSetNIDN({ bulanLahir: e.target.value })}
                          style={{width:'100%',padding:'6px 8px',border:'1.5px solid var(--border)',borderRadius:7,fontSize:13}}/>
                      </div>
                      <div>
                        <label style={{fontSize:10.5,fontWeight:600,color:'var(--text3)',display:'block',marginBottom:4}}>Thn Lahir</label>
                        <input type="number" min="1940" max="2005" value={nidnBuilder.tahunLahir} placeholder="TTTT"
                          onChange={e => buildAndSetNIDN({ tahunLahir: e.target.value })}
                          style={{width:'100%',padding:'6px 8px',border:'1.5px solid var(--border)',borderRadius:7,fontSize:13}}/>
                      </div>
                      <div>
                        <label style={{fontSize:10.5,fontWeight:600,color:'var(--text3)',display:'block',marginBottom:4}}>No. Urut</label>
                        <input type="number" min="1" max="99" value={nidnBuilder.noUrut} placeholder="NN"
                          onChange={e => buildAndSetNIDN({ noUrut: e.target.value })}
                          style={{width:'100%',padding:'6px 8px',border:'1.5px solid var(--border)',borderRadius:7,fontSize:13}}/>
                      </div>
                      <div>
                        <label style={{fontSize:10.5,fontWeight:600,color:'var(--text3)',display:'block',marginBottom:4}}>Status Kode</label>
                        <select value={nidnBuilder.statusKode} onChange={e => buildAndSetNIDN({ statusKode: e.target.value })}
                          style={{width:'100%',padding:'6px 8px',border:'1.5px solid var(--border)',borderRadius:7,fontSize:12.5}}>
                          <option value="01">01 – Aktif</option>
                          <option value="02">02 – Tidak Aktif</option>
                        </select>
                      </div>
                    </div>
                    {/* NIDN hasil */}
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <input type="text" value={form.nidn||''} readOnly
                        style={{flex:1,fontFamily:'monospace',letterSpacing:'1.5px',background:'#fff',padding:'8px 12px',border:'1.5px solid var(--primary)',borderRadius:8,fontWeight:700,color:'var(--primary)',fontSize:15}}/>
                      <button type="button" onClick={() => { const nidn = generateNIDN(nidnBuilder); setForm(p => ({ ...p, nidn, password: nidn })) }}
                        style={{padding:'8px 14px',borderRadius:8,border:'1.5px solid var(--border)',background:'#fff',cursor:'pointer',fontSize:12,whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:5}}>
                        <IcoReset/> Generate
                      </button>
                    </div>
                    <p style={{fontSize:11,color:'var(--text3)',marginTop:6}}>
                      Atau isi NIDN manual langsung di kolom NIDN di atas.
                    </p>
                  </div>
                </div>

                <div className="adm-field">
                  <label>Email <span style={{fontWeight:400,color:'var(--text3)',fontSize:11}}>(otomatis dari nama)</span></label>
                  <input type="email" value={form.email||''} placeholder="nama@unhar.ac.id"
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}/>
                </div>
              </>}

              <div className="adm-field">
                <label>Program Studi</label>
                <select value={form.prodi_id||''} style={sel} onChange={e => setForm(p => ({ ...p, prodi_id: e.target.value }))}>
                  <option value="">— Pilih Program Studi —</option>
                  {prodiList.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
                </select>
              </div>

              {/* Jabatan — dropdown + bisa tambah baru */}
              <div className="adm-field">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <label style={{marginBottom:0}}>Jabatan / Gelar Akademik</label>
                  <button type="button" onClick={() => setShowAddJabatan(v => !v)}
                    style={{fontSize:11,color:'var(--primary)',background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontWeight:600}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Tambah jabatan baru
                  </button>
                </div>
                {showAddJabatan && (
                  <div style={{display:'flex',gap:8,marginBottom:8}}>
                    <input type="text" value={jabatanBaru} placeholder="Nama jabatan baru..."
                      onChange={e => setJabatanBaru(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addJabatanBaru()}
                      style={{flex:1,padding:'8px 10px',border:'1.5px solid var(--primary)',borderRadius:8,fontSize:13}}/>
                    <button type="button" onClick={addJabatanBaru}
                      style={{padding:'8px 14px',borderRadius:8,background:'var(--primary)',color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:600}}>
                      Tambah
                    </button>
                  </div>
                )}
                <select value={form.jabatan||''} style={sel} onChange={e => setForm(p => ({ ...p, jabatan: e.target.value }))}>
                  <option value="">— Pilih Jabatan —</option>
                  {jabatanList.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>

              {!editing && (
                <div className="adm-field">
                  <label>Password <span style={{fontWeight:400,color:'var(--text3)',fontSize:11}}>(default = NIDN, bisa diubah)</span></label>
                  <input type="text" value={form.password||''} placeholder="Minimal 8 karakter"
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}/>
                  <p style={{fontSize:11,color:'var(--text3)',marginTop:4}}>Dosen bisa mengubah password setelah login pertama.</p>
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
