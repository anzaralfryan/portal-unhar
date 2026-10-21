import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'
import { useFetch, useSubmit } from '../../hooks/useFetch'
import { mahasiswaService, authService } from '../../services/services'
import { useAuth } from '../../context/AuthContext'
import { getErrorMessage } from '../../services/api'
import './ProfilPage.css'

export default function ProfilPage() {
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()

  const { data: profil, loading, refetch } = useFetch(() => mahasiswaService.getProfil(), [])

  const [editMode, setEditMode] = useState(false)
  const [form, setForm]         = useState({})
  const [toast, setToast]       = useState(null)
  const [toastErr, setToastErr] = useState(false)
  const [fotoBust, setFotoBust] = useState(0)
  const fileRef = useRef()
  const [showPw, setShowPw] = useState(false)
  const [pwForm, setPwForm] = useState({ password_lama:'', password_baru:'', password_baru_confirmation:'' })

  const fotoSrc = profil?.foto_url ? `${profil.foto_url}${profil.foto_url.includes('?') ? '&' : '?'}t=${fotoBust}` : null

  const { submit: uploadFoto, loading: uploading } = useSubmit(
    (file) => mahasiswaService.uploadFoto(file),
    {
      onSuccess: (resData) => {
        setFotoBust(Date.now())
        refetch()
        showToast('Foto berhasil diupload!')
        // Batch 9b: update user context agar sidebar langsung tampil foto baru
        if (resData?.foto_url) {
          updateUser({ mahasiswa: { ...(user?.mahasiswa || {}), foto_url: resData.foto_url } })
        }
      },
      onError:   (msg) => showToast(msg || 'Gagal upload foto', true),
    }
  )

  const { submit: hapusFoto, loading: deleting } = useSubmit(
    () => mahasiswaService.deleteFoto(),
    {
      onSuccess: () => {
        setFotoBust(Date.now())
        refetch()
        showToast('Foto profil dihapus.')
        updateUser({ mahasiswa: { ...(user?.mahasiswa || {}), foto_url: null } })
      },
      onError: (msg) => showToast(msg || 'Gagal hapus foto', true),
    }
  )

  const { submit: gantiPw, loading: pwLoading } = useSubmit(
    (data) => authService.updatePassword(data),
    {
      onSuccess: () => {
        setPwForm({ password_lama:'', password_baru:'', password_baru_confirmation:'' })
        setShowPw(false)
        showToast('Password berhasil diubah!')
      },
      onError: (msg) => showToast(msg, true),
    }
  )

  function handleFotoChange(e) {
    const file = e.target.files?.[0]
    if (file) uploadFoto(file)
  }
  function showToast(msg, isErr = false) {
    setToast(msg); setToastErr(isErr)
    setTimeout(() => setToast(null), 2800)
  }

  const { submit: doUpdate, loading: saving } = useSubmit(
    (data) => mahasiswaService.updateProfil(data),
    {
      onSuccess: (res) => {
        updateUser({ name: form.name || profil?.nama })
        refetch()
        setEditMode(false)
        showToast('Profil berhasil diperbarui!')
      },
      onError: (msg) => showToast(msg, true),
    }
  )

  function startEdit() {
    setForm({ name: profil?.nama, no_hp: profil?.no_hp || '', alamat: profil?.alamat || '' })
    setEditMode(true)
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const initials = (profil?.nama || 'M').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const rows = [
    ['NIM',           profil?.nim],
    ['Program Studi', profil?.prodi],
    ['Fakultas',      profil?.fakultas],
    ['Angkatan',      profil?.angkatan],
    ['Kelas',         profil?.kelas],
    ['Email',         profil?.email],
    ['No. HP',        profil?.no_hp, 'no_hp'],
    ['Alamat',        profil?.alamat, 'alamat'],
    ['Dosen Wali',      profil?.dospem || '–'],
  ]

  return (
    <div className="page-single">
      <PageHeader
        title="Profil Mahasiswa"
        subtitle="Data akademik & informasi akun"
        actions={
          !editMode
            ? <button className="prf-edit-btn" onClick={startEdit}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit Profil
              </button>
            : <div style={{ display:'flex', gap:8 }}>
                <button className="prf-cancel-btn" onClick={() => setEditMode(false)}>Batal</button>
                <button className="prf-save-btn" disabled={saving} onClick={() => doUpdate(form)}>
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
        }
      />

      {toast && (
        <div className="prf-toast" style={{ background: toastErr ? 'var(--red)' : 'var(--teal)' }}>{toast}</div>
      )}

      <div className="content-body">
        {loading ? (
          <div style={{ textAlign:'center', padding:'60px', color:'var(--text3)' }}>Memuat data profil...</div>
        ) : (
          <div className="prf-grid">
            {/* Kolom kiri */}
            <div className="prf-col-left">
              <div className="prf-avatar-card">
                {profil?.foto_url
                  ? <img src={fotoSrc} alt={profil?.nama || 'Foto profil'} className="prf-avatar prf-avatar-img"/>
                  : <div className="prf-avatar">{initials}</div>
                }
                <div className="prf-avatar-info">
                  <h2 className="prf-nama">{profil?.nama || '–'}</h2>
                  <p className="prf-prodi">{profil?.prodi} · {profil?.nim}</p>
                  <span className="badge badge-green" style={{ marginTop:8, display:'inline-flex' }}>Mahasiswa Aktif</span>
                </div>
              </div>

              <div className="card">
                <div className="card-title">Ringkasan Akademik</div>
                <div className="prf-akademik-grid">
                  {[
                    ['IPK',       profil?.ipk != null ? Number(profil.ipk).toFixed(2) : '–'],
                    ['SKS Lulus', profil?.sks_lulus != null ? profil.sks_lulus : '–'],
                    ['Semester',  profil?.semester || '–'],
                    ['Status',    profil?.status || 'Aktif'],
                  ].map(([label, val]) => (
                    <div key={label} className="prf-akademik-item">
                      <span className="prf-akademik-val">{val}</span>
                      <span className="prf-akademik-lbl">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-title">Akun</div>
                <div className="list-item" style={{ cursor:'pointer' }} onClick={() => setShowPw(true)}>
                  <div className="prf-action-icon prf-action-icon--amber">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  </div>
                  <div className="list-body"><h4>Ganti Password</h4><p>Perbarui kata sandi akun</p></div>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
                <div className="list-item" style={{ cursor:'pointer', borderBottom:'none' }} onClick={handleLogout}>
                  <div className="prf-action-icon prf-action-icon--red">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  </div>
                  <div className="list-body"><h4 style={{ color:'var(--red)' }}>Keluar</h4><p>Logout dari akun</p></div>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </div>
            </div>

            {/* Kolom kanan */}
            <div className="prf-col-right">
              <div className="card">
                <div className="card-title">Data Mahasiswa</div>
                {rows.map(([label, val, field]) => (
                  <div key={label} className="prf-row"
                    style={{ borderBottom:'1px solid var(--border)' }}>
                    <span className="prf-row-label">{label}</span>
                    {editMode && field
                      ? <input className="prf-input" value={form[field] ?? ''} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}/>
                      : <span className="prf-row-val">{val || '–'}</span>
                    }
                  </div>
                ))}
                <div className="prf-row" style={{ borderBottom:'none' }}>
                  <span className="prf-row-label">Status</span>
                  <span className="badge badge-green">{profil?.status || 'Aktif'}</span>
                </div>
              </div>

              <div className="prf-foto-note">
                <div className="prf-foto-box">
                  {profil?.foto_url
                    ? <img src={fotoSrc} alt="Foto 3×4" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:6 }}/>
                    : <><p>Foto</p><small>3×4</small></>
                  }
                </div>
                <div className="prf-foto-info">
                  <h4>Foto Profil</h4>
                  <p>Foto profil akan digunakan saat mencetak KRS. Format: JPG/PNG, ukuran maks 2 MB.</p>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    <button className="prf-upload-foto" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      {uploading ? 'Mengunggah...' : 'Unggah Foto'}
                    </button>
                    {profil?.foto_url && (
                      <button className="prf-hapus-foto"
                        onClick={() => { if(confirm('Hapus foto profil? Foto akan dihapus permanen.')) hapusFoto() }}
                        disabled={deleting}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                        {deleting ? 'Menghapus...' : 'Hapus Foto'}
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    style={{ display:'none' }}
                    onChange={handleFotoChange}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {showPw && (
  <div className="modal-overlay" onClick={() => setShowPw(false)}>
    <div className="modal-box" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Ganti Password</h3>
        <button className="modal-close" onClick={() => setShowPw(false)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div className="modal-body">
        <div className="adm-field">
          <label>Password Saat Ini</label>
          <input type="password" value={pwForm.password_lama}
            onChange={e => setPwForm(p => ({...p, password_lama: e.target.value}))}/>
        </div>
        <div className="adm-field">
          <label>Password Baru</label>
          <input type="password" value={pwForm.password_baru}
            onChange={e => setPwForm(p => ({...p, password_baru: e.target.value}))}/>
        </div>
        <div className="adm-field">
          <label>Konfirmasi Password Baru</label>
          <input type="password" value={pwForm.password_baru_confirmation}
            onChange={e => setPwForm(p => ({...p, password_baru_confirmation: e.target.value}))}/>
        </div>
      </div>
      <div className="modal-footer">
        <button className="modal-btn-cancel" onClick={() => setShowPw(false)}>Batal</button>
        <button className="modal-btn-save" onClick={() => gantiPw(pwForm)} disabled={pwLoading}>
          {pwLoading ? 'Menyimpan...' : 'Ubah Password'}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  )
}
