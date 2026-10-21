import { useState } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import { useAuth } from '../../context/AuthContext'
import { useFetch, useSubmit } from '../../hooks/useFetch'
import { adminService, authService } from '../../services/services'
import api, { getErrorMessage } from '../../services/api'
import './AdminCrud.css'

/* ── Ikon SVG ── */
const IcoUser  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
const IcoLock  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
const IcoPlus  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
const IcoReset = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>

/* ════════════════════════════════════════════════════════
   RESET PASSWORD MASSAL — Section
   Mengembalikan password SEMUA mahasiswa & dosen ke default
   (NIM untuk mahasiswa, NIP/NIDN untuk dosen). Berguna untuk
   memperbaiki akun lama yang gagal login.
════════════════════════════════════════════════════════ */
function ResetPasswordMassalSection() {
  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState('')
  const [err,     setErr]     = useState('')

  async function handleReset() {
    if (!confirm(
      'Reset password SEMUA mahasiswa ke NIM dan SEMUA dosen ke NIP/NIDN masing-masing?\n\n' +
      'Password yang sudah diganti manual oleh mahasiswa/dosen juga akan ikut direset ke default.\n\n' +
      'Lanjutkan?'
    )) return

    setLoading(true); setMsg(''); setErr('')
    try {
      const r = await adminService.resetPasswordMassal()
      setMsg(r?.data?.message || 'Password berhasil direset ke default.')
    } catch (e) {
      setErr(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{padding:20,maxWidth:600}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <div style={{width:36,height:36,borderRadius:10,background:'#fee2e2',color:'#dc2626',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <IcoReset/>
        </div>
        <div>
          <h3 style={{fontFamily:'var(--font-heading)',fontSize:14,fontWeight:700,margin:0}}>Reset Password Massal</h3>
          <p style={{fontSize:12,color:'var(--text3)',margin:0,marginTop:1}}>Perbaiki akun mahasiswa/dosen lama yang gagal login</p>
        </div>
      </div>

      {msg && <div className="adm-success" style={{marginBottom:14}}>{msg}</div>}
      {err && <div className="adm-error"   style={{marginBottom:14}}>{err}</div>}

      <p style={{fontSize:13,color:'var(--text2)',lineHeight:1.6,marginBottom:14}}>
        Tombol ini akan mereset password <strong>semua akun mahasiswa</strong> ke NIM
        masing-masing, dan <strong>semua akun dosen</strong> ke NIP/NIDN masing-masing.
        Gunakan ini jika ada akun lama yang tidak bisa login meski password
        default sudah benar.
      </p>
      <div style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:9,padding:'10px 12px',fontSize:12,color:'var(--text3)',marginBottom:16}}>
        ⚠️ Mahasiswa/dosen yang sudah mengganti password sendiri akan ikut
        direset ke default (NIM/NIP). Beri tahu mereka untuk login ulang
        dengan NIM/NIP, lalu ganti password kembali jika perlu.
      </div>

      <button className="adm-btn-save" onClick={handleReset} disabled={loading}
        style={{display:'flex',alignItems:'center',gap:7,background:'#dc2626'}}>
        {loading ? 'Memproses...' : <><IcoReset/> Reset Semua Password</>}
      </button>
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   TAMBAH ADMIN BARU — Section
════════════════════════════════════════════════════════ */
function TambahAdminSection() {
  const [form,    setForm]    = useState({ name:'', email:'', password:'' })
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')
  const [err,     setErr]     = useState('')
  const [open,    setOpen]    = useState(false)

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setErr('Nama, email, dan password wajib diisi.'); return
    }
    if (form.password.length < 8) {
      setErr('Password minimal 8 karakter.'); return
    }
    setSaving(true); setErr('')
    try {
      // Kirim ke endpoint tambah admin — gunakan endpoint general user dengan role=admin
      await api.post('/admin/admin', { ...form, role: 'admin' })
      setMsg('Admin baru berhasil ditambahkan.')
      setForm({ name:'', email:'', password:'' })
      setOpen(false)
      setTimeout(() => setMsg(''), 4000)
    } catch(e) {
      setErr(getErrorMessage(e))
    } finally { setSaving(false) }
  }

  return (
    <div className="card" style={{padding:20,maxWidth:600,marginBottom:0}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:open?16:0}}>
        <div style={{width:36,height:36,borderRadius:10,background:'#ede9fe',color:'#7c3aed',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <IcoPlus/>
        </div>
        <div style={{flex:1}}>
          <h3 style={{fontFamily:'var(--font-heading)',fontSize:14,fontWeight:700,margin:0,color:'var(--text)'}}>Tambah Admin Baru</h3>
          <p style={{fontSize:12,color:'var(--text3)',margin:0,marginTop:2}}>Buat akun administrator baru untuk portal</p>
        </div>
        <button
          onClick={() => { setOpen(v => !v); setErr('') }}
          style={{padding:'8px 16px',borderRadius:9,border:'1.5px solid var(--border)',background:open?'var(--bg)':'#fff',fontSize:13,fontWeight:600,color:'var(--text2)',cursor:'pointer',transition:'all 0.13s'}}
        >
          {open ? 'Batal' : '+ Tambah'}
        </button>
      </div>

      {open && (
        <>
          {err && <div className="adm-error" style={{marginBottom:12}}>{err}</div>}
          <div className="adm-field">
            <label>Nama Lengkap</label>
            <input type="text" value={form.name} placeholder="Nama administrator baru"
              onChange={e => setForm(p => ({...p, name: e.target.value}))}/>
          </div>
          <div className="adm-field">
            <label>Email</label>
            <input type="email" value={form.email} placeholder="email@unhar.ac.id"
              onChange={e => setForm(p => ({...p, email: e.target.value}))}/>
          </div>
          <div className="adm-field">
            <label>Password</label>
            <input type="password" value={form.password} placeholder="Minimal 8 karakter"
              onChange={e => setForm(p => ({...p, password: e.target.value}))}/>
            <p style={{fontSize:11,color:'var(--text3)',marginTop:4}}>Admin baru bisa mengubah password setelah login pertama.</p>
          </div>
          <div style={{background:'#fffbeb',border:'1px solid #fbbf24',borderRadius:8,padding:'10px 13px',marginBottom:14,display:'flex',alignItems:'flex-start',gap:8}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p style={{fontSize:11.5,color:'#92400e',margin:0,lineHeight:1.5}}>
              Admin baru akan memiliki akses penuh ke semua fitur portal. Pastikan hanya memberikan akses kepada staf yang berwenang.
            </p>
          </div>
          <button className="adm-btn-save" onClick={handleSave} disabled={saving}
            style={{display:'flex',alignItems:'center',gap:7}}>
            {saving ? 'Menyimpan...' : <><IcoPlus/> Buat Akun Admin</>}
          </button>
        </>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════ */
export default function ProfilPage() {
  const { user } = useAuth()
  const { data: profil, refetch } = useFetch(() => adminService.getProfil(), [])
  const [form, setForm]   = useState({})
  const [pw, setPw]       = useState({ password_lama:'', password_baru:'', password_baru_confirmation:'' })
  const [msg, setMsg]     = useState('')
  const [msgType, setMsgType] = useState('ok') // 'ok' | 'err'

  const { submit: save, loading: saving } = useSubmit(
    d => adminService.updateProfil(d),
    { onSuccess: () => { refetch(); showMsg('Profil berhasil disimpan.', 'ok') } }
  )
  const { submit: chgPw, loading: pwLoading } = useSubmit(
    d => authService.updatePassword(d),
    {
      onSuccess: () => { setPw({ password_lama:'', password_baru:'', password_baru_confirmation:'' }); showMsg('Password berhasil diubah.', 'ok') },
      onError:   (m) => showMsg(m, 'err'),
    }
  )

  function showMsg(text, type = 'ok') {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  const SECTION = [
    { id:'data',  label:'Data Diri',    icon: <IcoUser/>,  iconBg:'#ddeab6', iconColor:'#31511E' },
    { id:'pw',    label:'Ganti Password',icon: <IcoLock/>,  iconBg:'#fef3c7', iconColor:'#d97706' },
    { id:'admin', label:'Tambah Admin',  icon: <IcoPlus/>,  iconBg:'#ede9fe', iconColor:'#7c3aed' },
    { id:'reset', label:'Reset Password Massal', icon: <IcoReset/>, iconBg:'#fee2e2', iconColor:'#dc2626' },
  ]
  const [activeSection, setActiveSection] = useState('data')

  return (
    <div className="page-single">
      <PageHeader title="Profil Admin" subtitle="Data diri & keamanan akun"/>
      <div className="content-body">
        {msg && (
          <div className={msgType === 'ok' ? 'adm-success' : 'adm-error'} style={{marginBottom:16,maxWidth:600}}>
            {msg}
          </div>
        )}

        {/* Tab navigasi */}
        <div style={{display:'flex',gap:8,marginBottom:20,maxWidth:600}}>
          {SECTION.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              style={{
                display:'flex',alignItems:'center',gap:7,
                padding:'9px 16px',borderRadius:10,border:'1.5px solid',
                fontFamily:'var(--font-heading)',fontSize:13,fontWeight:600,cursor:'pointer',
                transition:'all 0.15s',
                background: activeSection===s.id ? s.iconBg : '#fff',
                borderColor: activeSection===s.id ? 'transparent' : 'var(--border)',
                color: activeSection===s.id ? s.iconColor : 'var(--text2)',
                boxShadow: activeSection===s.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              }}>
              <span style={{color:s.iconColor}}>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Data Diri ── */}
        {activeSection === 'data' && (
          <div className="card" style={{padding:20,maxWidth:600}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
              <div style={{width:36,height:36,borderRadius:10,background:'#ddeab6',color:'#31511E',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <IcoUser/>
              </div>
              <div>
                <h3 style={{fontFamily:'var(--font-heading)',fontSize:14,fontWeight:700,margin:0}}>Data Diri</h3>
                <p style={{fontSize:12,color:'var(--text3)',margin:0,marginTop:1}}>Informasi akun administrator</p>
              </div>
            </div>
            {[['Nama','nama',profil?.nama||user?.name],['Email','email',profil?.email||user?.email],['Telepon','telepon',profil?.telepon]].map(([l,k,v]) => (
              <div key={k} className="adm-field">
                <label>{l}</label>
                <input type="text" defaultValue={v||''} onChange={e => setForm(p => ({...p,[k]:e.target.value}))}/>
              </div>
            ))}
            <button className="adm-btn-save" onClick={() => save(form)} disabled={saving}
              style={{marginTop:8,display:'flex',alignItems:'center',gap:7}}>
              {saving ? 'Menyimpan...' : <><IcoUser/> Simpan Profil</>}
            </button>
          </div>
        )}

        {/* ── Ganti Password ── */}
        {activeSection === 'pw' && (
          <div className="card" style={{padding:20,maxWidth:600}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
              <div style={{width:36,height:36,borderRadius:10,background:'#fef3c7',color:'#d97706',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <IcoLock/>
              </div>
              <div>
                <h3 style={{fontFamily:'var(--font-heading)',fontSize:14,fontWeight:700,margin:0}}>Ganti Password</h3>
                <p style={{fontSize:12,color:'var(--text3)',margin:0,marginTop:1}}>Pastikan password baru kuat dan tidak digunakan di tempat lain</p>
              </div>
            </div>
            {[['password_lama','Password Saat Ini'],['password_baru','Password Baru'],['password_baru_confirmation','Konfirmasi Password Baru']].map(([k,l]) => (
              <div key={k} className="adm-field">
                <label>{l}</label>
                <input type="password" value={pw[k]} onChange={e => setPw(p => ({...p,[k]:e.target.value}))}/>
              </div>
            ))}
            <button className="adm-btn-save" onClick={() => chgPw(pw)} disabled={pwLoading}
              style={{marginTop:8,display:'flex',alignItems:'center',gap:7}}>
              {pwLoading ? 'Menyimpan...' : <><IcoLock/> Ubah Password</>}
            </button>
          </div>
        )}

        {/* ── Tambah Admin ── */}
        {activeSection === 'admin' && <TambahAdminSection/>}

        {/* ── Reset Password Massal ── */}
        {activeSection === 'reset' && <ResetPasswordMassalSection/>}
      </div>
    </div>
  )
}
