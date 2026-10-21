import { useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useFetch, useSubmit } from '../../hooks/useFetch'
import { dosenService, authService } from '../../services/services'
import './ProfilPage.css'

/* ── Helpers ── */
function getProdiColor(str = '') {
  // Semua palet dalam keluarga olive/hijau — konsisten dengan palette portal
  const PALETTES = [
    { main:'#5D8736', dark:'#31511E', light:'#F4FFC3' },  // olive utama
    { main:'#31511E', dark:'#1a2e10', light:'#e8f5e0' },  // forest gelap
    { main:'#859F3D', dark:'#5D8736', light:'#edf7c3' },  // olive mid
    { main:'#809D3C', dark:'#4a6020', light:'#eaf5d0' },  // olive warm
    { main:'#4a7c30', dark:'#2d4e1a', light:'#dff0cb' },  // hijau medium
    { main:'#3d6b28', dark:'#254018', light:'#d9edca' },  // hijau tua
    { main:'#6aab3a', dark:'#3d6b28', light:'#e8f7d8' },  // hijau segar
    { main:'#537a27', dark:'#2e4516', light:'#deedc4' },  // olive earthy
  ]
  let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PALETTES[h % PALETTES.length]
}
function initials(name = '') {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase()
}
function showMsg(setFn, msg, type='ok') {
  setFn({ msg, type })
  setTimeout(() => setFn(null), 3000)
}

/* ── Ikon SVG ── */
const Ico = {
  camera: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  trash:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
  edit:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  lock:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  book:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  check:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  mail:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  phone:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .91h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
  map:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  id:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  sks:    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  star:   <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
}

