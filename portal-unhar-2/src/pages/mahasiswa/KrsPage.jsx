import { useState, useEffect, useCallback } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import { useFetch, useSubmit } from '../../hooks/useFetch'
import { krsService, mahasiswaService } from '../../services/services'
import { useKrsDraft } from '../../hooks/useKrsDraft'
import './KrsPage.css'

const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
function tglHariIni(){ const d=new Date(); return `${d.getDate()} ${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}` }

function parseLabel(label) {
  const m = (label || '').match(/Semester\s+(\S+)\s+(\S+)/i)
  return m ? { periode: m[1], tahun: m[2] } : { periode: '', tahun: '' }
}

function PrintArea({ krs, mhs, detail }) {
  const dipilih = detail?.matkul || []
  const total   = detail?.total_sks || 0
  const { periode, tahun: tahunPart } = parseLabel(krs?.tahun_akademik)
  const logoUrl = '/logo-unhar.png'

  return (
    <div className="krs-print-area">
      {/* ── Kop Surat ── */}
      <div className="print-kop">
        <div className="print-kop-logo">
          <img src={logoUrl} alt="Logo UNHAR"
            onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling.style.display='flex' }}
            style={{width:'100%',height:'100%',objectFit:'contain'}}/>
          <div style={{display:'none',alignItems:'center',justifyContent:'center',width:'100%',height:'100%',fontSize:9,color:'#666',fontWeight:700,textAlign:'center',border:'1px dashed #ccc',flexDirection:'column',gap:2}}>
            <span>LOGO</span><span>UNHAR</span>
          </div>
        </div>
        <div className="print-kop-text">
          <p className="print-kop-univ">UNIVERSITAS HARAPAN MEDAN</p>
          <p className="print-kop-fak">Fakultas {mhs?.fakultas || 'Teknik & Komputer'} &middot; Program Studi {mhs?.prodi || '–'}</p>
          <p className="print-kop-alamat">Jl. HM. Jhoni No.70, Medan, Sumatera Utara 20217 &nbsp;|&nbsp; Telp. (061) 4158928</p>
          <p className="print-kop-web">www.unhar.ac.id</p>
        </div>
      </div>
      <div className="print-kop-line"/>

      {/* ── Judul ── */}
      <div className="print-judul-wrap">
        <p className="print-judul">KARTU RENCANA STUDI (KRS)</p>
        <p className="print-sub-judul">Semester {periode || '–'} {tahunPart || ''}</p>
      </div>

      {/* ── Data Mahasiswa + Foto ── */}
      <div className="print-data-wrap">
        <table className="print-tbl-mhs">
          <tbody>
            {[
              ['Nama',          mhs?.nama],
              ['NIM',           mhs?.nim],
              ['Program Studi', mhs?.prodi],
              ['Semester',      mhs?.semester],
              ['Kelas',         mhs?.kelas],
              ['Dosen Wali',    mhs?.doswali],
            ].map(([lbl, val]) => (
              <tr key={lbl}>
                <td className="print-td-lbl">{lbl}</td>
                <td className="print-td-sep">:</td>
                <td className="print-td-val">{val || '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="print-foto-box">
          {mhs?.foto_url
            ? <img src={mhs.foto_url} alt="Foto" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            : <div className="print-foto-placeholder">
                <span>Pas Foto</span>
                <span>3 × 4</span>
              </div>
          }
        </div>
      </div>

      {/* ── Tabel Mata Kuliah ── */}
      <table className="print-tbl-matkul">
        <thead>
          <tr>
            <th style={{width:'5%'}}>No</th>
            <th style={{width:'10%'}}>Kode</th>
            <th>Mata Kuliah</th>
            <th style={{width:'7%'}}>SKS</th>
            <th style={{width:'28%'}}>Dosen Pengampu</th>
            <th style={{width:'14%'}}>Paraf Dosen</th>
          </tr>
        </thead>
        <tbody>
          {dipilih.length === 0
            ? <tr><td colSpan={6} style={{textAlign:'center',padding:'16px',color:'#888',fontStyle:'italic'}}>Belum ada mata kuliah dipilih</td></tr>
            : dipilih.map((m, i) => (
              <tr key={m.jadwal_id}>
                <td style={{textAlign:'center'}}>{i + 1}</td>
                <td style={{textAlign:'center'}}>{m.kode || '–'}</td>
                <td>{m.nama || '–'}</td>
                <td style={{textAlign:'center'}}>{m.sks ?? '–'}</td>
                <td>{m.dosen || '–'}</td>
                <td></td>
              </tr>
            ))
          }
          <tr className="print-total-row">
            <td colSpan={3} style={{textAlign:'right',paddingRight:8}}>Total SKS</td>
            <td style={{textAlign:'center'}}>{total}</td>
            <td colSpan={2}></td>
          </tr>
        </tbody>
      </table>

      {/* ── Catatan ── */}
      <p className="print-catatan">
        <strong>Catatan:</strong> Lembar KRS dibuat rangkap 3 (tiga) &mdash; Lembar 1 untuk Mahasiswa &middot; Lembar 2 untuk Program Studi &middot; Lembar 3 untuk Dosen Wali
      </p>

      {/* ── Tanda Tangan ── */}
      <div className="print-ttd-section">
        <p className="print-ttd-kota">Medan, {tglHariIni()}</p>
        <div className="print-ttd-grid">
          {[
            { label:'Mahasiswa',               nama: mhs?.nama,                      nim: 'NIM. ' + (mhs?.nim || '–') },
            { label:'Koordinator Program Studi',nama: '________________________',     nim: 'NIP. ________________________' },
            { label:'Dosen Wali',               nama: mhs?.doswali || '________________________', nim: 'NIDN. ________________________' },
          ].map((t, i) => (
            <div key={i} className="print-ttd-col">
              <p className="print-ttd-label">{t.label}</p>
              <div className="print-ttd-ruang"/>
              <p className="print-ttd-nama">{t.nama}</p>
              <p className="print-ttd-nip">{t.nim}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Halaman KRS Mahasiswa ───────────────────────────────
export default function KrsPage() {
  const { data: profil } = useFetch(() => mahasiswaService.getProfil(), [])

  const { data: krsList, loading: krsLoading, refetch: refetchList } =
    useFetch(() => krsService.getAll(), [])

  const [activeId,          setActiveId]          = useState(null)
  const [filterTahun,       setFilterTahun]       = useState('semua')
  const [detail,            setDetail]            = useState(null)
  const [detailLoading,     setDetailLoading]     = useState(false)
  const [detailError,       setDetailError]       = useState('')
  const [toast,             setToast]             = useState(null)
  const [toastErr,          setToastErr]          = useState(false)
  const [showPrint,         setShowPrint]         = useState(false)
  const [showTambah,        setShowTambah]        = useState(false)
  const [showEditInfo,      setShowEditInfo]      = useState(false)

  // ── Offline KRS Draft ──────────────────────────────────
  const {
    drafts,
    isOnline,
    isSyncing,
    lastSynced,
    addDraft,
    removeDraft,
    syncNow,
    saveTokenForSW,
  } = useKrsDraft()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) saveTokenForSW(token)
  }, [saveTokenForSW])

  const active = (krsList || []).find(k => k.id === activeId)

  useEffect(() => {
    if (isOnline && drafts.length > 0 && active) {
      handleSyncDrafts()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  // ── KRS logic ─────────────────────────────────────────
  useEffect(() => {
    if (!activeId && krsList && krsList.length > 0) {
      setActiveId(krsList[0].id)
    }
  }, [krsList, activeId])

  useEffect(() => {
    if (!active?.tahun_id) { setDetail(null); return }
    let cancelled = false
    setDetailLoading(true); setDetailError('')
    krsService.getByTahun(active.tahun_id)
      .then(res => { if (!cancelled) setDetail(res.data?.data || res.data) })
      .catch(err => { if (!cancelled) setDetailError(err?.response?.data?.message || 'Gagal memuat detail KRS') })
      .finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [active?.tahun_id])

  function reloadDetail() {
    if (!active?.tahun_id) return
    krsService.getByTahun(active.tahun_id)
      .then(res => setDetail(res.data?.data || res.data))
      .catch(() => {})
  }

  function showToast(msg, isErr = false) {
    setToast(msg); setToastErr(isErr)
    setTimeout(() => setToast(null), 2600)
  }

  const { submit: doAdd, loading: adding } = useSubmit(
    (jadwalId) => krsService.addMatkul(active?.id, jadwalId),
    {
      onSuccess: () => { reloadDetail(); refetchList(); showToast('Mata kuliah ditambahkan') },
      onError:   (m) => showToast(m, true),
    }
  )
  const { submit: doRemove, loading: removing } = useSubmit(
    (jadwalId) => krsService.removeMatkul(active?.id, jadwalId),
    {
      onSuccess: () => { reloadDetail(); refetchList(); showToast('Mata kuliah dihapus') },
      onError:   (m) => showToast(m, true),
    }
  )
  const { submit: doRequestUnlock, loading: requesting } = useSubmit(
    (payload) => krsService.requestUnlock(active?.id, payload),
    {
      onSuccess: (_, payload) => {
        setShowRequestModal(false); setRequestCatatan('')
        showToast(payload?.tipe === 'minta_admin_ubah'
          ? 'Permintaan dikirim. Admin akan mengubah KRS Anda.'
          : 'Permintaan buka kunci terkirim ke Admin.')
      },
      onError: (m) => { setShowRequestModal(false); showToast(m, true) },
    }
  )
  const { submit: doCreate, loading: creating } = useSubmit(
    () => krsService.create(),
    {
      onSuccess: async (res) => {
        await refetchList()
        setActiveId(res.data?.id ?? res.id)
        showToast('KRS berhasil dibuat')
      },
      onError: (m) => {
        if (m && (m.toLowerCase().includes('pembayaran') || m.toLowerCase().includes('tagihan'))) {
          showToast('Tagihan semester ini belum lunas. Selesaikan pembayaran di menu Pembayaran terlebih dahulu.', true)
        } else {
          showToast(m, true)
        }
      },
    }
  )
  const { submit: doLock, loading: locking } = useSubmit(
    () => krsService.submit(active?.id),
    {
      onSuccess: () => { setShowLockConfirm(false); showToast('KRS berhasil dikunci & terverifikasi otomatis ✓'); refetchList() },
      onError:   (m) => { setShowLockConfirm(false); showToast(m, true) },
    }
  )
  const [showLockConfirm, setShowLockConfirm] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestTipe, setRequestTipe]           = useState('buka_kunci')
  const [requestCatatan, setRequestCatatan]     = useState('')

  // ── Handle tambah matkul: online → API, offline → draft ─
  function handleAdd(jadwalId) {
    if (active?.is_locked) { setShowEditInfo(true); return }

    if (!isOnline) {
      const matkul = tersedia.find(m => m.jadwal_id === jadwalId) || {}
      addDraft(jadwalId, matkul.nama, matkul)
      showToast(`"${matkul.nama || 'Matkul'}" disimpan sebagai draft (offline)`)
      return
    }

    doAdd(jadwalId)
  }

  function handleRemove(jadwalId) {
    if (active?.is_locked) { setShowEditInfo(true); return }
    doRemove(jadwalId)
  }

  // ── Sync draft ke server ──────────────────────────────
  const handleSyncDrafts = useCallback(async () => {
    if (!active?.id) return
    const { synced, failed } = await syncNow(
      (jadwalId) => krsService.addMatkul(active.id, jadwalId)
    )
    if (synced > 0) {
      reloadDetail()
      refetchList()
      showToast(`${synced} mata kuliah berhasil disinkronkan dari draft`)
    }
    if (failed > 0) {
      showToast(`${failed} matkul gagal disinkronkan (mungkin sudah ditambahkan)`, true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, syncNow])

  // ── Derived ───────────────────────────────────────────
  const tahunUnik = [...new Set(
    (krsList || []).map(k => parseLabel(k.tahun_akademik).tahun).filter(Boolean)
  )]

  const filtered = filterTahun === 'semua'
    ? (krsList || [])
    : (krsList || []).filter(k => parseLabel(k.tahun_akademik).tahun === filterTahun)

  const dipilih              = detail?.krs?.matkul           || []
  const tersedia             = detail?.tersedia              || []
  const tersediaPerSemester  = detail?.tersedia_per_semester || []
  const semesterMahasiswa    = detail?.semester_mahasiswa    || 99
  const totalSks             = detail?.krs?.total_sks        || 0

  const draftJadwalIds = new Set(drafts.map(d => d.jadwal_id))
  const [semBukaSet, setSemBukaSet] = useState(new Set([1,2,3,4,5,6,7,8]))

  // ── RENDER ────────────────────────────────────────────
  if (krsLoading) {
    return (
      <div className="page-single">
        <PageHeader title="Kartu Rencana Studi" subtitle="Memuat..."/>
        <div className="content-body" style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>
          Memuat data KRS...
        </div>
      </div>
    )
  }

  if (!krsList || krsList.length === 0) {
    return (
      <div className="page-single">
        <PageHeader title="Kartu Rencana Studi" subtitle="Belum ada KRS untuk periode ini"/>
        <div className="content-body">
          <div className="card" style={{ padding:40, textAlign:'center' }}>
            <div style={{ width:56, height:56, borderRadius:16, background:'var(--primary-light)',
              display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>
              </svg>
            </div>
            <p style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:8 }}>
              Belum Ada KRS
            </p>
            <p style={{ fontSize:13, color:'var(--text3)', marginBottom:8, lineHeight:1.6 }}>
              Buat KRS baru untuk semester aktif.
            </p>
            <div style={{ background:'#fef3c7', border:'1px solid #fbbf24', borderRadius:9,
              padding:'10px 16px', marginBottom:20, display:'flex', alignItems:'flex-start', gap:8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0, marginTop:2}}>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <p style={{ fontSize:12.5, color:'#92400e', margin:0, lineHeight:1.5, textAlign:'left' }}>
                <strong>Syarat KRS:</strong> Pastikan tagihan UKT semester ini sudah lunas sebelum mengisi KRS.
                Jika belum, selesaikan pembayaran di menu <strong>Pembayaran</strong> terlebih dahulu.
              </p>
            </div>
            <button className="krs-btn-cetak" onClick={() => doCreate()} disabled={creating}>
              {creating
                ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{animation:'spin 1s linear infinite'}}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Memeriksa...</>
                : '+ Buat KRS Semester Aktif'
              }
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-root">
      {/* Panel kiri */}
      <div className="page-panel">
        <div className="panel-section">
          <p className="panel-label">Tahun Akademik</p>
          <select className="panel-select" value={filterTahun} onChange={e=>setFilterTahun(e.target.value)}>
            <option value="semua">Semua Tahun</option>
            {tahunUnik.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="panel-section" style={{flex:1}}>
          <p className="panel-label">Pilih Semester</p>
          {filtered.length === 0
            ? <p style={{ fontSize:12, color:'var(--text3)' }}>Tidak ada KRS</p>
            : filtered.map(k => (
              <button key={k.id}
                className={`krs-panel-sem-btn ${activeId===k.id?'active':''}`}
                onClick={()=>setActiveId(k.id)}>
                <div className="krs-panel-sem-info">
                  <span className="krs-panel-sem-label">{k.tahun_akademik || '–'}</span>
                  <span className="krs-panel-sem-sub">{k.matkul?.length || 0} matkul · {k.total_sks || 0} SKS</span>
                </div>
                <span className={`krs-sem-badge ${k.is_locked?'closed':'open'}`}>
                  {k.is_locked ? 'Terkunci' : 'Terbuka'}
                </span>
              </button>
            ))
          }
        </div>
      </div>

      {/* Main */}
      <div className="page-main">
        <PageHeader
          title="Kartu Rencana Studi"
          subtitle={active?.tahun_akademik || '–'}
          actions={
            <button className="krs-btn-cetak" onClick={()=>setShowPrint(true)} disabled={!active || dipilih.length===0}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
              </svg>
              Cetak KRS
            </button>
          }
        />
        <div className="content-body">
          {toast && (
            <div style={{
              background: toastErr ? 'var(--red)' : 'var(--teal)',
              color:'#fff', padding:'10px 14px', borderRadius:8, marginBottom:12,
              fontSize:13, fontWeight:600
            }}>{toast}</div>
          )}

          {/* ── Banner Offline ── */}
          {!isOnline && (
            <div style={{
              display:'flex', alignItems:'center', gap:10,
              background:'#fef3c7', border:'1.5px solid #fbbf24',
              borderRadius:10, padding:'10px 14px', marginBottom:12
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0119 12.55M5 19H3a1 1 0 01-1-1v-4a1 1 0 011-1h1M10.66 5H19a1 1 0 011 1v4a1 1 0 01-1 1"/></svg>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:'#92400e', margin:0 }}>Mode Offline</p>
                <p style={{ fontSize:11, color:'#b45309', margin:0 }}>
                  Pilihan matkul akan disimpan sebagai draft dan otomatis dikirim saat koneksi kembali.
                </p>
              </div>
            </div>
          )}

          {/* ── Banner Draft Pending ── */}
          {drafts.length > 0 && (
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10,
              background: isOnline ? '#eff6ff' : '#fef9c3',
              border: `1.5px solid ${isOnline ? '#93c5fd' : '#fde68a'}`,
              borderRadius:10, padding:'12px 14px', marginBottom:12
            }}>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color: isOnline ? '#1d4ed8' : '#92400e', margin:0 }}>
                  {drafts.length} matkul tersimpan sebagai draft
                </p>
                <p style={{ fontSize:11, color:'var(--text3)', margin:'3px 0 0' }}>
                  {drafts.map(d => d.nama).join(', ')}
                </p>
                {lastSynced && (
                  <p style={{ fontSize:10, color:'#059669', margin:'2px 0 0' }}>
                    Terakhir sync: {lastSynced.toLocaleTimeString('id-ID')}
                  </p>
                )}
              </div>
              {isOnline && (
                <div style={{ display:'flex', gap:8 }}>
                  <button
                    onClick={handleSyncDrafts}
                    disabled={isSyncing}
                    style={{
                      background:'#1d4ed8', color:'#fff', border:'none',
                      borderRadius:8, padding:'7px 16px', fontSize:12,
                      fontWeight:700, cursor:'pointer', whiteSpace:'nowrap'
                    }}
                  >
                    {isSyncing ? '⟳ Menyinkronkan...' : '↑ Sinkronkan Sekarang'}
                  </button>
                  <button
                    onClick={async () => {
                      for (const d of drafts) await removeDraft(d.clientId)
                      showToast('Draft dihapus')
                    }}
                    style={{
                      background:'transparent', color:'var(--text3)', border:'1px solid var(--border)',
                      borderRadius:8, padding:'7px 12px', fontSize:12, cursor:'pointer'
                    }}
                  >
                    Hapus Draft
                  </button>
                </div>
              )}
            </div>
          )}

          {detailError && <div className="adm-error" style={{ marginBottom:12 }}>{detailError}</div>}

          {/* Banner status KRS */}
          {active?.is_locked
            ? <div className="krs-banner krs-banner--closed">
                <span className="krs-banner-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                </span>
                <div style={{ flex:1 }}>
                  <p className="krs-banner-title">KRS Terkunci &amp; Terverifikasi Otomatis ✓</p>
                  <p className="krs-banner-sub">KRS sudah dikunci oleh sistem. Untuk perubahan, pilih opsi di bawah.</p>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <button className="krs-btn-cetak" style={{ background:'#f59e0b', fontSize:12 }}
                    onClick={() => { setRequestTipe('buka_kunci'); setShowRequestModal(true) }}
                    disabled={requesting}>
                    🔓 Minta Buka Kunci
                  </button>
                  <button className="krs-btn-cetak" style={{ background:'#6366f1', fontSize:12 }}
                    onClick={() => { setRequestTipe('minta_admin_ubah'); setShowRequestModal(true) }}
                    disabled={requesting}>
                    ✏️ Minta Admin Ubah
                  </button>
                </div>
              </div>
            : <div className="krs-banner krs-banner--open">
                <span className="krs-banner-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>
                  </svg>
                </span>
                <div style={{flex:1}}>
                  <p className="krs-banner-title">Pengisian KRS Dibuka</p>
                  <p className="krs-banner-sub">{totalSks} SKS dipilih · Status: {active?.status || 'draft'}</p>
                </div>
                {dipilih.length > 0 && (
                  <button className="krs-btn-kunci" onClick={() => setShowLockConfirm(true)} disabled={locking}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    Kunci KRS
                  </button>
                )}
              </div>
          }

          {showEditInfo && (
            <div className="krs-info-box">
              <p className="krs-info-title" style={{display:"flex",alignItems:"center",gap:6}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> KRS sudah terkunci</p>
              <p className="krs-info-body">Untuk mengubah KRS, tekan tombol <strong>Minta Ubah ke Admin</strong> di atas.</p>
              <button className="krs-info-close" onClick={()=>setShowEditInfo(false)}>Tutup</button>
            </div>
          )}

          {detailLoading ? (
            <div style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>Memuat detail...</div>
          ) : (
            <>
              <div className="section-header">
                <p className="section-title" style={{marginBottom:0}}>Mata Kuliah Dipilih</p>
                <span className="badge badge-green">{dipilih.length} matkul · {totalSks} SKS</span>
              </div>
              <div className="krs-matkul-list">
                {dipilih.length === 0
                  ? <p style={{ color:'var(--text3)', fontSize:13, padding:16, textAlign:'center' }}>Belum ada mata kuliah dipilih.</p>
                  : dipilih.map(m=>(
                    <div key={m.jadwal_id} className="krs-matkul-item">
                      <span className="krs-sks-badge">{m.sks} SKS</span>
                      <div className="list-body"><h4>{m.nama}</h4><p>{m.kode} · {m.dosen || '–'}</p></div>
                      {active?.is_locked
                        ? <button className="krs-lock-btn" onClick={()=>setShowEditInfo(true)}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                            </svg></button>
                        : <button className="krs-check-btn" onClick={()=>handleRemove(m.jadwal_id)} disabled={removing}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </button>
                      }
                    </div>
                  ))}

                {drafts.length > 0 && (
                  <>
                    <div style={{ padding:'8px 14px', background:'#fffbeb',
                      borderTop:'1px dashed #fbbf24', fontSize:11,
                      color:'#92400e', fontWeight:600 }}>
                      Draft Offline (belum tersimpan ke server)
                    </div>
                    {drafts.map(d => (
                      <div key={d.clientId} className="krs-matkul-item"
                        style={{ opacity:0.7, borderLeft:'3px solid #fbbf24' }}>
                        <span className="krs-sks-badge" style={{ background:'#fef3c7', color:'#92400e' }}>
                          {d.sks || '?'} SKS
                        </span>
                        <div className="list-body">
                          <h4>{d.nama} <span style={{ fontSize:10, color:'#d97706', marginLeft:6 }}>DRAFT</span></h4>
                          <p>{d.kode || '–'}</p>
                        </div>
                        <button
                          onClick={() => removeDraft(d.clientId)}
                          style={{ background:'none', border:'none', cursor:'pointer',
                            color:'var(--text3)', fontSize:16, padding:'4px 8px' }}
                          title="Hapus draft"
                        >×</button>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {!active?.is_locked && (
                <>
                  <div className="krs-add-btn" onClick={()=>setShowTambah(v=>!v)}>
                    <span className="krs-add-icon">+</span>
                    <div className="list-body">
                      <h4>Tambah mata kuliah {!isOnline && <span style={{ fontSize:10, color:'#d97706', marginLeft:6 }}>OFFLINE</span>}</h4>
                      <p>Sisa kuota: {24-totalSks} SKS · {tersedia.length} matkul tersedia</p>
                    </div>
                    <span className="krs-add-arrow">{showTambah?'▲':'▼'}</span>
                  </div>
                  {showTambah && tersedia.length > 0 && (
                    <div className="krs-tersedia-list">
                      <p className="krs-tersedia-label">
                        Mata Kuliah Tersedia
                        {!isOnline && (
                          <span style={{ marginLeft:8, fontSize:10, background:'#fef3c7',
                            color:'#92400e', padding:'2px 6px', borderRadius:10, fontWeight:600 }}>
                            Pilihan akan disimpan sebagai draft
                          </span>
                        )}
                        <span style={{ marginLeft:8, fontSize:10, color:'var(--text3)' }}>
                          Semester 1–{semesterMahasiswa} yang tersedia
                        </span>
                      </p>

                      {tersediaPerSemester.length > 0
                        ? tersediaPerSemester.map(({ semester: sem, jadwal: jadwalList }) => {
                            const isBuka = semBukaSet.has(sem)
                            const toggleSem = () => setSemBukaSet(prev => {
                              const s = new Set(prev)
                              s.has(sem) ? s.delete(sem) : s.add(sem)
                              return s
                            })
                            return (
                              <div key={sem} className="krs-sem-accordion">
                                <button className="krs-sem-accordion-hdr" onClick={toggleSem}>
                                  <span className="krs-sem-pill">Semester {sem}</span>
                                  <span style={{ flex:1, fontSize:12, color:'var(--text3)', marginLeft:8 }}>
                                    {jadwalList.length} mata kuliah
                                  </span>
                                  <span style={{ fontSize:11, color:'var(--text3)' }}>{isBuka ? '▲' : '▼'}</span>
                                </button>
                                {isBuka && jadwalList.map(m => {
                                  const sudahDraft = draftJadwalIds.has(m.jadwal_id)
                                  return (
                                    <div key={m.jadwal_id}
                                      className="krs-tersedia-item"
                                      style={{ opacity: sudahDraft ? 0.5 : 1 }}
                                      onClick={()=>{ if(m.sks <= 24-totalSks && !sudahDraft) handleAdd(m.jadwal_id) }}>
                                      <span className="krs-sks-badge krs-sks-badge--gray">{m.sks} SKS</span>
                                      <div className="list-body">
                                        <h4>{m.nama}</h4>
                                        <p>{m.kode} · {m.dosen || '–'} · {m.hari} {m.jam_mulai?.slice(0,5)}</p>
                                      </div>
                                      {sudahDraft
                                        ? <span style={{ fontSize:11, color:'#d97706', fontWeight:600 }}>Draft ✓</span>
                                        : m.sks <= 24-totalSks
                                          ? <span className="krs-add-plus">{adding ? '...' : isOnline ? '+ Pilih' : '+ Draft'}</span>
                                          : <span className="krs-quota-warn">Kuota penuh</span>
                                      }
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })
                        : tersedia.map(m => {
                            const sudahDraft = draftJadwalIds.has(m.jadwal_id)
                            return (
                              <div key={m.jadwal_id}
                                className="krs-tersedia-item"
                                style={{ opacity: sudahDraft ? 0.5 : 1 }}
                                onClick={()=>{ if(m.sks <= 24-totalSks && !sudahDraft) handleAdd(m.jadwal_id) }}>
                                <span className="krs-sks-badge krs-sks-badge--gray">{m.sks} SKS</span>
                                <div className="list-body">
                                  <h4>{m.nama}</h4>
                                  <p>{m.kode} · {m.dosen || '–'} · {m.hari} {m.jam_mulai?.slice(0,5)}</p>
                                </div>
                                {sudahDraft
                                  ? <span style={{ fontSize:11, color:'#d97706', fontWeight:600 }}>Draft ✓</span>
                                  : m.sks <= 24-totalSks
                                    ? <span className="krs-add-plus">{adding ? '...' : isOnline ? '+ Pilih' : '+ Draft'}</span>
                                    : <span className="krs-quota-warn">Kuota penuh</span>
                                }
                              </div>
                            )
                          })
                      }
                    </div>
                  )}
                  {showTambah && tersedia.length === 0 && (
                    <p style={{ padding:16, color:'var(--text3)', fontSize:13, textAlign:'center' }}>
                      Tidak ada mata kuliah tersedia untuk semester 1–{semesterMahasiswa}.
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal permintaan ke Admin */}
      {showRequestModal && (
        <div className="krs-modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="krs-modal" style={{ maxWidth:480 }} onClick={e => e.stopPropagation()}>
            <div className="krs-modal-header">
              <h3>{requestTipe === 'minta_admin_ubah' ? '✏️ Minta Admin Ubah KRS' : '🔓 Minta Buka Kunci KRS'}</h3>
              <button className="krs-modal-close" onClick={() => setShowRequestModal(false)}>×</button>
            </div>
            <div className="krs-modal-body">
              <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                <button
                  onClick={() => setRequestTipe('buka_kunci')}
                  style={{
                    flex:1, padding:'10px 8px', borderRadius:10, border:'2px solid',
                    borderColor: requestTipe === 'buka_kunci' ? 'var(--primary)' : 'var(--border)',
                    background: requestTipe === 'buka_kunci' ? 'var(--primary-light, #F4FFC3)' : '#fff',
                    cursor:'pointer', fontSize:12.5, fontWeight:600,
                    color: requestTipe === 'buka_kunci' ? 'var(--primary)' : 'var(--text2)',
                  }}>
                  🔓 Minta Buka Kunci
                  <p style={{ fontSize:11, fontWeight:400, marginTop:3, color:'inherit', opacity:0.8 }}>
                    Admin buka kunci, kamu ubah sendiri
                  </p>
                </button>
                <button
                  onClick={() => setRequestTipe('minta_admin_ubah')}
                  style={{
                    flex:1, padding:'10px 8px', borderRadius:10, border:'2px solid',
                    borderColor: requestTipe === 'minta_admin_ubah' ? '#6366f1' : 'var(--border)',
                    background: requestTipe === 'minta_admin_ubah' ? '#ede9fe' : '#fff',
                    cursor:'pointer', fontSize:12.5, fontWeight:600,
                    color: requestTipe === 'minta_admin_ubah' ? '#4338ca' : 'var(--text2)',
                  }}>
                  ✏️ Minta Admin Ubah
                  <p style={{ fontSize:11, fontWeight:400, marginTop:3, color:'inherit', opacity:0.8 }}>
                    Admin yang mengubah langsung
                  </p>
                </button>
              </div>

              <div style={{ background:'#f8fafc', borderRadius:9, padding:'12px 14px', marginBottom:14 }}>
                <p style={{ fontSize:12.5, color:'var(--text2)', lineHeight:1.6 }}>
                  {requestTipe === 'minta_admin_ubah'
                    ? <>Admin akan membuka portal KRS Anda dan langsung mengubah matkul. Anda akan mendapat notifikasi setelah selesai.</>
                    : <>Admin akan membuka kunci KRS <strong>{active?.tahun_akademik}</strong>. Setelah terbuka, Anda bisa mengubah matkul lalu kunci ulang.</>
                  }
                </p>
              </div>

              <label style={{ fontSize:12, fontWeight:700, color:'var(--text2)', display:'block', marginBottom:5 }}>
                Catatan untuk Admin <span style={{ fontWeight:400 }}>(opsional)</span>
              </label>
              <textarea
                rows={3}
                value={requestCatatan}
                onChange={e => setRequestCatatan(e.target.value)}
                placeholder={requestTipe === 'minta_admin_ubah'
                  ? 'Contoh: Mohon ganti Matkul A dengan Matkul B karena jadwal bentrok.'
                  : 'Contoh: Ada matkul yang ingin saya ganti karena jadwal bentrok.'}
                style={{ width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:9, fontSize:13, resize:'vertical', fontFamily:'inherit' }}
              />
            </div>
            <div className="krs-modal-footer">
              <button className="krs-btn-secondary" onClick={() => { setShowRequestModal(false); setRequestCatatan('') }}>Batal</button>
              <button
                style={{ background: requestTipe === 'minta_admin_ubah' ? '#6366f1' : 'var(--primary)', color:'#fff', border:'none', borderRadius:10, padding:'9px 20px', fontWeight:700, fontSize:13, cursor:'pointer' }}
                onClick={() => doRequestUnlock({ tipe: requestTipe, catatan: requestCatatan })}
                disabled={requesting}>
                {requesting ? 'Mengirim...' : 'Kirim Permintaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal konfirmasi KUNCI KRS */}
      {showLockConfirm && (
        <div className="krs-modal-overlay" onClick={() => setShowLockConfirm(false)}>
          <div className="krs-modal" style={{ maxWidth:440 }} onClick={e => e.stopPropagation()}>
            <div className="krs-modal-header">
              <h3 style={{display:'flex',alignItems:'center',gap:8}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                Kunci KRS
              </h3>
              <button className="krs-modal-close" onClick={() => setShowLockConfirm(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="krs-modal-body">
              <div style={{background:'#fef3c7',border:'1px solid #fbbf24',borderRadius:9,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'flex-start',gap:8}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <p style={{fontSize:12.5,color:'#92400e',margin:0,lineHeight:1.5}}>
                  Setelah dikunci, KRS <strong>{active?.tahun_akademik}</strong> akan <strong>terverifikasi otomatis</strong> oleh sistem — tidak perlu menunggu Admin. Untuk mengubah di kemudian hari, gunakan fitur <em>Minta Buka Kunci</em> atau <em>Minta Admin Ubah</em>.
                </p>
              </div>
              <div style={{background:'var(--bg)',borderRadius:9,padding:'12px 14px',marginBottom:4}}>
                <p style={{fontSize:12,color:'var(--text3)',marginBottom:6,fontWeight:700}}>Ringkasan KRS</p>
                <p style={{fontSize:13,color:'var(--text)',margin:0}}>{dipilih.length} mata kuliah · {totalSks} SKS</p>
                <p style={{fontSize:11,color:'var(--text3)',marginTop:4}}>
                  {dipilih.slice(0,3).map(m => m.nama).join(', ')}{dipilih.length > 3 ? ` +${dipilih.length-3} lainnya` : ''}
                </p>
              </div>
            </div>
            <div className="krs-modal-footer">
              <button className="krs-btn-secondary" onClick={() => setShowLockConfirm(false)}>Batal</button>
              <button className="krs-btn-cetak" onClick={() => { doLock(); setShowLockConfirm(false) }} disabled={locking}
                style={{display:'flex',alignItems:'center',gap:6}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                {locking ? 'Mengirim...' : 'Ya, Kunci & Kirim ke Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cetak */}
      {showPrint && active && detail && (
        <div className="krs-modal-overlay" onClick={()=>setShowPrint(false)}>
          <div className="krs-modal" onClick={e=>e.stopPropagation()}>
            <div className="krs-modal-header">
              <h3>Preview Cetak KRS</h3>
              <button className="krs-modal-close" onClick={()=>setShowPrint(false)}>×</button>
            </div>
            <div className="krs-modal-body">
              <div className="krs-catatan-rangkap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <p>Cetak <strong>rangkap 3</strong>: untuk <strong>Mahasiswa</strong>, <strong>Program Studi</strong>, dan <strong>Dosen Wali</strong></p>
              </div>
              <div className="krs-print-scroll">
                <PrintArea krs={active} mhs={profil} detail={detail?.krs}/>
              </div>
            </div>
            <div className="krs-modal-footer">
              <button className="krs-btn-secondary" onClick={()=>setShowPrint(false)}>Batal</button>
              <button className="krs-btn-cetak" onClick={()=>{ setShowPrint(false); setTimeout(()=>window.print(),100) }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                </svg>
                Cetak / Simpan PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}