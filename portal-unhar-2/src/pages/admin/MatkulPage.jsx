import { useState, useEffect } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import { adminService } from '../../services/services'
import { getErrorMessage } from '../../services/api'
import './AdminCrud.css'

const PAGE_SIZE = 15

export default function MatkulPage() {
  const [list, setList] = useState([])
  const [prodiList, setProdiList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterProdi, setFilterProdi] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ total:0, totalPages:1 })
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ kode:'', nama:'', sks:'', semester:'', prodi_id:'' })
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')
  const [showNonaktif, setShowNonaktif] = useState(false)

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await adminService.getMatkul({ search, prodi_id: filterProdi, page, limit: PAGE_SIZE })
      const d = res.data?.data || res.data
      setList(Array.isArray(d) ? d : d?.items || [])
      setMeta(res.data?.meta || { total: (Array.isArray(d) ? d.length : 0), totalPages: 1 })
    } catch (e) { setError(getErrorMessage(e)) }
    finally { setLoading(false) }
  }
  async function loadProdi() {
    try { const res = await adminService.getProdi(); const d = res.data?.data || res.data; setProdiList(Array.isArray(d) ? d : []) }
    catch {}
  }
  useEffect(() => { loadProdi() }, [])
  useEffect(() => { load() }, [page, filterProdi])
  useEffect(() => { const t = setTimeout(() => { setPage(1); load() }, 400); return () => clearTimeout(t) }, [search])

  function openAdd() { setEditing(null); setForm({ kode:'', nama:'', sks:'', semester:'', prodi_id:'' }); setFormErr(''); setShowForm(true) }
  function openEdit(m) { setEditing(m); setForm({ kode:m.kode||'', nama:m.nama||'', sks:m.sks||'', semester:m.semester||'', prodi_id:m.prodi_id||m.prodi?.id||'' }); setFormErr(''); setShowForm(true) }

  async function handleSave() {
    setSaving(true); setFormErr('')
    try {
      if (editing) await adminService.updateMatkul(editing.id, form)
      else await adminService.storeMatkul(form)
      setShowForm(false); load()
    } catch (e) { setFormErr(getErrorMessage(e)) }
    finally { setSaving(false) }
  }
  async function handleToggle(m) {
    const label = m.is_aktif !== false ? 'nonaktifkan' : 'aktifkan'
    if (!confirm('Apakah kamu ingin ' + label + ' matkul "' + m.nama + '"?')) return
    try { await adminService.toggleMatkul(m.id); load() } catch (e) { alert(getErrorMessage(e)) }
  }

  async function handleDelete(m) {
    if (!confirm('Hapus permanen mata kuliah "' + m.nama + '"?\nPastikan sudah tidak digunakan di jadwal.')) return
    try { await adminService.deleteMatkul(m.id); load() } catch (e) { alert(getErrorMessage(e)) }
  }

  return (
    <div className="page-single">
      <PageHeader title="Manajemen Mata Kuliah" subtitle={`Total: ${meta.total || list.length} mata kuliah`}/>
      <div className="content-body">
        <div className="adm-toolbar">
          <input className="adm-search" placeholder="Cari kode atau nama mata kuliah..." value={search} onChange={e => setSearch(e.target.value)}/>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text2)',cursor:'pointer',userSelect:'none'}}>
            <input type="checkbox" checked={showNonaktif} onChange={e => setShowNonaktif(e.target.checked)}/>
            Tampilkan Nonaktif
          </label>
          <select value={filterProdi} onChange={e => setFilterProdi(e.target.value)} style={{padding:'10px 14px',border:'1.5px solid var(--border)',borderRadius:9,fontSize:13,background:'#fff',outline:'none',minWidth:160}}>
            <option value="">Semua Prodi</option>
            {prodiList.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>
          <button className="adm-add-btn" onClick={openAdd}>+ Tambah Matkul</button>
        </div>
        {error && <div className="adm-error">{error}</div>}

        <div className="card adm-table">
          <div className="adm-thead">
            <span className="c-no">No</span><span className="c-nim">Kode</span>
            <span className="c-nama">Nama Mata Kuliah</span><span className="c-prodi">Prodi</span>
            <span className="c-sem">SKS</span><span className="c-sem">Sem</span><span className="c-act">Aksi</span>
          </div>
          {loading ? <div className="adm-loading">Memuat data...</div> :
           list.length === 0 ? <div className="adm-loading">Tidak ada data.</div> :
           (showNonaktif ? list : list.filter(m => m.is_aktif !== false)).map((m, i) => (
            <div key={m.id || i} className="adm-trow">
              <span className="c-no">{(page-1)*PAGE_SIZE + i + 1}</span>
              <span className="c-nim">{m.kode || '–'}</span>
              <span className="c-nama">
                {m.nama || '–'}
                {m.is_aktif === false && <span className="status-badge-inactive" style={{marginLeft:6,fontSize:10}}>Nonaktif</span>}
              </span>
              <span className="c-prodi">{m.prodi?.nama || m.prodi_nama || '–'}</span>
              <span className="c-sem">{m.sks || '–'}</span>
              <span className="c-sem">{m.semester || '–'}</span>
              <span className="c-act">
                <button className="adm-btn-edit" onClick={() => openEdit(m)} title="Edit">✏</button>
                <button
                  onClick={() => handleToggle(m)}
                  title={m.is_aktif !== false ? 'Nonaktifkan' : 'Aktifkan'}
                  style={{padding:'4px 8px',borderRadius:6,border:'none',cursor:'pointer',fontSize:13,
                    background: m.is_aktif !== false ? '#fef3c7' : '#d1fae5',
                    color: m.is_aktif !== false ? '#d97706' : '#059669'}}>
                  {m.is_aktif !== false ? '⏸' : '▶'}
                </button>
                {m.is_aktif === false && <button className="adm-btn-del" onClick={() => handleDelete(m)} title="Hapus Permanen">×</button>}
              </span>
            </div>
          ))}
        </div>

        {meta.totalPages > 1 && (
          <div className="adm-pagination">
            <button disabled={page === 1} onClick={() => setPage(p => p-1)}>‹ Prev</button>
            <span>Halaman {page} dari {meta.totalPages}</span>
            <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p+1)}>Next ›</button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="adm-modal-bg" onClick={() => setShowForm(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hdr">
              <h3>{editing ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah'}</h3>
              <button className="adm-modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="adm-modal-body">
              {formErr && <div className="adm-error">{formErr}</div>}
              <div className="adm-field"><label>Kode Mata Kuliah</label><input type="text" value={form.kode} onChange={e => setForm(p => ({...p, kode:e.target.value}))} placeholder="Mis: TIF101"/></div>
              <div className="adm-field"><label>Nama Mata Kuliah</label><input type="text" value={form.nama} onChange={e => setForm(p => ({...p, nama:e.target.value}))} placeholder="Mis: Algoritma & Pemrograman"/></div>
              <div className="adm-field"><label>SKS</label><input type="number" min="1" max="6" value={form.sks} onChange={e => setForm(p => ({...p, sks:e.target.value}))}/></div>
              <div className="adm-field"><label>Semester</label><input type="number" min="1" max="14" value={form.semester} onChange={e => setForm(p => ({...p, semester:e.target.value}))}/></div>
              <div className="adm-field"><label>Program Studi</label>
                <select value={form.prodi_id} onChange={e => setForm(p => ({...p, prodi_id:e.target.value}))} style={{padding:'10px 12px',border:'1.5px solid var(--border)',borderRadius:9,fontSize:13,background:'#fff',outline:'none'}}>
                  <option value="">— Pilih Prodi —</option>
                  {prodiList.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
                </select>
              </div>
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
