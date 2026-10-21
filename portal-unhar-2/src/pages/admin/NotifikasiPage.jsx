import { useState } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import { useFetch, useSubmit } from '../../hooks/useFetch'
import { adminService } from '../../services/services'
import { getErrorMessage } from '../../services/api'
import './NotifikasiPage.css'

const ROLE_OPTIONS = [
  { value: 'semua',     label: 'Semua Pengguna',   color: '#6366f1' },
  { value: 'mahasiswa', label: 'Mahasiswa Saja',    color: '#0F9E7B' },
  { value: 'dosen',     label: 'Dosen Saja',        color: '#d97706' },
]

const TIPE_OPTIONS = ['Akademik', 'Nilai', 'Jadwal', 'Pembayaran', 'Pengumuman']

const TIPE_COLOR = {
  Akademik:   { bg:'#dbeafe', color:'#1e40af' },
  Nilai:      { bg:'#d1fae5', color:'#065f46' },
  Jadwal:     { bg:'#fef3c7', color:'#92400e' },
  Pembayaran: { bg:'#fee2e2', color:'#991b1b' },
  Pengumuman: { bg:'#ede9fe', color:'#5b21b6' },
}

export default function NotifikasiPage() {
  const [tab, setTab] = useState('masuk')  // 'masuk' | 'kirim' | 'riwayat'

  // === KOTAK MASUK (notifikasi yang DITERIMA admin, mis. KRS diajukan, bukti pembayaran) ===
  const { data: inboxData, loading: inboxLoading, refetch: refetchInbox } = useFetch(
    () => adminService.getNotifikasi(),
    [],
    { interval: 15000 }
  )
  const inboxList = inboxData?.list || []
  const inboxUnread = inboxData?.unread || 0

  const { submit: doInboxRead }    = useSubmit(adminService.markNotifRead,    { onSuccess: refetchInbox })
  const { submit: doInboxReadAll } = useSubmit(adminService.markAllNotifRead, { onSuccess: refetchInbox })
  const { submit: doInboxHapus }   = useSubmit(adminService.destroyNotif,     { onSuccess: refetchInbox })

  // === KIRIM BROADCAST ===
  const [form, setForm]       = useState({ judul:'', isi:'', tipe:'Akademik', role:'semua' })
  const [sending, setSending] = useState(false)
  const [sendErr, setSendErr] = useState('')
  const [sendOk,  setSendOk]  = useState('')

  async function handleSend() {
    if (!form.judul.trim() || !form.isi.trim()) {
      setSendErr('Judul dan isi notifikasi tidak boleh kosong.')
      return
    }
    setSending(true); setSendErr(''); setSendOk('')
    try {
      const res = await adminService.broadcast(form)
      setSendOk(res?.data?.message || 'Notifikasi berhasil dikirim!')
      setForm({ judul:'', isi:'', tipe:'Akademik', role:'semua' })
    } catch(e) { setSendErr(getErrorMessage(e)) }
    finally { setSending(false) }
  }

  // === RIWAYAT BROADCAST — dari tabel broadcast_logs (akurat, 1 baris per kirim) ===
  const { data: riwayatData, loading: riwayatLoading, refetch: refetchRiwayat } = useFetch(
    () => adminService.getBroadcastHistory(),
    [],
    { interval: 60000 }
  )
  // BUG FIX: useFetch sudah unwrap res.data.data → riwayatData langsung berisi array
  const list = Array.isArray(riwayatData) ? riwayatData : (riwayatData?.data || [])

  const [busyId,    setBusyId]    = useState(null)   // id log yang sedang diproses
  const [riwayatOk, setRiwayatOk] = useState('')
  const [riwayatErr,setRiwayatErr] = useState('')
  const [confirmId, setConfirmId] = useState(null)   // id yang minta konfirmasi hapus

  function showRiwayatMsg(msg, isErr = false) {
    if (isErr) { setRiwayatErr(msg); setRiwayatOk('') }
    else        { setRiwayatOk(msg); setRiwayatErr('') }
    setTimeout(() => { setRiwayatOk(''); setRiwayatErr('') }, 3000)
  }

  async function handleResend(log) {
    setBusyId(log.id)
    try {
      const res = await adminService.resendBroadcast(log.id)
      showRiwayatMsg(res?.data?.message || 'Notifikasi berhasil dikirim ulang!')
      refetchRiwayat()
    } catch(e) { showRiwayatMsg(getErrorMessage(e), true) }
    finally    { setBusyId(null) }
  }

  async function handleDeleteLog(id) {
    setBusyId(id)
    try {
      await adminService.deleteBroadcastLog(id)
      showRiwayatMsg('Riwayat broadcast dihapus.')
      setConfirmId(null)
      refetchRiwayat()
    } catch(e) { showRiwayatMsg(getErrorMessage(e), true) }
    finally    { setBusyId(null) }
  }

  const sel = {
    padding:'10px 12px', border:'1.5px solid var(--border)',
    borderRadius:9, fontSize:13, background:'#fff', outline:'none', width:'100%'
  }

  return (
    <div className="page-single">
      <PageHeader
        title="Pusat Notifikasi"
        subtitle="Kotak masuk, kirim broadcast & pantau riwayat pengiriman"
      />
      <div className="content-body">

        {/* ── Tab Switcher ── */}
        <div style={{display:'flex', gap:4, background:'#F1F5F9', borderRadius:10,
          padding:4, marginBottom:22, width:'fit-content'}}>
          {[
            { key:'masuk',   label:`Kotak Masuk${inboxUnread > 0 ? ` (${inboxUnread})` : ''}` },
            { key:'kirim',   label:'Kirim Broadcast' },
            { key:'riwayat', label:'Riwayat Notifikasi' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding:'8px 20px', borderRadius:8, border:'none', cursor:'pointer',
                fontSize:13, fontWeight:600, transition:'all 0.15s',
                background: tab === t.key ? '#fff' : 'transparent',
                color: tab === t.key ? 'var(--text)' : 'var(--text3)',
                boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════
            TAB: KOTAK MASUK
        ══════════════════════════════════════ */}
        {tab === 'masuk' && (
          <div className="notif-layout">
            <div className="notif-tabs" style={{ marginBottom: 0 }}>
              {inboxUnread > 0 && (
                <button className="notif-baca-btn" onClick={() => doInboxReadAll()}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Tandai semua dibaca
                </button>
              )}
            </div>
            <div className="notif-list">
              {inboxLoading && <div style={{textAlign:'center',padding:'40px',color:'var(--text3)'}}>Memuat...</div>}
              {!inboxLoading && inboxList.length === 0 && <div className="notif-empty"><p>Tidak ada notifikasi masuk</p></div>}
              {inboxList.map(n => {
                const tc = TIPE_COLOR[n.tipe] || TIPE_COLOR.Akademik
                return (
                  <div key={n.id} className={`notif-item ${!n.is_read?'unread':''}`} onClick={() => !n.is_read && doInboxRead(n.id)}>
                    <div className="notif-body">
                      <div className="notif-top">
                        <div className="notif-top-left">
                          <span className="notif-tipe-badge" style={{ background:tc.bg, color:tc.color }}>
                            {n.tipe}
                          </span>
                          {!n.is_read && <span className="notif-unread-dot"/>}
                        </div>
                        <div className="notif-actions">
                          <span className="notif-waktu">{n.waktu}</span>
                          <button className="notif-hapus-btn" onClick={e => { e.stopPropagation(); doInboxHapus(n.id) }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      </div>
                      <h4 className="notif-judul">{n.judul}</h4>
                      <p className="notif-isi">{n.isi}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB: KIRIM BROADCAST
        ══════════════════════════════════════ */}
        {tab === 'kirim' && (
          <div style={{maxWidth:620}}>
            {/* Info card */}
            <div style={{background:'linear-gradient(135deg,#0F9E7B,#059669)', color:'#fff',
              borderRadius:14, padding:'18px 22px', marginBottom:20, display:'flex',
              alignItems:'flex-start', gap:14}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              <div>
                <p style={{fontWeight:700, fontSize:14, margin:'0 0 4px'}}>Broadcast Notifikasi</p>
                <p style={{fontSize:12, margin:0, opacity:0.88}}>
                  Notifikasi akan dikirim ke in-app dan push notification browser semua pengguna yang dipilih.
                </p>
              </div>
            </div>

            {sendErr && (
              <div style={{background:'#FEF2F2', border:'1px solid #FECACA',
                borderRadius:9, padding:'10px 14px', fontSize:12.5, color:'#DC2626',
                marginBottom:14}}>
                {sendErr}
              </div>
            )}
            {sendOk && (
              <div style={{background:'#F0FDF4', border:'1px solid #86EFAC',
                borderRadius:9, padding:'10px 14px', fontSize:12.5, color:'#166534',
                marginBottom:14, display:'flex', alignItems:'center', gap:8}}>
                <span>✓</span> {sendOk}
              </div>
            )}

            {/* Form */}
            <div style={{background:'#fff', border:'1px solid var(--border)',
              borderRadius:14, padding:'22px 22px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>

              {/* Judul */}
              <div style={{marginBottom:14}}>
                <label style={{display:'block', fontFamily:'var(--font-heading)', fontSize:11,
                  fontWeight:700, color:'var(--text2)', textTransform:'uppercase',
                  letterSpacing:'0.5px', marginBottom:6}}>
                  Judul Notifikasi
                </label>
                <input type="text" value={form.judul}
                  onChange={e => setForm(p => ({...p, judul:e.target.value}))}
                  placeholder="Mis: Pengumuman Jadwal Ujian Akhir Semester"
                  style={sel}/>
              </div>

              {/* Isi */}
              <div style={{marginBottom:14}}>
                <label style={{display:'block', fontFamily:'var(--font-heading)', fontSize:11,
                  fontWeight:700, color:'var(--text2)', textTransform:'uppercase',
                  letterSpacing:'0.5px', marginBottom:6}}>
                  Isi Notifikasi
                </label>
                <textarea value={form.isi}
                  onChange={e => setForm(p => ({...p, isi:e.target.value}))}
                  placeholder="Tulis isi notifikasi secara jelas dan lengkap..."
                  rows={4} style={{...sel, resize:'vertical'}}/>
              </div>

              {/* Tipe & Role dalam 1 baris */}
              <div style={{display:'flex', gap:12, marginBottom:20}}>
                <div style={{flex:1}}>
                  <label style={{display:'block', fontFamily:'var(--font-heading)', fontSize:11,
                    fontWeight:700, color:'var(--text2)', textTransform:'uppercase',
                    letterSpacing:'0.5px', marginBottom:6}}>
                    Kategori
                  </label>
                  <select value={form.tipe} onChange={e => setForm(p => ({...p, tipe:e.target.value}))} style={sel}>
                    {TIPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{flex:1}}>
                  <label style={{display:'block', fontFamily:'var(--font-heading)', fontSize:11,
                    fontWeight:700, color:'var(--text2)', textTransform:'uppercase',
                    letterSpacing:'0.5px', marginBottom:6}}>
                    Kirim Ke
                  </label>
                  <select value={form.role} onChange={e => setForm(p => ({...p, role:e.target.value}))} style={sel}>
                    {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Preview chip */}
              <div style={{background:'#F8FAFC', borderRadius:9, padding:'12px 14px',
                marginBottom:18, display:'flex', alignItems:'center', gap:10,
                border:'1px solid var(--border)'}}>
                <span style={{fontSize:12, color:'var(--text3)'}}>Preview:</span>
                <span style={{...TIPE_COLOR[form.tipe], padding:'3px 10px',
                  borderRadius:20, fontSize:11, fontWeight:600}}>
                  {form.tipe}
                </span>
                <span style={{fontSize:12, color:'var(--text2)', fontWeight:600}}>→</span>
                <span style={{fontSize:12, color:ROLE_OPTIONS.find(r=>r.value===form.role)?.color,
                  fontWeight:600}}>
                  {ROLE_OPTIONS.find(r=>r.value===form.role)?.label}
                </span>
              </div>

              <button onClick={handleSend} disabled={sending}
                style={{width:'100%', padding:'12px',
                  background: sending ? '#9CA3AF' : 'linear-gradient(135deg,#0F9E7B,#059669)',
                  color:'#fff', border:'none', borderRadius:10,
                  fontFamily:'var(--font-heading)', fontSize:14, fontWeight:700,
                  cursor: sending ? 'not-allowed' : 'pointer',
                  boxShadow:'0 3px 12px rgba(15,158,123,0.3)', transition:'opacity 0.15s'}}>
                {sending ? 'Mengirim...' : 'Kirim Notifikasi Sekarang'}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB: RIWAYAT NOTIFIKASI
        ══════════════════════════════════════ */}
        {tab === 'riwayat' && (
          <div>
            {/* Feedback bar */}
            {riwayatOk && (
              <div className="rw-alert rw-alert--ok">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {riwayatOk}
              </div>
            )}
            {riwayatErr && (
              <div className="rw-alert rw-alert--err">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {riwayatErr}
              </div>
            )}

            {/* Info panel */}
            <div className="rw-info-bar">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <span>
                Riwayat broadcast yang dikirim Admin. Setiap baris adalah satu sesi pengiriman.
                Klik <strong>Kirim Ulang</strong> untuk mengirim ulang ke semua penerima saat ini,
                atau <strong>Hapus</strong> untuk menghapus catatan (notifikasi yang sudah diterima pengguna tidak terpengaruh).
              </span>
            </div>

            {riwayatLoading ? (
              <div className="rw-loading">
                <div className="rw-spinner" />
                Memuat riwayat...
              </div>
            ) : list.length === 0 ? (
              <div className="rw-empty">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                <p>Belum ada riwayat broadcast.</p>
                <span>Gunakan tab <strong>Kirim Broadcast</strong> untuk mengirim notifikasi pertama.</span>
              </div>
            ) : (
              <div className="rw-list">
                {list.map((log, i) => {
                  const tc        = TIPE_COLOR[log.tipe] || TIPE_COLOR.Akademik
                  const isBusy    = busyId === log.id
                  const isConfirm = confirmId === log.id
                  return (
                    <div key={log.id} className="rw-item">
                      {/* Kiri — konten */}
                      <div className="rw-item-body">
                        <div className="rw-item-top">
                          <span className="notif-tipe-badge" style={{ background:tc.bg, color:tc.color }}>
                            {log.tipe}
                          </span>
                          <span className="rw-role-chip">{
                            log.role_target === 'semua'     ? '👥 Semua Pengguna' :
                            log.role_target === 'mahasiswa' ? '🎓 Mahasiswa'       : '🏫 Dosen'
                          }</span>
                          <span className="rw-penerima">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                              <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                            </svg>
                            {log.jumlah_penerima} penerima
                          </span>
                        </div>
                        <h4 className="rw-judul">{log.judul}</h4>
                        <p className="rw-isi">{log.isi}</p>
                        <div className="rw-meta">
                          <span>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>
                            {log.created_at}
                          </span>
                          {log.sent_by_nama && (
                            <span>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                              </svg>
                              {log.sent_by_nama}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Kanan — aksi */}
                      <div className="rw-item-actions">
                        {!isConfirm ? (
                          <>
                            <button
                              className="rw-btn rw-btn--resend"
                              onClick={() => handleResend(log)}
                              disabled={isBusy}
                              title="Kirim ulang ke semua penerima saat ini"
                            >
                              {isBusy ? <span className="rw-spinner-sm" /> : (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="23 4 23 10 17 10"/>
                                  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                                </svg>
                              )}
                              {isBusy ? 'Mengirim...' : 'Kirim Ulang'}
                            </button>
                            <button
                              className="rw-btn rw-btn--del"
                              onClick={() => setConfirmId(log.id)}
                              disabled={isBusy}
                              title="Hapus dari riwayat"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                                <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                              </svg>
                              Hapus
                            </button>
                          </>
                        ) : (
                          <div className="rw-confirm">
                            <p>Hapus riwayat ini?</p>
                            <div className="rw-confirm-btns">
                              <button className="rw-btn rw-btn--cancel" onClick={() => setConfirmId(null)}>Batal</button>
                              <button className="rw-btn rw-btn--del-confirm"
                                onClick={() => handleDeleteLog(log.id)} disabled={isBusy}>
                                {isBusy ? 'Menghapus...' : 'Ya, Hapus'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
