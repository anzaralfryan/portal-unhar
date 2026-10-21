import { useState, useEffect } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import { adminService } from '../../services/services'
import { getErrorMessage } from '../../services/api'
import './AdminCrud.css'

// Generate pilihan tahun akademik: 5 tahun ke belakang sampai 2 tahun ke depan
function generateTahunOptions() {
  const now   = new Date().getFullYear()
  const years = []
  for (let y = now - 5; y <= now + 2; y++) {
    years.push(`${y}/${y+1}`)
  }
  return years
}

export default function TahunPage() {
  const [list,    setList]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [showForm,setShowForm]= useState(false)
  const [form,    setForm]    = useState({ tahun:'', semester:'Ganjil' })
  const [saving,  setSaving]  = useState(false)
  const [formErr, setFormErr] = useState('')

  const tahunOptions = generateTahunOptions()

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await adminService.getTahun()
      const d = res.data?.data || res.data
      setList(Array.isArray(d) ? d : d?.items || [])
    } catch (e) { setError(getErrorMessage(e)) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function openAdd() {
    // Pre-fill dengan tahun berikutnya yang belum ada
    const now = new Date().getFullYear()
    const tahunSuggested = `${now}/${now+1}`
    setForm({ tahun: tahunSuggested, semester: 'Ganjil' })
    setFormErr(''); setShowForm(true)
  }

  async function handleSave() {
    setSaving(true); setFormErr('')
    try {
      await adminService.storeTahun(form)
      setShowForm(false)
      setForm({ tahun:'', semester:'Ganjil' })
      load()
    } catch (e) { setFormErr(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  async function handleAktifkan(t) {
    if (!confirm('Aktifkan tahun akademik ' + t.tahun + ' ' + t.semester + '?\nTahun yang aktif sebelumnya akan dinonaktifkan.')) return
    try { await adminService.aktifkanTahun(t.id); load() }
    catch (e) { alert(getErrorMessage(e)) }
  }

  async function handleDelete(t) {
    if (!confirm('Hapus tahun akademik ' + t.tahun + ' ' + t.semester + '?')) return
    try { await adminService.deleteTahun(t.id); load() }
    catch (e) { alert(getErrorMessage(e)) }
  }

  const sel = { padding:'10px 12px', border:'1.5px solid var(--border)', borderRadius:9, fontSize:13, background:'#fff', outline:'none', width:'100%' }

  return (
    <div className="page-single">
      <PageHeader title="Tahun Akademik" subtitle={'Total: ' + list.length + ' periode'}/>
      <div className="content-body">
        <div className="adm-toolbar">
          <div style={{flex:1}}/>
          <button className="adm-add-btn" onClick={openAdd}>+ Tambah Tahun Akademik</button>
        </div>
        {error && <div className="adm-error">{error}</div>}

        <div className="card adm-table">
          <div className="adm-thead">
            <span className="c-no">No</span>
            <span className="c-nim">Tahun</span>
            <span className="c-nama">Semester</span>
            <span className="c-prodi">Status</span>
            <span className="c-act" style={{width:200}}>Aksi</span>
          </div>
          {loading ? <div className="adm-loading">Memuat...</div> :
           list.length === 0 ? <div className="adm-loading">Belum ada tahun akademik.</div> :
           list.map((t, i) => (
            <div key={t.id || i} className="adm-trow">
              <span className="c-no">{i+1}</span>
              <span className="c-nim">{t.tahun || '–'}</span>
              <span className="c-nama">{t.semester || '–'}</span>
              <span className="c-prodi">
                {(t.aktif || t.is_aktif)
                  ? <span className="badge badge-green">Aktif</span>
                  : <span className="badge badge-gray">Nonaktif</span>}
              </span>
              <span className="c-act" style={{width:200,gap:6}}>
                {!(t.aktif || t.is_aktif) && (
                  <button className="adm-btn-edit" onClick={() => handleAktifkan(t)}
                    style={{width:'auto',padding:'0 10px',background:'#d1fae5',color:'#059669',border:'none'}}>
                    ✓ Aktifkan
                  </button>
                )}
                <button className="adm-btn-del" onClick={() => handleDelete(t)} title="Hapus">×</button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="adm-modal-bg" onClick={() => setShowForm(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hdr">
              <h3>Tambah Tahun Akademik</h3>
              <button className="adm-modal-close" onClick={() => setShowForm(false)}>&#215;</button>
            </div>
            <div className="adm-modal-body">
              {formErr && <div className="adm-error">{formErr}</div>}

              <div className="adm-field">
                <label>Tahun Akademik</label>
                <select value={form.tahun} onChange={e => setForm(p => ({...p, tahun:e.target.value}))} style={sel}>
                  <option value="">— Pilih Tahun —</option>
                  {tahunOptions.map(t => (
                    <option key={t} value={t}
                      disabled={list.some(l => l.tahun === t && l.semester === form.semester)}>
                      {t}{list.some(l => l.tahun === t && l.semester === form.semester) ? ' (sudah ada)' : ''}
                    </option>
                  ))}
                </select>
                <p style={{fontSize:11,color:'var(--text3)',marginTop:4}}>
                  Format: 2025/2026, 2026/2027, dst.
                </p>
              </div>

              <div className="adm-field">
                <label>Semester</label>
                <div style={{display:'flex',gap:12}}>
                  {['Ganjil','Genap'].map(s => (
                    <label key={s} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',flex:1,
                      padding:'10px 14px',border:'1.5px solid ' + (form.semester===s?'var(--primary,#0F9E7B)':'var(--border)'),
                      borderRadius:9,background:form.semester===s?'#f0fdf4':'#fff',fontWeight:form.semester===s?600:400,
                      fontSize:13,transition:'all 0.15s'}}>
                      <input type="radio" name="semester" value={s} checked={form.semester===s}
                        onChange={() => setForm(p => ({...p, semester:s}))} style={{accentColor:'var(--primary,#0F9E7B)'}}/>
                      Semester {s}
                    </label>
                  ))}
                </div>
              </div>

              {form.tahun && form.semester && (
                <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#059669',marginTop:8}}>
                  Akan dibuat: <strong>{form.tahun} — Semester {form.semester}</strong>
                </div>
              )}
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn-cancel" onClick={() => setShowForm(false)}>Batal</button>
              <button className="adm-btn-save" onClick={handleSave} disabled={saving || !form.tahun}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
