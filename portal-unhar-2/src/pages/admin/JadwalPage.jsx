import { useState, useEffect, useMemo } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import api, { getErrorMessage } from '../../services/api'
import { adminService } from '../../services/services'
import './AdminCrud.css'
import './JadwalAdmin.css'

const HARI_ORDER = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
const KELAS      = ['pagi','sore','karyawan']

/* ── 8 palet warna kaya — terinspirasi referensi kalender ── */
const PALETTES = [
  { bg:'#EDE9FE', border:'#7C3AED', text:'#5B21B6', chip:'rgba(124,58,237,0.12)', avatar:'#DDD6FE' },
  { bg:'#DBEAFE', border:'#2563EB', text:'#1D4ED8', chip:'rgba(37,99,235,0.12)',  avatar:'#BFDBFE' },
  { bg:'#D1FAE5', border:'#059669', text:'#065F46', chip:'rgba(5,150,105,0.12)',   avatar:'#A7F3D0' },
  { bg:'#FEF3C7', border:'#D97706', text:'#92400E', chip:'rgba(217,119,6,0.12)',   avatar:'#FDE68A' },
  { bg:'#FCE7F3', border:'#DB2777', text:'#9D174D', chip:'rgba(219,39,119,0.12)', avatar:'#FBCFE8' },
  { bg:'#E0F2FE', border:'#0284C7', text:'#0C4A6E', chip:'rgba(2,132,199,0.12)',  avatar:'#BAE6FD' },
  { bg:'#F0FDF4', border:'#16A34A', text:'#14532D', chip:'rgba(22,163,74,0.12)',  avatar:'#BBF7D0' },
  { bg:'#FFF7ED', border:'#EA580C', text:'#7C2D12', chip:'rgba(234,88,12,0.12)',  avatar:'#FED7AA' },
]
function getPalette(nama = '') {
  let h = 0; for (let i = 0; i < nama.length; i++) h = (h * 31 + nama.charCodeAt(i)) >>> 0
  return PALETTES[h % PALETTES.length]
}

function toMin(jam = '') { const [h,m] = jam.split(':').map(Number); return h*60 + (m||0) }
function fmtJam(jam = '') { return (jam||'').substring(0,5) }
function durasi(mulai, selesai) {
  const d = toMin(selesai) - toMin(mulai)
  if (d <= 0) return ''
  const h = Math.floor(d/60), m = d%60
  return h > 0 ? (m > 0 ? `${h}j ${m}m` : `${h} jam`) : `${m} mnt`
}
function initials(nama = '') {
  return nama.trim().split(/\s+/).slice(0,2).map(w => w[0]?.toUpperCase()||'').join('')
}
function safeStr(val) {
  if (!val) return '–'
  if (typeof val === 'string') return val
  if (typeof val === 'object') return val.nama || val.name || '–'
  return String(val)
}

