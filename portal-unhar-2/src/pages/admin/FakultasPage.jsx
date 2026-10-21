import { useState, useEffect } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import { adminService, fakultasService } from '../../services/services'
import { getErrorMessage } from '../../services/api'
import './AdminCrud.css'
import './FakultasAdmin.css'

/**
 * FakultasPage — Hierarki Fakultas → Prodi → Mata Kuliah
 * Mendukung: Tambah, Edit (termasuk PINDAH ke Fakultas/Prodi lain), Hapus, Toggle Aktif
 */
export default function FakultasPage() {
  const [level,      setLevel]     = useState(0)
  const [selFak,     setSelFak]    = useState(null)
  const [selProdi,   setSelProdi]  = useState(null)

  const [fakultasList, setFakultasList] = useState([])
  const [prodiList,    setProdiList]    = useState([])
  const [matkulList,   setMatkulList]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState({})
  const [saving,   setSaving]   = useState(false)
  const [formErr,  setFormErr]  = useState('')

  // ── Loaders ─────────────────────────────────────────────
  async function loadFakultas() {
    setLoading(true); setError('')
    try {
      const r = await fakultasService.getAll()
      const d = r.data?.data || r.data
      setFakultasList(Array.isArray(d) ? d : [])
    } catch(e) { setError(getErrorMessage(e)) }
    finally { setLoading(false) }
  }

  async function loadProdi(fakId) {
    setLoading(true); setError('')
    try {
      const r = await adminService.getProdi({ fakultas_id: fakId })
      const d = r.data?.data || r.data
      setProdiList(Array.isArray(d) ? d : (d?.data || []))
    } catch(e) { setError(getErrorMessage(e)) }
    finally { setLoading(false) }
  }

  async function loadMatkul(prodiId) {
    setLoading(true); setError('')
    try {
      const r = await adminService.getMatkul({ prodi_id: prodiId })
      const d = r.data?.data || r.data
      setMatkulList(Array.isArray(d) ? d : (d?.data || []))
    } catch(e) { setError(getErrorMessage(e)) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadFakultas() }, [])

  // ── Navigation ────────────────────────────────────────────
  function goToProdi(fak) { setSelFak(fak); setLevel(1); loadProdi(fak.id) }
  function goToMatkul(prodi) { setSelProdi(prodi); setLevel(2); loadMatkul(prodi.id) }
  function goBack() {
    if (level === 2) { setLevel(1); loadProdi(selFak.id) }
    else { setLevel(0); setSelFak(null); loadFakultas() }
  }

  // ── Form helpers ─────────────────────────────────────────
  function openAdd() {
    setEditing(null)
    if (level === 0) setForm({ kode:'', nama:'' })
    if (level === 1) setForm({ kode:'', nama:'', fakultas_id: selFak.id })
    if (level === 2) setForm({ kode:'', nama:'', sks:2, semester:1, prodi_id: selProdi.id })
    setFormErr(''); setShowForm(true)
  }

  function openEdit(item) {
    setEditing(item)
    if (level === 0) setForm({ kode: item.kode||'', nama: item.nama||'' })
    if (level === 1) setForm({
      kode       : item.kode    || '',
      nama       : item.nama    || '',
      fakultas_id: item.fakultas_id || selFak.id,   // ← untuk pindah
    })
    if (level === 2) setForm({
      kode     : item.kode     || '',
      nama     : item.nama     || '',
      sks      : item.sks      || 2,
      semester : item.semester || 1,
      prodi_id : item.prodi_id || selProdi.id,       // ← untuk pindah
    })
    setFormErr(''); setShowForm(true)
  }

  async function handleSave() {
    setSaving(true); setFormErr('')
    try {
      if (level === 0) {
        if (editing) await fakultasService.update(editing.id, form)
        else await fakultasService.store(form)
        loadFakultas()
      } else if (level === 1) {
        if (editing) {
          await adminService.updateProdi(editing.id, form)
          // Jika dipindah ke fakultas lain → kembali ke level 0 lebih intuitif
          if (form.fakultas_id !== selFak.id) {
            setShowForm(false)
            setLevel(0); setSelFak(null); loadFakultas()
            return
          }
          loadProdi(selFak.id)
        } else {
          await adminService.storeProdi(form)
          loadProdi(selFak.id)
        }
      } else {
        if (editing) {
          await adminService.updateMatkul(editing.id, form)
          // Jika dipindah ke prodi lain → kembali ke level 1
          if (form.prodi_id !== selProdi.id) {
            setShowForm(false)
            setLevel(1); setSelProdi(null); loadProdi(selFak.id)
            return
          }
          loadMatkul(selProdi.id)
        } else {
          await adminService.storeMatkul(form)
          loadMatkul(selProdi.id)
        }
      }
      setShowForm(false)
    } catch(e) { setFormErr(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  async function handleDelete(item) {
    const label = level===0 ? 'fakultas' : level===1 ? 'program studi' : 'mata kuliah'
    if (!confirm('Hapus ' + label + ' "' + item.nama + '"?\nAksi ini tidak bisa dibatalkan.')) return
    try {
      if (level === 0) await fakultasService.destroy(item.id)
      else if (level === 1) await adminService.deleteProdi(item.id)
      else await adminService.deleteMatkul(item.id)
      if (level === 0) loadFakultas()
      else if (level === 1) loadProdi(selFak.id)
      else loadMatkul(selProdi.id)
    } catch(e) { alert(getErrorMessage(e)) }
  }

  async function handleToggle(item) {
    try {
      if (level === 1) { await adminService.toggleProdi(item.id); loadProdi(selFak.id) }
      else if (level === 2) { await adminService.toggleMatkul(item.id); loadMatkul(selProdi.id) }
    } catch(e) { alert(getErrorMessage(e)) }
  }

  // ── Styles ────────────────────────────────────────────────
  const sel = { padding:'10px 12px', border:'1.5px solid var(--border)',
    borderRadius:9, fontSize:13, background:'#fff', outline:'none', width:'100%' }

  const addLabel = level===0 ? '+ Tambah Fakultas' : level===1 ? '+ Tambah Prodi' : '+ Tambah Mata Kuliah'
  const pageTitle = level===0 ? 'Manajemen Akademik' : level===1 ? selFak?.nama : selProdi?.nama
  const pageSub   = level===0 ? 'Kelola Fakultas, Prodi, dan Mata Kuliah'
    : level===1 ? (selFak?.kode + ' — Program Studi')
    : (selFak?.kode + ' > ' + selProdi?.nama + ' — Mata Kuliah')

  return (
    <div className="page-single">
      <PageHeader title={pageTitle} subtitle={pageSub}
        actions={level > 0 && (
          <button onClick={goBack}
            style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',
              border:'1.5px solid var(--border)',borderRadius:8,background:'#fff',
              fontSize:13,fontWeight:600,cursor:'pointer',color:'var(--text2)'}}>
            ← Kembali
          </button>
        )}
      />
      <div className="content-body">

        {/* Breadcrumb */}
        <div className="fak-breadcrumb">
          {level > 0
            ? <button className="fak-breadcrumb-link" onClick={() => { setLevel(0);setSelFak(null);loadFakultas() }}>Fakultas</button>
            : <span className="fak-breadcrumb-cur">Fakultas</span>
          }
          {level >= 1 && <>
            <span className="fak-breadcrumb-sep">›</span>
            {level > 1
              ? <button className="fak-breadcrumb-link" onClick={() => { setLevel(1);loadProdi(selFak.id) }}>{selFak?.nama}</button>
              : <span className="fak-breadcrumb-cur">{selFak?.nama}</span>
            }
          </>}
          {level >= 2 && <>
            <span className="fak-breadcrumb-sep">›</span>
            <span className="fak-breadcrumb-cur">{selProdi?.nama}</span>
          </>}
        </div>

        {error && <div className="adm-error">{error}</div>}

        <div className="adm-toolbar">
          <div style={{flex:1}}/>
          <button className="adm-add-btn" onClick={openAdd}>{addLabel}</button>
        </div>

        {loading ? <div className="adm-loading">Memuat data...</div> : (

          /* ══ LEVEL 0: FAKULTAS CARDS ══ */
          level === 0 ? (
            fakultasList.length === 0 ? (
              <div className="adm-loading">Belum ada fakultas.</div>
            ) : (
              <div className="fak-grid">
                {fakultasList.map(f => {
                  const prodiArr    = f.prodi || []
                  const totalMatkul = prodiArr.reduce((s,p) => s+(p.matkul_count||0), 0)
                  return (
                    <div key={f.id} className="fak-card">
                      <div className="fak-card-top">
                        <div className="fak-card-info" onClick={() => goToProdi(f)}>
                          <span className="fak-card-kode">{f.kode}</span>
                          <h3 className="fak-card-nama">{f.nama}</h3>
                        </div>
                        <div className="fak-card-actions">
                          <button className="adm-btn-edit" onClick={e=>{e.stopPropagation();openEdit(f)}} title="Edit">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className="adm-btn-del" onClick={e=>{e.stopPropagation();handleDelete(f)}} title="Hapus">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      </div>
                      <div className="fak-card-stats" onClick={() => goToProdi(f)}>
                        <div className="fak-stat-box">
                          <span className="fak-stat-num">{prodiArr.length}</span>
                          <span className="fak-stat-lbl">Program Studi</span>
                        </div>
                        <div className="fak-stat-box">
                          <span className="fak-stat-num" style={{color:'var(--text)'}}>{totalMatkul}</span>
                          <span className="fak-stat-lbl">Mata Kuliah</span>
                        </div>
                      </div>
                      {prodiArr.length > 0 && (
                        <div className="fak-card-prodi-tags" onClick={() => goToProdi(f)}>
                          {prodiArr.slice(0,3).map(p=>(
                            <span key={p.id} className="fak-prodi-tag">{p.nama}</span>
                          ))}
                          {prodiArr.length>3 && <span className="fak-prodi-tag" style={{color:'var(--text3)'}}>+{prodiArr.length-3} lainnya</span>}
                        </div>
                      )}
                      <div className="fak-card-cta" onClick={() => goToProdi(f)}>
                        Kelola Program Studi
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                    </div>
                  )
                })}
              </div>
            )

          /* ══ LEVEL 1: PRODI TABLE ══ */
          ) : level === 1 ? (
            prodiList.length === 0 ? (
              <div className="adm-loading">Belum ada program studi di fakultas ini.</div>
            ) : (
              <div className="card adm-table">
                <div className="adm-thead">
                  <span className="c-no">No</span>
                  <span className="c-nim">Kode</span>
                  <span className="c-nama">Nama Program Studi</span>
                  <span className="c-sem">Status</span>
                  <span style={{width:60,flexShrink:0,fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Matkul</span>
                  <span style={{width:180,flexShrink:0,fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.5px',display:'flex',justifyContent:'flex-end'}}>Aksi</span>
                </div>
                {prodiList.map((p,i) => (
                  <div key={p.id||i} className="adm-trow">
                    <span className="c-no">{i+1}</span>
                    <span className="c-nim">{p.kode||'–'}</span>
                    <span className="c-nama" style={{cursor:'pointer',color:'var(--primary)',fontWeight:600}} onClick={() => goToMatkul(p)}>
                      {p.nama||'–'}
                      {p.is_aktif===false && <span className="status-badge-inactive" style={{marginLeft:8}}>Nonaktif</span>}
                    </span>
                    <span className="c-sem">
                      <span style={{fontSize:11,padding:'3px 8px',borderRadius:20,fontWeight:600,
                        background:p.is_aktif!==false?'#d1fae5':'#f3f4f6',
                        color:p.is_aktif!==false?'#059669':'#6b7280'}}>
                        {p.is_aktif!==false?'Aktif':'Nonaktif'}
                      </span>
                    </span>
                    <span style={{width:60,flexShrink:0,fontSize:13,textAlign:'center'}}>{p.matkul_count??'–'}</span>
                    <span style={{width:180,flexShrink:0,display:'flex',alignItems:'center',gap:5,justifyContent:'flex-end'}}>
                      <button className="adm-btn-edit" onClick={() => openEdit(p)} title="Edit">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => handleToggle(p)} title={p.is_aktif!==false?'Nonaktifkan':'Aktifkan'}
                        className={`btn-toggle-aktif ${p.is_aktif!==false?'btn-toggle-aktif--on':'btn-toggle-aktif--off'}`}>
                        {p.is_aktif!==false
                          ? <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'><rect x='6' y='4' width='4' height='16'/><rect x='14' y='4' width='4' height='16'/></svg>
                          : <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'><polygon points='5 3 19 12 5 21 5 3'/></svg>}
                      </button>
                      <button className="adm-btn-del" onClick={() => handleDelete(p)} title="Hapus">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                      <button onClick={() => goToMatkul(p)}
                        style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:7,border:'none',background:'#EDE9FE',color:'#7C3AED',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        Matkul
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )

          /* ══ LEVEL 2: MATKUL TABLE ══ */
          ) : (
            matkulList.length === 0 ? (
              <div className="adm-loading">Belum ada mata kuliah di program studi ini.</div>
            ) : (
              <div className="card adm-table">
                <div className="adm-thead">
                  <span className="c-no">No</span><span className="c-nim">Kode</span>
                  <span className="c-nama">Nama Mata Kuliah</span>
                  <span className="c-sem">SKS</span><span className="c-sem">Sem</span>
                  <span className="c-sem">Status</span><span className="c-act" style={{width:100}}>Aksi</span>
                </div>
                {matkulList.map((m,i) => (
                  <div key={m.id||i} className="adm-trow">
                    <span className="c-no">{i+1}</span>
                    <span className="c-nim">{m.kode||'–'}</span>
                    <span className="c-nama">
                      {m.nama||'–'}
                      {m.is_aktif===false && <span className="status-badge-inactive" style={{marginLeft:8}}>Nonaktif</span>}
                    </span>
                    <span className="c-sem">{m.sks||'–'}</span>
                    <span className="c-sem">{m.semester||'–'}</span>
                    <span className="c-sem">
                      <span style={{fontSize:11,padding:'3px 8px',borderRadius:20,fontWeight:600,
                        background:m.is_aktif!==false?'#d1fae5':'#f3f4f6',
                        color:m.is_aktif!==false?'#059669':'#6b7280'}}>
                        {m.is_aktif!==false?'Aktif':'Nonaktif'}
                      </span>
                    </span>
                    <span className="c-act" style={{width:100,gap:5}}>
                      <button className="adm-btn-edit" onClick={() => openEdit(m)} title="Edit / Pindah Prodi"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                      <button onClick={() => handleToggle(m)} title={m.is_aktif!==false?'Nonaktifkan':'Aktifkan'}
                        style={{padding:'5px 8px',borderRadius:6,border:'none',cursor:'pointer',fontSize:13,
                          background:m.is_aktif!==false?'#fef3c7':'#d1fae5',
                          color:m.is_aktif!==false?'#d97706':'#059669'}}>
                        {m.is_aktif!==false ? <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><rect x='6' y='4' width='4' height='16'/><rect x='14' y='4' width='4' height='16'/></svg> : <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polygon points='5 3 19 12 5 21 5 3'/></svg>}
                      </button>
                      {m.is_aktif===false && (
                        <button className="adm-btn-del" onClick={() => handleDelete(m)} title="Hapus"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )
          )
        )}
      </div>

      {/* ══ MODAL FORM ══ */}
      {showForm && (
        <div className="adm-modal-bg" onClick={() => setShowForm(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hdr">
              <h3>
                {editing
                  ? 'Edit ' + (level===0?'Fakultas':level===1?'Program Studi':'Mata Kuliah')
                  : 'Tambah ' + (level===0?'Fakultas':level===1?'Program Studi':'Mata Kuliah')}
              </h3>
              <button className="adm-modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="adm-modal-body">
              {formErr && <div className="adm-error">{formErr}</div>}

              {/* Kode */}
              <div className="adm-field">
                <label>Kode</label>
                <input type="text" value={form.kode||''} onChange={e => setForm(p=>({...p,kode:e.target.value}))}
                  placeholder={level===0?'Mis: FTK':level===1?'Mis: TI':'Mis: IF501'}/>
              </div>

              {/* Nama */}
              <div className="adm-field">
                <label>{level===0?'Nama Fakultas':level===1?'Nama Program Studi':'Nama Mata Kuliah'}</label>
                <input type="text" value={form.nama||''} onChange={e => setForm(p=>({...p,nama:e.target.value}))}
                  placeholder={level===0?'Mis: Fakultas Teknik & Komputer':level===1?'Mis: Teknik Informatika':'Mis: Kecerdasan Buatan'}/>
              </div>

              {/* SKS & Semester — hanya Matkul */}
              {level === 2 && (
                <div style={{display:'flex',gap:12}}>
                  <div className="adm-field" style={{flex:1}}>
                    <label>SKS</label>
                    <input type="number" min="1" max="6" value={form.sks||2}
                      onChange={e => setForm(p=>({...p,sks:e.target.value}))}/>
                  </div>
                  <div className="adm-field" style={{flex:1}}>
                    <label>Semester</label>
                    <input type="number" min="1" max="8" value={form.semester||1}
                      onChange={e => setForm(p=>({...p,semester:e.target.value}))}/>
                  </div>
                </div>
              )}

              {/* ── PINDAH KE FAKULTAS (edit prodi) ── */}
              {level === 1 && editing && fakultasList.length > 0 && (
                <div className="adm-field">
                  <label style={{display:'flex',alignItems:'center',gap:8}}>
                    Pindah ke Fakultas
                    {form.fakultas_id !== selFak.id && (
                      <span style={{background:'#FEF3C7',color:'#92400E',fontSize:10,
                        padding:'2px 8px',borderRadius:20,fontWeight:600}}>
                        ⚠ Akan dipindahkan
                      </span>
                    )}
                  </label>
                  <select value={form.fakultas_id||selFak.id} onChange={e => setForm(p=>({...p,fakultas_id:e.target.value}))} style={sel}>
                    {fakultasList.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.kode} — {f.nama}{f.id===selFak.id?' (saat ini)':''}
                      </option>
                    ))}
                  </select>
                  {form.fakultas_id !== selFak.id && (
                    <p style={{fontSize:11,color:'#92400E',marginTop:4}}>
                      Setelah disimpan, kamu akan kembali ke daftar Fakultas karena prodi berpindah.
                    </p>
                  )}
                </div>
              )}

              {/* ── PINDAH KE PRODI (edit matkul) ── */}
              {level === 2 && editing && prodiList.length > 0 && (
                <div className="adm-field">
                  <label style={{display:'flex',alignItems:'center',gap:8}}>
                    Pindah ke Program Studi
                    {form.prodi_id !== selProdi.id && (
                      <span style={{background:'#FEF3C7',color:'#92400E',fontSize:10,
                        padding:'2px 8px',borderRadius:20,fontWeight:600}}>
                        ⚠ Akan dipindahkan
                      </span>
                    )}
                  </label>
                  <select value={form.prodi_id||selProdi.id} onChange={e => setForm(p=>({...p,prodi_id:e.target.value}))} style={sel}>
                    {prodiList.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.kode} — {p.nama}{p.id===selProdi.id?' (saat ini)':''}
                      </option>
                    ))}
                  </select>
                  {String(form.prodi_id) !== String(selProdi.id) && (
                    <p style={{fontSize:11,color:'#92400E',marginTop:4}}>
                      Setelah disimpan, kamu akan kembali ke daftar Prodi.
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn-cancel" onClick={() => setShowForm(false)}>Batal</button>
              <button className="adm-btn-save" onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
