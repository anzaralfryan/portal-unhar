import { useState, useEffect, useCallback, useRef } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import { landingService } from '../../services/services'
import { getErrorMessage } from '../../services/api'
import './LandingCms.css'

const TABS = [
  { id: 'berita',     label: 'Berita',      icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v8a2 2 0 01-2 2zM14 2v6h6M12 11v6M9 14h6' },
  { id: 'pengumuman', label: 'Pengumuman',  icon: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0' },
  { id: 'agenda',     label: 'Agenda',      icon: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18' },
  { id: 'hero',       label: 'Hero Slider', icon: 'M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM7 14l3-3 2 2 4-4' },
  { id: 'stats',      label: 'Statistik',   icon: 'M18 20V10M12 20V4M6 20v-6' },
  { id: 'layanan',    label: 'Layanan',     icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  { id: 'keunggulan', label: 'Keunggulan',  icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
  { id: 'mitra',      label: 'Mitra',       icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 100 8 4 4 0 000-8' },
]

const FIELDS = {
  berita:     ['judul','isi','gambar','kategori','tanggal_tampil','urutan'],
  pengumuman: ['judul','isi','tanggal_tampil','bulan_tampil','kategori','urutan'],
  agenda:     ['judul','isi','tanggal_tampil','bulan_tampil','kategori','urutan'],
  hero:       ['judul','isi','gambar','meta_tag','urutan'],
  stats:      ['judul','meta_val','urutan'],
  layanan:    ['judul','isi','meta_icon','meta_color','link','urutan'],
  keunggulan: ['judul','isi','meta_icon','urutan'],
  mitra:      ['judul','gambar','link','urutan'],
}

const LABEL = {
  judul:'Judul / Nama', isi:'Isi / Deskripsi', gambar:'Gambar',
  kategori:'Kategori', link:'URL Link', tanggal_tampil:'Tanggal (mis. "14")',
  bulan_tampil:'Bulan (mis. "Agu")', meta_tag:'Tag / Badge Hero',
  meta_val:'Nilai Angka', meta_icon:'Nama Ikon (mis. "globe")',
  meta_color:'Warna Aksen', urutan:'Urutan Tampil',
}

const HINTS = {
  berita:     '📰 Berita tampil di grid "Berita UNHAR". Isi mendukung Markdown (**bold**, _italic_, ## heading, - list).',
  pengumuman: '📢 Pengumuman tampil di sidebar kanan. Isi tanggal & bulan untuk kotak tanggal hijau.',
  agenda:     '📅 Agenda tampil di sidebar kanan bawah, di bawah Pengumuman.',
  hero:       '🖼️ Hero Slider: setiap item adalah 1 slide. Urutan 0 = tampil pertama.',
  stats:      '📊 Angka statistik di strip hijau. Isi "Nilai Angka" sebagai nilai yang tampil besar.',
  layanan:    '🔗 Kartu layanan digital (SIAUNHAR, PMB, dll). Isi nama ikon dan warna aksen.',
  keunggulan: '⭐ Kartu "Why Choose UnHar". Nama ikon: globe, monitor, award, users.',
  mitra:      '🤝 Logo mitra scroll otomatis. Cukup isi nama dan URL gambar logo.',
}

const RICHTEXT = ['berita','pengumuman','agenda']

function itemToForm(item) {
  return {
    judul: item?.judul ?? '', isi: item?.isi ?? '',
    gambar: item?.gambar ?? '', gambar_file: null, gambar_preview: item?.gambar ?? '',
    kategori: item?.kategori ?? '', link: item?.link ?? '',
    tanggal_tampil: item?.tanggal_tampil ?? '', bulan_tampil: item?.bulan_tampil ?? '',
    urutan: item?.urutan ?? 0, aktif: item?.aktif ?? true,
    meta_tag: item?.meta?.tag ?? '', meta_val: item?.meta?.val ?? '',
    meta_icon: item?.meta?.icon ?? '', meta_color: item?.meta?.color ?? '',
  }
}

function formToPayload(form, tipe) {
  const meta = {}
  if (form.meta_tag)   meta.tag   = form.meta_tag
  if (form.meta_val)   meta.val   = form.meta_val
  if (form.meta_icon)  meta.icon  = form.meta_icon
  if (form.meta_color) meta.color = form.meta_color
  return {
    tipe, judul: form.judul||null, isi: form.isi||null, gambar: form.gambar||null,
    kategori: form.kategori||null, link: form.link||null,
    tanggal_tampil: form.tanggal_tampil||null, bulan_tampil: form.bulan_tampil||null,
    urutan: Number(form.urutan)||0, aktif: form.aktif,
    meta: Object.keys(meta).length ? meta : null,
  }
}

function fileToBase64(file) {
  return new Promise((res,rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

/* ── Rich text toolbar ── */
function RichBar({ taRef, value, onChange }) {
  function wrap(b, a=b) {
    const el=taRef.current; if(!el) return
    const s=el.selectionStart, e=el.selectionEnd
    const sel=value.slice(s,e)||'teks'
    const nv=value.slice(0,s)+b+sel+a+value.slice(e)
    onChange(nv)
    requestAnimationFrame(()=>{ el.focus(); el.setSelectionRange(s+b.length, s+b.length+sel.length) })
  }
  function line(p) {
    const el=taRef.current; if(!el) return
    const s=el.selectionStart
    const ls=value.lastIndexOf('\n',s-1)+1
    const nv=value.slice(0,ls)+p+value.slice(ls)
    onChange(nv)
    requestAnimationFrame(()=>{ el.focus(); el.setSelectionRange(s+p.length,s+p.length) })
  }
  return (
    <div className="lcms-rt-bar">
      <button type="button" className="lcms-rt-btn" title="Bold"          onClick={()=>wrap('**')}>B</button>
      <button type="button" className="lcms-rt-btn lcms-rt-btn--it" title="Italic" onClick={()=>wrap('_')}>I</button>
      <button type="button" className="lcms-rt-btn" title="Heading"       onClick={()=>line('## ')}>H</button>
      <button type="button" className="lcms-rt-btn" title="Bullet list"   onClick={()=>line('- ')}>•</button>
      <button type="button" className="lcms-rt-btn" title="Ordered list"  onClick={()=>line('1. ')}>1.</button>
      <button type="button" className="lcms-rt-btn" title="Blockquote"    onClick={()=>line('> ')}>"</button>
      <span className="lcms-rt-hint">Markdown</span>
    </div>
  )
}

/* ── Form Modal ── */
function FormModal({ tipe, item, onClose, onSaved }) {
  const [form, setForm] = useState(()=>itemToForm(item))
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')
  const [imgTab, setImgTab] = useState(item?.gambar ? 'url' : 'url')
  const taRef = useRef(null)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  async function onFile(e) {
    const f=e.target.files?.[0]; if(!f) return
    if(f.size>5*1024*1024){setErr('Maks 5 MB'); return}
    try {
      const b64=await fileToBase64(f)
      setForm(p=>({...p, gambar:b64, gambar_preview:b64, gambar_file:f})); setErr('')
    } catch{setErr('Gagal membaca file')}
  }

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      const p=formToPayload(form,tipe)
      if(item?.id) await landingService.update(item.id,p)
      else         await landingService.store(p)
      onSaved()
    } catch(e){setErr(getErrorMessage(e))}
    finally{setBusy(false)}
  }

  const fields = FIELDS[tipe]||['judul','isi']
  const rt = RICHTEXT.includes(tipe)

  return (
    <div className="lcms-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="lcms-modal">
        <div className="lcms-modal-hdr">
          <h3>{item?.id?'Edit':'Tambah'} {TABS.find(t=>t.id===tipe)?.label}</h3>
          <button className="lcms-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="lcms-modal-body">
          {err && <div className="lcms-alert lcms-alert--err">{err}</div>}

          {fields.map(key => {
            if (key==='aktif') return null

            if (key==='gambar') return (
              <div key="gambar" className="lcms-field">
                <label className="lcms-label">Gambar</label>
                <div className="lcms-img-tabs">
                  <button type="button" className={`lcms-img-tab${imgTab==='url'?' active':''}`} onClick={()=>setImgTab('url')}>🔗 URL</button>
                  <button type="button" className={`lcms-img-tab${imgTab==='upload'?' active':''}`} onClick={()=>setImgTab('upload')}>📤 Upload File</button>
                </div>
                {imgTab==='url'
                  ? <input type="text" className="lcms-input"
                      value={form.gambar_file?'':form.gambar}
                      onChange={e=>setForm(p=>({...p,gambar:e.target.value,gambar_preview:e.target.value,gambar_file:null}))}
                      placeholder="https://example.com/foto.jpg"/>
                  : <label className="lcms-upload-area">
                      <input type="file" accept="image/*" style={{display:'none'}} onChange={onFile}/>
                      {form.gambar_file
                        ? <div className="lcms-upload-chosen">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            <span>{form.gambar_file.name}</span>
                            <button type="button" className="lcms-upload-clear"
                              onClick={e=>{e.preventDefault();setForm(p=>({...p,gambar:'',gambar_preview:'',gambar_file:null}))}}>
                              × Hapus
                            </button>
                          </div>
                        : <div className="lcms-upload-placeholder">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            <span>Klik untuk pilih gambar</span>
                            <small>JPG, PNG, WebP · Maks 5 MB</small>
                          </div>
                      }
                    </label>
                }
                {form.gambar_preview && (
                  <div className="lcms-preview">
                    <img src={form.gambar_preview} alt="preview" onError={e=>e.target.style.display='none'}/>
                  </div>
                )}
              </div>
            )

            if (key==='isi') return (
              <div key="isi" className="lcms-field">
                <label className="lcms-label">Isi / Deskripsi</label>
                {rt && <RichBar taRef={taRef} value={form.isi} onChange={v=>set('isi',v)}/>}
                <textarea ref={taRef}
                  className={`lcms-input lcms-input--ta${rt?' lcms-input--ta-rich':''}`}
                  rows={rt?8:4} value={form.isi}
                  onChange={e=>set('isi',e.target.value)}
                  placeholder={rt?'Tulis isi... (**bold**, _italic_, ## heading, - list)':'Isi konten...'}/>
                {rt && form.isi && <div className="lcms-charcount">{form.isi.length} karakter</div>}
              </div>
            )

            return (
              <div key={key} className="lcms-field">
                <label className="lcms-label">{LABEL[key]??key}</label>
                <input type={key==='urutan'?'number':'text'} className="lcms-input"
                  value={form[key]??''} onChange={e=>set(key,e.target.value)}
                  placeholder={LABEL[key]}/>
                {key==='meta_color' && form.meta_color && (
                  <span className="lcms-color-swatch" style={{background:form.meta_color}}/>
                )}
              </div>
            )
          })}

          <div className="lcms-field lcms-field--inline">
            <label className="lcms-label">Status</label>
            <label className="lcms-toggle">
              <input type="checkbox" checked={form.aktif} onChange={e=>set('aktif',e.target.checked)}/>
              <span className="lcms-toggle-track"><span className="lcms-toggle-thumb"/></span>
              <span>{form.aktif?'Aktif (tampil di landing page)':'Nonaktif (tersembunyi)'}</span>
            </label>
          </div>

          <div className="lcms-modal-ftr">
            <button type="button" className="lcms-btn lcms-btn--ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="lcms-btn lcms-btn--primary" disabled={busy}>
              {busy?'Menyimpan…':item?.id?'Simpan Perubahan':'Tambah Konten'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Confirm({ msg, onOk, onCancel }) {
  return (
    <div className="lcms-overlay">
      <div className="lcms-confirm">
        <p>{msg}</p>
        <div className="lcms-confirm-btns">
          <button className="lcms-btn lcms-btn--ghost" onClick={onCancel}>Batal</button>
          <button className="lcms-btn lcms-btn--danger" onClick={onOk}>Hapus</button>
        </div>
      </div>
    </div>
  )
}

/* ── Item Card dengan drag handle ── */
function ItemCard({ item, index, onEdit, onToggle, onDelete, onDragStart, onDragOver, onDrop }) {
  const meta = item.meta||{}
  const img  = item.gambar_preview??item.gambar
  return (
    <div className={`lcms-card${!item.aktif?' lcms-card--off':''}`}
      draggable onDragStart={()=>onDragStart(index)}
      onDragOver={e=>{e.preventDefault();onDragOver(index)}}
      onDrop={()=>onDrop()}>
      <div className="lcms-drag-handle" title="Seret untuk ubah urutan">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="5" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="9" cy="19" r="1.2"/>
          <circle cx="15" cy="5" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="15" cy="19" r="1.2"/>
        </svg>
      </div>
      {img && (
        <div className="lcms-card-img">
          <img src={img} alt={item.judul} onError={e=>e.target.parentElement.style.display='none'}/>
          {!item.aktif && <div className="lcms-card-img-off">Nonaktif</div>}
        </div>
      )}
      <div className="lcms-card-body">
        {item.kategori && <span className="lcms-badge">{item.kategori}</span>}
        {(item.tanggal_tampil||item.bulan_tampil) && (
          <div className="lcms-date-chip">{item.tanggal_tampil} {item.bulan_tampil}</div>
        )}
        {meta.tag && <span className="lcms-badge lcms-badge--hero">{meta.tag}</span>}
        <h4 className="lcms-card-title">{item.judul||<em>Tanpa judul</em>}</h4>
        {item.isi && (
          <p className="lcms-card-desc">
            {item.isi.replace(/[#*_>`]/g,'').slice(0,120)}{item.isi.length>120?'…':''}
          </p>
        )}
        {meta.val && <p className="lcms-card-meta"><strong>{meta.val}</strong></p>}
        {meta.icon && <p className="lcms-card-meta">Ikon: <code>{meta.icon}</code></p>}
        {meta.color && (
          <p className="lcms-card-meta" style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:11,height:11,borderRadius:'50%',background:meta.color,border:'1px solid rgba(0,0,0,0.12)',flexShrink:0}}/>
            {meta.color}
          </p>
        )}
        {item.link && <p className="lcms-card-meta lcms-card-link">{item.link}</p>}
        <p className="lcms-card-meta">Urutan: {item.urutan}</p>
      </div>
      <div className="lcms-card-actions">
        <button className="lcms-act-btn lcms-act-btn--edit" onClick={()=>onEdit(item)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
        <button className={`lcms-act-btn ${item.aktif?'lcms-act-btn--toggle-off':'lcms-act-btn--toggle-on'}`} onClick={()=>onToggle(item)}>
          {item.aktif
            ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></svg>Sembunyikan</>
            : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Tampilkan</>
          }
        </button>
        <button className="lcms-act-btn lcms-act-btn--del" onClick={()=>onDelete(item)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          Hapus
        </button>
      </div>
    </div>
  )
}

/* ══ MAIN ══ */
export default function LandingCmsPage() {
  const [activeTab,   setActiveTab]   = useState('berita')
  const [items,       setItems]       = useState([])
  const [filtered,    setFiltered]    = useState([])
  const [loading,     setLoading]     = useState(false)
  const [modal,       setModal]       = useState(null)
  const [confirm,     setConfirm]     = useState(null)
  const [search,      setSearch]      = useState('')
  const [filterAktif, setFilterAktif] = useState('semua')
  const [toast,       setToast]       = useState(null)
  const [toastErr,    setToastErr]    = useState(false)
  const [reordering,  setReordering]  = useState(false)
  const dragFrom = useRef(null)

  const showToast = (msg, isErr=false) => {
    setToast(msg); setToastErr(isErr)
    setTimeout(()=>setToast(null), 2800)
  }

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const data = await landingService.getList(activeTab)
      setItems(Array.isArray(data)?data:[])
    } catch(e){ showToast(getErrorMessage(e),true) }
    finally{ setLoading(false) }
  }, [activeTab])

  useEffect(()=>{ fetchItems() },[fetchItems])

  useEffect(()=>{
    let r=[...items]
    if(filterAktif==='aktif')    r=r.filter(i=>i.aktif)
    if(filterAktif==='nonaktif') r=r.filter(i=>!i.aktif)
    if(search.trim()){
      const q=search.toLowerCase()
      r=r.filter(i=>(i.judul||'').toLowerCase().includes(q)||(i.isi||'').toLowerCase().includes(q)||(i.kategori||'').toLowerCase().includes(q))
    }
    setFiltered(r)
  },[items,search,filterAktif])

  async function handleToggle(item) {
    try{
      await landingService.toggle(item.id); fetchItems()
      showToast(`"${item.judul||'Konten'}" ${item.aktif?'disembunyikan':'ditampilkan'}.`)
    }catch(e){showToast(getErrorMessage(e),true)}
  }
  async function handleDelete(item) {
    try{
      await landingService.destroy(item.id); setConfirm(null); fetchItems()
      showToast(`"${item.judul||'Konten'}" dihapus.`)
    }catch(e){setConfirm(null);showToast(getErrorMessage(e),true)}
  }

  function handleDragStart(i){ dragFrom.current=i }
  function handleDragOver(i){
    if(dragFrom.current===null||dragFrom.current===i) return
    const arr=[...filtered], moved=arr.splice(dragFrom.current,1)[0]
    arr.splice(i,0,moved); dragFrom.current=i; setFiltered(arr)
  }
  async function handleDrop(){
    dragFrom.current=null; setReordering(true)
    try{
      await landingService.reorder(filtered.map((it,i)=>({id:it.id,urutan:i})))
      showToast('Urutan berhasil disimpan.'); fetchItems()
    }catch(e){showToast(getErrorMessage(e),true)}
    finally{setReordering(false)}
  }

  const tab   = TABS.find(t=>t.id===activeTab)
  const aktif = items.filter(i=>i.aktif).length

  return (
    <div className="page-single">
      <PageHeader title="Kelola Konten Landing Page"
        subtitle="Atur semua konten yang tampil di halaman publik Portal UNHAR"/>

      {/* Toast */}
      {toast && (
        <div className={`lcms-toast${toastErr?' lcms-toast--err':''}`}>
          {toastErr
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          }
          {toast}
        </div>
      )}

      {/* Tab bar */}
      <div className="lcms-tabs">
        {TABS.map(t=>(
          <button key={t.id} className={`lcms-tab${activeTab===t.id?' active':''}`}
            onClick={()=>{setActiveTab(t.id);setSearch('');setFilterAktif('semua')}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon}/></svg>
            {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="lcms-toolbar">
        <div className="lcms-toolbar-left">
          <div className="lcms-search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="lcms-search" placeholder={`Cari ${tab?.label}...`}
              value={search} onChange={e=>setSearch(e.target.value)}/>
            {search && <button className="lcms-search-clear" onClick={()=>setSearch('')}>✕</button>}
          </div>
          <select className="lcms-filter-sel" value={filterAktif} onChange={e=>setFilterAktif(e.target.value)}>
            <option value="semua">Semua ({items.length})</option>
            <option value="aktif">Aktif ({aktif})</option>
            <option value="nonaktif">Nonaktif ({items.length-aktif})</option>
          </select>
        </div>
        <div className="lcms-toolbar-right">
          <a href="/beranda" target="_blank" rel="noopener noreferrer"
            className="lcms-btn lcms-btn--ghost lcms-btn--preview">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Lihat Landing Page ↗
          </a>
          <button className="lcms-btn lcms-btn--primary" onClick={()=>setModal({item:null})}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah {tab?.label}
          </button>
        </div>
      </div>

      {/* Hint + drag hint */}
      <div className="lcms-hint">{HINTS[activeTab]}</div>
      {filtered.length>1 && (
        <div className="lcms-drag-hint">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
          Seret kartu untuk ubah urutan · Tersimpan otomatis saat dilepas
          {reordering && <span className="lcms-drag-saving"> · Menyimpan...</span>}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="lcms-loading"><div className="lcms-spinner"/> Memuat konten...</div>
      ) : filtered.length===0 ? (
        <div className="lcms-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d={tab?.icon}/></svg>
          <p>{search?`Tidak ada hasil untuk "${search}".`:`Belum ada konten ${tab?.label}.`}</p>
          {!search && <button className="lcms-btn lcms-btn--primary" onClick={()=>setModal({item:null})}>Tambah sekarang</button>}
        </div>
      ) : (
        <div className="lcms-grid">
          {filtered.map((item,i)=>(
            <ItemCard key={item.id} item={item} index={i}
              onEdit={it=>setModal({item:it})}
              onToggle={handleToggle} onDelete={it=>setConfirm(it)}
              onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}/>
          ))}
        </div>
      )}

      {modal && (
        <FormModal tipe={activeTab} item={modal.item}
          onClose={()=>setModal(null)}
          onSaved={()=>{setModal(null);fetchItems();showToast('Konten berhasil disimpan!')}}/>
      )}
      {confirm && (
        <Confirm
          msg={`Hapus "${confirm.judul||'item ini'}"? Tidak bisa dibatalkan.`}
          onOk={()=>handleDelete(confirm)} onCancel={()=>setConfirm(null)}/>
      )}
    </div>
  )
}