/* ════════════════════════════════════════════════════════
   JadwalCard — visual kaya
════════════════════════════════════════════════════════ */
function JadwalCard({ j, onEdit, onDelete }) {
  const matkulNama = safeStr(j.matkul) !== '–' ? safeStr(j.matkul)
    : (j.nama_matkul || (j.matkul?.nama) || '–')
  const pal    = getPalette(matkulNama)
  const dosen  = j.dosen?.user?.name || j.dosen?.nip || j.dosen?.nidn || '–'
  const sks    = j.sks || j.matkul?.sks || j.matkul_detail?.sks || ''
  const ruang  = j.ruang || '–'
  const kelas  = j.kelas_type || ''
  const jam    = fmtJam(j.jam_mulai) && fmtJam(j.jam_selesai)
    ? `${fmtJam(j.jam_mulai)} – ${fmtJam(j.jam_selesai)}` : '–'
  const dur    = durasi(j.jam_mulai, j.jam_selesai)
  const inits  = initials(dosen)

  return (
    <div className="jdw-adm-card"
      style={{ background: pal.bg, borderLeft: `4px solid ${pal.border}` }}>
      {/* Nama mata kuliah + tombol edit/hapus */}
      <div className="jdw-adm-card-top">
        <span className="jdw-adm-matkul" style={{ color: pal.text }}>{matkulNama}</span>
        <div className="jdw-adm-actions">
          <button onClick={() => onEdit(j)} className="jdw-adm-btn jdw-adm-btn--edit" title="Edit">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button onClick={() => onDelete(j)} className="jdw-adm-btn jdw-adm-btn--del" title="Hapus">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Chips: jam, durasi, ruang, kelas */}
      <div className="jdw-adm-chips">
        <span className="jdw-adm-chip" style={{ color: pal.text }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {jam}
        </span>
        {dur && (
          <span className="jdw-adm-chip" style={{ color: pal.text }}>
            {dur}
          </span>
        )}
        {ruang !== '–' && (
          <span className="jdw-adm-chip" style={{ color: pal.text }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            {ruang}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="jdw-adm-divider"/>

      {/* Dosen + badge kelas + SKS */}
      <div className="jdw-adm-dosen-row">
        <div className="jdw-adm-dosen-avatar" style={{ background: pal.avatar, color: pal.text }}>
          {inits || (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          )}
        </div>
        <span className="jdw-adm-dosen-name" style={{ color: pal.text }}>{dosen}</span>
      </div>

      {/* Footer: kelas + SKS */}
      {(kelas || sks) && (
        <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:6 }}>
          {kelas && (
            <span className="jdw-adm-kelas-badge" style={{ color: pal.text }}>
              {kelas.charAt(0).toUpperCase() + kelas.slice(1)}
            </span>
          )}
          {sks && (
            <span className="jdw-adm-sks-badge" style={{ color: pal.text }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
              {sks} SKS
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Kolom satu hari ── */
function HariColumn({ hari, items, onEdit, onDelete, onAdd }) {
  const sorted  = [...items].sort((a,b) => toMin(a.jam_mulai) - toMin(b.jam_mulai))
  const today   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date().getDay()]
  const isToday = hari === today
  const totalSks = items.reduce((s,j) => s + (j.sks || j.matkul?.sks || 0), 0)

  return (
    <div className={`jdw-adm-col ${isToday ? 'jdw-adm-col--today' : ''}`}>
      <div className="jdw-adm-col-header">
        <div className="jdw-adm-col-header-top">
          <span className="jdw-adm-col-day">{hari}</span>
          {isToday && <span className="jdw-adm-today-badge">Hari Ini</span>}
          <span className="jdw-adm-col-count">{sorted.length} kelas</span>
        </div>
        {sorted.length > 0 && (
          <div className="jdw-adm-col-header-sub">
            {/* Rentang jam paling awal - paling akhir */}
            {fmtJam(sorted[0].jam_mulai)} – {fmtJam(sorted[sorted.length-1].jam_selesai)}
            {totalSks > 0 && <span style={{marginLeft:6, fontWeight:600, color:'var(--primary)'}}>· {totalSks} SKS</span>}
          </div>
        )}
      </div>
      <div className="jdw-adm-col-body">
        {sorted.length === 0 ? (
          <div className="jdw-adm-empty">
            <div className="jdw-adm-empty-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
            </div>
            <span>Tidak ada kelas</span>
          </div>
        ) : (
          sorted.map(j => (
            <JadwalCard key={j.id} j={j} onEdit={onEdit} onDelete={onDelete}/>
          ))
        )}
        <button className="jdw-adm-add-slot" onClick={() => onAdd(hari)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tambah Kelas
        </button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════ */
export default function JadwalPage() {
  const [list,        setList]        = useState([])
  const [matkulList,  setMatkulList]  = useState([])
  const [dosenList,   setDosenList]   = useState([])
  const [tahunList,   setTahunList]   = useState([])
  const [ruanganList, setRuanganList] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [filterTahun, setFilterTahun] = useState('')
  const [filterKelas, setFilterKelas] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState({})
  const [saving,   setSaving]   = useState(false)
  const [formErr,  setFormErr]  = useState('')

  const [showRuangan,    setShowRuangan]    = useState(false)
  const [ruanganForm,    setRuanganForm]    = useState({ nama:'', gedung:'', kapasitas:40 })
  const [ruanganEditing, setRuanganEditing] = useState(null)
  const [ruanganSaving,  setRuanganSaving]  = useState(false)
  const [ruanganErr,     setRuanganErr]     = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const q = {}; if (filterTahun) q.tahun_id = filterTahun
      const res = await api.get('/admin/jadwal', { params: q })
      const d = res.data?.data || res.data
      setList(Array.isArray(d) ? d : [])
    } catch(e) { setError(getErrorMessage(e)) } finally { setLoading(false) }
  }

  async function loadRefs() {
    try { const r = await adminService.getMatkul(); setMatkulList(r.data?.data || []) } catch {}
    try { const r = await adminService.getDosen(); const d = r.data?.data||r.data; setDosenList(Array.isArray(d)?d:(d?.data||[])) } catch {}
    try { const r = await adminService.getTahun(); setTahunList(r.data?.data || []) } catch {}
    try { const r = await adminService.getRuangan(); const d = r.data?.data||r.data; setRuanganList(Array.isArray(d)?d:[]) } catch {}
  }

  useEffect(() => { loadRefs() }, [])
  useEffect(() => { load() }, [filterTahun])

  const byHari = useMemo(() => {
    const filtered = filterKelas ? list.filter(j => j.kelas_type === filterKelas) : list
    const map = {}
    HARI_ORDER.forEach(h => { map[h] = [] })
    filtered.forEach(j => { if (map[j.hari]) map[j.hari].push(j) })
    return map
  }, [list, filterKelas])

  const totalJadwal = list.length

  /* ── Jadwal CRUD ── */
  function openAdd(hari = 'Senin') {
    setEditing(null)
    setForm({ matkul_id:'', dosen_id:'', tahun_akademik_id: filterTahun||'', hari, jam_mulai:'08:00', jam_selesai:'09:40', ruang:'', kelas_type: filterKelas||'pagi', kapasitas:40 })
    setFormErr(''); setShowForm(true)
  }
  function openEdit(j) {
    setEditing(j)
    setForm({ hari:j.hari, jam_mulai:j.jam_mulai, jam_selesai:j.jam_selesai, ruang:j.ruang, dosen_id:j.dosen?.id||'' })
    setFormErr(''); setShowForm(true)
  }
  async function handleSave() {
    setSaving(true); setFormErr('')
    try {
      if (editing) await api.put('/admin/jadwal/'+editing.id, form)
      else await api.post('/admin/jadwal', form)
      setShowForm(false); load()
    } catch(e) { setFormErr(getErrorMessage(e)) } finally { setSaving(false) }
  }
  async function handleDel(j) {
    const label = safeStr(j.matkul) !== '–' ? safeStr(j.matkul) : (j.matkul?.nama||j.nama_matkul||'ini')
    if (!confirm(`Hapus jadwal ${label} ${j.hari} ${fmtJam(j.jam_mulai)}?`)) return
    try { await api.delete('/admin/jadwal/'+j.id); load() } catch(e) { alert(getErrorMessage(e)) }
  }

  /* ── Ruangan CRUD ── */
  function openRuangan() { setRuanganEditing(null); setRuanganForm({nama:'',gedung:'',kapasitas:40}); setRuanganErr(''); setShowRuangan(true) }
  function editRuangan(r) { setRuanganEditing(r); setRuanganForm({nama:r.nama||'',gedung:r.gedung||'',kapasitas:r.kapasitas||40}); setRuanganErr('') }
  async function saveRuangan() {
    setRuanganSaving(true); setRuanganErr('')
    try {
      if (ruanganEditing) await adminService.updateRuangan(ruanganEditing.id, ruanganForm)
      else await adminService.storeRuangan(ruanganForm)
      setRuanganEditing(null); setRuanganForm({nama:'',gedung:'',kapasitas:40})
      const r = await adminService.getRuangan(); const d = r.data?.data||r.data; setRuanganList(Array.isArray(d)?d:[])
    } catch(e) { setRuanganErr(getErrorMessage(e)) } finally { setRuanganSaving(false) }
  }
  async function toggleRuangan(r) {
    try { await adminService.toggleRuangan(r.id); const res = await adminService.getRuangan(); const d=res.data?.data||res.data; setRuanganList(Array.isArray(d)?d:[]) } catch(e) { alert(getErrorMessage(e)) }
  }
  async function deleteRuangan(r) {
    if (!confirm(`Hapus ruangan "${r.nama}"?`)) return
    try { await adminService.deleteRuangan(r.id); const res = await adminService.getRuangan(); const d=res.data?.data||res.data; setRuanganList(Array.isArray(d)?d:[]) } catch(e) { alert(getErrorMessage(e)) }
  }

  const sel = { padding:'10px 12px', border:'1.5px solid var(--border)', borderRadius:9, fontSize:13, background:'#fff', outline:'none', width:'100%' }
  const aktifRuangan = ruanganList.filter(r => r.is_aktif !== false)

  return (
    <div className="page-single">
      <PageHeader title="Manajemen Jadwal" subtitle={`Total: ${totalJadwal} jadwal`}/>
      <div className="content-body">
        <div className="adm-toolbar">
          <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)}
            style={{padding:'8px 12px',border:'1.5px solid var(--border)',borderRadius:9,fontSize:12.5,background:'#fff',outline:'none'}}>
            <option value="">Semua Tahun</option>
            {tahunList.map(t => <option key={t.id} value={t.id}>{t.tahun} {t.semester}{(t.aktif||t.is_aktif)?' ★':''}</option>)}
          </select>
          <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
            style={{padding:'8px 12px',border:'1.5px solid var(--border)',borderRadius:9,fontSize:12.5,background:'#fff',outline:'none'}}>
            <option value="">Semua Kelas</option>
            {KELAS.map(k => <option key={k} value={k}>{k.charAt(0).toUpperCase()+k.slice(1)}</option>)}
          </select>
          <div style={{flex:1}}/>
          <button onClick={openRuangan}
            style={{padding:'8px 14px',borderRadius:8,border:'1.5px solid var(--border)',background:'#fff',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontWeight:600}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Kelola Ruangan
          </button>
          <button className="adm-add-btn" onClick={() => openAdd()}>+ Tambah Jadwal</button>
        </div>
        {error && <div className="adm-error">{error}</div>}

        {loading ? (
          <div className="adm-loading">Memuat jadwal...</div>
        ) : (
          <div className="jdw-adm-grid">
            {HARI_ORDER.map(hari => (
              <HariColumn key={hari} hari={hari}
                items={byHari[hari]||[]}
                onEdit={openEdit} onDelete={handleDel} onAdd={openAdd}/>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal Tambah/Edit ── */}
      {showForm && (
        <div className="adm-modal-bg" onClick={() => setShowForm(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hdr">
              <h3>{editing ? 'Edit Jadwal' : 'Tambah Jadwal'}</h3>
              <button className="adm-modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="adm-modal-body">
              {formErr && <div className="adm-error">{formErr}</div>}
              {!editing && <>
                <div className="adm-field"><label>Mata Kuliah</label>
                  <select value={form.matkul_id||''} onChange={e=>setForm(p=>({...p,matkul_id:e.target.value}))} style={sel}>
                    <option value="">— Pilih Mata Kuliah —</option>
                    {matkulList.filter(m=>m.is_aktif!==false).map(m=><option key={m.id} value={m.id}>{m.kode} – {m.nama}</option>)}
                  </select>
                </div>
                <div className="adm-field"><label>Tahun Akademik</label>
                  <select value={form.tahun_akademik_id||''} onChange={e=>setForm(p=>({...p,tahun_akademik_id:e.target.value}))} style={sel}>
                    <option value="">— Pilih Tahun —</option>
                    {tahunList.map(t=><option key={t.id} value={t.id}>{t.tahun} {t.semester}{(t.aktif||t.is_aktif)?' (Aktif)':''}</option>)}
                  </select>
                </div>
                <div className="adm-field"><label>Kelas</label>
                  <select value={form.kelas_type||'pagi'} onChange={e=>setForm(p=>({...p,kelas_type:e.target.value}))} style={sel}>
                    {KELAS.map(k=><option key={k} value={k}>{k.charAt(0).toUpperCase()+k.slice(1)}</option>)}
                  </select>
                </div>
                <div className="adm-field"><label>Kapasitas</label>
                  <input type="number" min="1" max="200" value={form.kapasitas||40} onChange={e=>setForm(p=>({...p,kapasitas:e.target.value}))}/>
                </div>
              </>}
              <div className="adm-field"><label>Dosen Pengampu</label>
                <select value={form.dosen_id||''} onChange={e=>setForm(p=>({...p,dosen_id:e.target.value}))} style={sel}>
                  <option value="">— Pilih Dosen —</option>
                  {dosenList.map(d=><option key={d.id} value={d.id}>{d.user?.name||d.nip||d.nidn}</option>)}
                </select>
              </div>
              <div className="adm-field"><label>Hari</label>
                <select value={form.hari||'Senin'} onChange={e=>setForm(p=>({...p,hari:e.target.value}))} style={sel}>
                  {HARI_ORDER.map(h=><option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div style={{display:'flex',gap:12}}>
                <div className="adm-field" style={{flex:1}}><label>Jam Mulai</label>
                  <input type="time" value={form.jam_mulai||'08:00'} onChange={e=>setForm(p=>({...p,jam_mulai:e.target.value}))}/>
                </div>
                <div className="adm-field" style={{flex:1}}><label>Jam Selesai</label>
                  <input type="time" value={form.jam_selesai||'09:40'} onChange={e=>setForm(p=>({...p,jam_selesai:e.target.value}))}/>
                </div>
              </div>
              <div className="adm-field">
                <label>Ruang <span style={{fontWeight:400,color:'var(--text3)',fontSize:11}}>(pilih atau ketik manual)</span></label>
                {aktifRuangan.length > 0 ? (
                  <select value={form.ruang||''} onChange={e=>setForm(p=>({...p,ruang:e.target.value}))} style={sel}>
                    <option value="">— Pilih Ruangan —</option>
                    {aktifRuangan.map(r=><option key={r.id} value={r.nama}>{r.nama}{r.gedung?' ('+r.gedung+')':''} — {r.kapasitas} kursi</option>)}
                    <option value="__manual__">Ketik manual...</option>
                  </select>
                ) : <p style={{fontSize:12,color:'var(--text3)',margin:'4px 0 8px'}}>Belum ada ruangan.</p>}
                {(form.ruang==='__manual__' || (form.ruang&&!aktifRuangan.find(r=>r.nama===form.ruang))) && (
                  <input type="text" value={form.ruang==='__manual__'?'':(form.ruang||'')}
                    placeholder="Ketik nama ruangan..." onChange={e=>setForm(p=>({...p,ruang:e.target.value}))}
                    style={{marginTop:6}}/>
                )}
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn-cancel" onClick={() => setShowForm(false)}>Batal</button>
              <button className="adm-btn-save" onClick={handleSave} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Kelola Ruangan ── */}
      {showRuangan && (
        <div className="adm-modal-bg" onClick={() => { setShowRuangan(false); setRuanganEditing(null) }}>
          <div className="adm-modal" style={{maxWidth:560}} onClick={e=>e.stopPropagation()}>
            <div className="adm-modal-hdr">
              <h3>Kelola Ruangan</h3>
              <button className="adm-modal-close" onClick={() => { setShowRuangan(false); setRuanganEditing(null) }}>×</button>
            </div>
            <div className="adm-modal-body">
              {ruanganErr && <div className="adm-error">{ruanganErr}</div>}
              <div style={{background:'#f8f9fb',borderRadius:10,padding:'14px 16px',marginBottom:16}}>
                <p style={{fontWeight:600,fontSize:13,margin:'0 0 10px',color:'var(--text)'}}>
                  {ruanganEditing ? 'Edit: '+ruanganEditing.nama : 'Tambah Ruangan Baru'}
                </p>
                <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                  <input type="text" value={ruanganForm.nama} placeholder="Nama (mis: Lab 3.1)"
                    style={{flex:2,padding:'8px 10px',border:'1.5px solid var(--border)',borderRadius:8,fontSize:13}}
                    onChange={e=>setRuanganForm(p=>({...p,nama:e.target.value}))}/>
                  <input type="text" value={ruanganForm.gedung||''} placeholder="Gedung (opsional)"
                    style={{flex:2,padding:'8px 10px',border:'1.5px solid var(--border)',borderRadius:8,fontSize:13}}
                    onChange={e=>setRuanganForm(p=>({...p,gedung:e.target.value}))}/>
                  <input type="number" value={ruanganForm.kapasitas||40} placeholder="Kapasitas"
                    style={{flex:1,padding:'8px 10px',border:'1.5px solid var(--border)',borderRadius:8,fontSize:13,minWidth:80}}
                    onChange={e=>setRuanganForm(p=>({...p,kapasitas:e.target.value}))}/>
                  <button onClick={saveRuangan} disabled={ruanganSaving}
                    style={{padding:'8px 16px',borderRadius:8,border:'none',background:'var(--primary)',color:'#fff',fontSize:13,cursor:'pointer',fontWeight:600}}>
                    {ruanganSaving?'...':(ruanganEditing?'Update':'Tambah')}
                  </button>
                  {ruanganEditing && (
                    <button onClick={() => { setRuanganEditing(null); setRuanganForm({nama:'',gedung:'',kapasitas:40}) }}
                      style={{padding:'8px 14px',borderRadius:8,border:'1.5px solid var(--border)',background:'#fff',fontSize:13,cursor:'pointer'}}>Batal</button>
                  )}
                </div>
              </div>
              <div style={{maxHeight:280,overflowY:'auto'}}>
                {ruanganList.length===0 ? (
                  <p style={{textAlign:'center',color:'var(--text3)',fontSize:13,padding:'20px 0'}}>Belum ada ruangan.</p>
                ) : ruanganList.map(r=>(
                  <div key={r.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 4px',borderBottom:'1px solid var(--border)'}}>
                    <div style={{flex:1}}>
                      <p style={{margin:0,fontSize:13,fontWeight:500,color:r.is_aktif!==false?'var(--text)':'var(--text3)'}}>{r.nama}</p>
                      <p style={{margin:0,fontSize:11,color:'var(--text3)'}}>{r.gedung?r.gedung+' · ':''}{r.kapasitas} kursi</p>
                    </div>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,fontWeight:600,
                      background:r.is_aktif!==false?'#d1fae5':'#f3f4f6',color:r.is_aktif!==false?'#059669':'#6b7280'}}>
                      {r.is_aktif!==false?'Aktif':'Nonaktif'}
                    </span>
                    <button onClick={() => editRuangan(r)} style={{padding:'4px 10px',borderRadius:6,border:'1.5px solid var(--border)',background:'#fff',fontSize:12,cursor:'pointer'}}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => toggleRuangan(r)} style={{padding:'4px 10px',borderRadius:6,border:'none',fontSize:12,cursor:'pointer',
                      background:r.is_aktif!==false?'#fef3c7':'#d1fae5',color:r.is_aktif!==false?'#d97706':'#059669'}}>
                      {r.is_aktif!==false
                        ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
                    </button>
                    <button onClick={() => deleteRuangan(r)} style={{padding:'4px 10px',borderRadius:6,border:'none',background:'#fee2e2',color:'#e53e3e',fontSize:12,cursor:'pointer'}}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn-save" onClick={() => setShowRuangan(false)}>Selesai</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