export default function ProfilPage() {
  const { user, updateUser } = useAuth()
  const fileRef  = useRef()
  const [tab,          setTab]          = useState('data')
  const [editing,      setEditing]      = useState(false)
  const [form,         setForm]         = useState({})
  const [pwForm,       setPwForm]       = useState({ current_password:'', new_password:'', new_password_confirmation:'' })
  const [toast,        setToast]        = useState(null)
  const [fotoBust,     setFotoBust]     = useState(0)
  const [fotoMenuOpen, setFotoMenuOpen] = useState(false)

  const { data: profil, loading, refetch } = useFetch(() => dosenService.getProfil(), [])

  const fotoSrc  = profil?.foto_url ? `${profil.foto_url}?t=${fotoBust}` : null
  const pal      = getProdiColor(profil?.prodi || '')
  const inits    = initials(profil?.nama || user?.name || 'D')
  const nidn     = profil?.nidn || user?.dosen?.nidn || profil?.nip || user?.dosen?.nip || '–'
  const nama     = profil?.nama || user?.name || '–'
  const matkulList = profil?.matkul_diampu || []
  const totalSKS = matkulList.reduce((s, m) => s + (Number(m.sks) || 0), 0)

  /* ── Actions ── */
  const { submit: simpanProfil, loading: saving } = useSubmit(
    d => dosenService.updateProfil(d),
    {
      onSuccess: res => {
        refetch(); setEditing(false)
        if (res?.nama) updateUser({ name: res.nama })
        showMsg(setToast, 'Profil berhasil diperbarui!', 'ok')
      },
      onError: m => showMsg(setToast, m, 'err'),
    }
  )
  const { submit: uploadFoto, loading: uploading } = useSubmit(
    f => dosenService.uploadFoto(f),
    {
      onSuccess: res => {
        setFotoBust(Date.now()); refetch()
        if (res?.foto_url) updateUser({ dosen: { ...(user?.dosen||{}), foto_url: res.foto_url } })
        showMsg(setToast, 'Foto diupload!', 'ok'); setFotoMenuOpen(false)
      },
      onError: m => { showMsg(setToast, m, 'err'); setFotoMenuOpen(false) },
    }
  )
  const { submit: hapusFoto, loading: deleting } = useSubmit(
    () => dosenService.deleteFoto(),
    {
      onSuccess: () => {
        setFotoBust(Date.now()); refetch()
        updateUser({ dosen: { ...(user?.dosen||{}), foto_url: null } })
        showMsg(setToast, 'Foto dihapus.', 'ok'); setFotoMenuOpen(false)
      },
      onError: m => { showMsg(setToast, m, 'err'); setFotoMenuOpen(false) },
    }
  )
  const { submit: gantiPw, loading: pwLoading } = useSubmit(
    d => authService.updatePassword(d),
    {
      onSuccess: () => {
        setPwForm({ current_password:'', new_password:'', new_password_confirmation:'' })
        showMsg(setToast, 'Password diubah!', 'ok')
      },
      onError: m => showMsg(setToast, m, 'err'),
    }
  )

  function handleFotoChange(e) {
    const file = e.target.files?.[0]
    if (file) uploadFoto(file)
    e.target.value = ''
  }
  function startEdit() {
    setForm({ name: profil?.nama||'', no_hp: profil?.no_hp||'', alamat: profil?.alamat||'' })
    setEditing(true)
  }

  /* ── Render helpers ── */
  function InfoRow({ icon, label, value, mono }) {
    return (
      <div className="prf-info-row">
        <span className="prf-info-icon" style={{ color: pal.main }}>{icon}</span>
        <div className="prf-info-body">
          <span className="prf-info-label">{label}</span>
          <span className={`prf-info-val ${mono ? 'prf-info-val--mono' : ''}`}>{value || '–'}</span>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div className="prf-loading-wrap">
      {[220,140,160].map((h,i) => <div key={i} className="prf-skeleton" style={{ height:h }}/>)}
    </div>
  )

  return (
    <div className="prf-page">

      {/* ── Toast ── */}
      {toast && (
        <div className={`prf-toast prf-toast--${toast.type}`}>
          {toast.type === 'ok' ? Ico.check : null} {toast.msg}
        </div>
      )}

      {/* ═════════════════════════════════════
          HERO BANNER — olive gradient + rings
      ═════════════════════════════════════ */}
      <div className={`prf-hero ${fotoMenuOpen ? 'has-dropdown' : ''}`} style={{ '--pal-main': pal.main, '--pal-dark': pal.dark }}>
        {/* Decorative rings */}
        <div className="prf-hero-ring prf-hero-ring-1"/>
        <div className="prf-hero-ring prf-hero-ring-2"/>
        <div className="prf-hero-ring prf-hero-ring-3"/>
        <div className="prf-hero-sparkle"><span/><span/><span/><span/></div>

        {/* Avatar di hero */}
        <div className="prf-hero-left">
          <div className="prf-avatar-zone">
            <div className="prf-avatar-ring">
              <div className="prf-avatar" style={{ background: fotoSrc ? 'transparent' : pal.main }}>
                {fotoSrc
                  ? <img src={fotoSrc} alt="Foto" className="prf-avatar-img"
                      onError={e => { e.currentTarget.style.display='none'; e.currentTarget.parentElement.querySelector('.prf-avatar-inits').style.display='flex' }}/>
                  : null}
                <span className="prf-avatar-inits" style={{ display: fotoSrc ? 'none' : 'flex' }}>{inits}</span>
                <div className="prf-avatar-overlay" onClick={() => setFotoMenuOpen(v => !v)}
                  role="button" tabIndex={0} aria-label="Ubah atau hapus foto profil"
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFotoMenuOpen(v => !v) } }}>
                  {Ico.camera}
                </div>
              </div>
            </div>
            {/* Petunjuk — selalu terlihat, terutama untuk perangkat tanpa hover (HP/tablet) */}
            <button type="button" className="prf-avatar-hint" onClick={() => setFotoMenuOpen(v => !v)}>
              {Ico.camera} {fotoSrc ? 'Ubah / Hapus Foto' : 'Tambah Foto'}
            </button>
            {/* Dropdown foto */}
            {fotoMenuOpen && (
              <div className="prf-foto-dropdown">
                <button className="prf-foto-opt" onClick={() => { setFotoMenuOpen(false); fileRef.current?.click() }} disabled={uploading}>
                  {Ico.camera} {uploading ? 'Mengupload...' : 'Upload Foto'}
                </button>
                {fotoSrc && (
                  <button className="prf-foto-opt prf-foto-opt--del"
                    onClick={() => { setFotoMenuOpen(false); confirm('Hapus foto profil?') && hapusFoto() }}
                    disabled={deleting}>
                    {Ico.trash} {deleting ? 'Menghapus...' : 'Hapus Foto'}
                  </button>
                )}
                <button className="prf-foto-opt prf-foto-opt--cancel" onClick={() => setFotoMenuOpen(false)}>Batal</button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFotoChange}/>
          </div>

          {/* Nama & role di hero */}
          <div className="prf-hero-identity">
            <h1 className="prf-hero-name">{nama}</h1>
            <p className="prf-hero-role">Dosen Tetap</p>
            <div className="prf-hero-tags">
              <span className="prf-hero-tag prf-hero-tag--prodi">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                {profil?.prodi || user?.dosen?.prodi || 'Sistem Informasi'}
              </span>
              {profil?.jabatan && (
                <span className="prf-hero-tag prf-hero-tag--jabatan">{profil.jabatan}</span>
              )}
            </div>
          </div>
        </div>

        {/* Stat chips di hero */}
        <div className="prf-hero-right">
          <div className="prf-hero-stats">
            <div className="prf-hero-stat">
              <span className="prf-hero-stat-val">{matkulList.length}</span>
              <span className="prf-hero-stat-lbl">Mata Kuliah</span>
            </div>
            <div className="prf-hero-stat-divider"/>
            <div className="prf-hero-stat">
              <span className="prf-hero-stat-val">{totalSKS}</span>
              <span className="prf-hero-stat-lbl">Total SKS</span>
            </div>
            <div className="prf-hero-stat-divider"/>
            <div className="prf-hero-stat">
              <span className="prf-hero-stat-val prf-hero-stat-val--mono">{nidn !== '–' ? nidn.slice(0,5)+'…' : '–'}</span>
              <span className="prf-hero-stat-lbl">NIDN</span>
            </div>
          </div>

          {/* NIDN full card */}
          <div className="prf-hero-nidn-card">
            <span className="prf-hero-nidn-lbl">NIDN</span>
            <span className="prf-hero-nidn-val">{nidn}</span>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════
          KONTEN — Tabs + Grid
      ═════════════════════════════════════ */}
      <div className="prf-body">
        {/* Tab navigasi */}
        <div className="prf-tab-bar">
          {[
            { key:'data',     label:'Data Diri',   icon: Ico.edit },
            { key:'matkul',   label:'Mata Kuliah', icon: Ico.book },
            { key:'keamanan', label:'Keamanan',    icon: Ico.lock },
          ].map(t => (
            <button key={t.key} className={`prf-tab ${tab===t.key?'prf-tab--active':''}`}
              onClick={() => { setTab(t.key); setEditing(false) }}
              style={tab===t.key ? { '--pal-main': pal.main } : {}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: DATA DIRI ── */}
        {tab === 'data' && (
          <div className="prf-content-grid">
            {/* Card info kontak */}
            <div className="prf-card prf-card--info">
              <div className="prf-card-hdr">
                <span className="prf-card-title">Informasi Pribadi</span>
                {!editing
                  ? <button className="prf-btn-edit" onClick={startEdit}>{Ico.edit} Edit</button>
                  : <div style={{display:'flex',gap:8}}>
                      <button className="prf-btn-cancel" onClick={() => setEditing(false)}>Batal</button>
                      <button className="prf-btn-save" onClick={() => simpanProfil(form)} disabled={saving}
                        style={{ '--pal-main': pal.main, '--pal-dark': pal.dark }}>
                        {saving ? 'Menyimpan...' : <>{Ico.check} Simpan</>}
                      </button>
                    </div>
                }
              </div>
              <div className="prf-info-list">
                {editing ? (
                  <>
                    <div className="prf-edit-field">
                      <label>Nama Lengkap</label>
                      <input value={form.name||''} onChange={e => setForm(p => ({...p, name:e.target.value}))} placeholder="Nama lengkap"/>
                    </div>
                    <div className="prf-edit-field">
                      <label>No. HP / WhatsApp</label>
                      <input value={form.no_hp||''} onChange={e => setForm(p => ({...p, no_hp:e.target.value}))} placeholder="08xxxxxxxxxx"/>
                    </div>
                    <div className="prf-edit-field">
                      <label>Alamat</label>
                      <textarea value={form.alamat||''} onChange={e => setForm(p => ({...p, alamat:e.target.value}))} placeholder="Alamat lengkap" rows={3}/>
                    </div>
                  </>
                ) : (
                  <>
                    <InfoRow icon={Ico.mail}  label="Email"   value={profil?.email || user?.email}/>
                    <InfoRow icon={Ico.phone} label="No. HP"  value={profil?.no_hp}/>
                    <InfoRow icon={Ico.map}   label="Alamat"  value={profil?.alamat}/>
                    <InfoRow icon={Ico.id}    label="NIDN"    value={nidn} mono/>
                  </>
                )}
              </div>
            </div>

            {/* Card akademik */}
            <div className="prf-card prf-card--akademik">
              <span className="prf-card-title" style={{marginBottom:16,display:'block'}}>Data Akademik</span>
              <div className="prf-akademik-grid">
                {[
                  { label:'Program Studi', value: profil?.prodi || user?.dosen?.prodi, accent: pal.main },
                  { label:'Jabatan',       value: profil?.jabatan },
                  { label:'Fakultas',      value: profil?.fakultas },
                  { label:'Status',        value: 'Aktif Mengajar', green: true },
                ].map(item => item.value && (
                  <div key={item.label} className={`prf-akademik-item ${item.green ? 'prf-akademik-item--green' : ''}`}
                    style={item.accent ? { borderTop: `3px solid ${item.accent}` } : {}}>
                    <span className="prf-akademik-lbl">{item.label}</span>
                    <span className="prf-akademik-val">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: MATA KULIAH ── */}
        {tab === 'matkul' && (
          <div className="prf-matkul-section">
            <div className="prf-matkul-header">
              <div>
                <p className="prf-matkul-header-title">{matkulList.length} Mata Kuliah Diampu</p>
                <p className="prf-matkul-header-sub">Total beban: {totalSKS} SKS per minggu</p>
              </div>
              <div className="prf-matkul-header-badges">
                <span className="prf-matkul-stat" style={{ background: pal.light, color: pal.dark }}>
                  {Ico.sks} {totalSKS} SKS
                </span>
              </div>
            </div>
            <div className="prf-matkul-grid">
              {matkulList.length === 0 ? (
                <div className="prf-matkul-empty">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  <p>Tidak ada mata kuliah.</p>
                </div>
              ) : matkulList.map((m, i) => {
                const mPal = getProdiColor(m.nama || '')
                return (
                  <div key={i} className="prf-matkul-card">
                    <div className="prf-matkul-card-accent" style={{ background: mPal.main }}/>
                    <div className="prf-matkul-card-body">
                      <div className="prf-matkul-card-top">
                        <span className="prf-matkul-kode" style={{ color: mPal.main, background: mPal.light }}>
                          {m.kode || '–'}
                        </span>
                        <span className="prf-matkul-sks" style={{ color: mPal.dark }}>
                          {Ico.sks} {m.sks || '–'} SKS
                        </span>
                      </div>
                      <h4 className="prf-matkul-nama">{m.nama || m.nama_matkul || '–'}</h4>
                      {m.prodi && <p className="prf-matkul-prodi">{m.prodi}</p>}
                      {m.semester && (
                        <div className="prf-matkul-sem">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                          Semester {m.semester}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── TAB: KEAMANAN ── */}
        {tab === 'keamanan' && (
          <div className="prf-keamanan-wrap">
            <div className="prf-card prf-card--keamanan">
              <div className="prf-card-hdr">
                <span className="prf-card-title">Ganti Password</span>
              </div>
              <div className="prf-keamanan-tip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Gunakan kombinasi huruf besar, kecil, angka dan simbol untuk keamanan lebih baik.
              </div>
              <div className="prf-pw-fields">
                {[
                  { key:'current_password',          label:'Password Saat Ini',       type:'password' },
                  { key:'new_password',              label:'Password Baru',            type:'password' },
                  { key:'new_password_confirmation', label:'Konfirmasi Password Baru', type:'password' },
                ].map(f => (
                  <div key={f.key} className="prf-pw-field">
                    <label>{f.label}</label>
                    <input type={f.type} value={pwForm[f.key]}
                      onChange={e => setPwForm(p => ({...p,[f.key]:e.target.value}))}
                      placeholder="••••••••"/>
                  </div>
                ))}
                <button className="prf-btn-save prf-btn-save--full"
                  style={{ '--pal-main': pal.main, '--pal-dark': pal.dark }}
                  onClick={() => gantiPw({
                    password_lama: pwForm.current_password,
                    password_baru: pwForm.new_password,
                    password_baru_confirmation: pwForm.new_password_confirmation,
                  })}
                  disabled={pwLoading || !pwForm.current_password || !pwForm.new_password || !pwForm.new_password_confirmation}>
                  {pwLoading ? 'Menyimpan...' : <>{Ico.lock} Ubah Password</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
