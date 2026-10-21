import { useState, useEffect } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import { adminService, fakultasService } from '../../services/services'
import { getErrorMessage } from '../../services/api'
import './AdminCrud.css'

export default function ProdiPage() {
  const [list,      setList]    = useState([])
  const [fakList,   setFakList] = useState([])
  const [loading,   setLoading] = useState(true)
  const [error,     setError]   = useState('')
  const [showForm,  setShowForm] = useState(false)
  const [editing,   setEditing] = useState(null)
  const [form,      setForm]    = useState({ kode:'', nama:'', fakultas_id:'' })
  const [saving,    setSaving]  = useState(false)
  const [formErr,   setFormErr] = useState('')
  const [showNonaktif, setShowNonaktif] = useState(false)

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await adminService.getProdi()
      const d = res.data?.data || res.data
      setList(Array.isArray(d) ? d : d?.items || [])
    } catch (e) { setError(getErrorMessage(e)) }
    finally { setLoading(false) }
  }

  async function loadFak() {
    try { const res = await fakultasService.getAll(); const d = res.data?.data || res.data; setFakList(Array.isArray(d) ? d : []) }
    catch {}
  }

  useEffect(() => { loadFak(); load() }, [])

  function openAdd() { setEditing(null); setForm({ kode:'', nama:'', fakultas_id:'' }); setFormErr(''); setShowForm(true) }
  function openEdit(p) { setEditing(p); setForm({ kode: p.kode||'', nama: p.nama||'', fakultas_id: p.fakultas_id||p.fakultas?.id||'' }); setFormErr(''); setShowForm(true) }

  async function handleSave() {
    setSaving(true); setFormErr('')
    try {
      if (editing) await adminService.updateProdi(editing.id, form)
      else await adminService.storeProdi(form)
      setShowForm(false); load()
    } catch (e) { setFormErr(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  async function handleToggle(p) {
    const label = p.is_aktif ? 'nonaktifkan' : 'aktifkan'
    if (!confirm('Apakah kamu ingin ' + label + ' prodi "' + p.nama + '"?')) return
    try { await adminService.toggleProdi(p.id); load() }
    catch (e) { alert(getErrorMessage(e)) }
  }

  async function handleDelete(p) {
    if (!confirm('Hapus permanen prodi "' + p.nama + '"?\nAksi ini tidak bisa dibatalkan.')) return
    try { await adminService.deleteProdi(p.id); load() }
    catch (e) { alert(getErrorMessage(e)) }
  }

  const safe = (v) => v == null ? '–' : (typeof v === 'object' ? (v.nama || v.name || '–') : v)
  const displayed = showNonaktif ? list : list.filter(p => p.is_aktif !== false)
  const sel = { padding:'10px 12px', border:'1.5px solid var(--border)', borderRadius:9, fontSize:13, background:'#fff', outline:'none', width:'100%' }

  return (
    <div className="page-single">
      <PageHeader title="Manajemen Prodi" subtitle={'Total: ' + list.length + ' program studi (' + list.filter(p=>p.is_aktif!==false).length + ' aktif)'}/>
      <div className="content-body">
        <div className="adm-toolbar">
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text2)',cursor:'pointer',userSelect:'none'}}>
            <input type="checkbox" checked={showNonaktif} onChange={e => setShowNonaktif(e.target.checked)}/>
            Tampilkan Nonaktif
          </label>
          <div style={{flex:1}}/>
          <button className="adm-add-btn" onClick={openAdd}>+ Tambah Prodi</button>
        </div>
        {error && <div className="adm-error">{error}</div>}
        <div className="card adm-table">
          <div className="adm-thead">
            <span className="c-no">No</span>
            <span className="c-nim">Kode</span>
            <span className="c-nama">Nama Program Studi</span>
            <span className="c-prodi">Fakultas</span>
            <span className="c-sem">Status</span>
            <span className="c-act">Aksi</span>
          </div>
          {loading ? <div className="adm-loading">Memuat data...</div> :
           displayed.length === 0 ? <div className="adm-loading">Belum ada prodi.</div> :
           displayed.map((p, i) => (
            <div key={p.id || i} className="adm-trow">
              <span className="c-no">{i+1}</span>
              <span className="c-nim">{safe(p.kode)}</span>
              <span className="c-nama">
                {safe(p.nama)}
                {p.is_aktif === false && <span className="status-badge-inactive" style={{marginLeft:8}}>Nonaktif</span>}
              </span>
              <span className="c-prodi">{safe(p.fakultas) !== '–' ? safe(p.fakultas) : (fakList.find(f => f.id === p.fakultas_id)?.nama || '–')}</span>
              <span className="c-sem">
                <span style={{
                  fontSize:11, padding:'3px 8px', borderRadius:20, fontWeight:600,
                  background: p.is_aktif !== false ? '#d1fae5' : '#f3f4f6',
                  color:      p.is_aktif !== false ? '#059669'  : '#6b7280',
                }}>
                  {p.is_aktif !== false ? 'Aktif' : 'Nonaktif'}
                </span>
              </span>
              <span className="c-act">
                <button className="adm-btn-edit" onClick={() => openEdit(p)} title="Edit">✏</button>
                <button
                  className={p.is_aktif !== false ? 'adm-btn-del' : 'adm-btn-activate'}
                  onClick={() => handleToggle(p)}
                  title={p.is_aktif !== false ? 'Nonaktifkan' : 'Aktifkan'}
                  style={{background: p.is_aktif !== false ? '#fef3c7' : '#d1fae5', color: p.is_aktif !== false ? '#d97706' : '#059669'}}>
                  {p.is_aktif !== false ? '⏸' : '▶'}
                </button>
                {p.is_aktif === false && (
                  <button className="adm-btn-del" onClick={() => handleDelete(p)} title="Hapus Permanen">×</button>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="adm-modal-bg" onClick={() => setShowForm(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hdr">
              <h3>{editing ? 'Edit Prodi' : 'Tambah Prodi'}</h3>
              <button className="adm-modal-close" onClick={() => setShowForm(false)}>&#215;</button>
            </div>
            <div className="adm-modal-body">
              {formErr && <div className="adm-error">{formErr}</div>}
              <div className="adm-field"><label>Kode Prodi</label><input type="text" value={form.kode} onChange={e => setForm(p => ({...p, kode:e.target.value}))} placeholder="Mis: TI"/></div>
              <div className="adm-field"><label>Nama Program Studi</label><input type="text" value={form.nama} onChange={e => setForm(p => ({...p, nama:e.target.value}))} placeholder="Mis: Teknik Informatika"/></div>
              <div className="adm-field"><label>Fakultas</label>
                <select value={form.fakultas_id} onChange={e => setForm(p => ({...p, fakultas_id:e.target.value}))} style={sel}>
                  <option value="">— Pilih Fakultas —</option>
                  {fakList.map(f => <option key={f.id} value={f.id}>{f.nama}</option>)}
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
