import { useState, useEffect, useMemo } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import api, { getErrorMessage } from '../../services/api'
import { adminService } from '../../services/services'
import './AdminCrud.css'

const fmt = n => new Intl.NumberFormat('id-ID').format(n)

/* SVG ikon lampiran */
const IcoCheck= () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>

function BadgeStatus({ status }) {
  const cfg = {
    lunas: { bg:'#dcfce7', color:'#16a34a', label:'Lunas' },
    belum: { bg:'#fef3c7', color:'#d97706', label:'Belum' },
  }[status] || { bg:'#f3f4f6', color:'#6b7280', label: status||'–' }
  return <span style={{fontSize:11,padding:'3px 10px',borderRadius:20,fontWeight:600,background:cfg.bg,color:cfg.color}}>{cfg.label}</span>
}



/* ── Group satu tahun akademik ── */
function TahunGroup({ tahunLabel, items, onMarkLunas }) {
  const [open, setOpen]           = useState(true)
  const [statusFilter, setStatus] = useState('')

  const filtered = statusFilter ? items.filter(p => p.status === statusFilter) : items
  const totalLunas  = items.filter(p => p.status === 'lunas').length
  const totalBelum  = items.filter(p => p.status !== 'lunas').length
  const totalNominal = items.reduce((s, p) => s + (Number(p.jumlah) || 0), 0)

  return (
    <div className="pmb-group">
      {/* Header grup */}
      <div className="pmb-group-header" onClick={() => setOpen(v => !v)}>
        <div className="pmb-group-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--primary)',flexShrink:0}}>
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <span>{tahunLabel}</span>
        </div>
        <div className="pmb-group-stats" onClick={e => e.stopPropagation()}>
          <span className="pmb-stat pmb-stat--lunas" onClick={() => setStatus(s => s==='lunas'?'':'lunas')}>
            <IcoCheck/> {totalLunas} Lunas
          </span>
          <span className="pmb-stat pmb-stat--belum" onClick={() => setStatus(s => s==='belum'?'':'belum')}>
            {totalBelum} Belum
          </span>
          <span className="pmb-stat pmb-stat--total">
            Rp {fmt(totalNominal)}
          </span>
        </div>
        <svg className={`adm-sem-chevron ${open ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {open && (
        <div className="pmb-group-body">
          {statusFilter && (
            <div style={{padding:'6px 14px',background:'#fffbeb',borderBottom:'1px solid var(--border)',fontSize:11,color:'#92400e',display:'flex',alignItems:'center',gap:8}}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Filter: {statusFilter === 'lunas' ? 'Lunas' : 'Belum Bayar'}
              <button onClick={() => setStatus('')} style={{marginLeft:4,padding:'1px 6px',borderRadius:6,border:'1px solid #fbbf24',background:'#fff',color:'#92400e',fontSize:10,cursor:'pointer'}}>Hapus filter</button>
            </div>
          )}
          {/* Sub-tabel */}
          <div className="adm-thead" style={{borderRadius:0,borderTop:'none'}}>
            <span className="c-no">No</span>
            <span className="c-nim">NIM</span>
            <span className="c-nama">Nama</span>
            <span className="c-prodi" style={{width:200}}>Label</span>
            <span className="c-sem" style={{width:110}}>Jumlah</span>
            <span className="c-sem" style={{width:90}}>Status</span>
            <span className="c-act">Aksi</span>
          </div>
          {filtered.length === 0 ? (
            <div className="adm-loading">Tidak ada tagihan untuk filter ini.</div>
          ) : (
            filtered.map((p, i) => (
              <div key={p.id || i} className="adm-trow">
                <span className="c-no">{i + 1}</span>
                <span className="c-nim">{p.mahasiswa?.nim || '–'}</span>
                <span className="c-nama">{p.mahasiswa?.user?.name || '–'}</span>
                <span className="c-prodi" style={{width:200,fontSize:11.5}}>{p.label || '–'}</span>
                <span className="c-sem" style={{width:110,fontWeight:600}}>Rp {fmt(p.jumlah || 0)}</span>
                <span className="c-sem" style={{width:90,display:'flex',flexDirection:'column',gap:3,alignItems:'flex-start'}}>
                  <BadgeStatus status={p.status}/>
                </span>
                <span className="c-act" style={{display:'flex',gap:4}}>
                  {p.status !== 'lunas' && (
                    <button className="adm-btn-activate" onClick={() => onMarkLunas(p)} title="Tandai Lunas">
                      <IcoCheck/>
                    </button>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════ */
export default function PembayaranPage() {
  const [list,       setList]       = useState([])
  const [tahunList,  setTahunList]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [filterTahun,setFilterTahun]= useState('')
  const [search,     setSearch]     = useState('')
  const [showGen,    setShowGen]    = useState(false)
  const [genForm,    setGenForm]    = useState({})
  const [genSaving,  setGenSaving]  = useState(false)
  const [genErr,     setGenErr]     = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const q = {}; if (filterTahun) q.tahun_id = filterTahun
      const res = await api.get('/admin/pembayaran', { params: q })
      const d = res.data?.data || res.data
      setList(Array.isArray(d) ? d : (d?.data || []))
    } catch(e) { setError(getErrorMessage(e)) } finally { setLoading(false) }
  }

  async function loadTahun() {
    try { const r = await adminService.getTahun(); setTahunList(r.data?.data || []) } catch {}
  }

  useEffect(() => { loadTahun() }, [])
  useEffect(() => { load() }, [filterTahun])

  async function markLunas(p) {
    if (!confirm('Tandai ' + (p.mahasiswa?.user?.name || p.mahasiswa?.nim) + ' sebagai lunas?')) return
    try { await api.put('/admin/pembayaran/' + p.id + '/lunas'); load() } catch(e) { alert(getErrorMessage(e)) }
  }



  async function handleGen() {
    setGenSaving(true); setGenErr('')
    try {
      const res = await api.post('/admin/pembayaran/generate', genForm)
      alert(res.data?.message || 'Tagihan berhasil dibuat')
      setShowGen(false); load()
    } catch(e) { setGenErr(getErrorMessage(e)) } finally { setGenSaving(false) }
  }

  function openGen() {
    setGenForm({ tahun_akademik_id:'', jumlah:5000000, jatuh_tempo:'', nomor_rekening:'', nama_bank:'BSI', atas_nama:'', kode_bank:'248801', kode_antarbank:'900' })
    setGenErr(''); setShowGen(true)
  }

  /* Kelompokkan per tahun akademik + filter search */
  const byTahun = useMemo(() => {
    const map = {}
    const searchLower = search.toLowerCase()
    list
      .filter(p => !search || 
        (p.mahasiswa?.nim || '').includes(search) ||
        (p.mahasiswa?.user?.name || '').toLowerCase().includes(searchLower) ||
        (p.label || '').toLowerCase().includes(searchLower)
      )
      .forEach(p => {
        const key = p.tahun_akademik?.label || p.label?.split(' ').slice(-2).join(' ') || 'Tidak Diketahui'
        if (!map[key]) map[key] = []
        map[key].push(p)
      })
    return map
  }, [list, search])

  const tahunKeys = Object.keys(byTahun).sort().reverse() // Terbaru di atas
  const sel = { padding:'10px 12px', border:'1.5px solid var(--border)', borderRadius:9, fontSize:13, background:'#fff', outline:'none', width:'100%' }
  const selSm = { padding:'8px 12px', border:'1.5px solid var(--border)', borderRadius:9, fontSize:12.5, background:'#fff', outline:'none' }

  return (
    <div className="page-single">
      <PageHeader title="Manajemen Pembayaran" subtitle={`Total: ${list.length} tagihan`}/>
      <div className="content-body">
        <div className="adm-toolbar">
          <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)} style={selSm}>
            <option value="">Semua Tahun</option>
            {tahunList.map(t => <option key={t.id} value={t.id}>{t.tahun} {t.semester}</option>)}
          </select>
          <input
            className="adm-search"
            placeholder="Cari nama, NIM, atau label..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div style={{flex:1}}/>
          <button className="adm-add-btn" onClick={openGen}>+ Generate Tagihan Semester</button>
        </div>
        {error && <div className="adm-error">{error}</div>}

        {loading ? (
          <div className="adm-loading">Memuat data pembayaran...</div>
        ) : tahunKeys.length === 0 ? (
          <div className="adm-loading">Belum ada tagihan.</div>
        ) : (
          <div className="card adm-table" style={{padding:0}}>
            {tahunKeys.map(tahun => (
              <TahunGroup
                key={tahun}
                tahunLabel={tahun}
                items={byTahun[tahun]}
                onMarkLunas={markLunas}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modal Generate Tagihan ── */}
      {showGen && (
        <div className="adm-modal-bg" onClick={() => setShowGen(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hdr">
              <h3>Generate Tagihan Semester</h3>
              <button className="adm-modal-close" onClick={() => setShowGen(false)}>×</button>
            </div>
            <div className="adm-modal-body">
              {genErr && <div className="adm-error">{genErr}</div>}
              <p style={{fontSize:13,color:'var(--text3)',marginBottom:16}}>Generate tagihan UKT untuk semua mahasiswa aktif. Yang sudah punya tagihan di tahun ini akan dilewati.</p>
              <div className="adm-field"><label>Tahun Akademik</label>
                <select value={genForm.tahun_akademik_id||''} onChange={e => setGenForm(p => ({...p, tahun_akademik_id:e.target.value}))} style={sel}>
                  <option value="">— Pilih Tahun —</option>
                  {tahunList.map(t => <option key={t.id} value={t.id}>{t.tahun} {t.semester}</option>)}
                </select>
              </div>
              <div className="adm-field"><label>Jumlah Tagihan (Rp)</label>
                <input type="number" min="0" step="100000" value={genForm.jumlah||5000000} onChange={e => setGenForm(p => ({...p, jumlah:e.target.value}))}/>
              </div>
              <div className="adm-field"><label>Jatuh Tempo</label>
                <input type="date" value={genForm.jatuh_tempo||''} onChange={e => setGenForm(p => ({...p, jatuh_tempo:e.target.value}))}/>
              </div>
              <hr style={{border:'none',borderTop:'1px solid var(--border)',margin:'8px 0 12px'}}/>
              <p style={{fontSize:12,color:'var(--text3)',marginBottom:8}}>Informasi rekening transfer</p>
              <div className="adm-field"><label>Nama Bank</label>
                <select value={genForm.nama_bank||''} onChange={e => setGenForm(p => ({...p, nama_bank:e.target.value}))} style={sel}>
                  <option value="">— Pilih Bank —</option>
                  {['BSI','Mandiri','BCA','BRI','BNI','BTN','CIMB Niaga','Danamon'].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="adm-field"><label>Nomor Rekening</label>
                <input type="text" value={genForm.nomor_rekening||''} onChange={e => setGenForm(p => ({...p, nomor_rekening:e.target.value}))} placeholder="Contoh: 1234567890"/>
              </div>
              <div className="adm-field"><label>Atas Nama</label>
                <input type="text" value={genForm.atas_nama||''} onChange={e => setGenForm(p => ({...p, atas_nama:e.target.value}))} placeholder="Contoh: Universitas Harapan Medan"/>
              </div>
              <div style={{display:'flex',gap:12}}>
                <div className="adm-field" style={{flex:1}}><label>Kode Bank</label>
                  <input type="text" value={genForm.kode_bank||''} placeholder="Mis: 248801 (BSI)" onChange={e => setGenForm(p => ({...p, kode_bank:e.target.value}))}/>
                </div>
                <div className="adm-field" style={{flex:1}}><label>Kode Antar Bank</label>
                  <input type="text" value={genForm.kode_antarbank||''} placeholder="Mis: 900" onChange={e => setGenForm(p => ({...p, kode_antarbank:e.target.value}))}/>
                </div>
              </div>
              {genForm.kode_bank && (
                <div style={{background:'#f0fdf4',borderRadius:9,padding:'10px 14px',border:'1px solid #86EFAC',marginBottom:4}}>
                  <p style={{fontSize:11,fontWeight:700,color:'var(--text3)',marginBottom:6}}>Preview VA (NPM contoh: 222370066)</p>
                  <p style={{fontFamily:'monospace',fontWeight:700,color:'var(--primary)',fontSize:13,margin:0}}>{genForm.kode_bank}222370066</p>
                  {genForm.kode_antarbank && <p style={{fontFamily:'monospace',color:'#7C3AED',fontSize:12,margin:'4px 0 0'}}>{genForm.kode_antarbank}{genForm.kode_bank}222370066</p>}
                </div>
              )}
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn-cancel" onClick={() => setShowGen(false)}>Batal</button>
              <button className="adm-btn-save" onClick={handleGen} disabled={genSaving}>{genSaving ? 'Memproses...' : 'Generate'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
