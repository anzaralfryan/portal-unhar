import { useState } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import { useFetch, useSubmit } from '../../hooks/useFetch'
import { notifikasiService } from '../../services/services'
import './NotifikasiPage.css'
import { usePushNotification } from '../../hooks/usePushNotification'

const TIPE_COLOR = {
  Nilai:     { bg:'#d1fae5', color:'#065f46' },
  Akademik:  { bg:'#dbeafe', color:'#1e40af' },
  Pembayaran:{ bg:'#fee2e2', color:'#991b1b' },
  Jadwal:    { bg:'#fef3c7', color:'#92400e' },
}
const TABS = ['Semua','Akademik','Nilai','Jadwal','Pembayaran']

export default function NotifikasiPage() {
  const [tab, setTab] = useState('Semua')
  const { subscribed, permission, supported, swReady, loading: pushLoading, error: pushError, requestPermission } = usePushNotification()

  const { data, loading, refetch } = useFetch(() => notifikasiService.get(), [], { interval: 15000 })  // polling 15 detik
  const list   = data?.list  || []
  const unread = data?.unread || 0

  const { submit: doRead }    = useSubmit(notifikasiService.markRead,    { onSuccess: refetch })
  const { submit: doReadAll } = useSubmit(notifikasiService.markAllRead, { onSuccess: refetch })
  const { submit: doHapus }   = useSubmit(notifikasiService.destroy,     { onSuccess: refetch })

  const filtered = tab === 'Semua' ? list : list.filter(n => n.tipe === tab)

  return (
    <div className="page-single">
      <PageHeader
        title="Notifikasi"
        subtitle={`${unread} belum dibaca`}
        actions={
          unread > 0 && (
            <button className="notif-baca-btn" onClick={() => doReadAll()}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Tandai semua dibaca
            </button>
          )
        }
      />
      <div className="notif-layout">
        {/* ── Push Notification Banner ── Batch 9a */}
        {supported && swReady && !subscribed && permission !== 'denied' && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            flexWrap:'wrap', gap:10, background:'linear-gradient(135deg,#0F9E7B,#059669)',
            color:'#fff', borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:22 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></span>
              <div>
                <p style={{ fontWeight:700, fontSize:13, margin:0 }}>Aktifkan Notifikasi Push</p>
                <p style={{ fontSize:11, margin:0, opacity:0.85 }}>Nilai & materi baru langsung muncul di browser</p>
              </div>
            </div>
            <button onClick={requestPermission} disabled={pushLoading}
              style={{ background:'rgba(255,255,255,0.2)', border:'1.5px solid rgba(255,255,255,0.5)',
                color:'#fff', borderRadius:8, padding:'7px 16px', fontSize:12,
                fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
              {pushLoading ? 'Mengaktifkan...' : 'Aktifkan Sekarang'}
            </button>
          </div>
        )}
        {supported && swReady && subscribed && (
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'#d1fae5',
            border:'1px solid #86efac', borderRadius:10, padding:'10px 14px',
            marginBottom:12, fontSize:13, color:'#065f46' }}>
            <span>✓</span>
            <span>Notifikasi push aktif — nilai, materi & pengumuman muncul otomatis.</span>
          </div>
        )}
        {permission === 'denied' && (
          <div style={{ background:'#fff5f5', border:'1px solid #fca5a5', borderRadius:10,
            padding:'10px 14px', marginBottom:12, fontSize:12, color:'#991b1b' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> Izin ditolak. <strong>Brave:</strong> Settings → Privacy → "Use Google services for push messaging" → ON → refresh.
            <strong> Chrome:</strong> klik ikon kunci → Site settings → Notifications → Allow.
          </div>
        )}
        {pushError && (
          <div style={{ background:'#fff5f5', borderRadius:8, padding:'8px 12px',
            marginBottom:10, fontSize:12, color:'#991b1b' }}>{pushError}</div>
        )}
        <div className="notif-tabs">
          {TABS.map(t => (
            <button key={t} className={`notif-tab-btn ${tab===t?'active':''}`} onClick={() => setTab(t)}>
              {t}
              {t === 'Semua' && unread > 0 && <span className="notif-tab-badge">{unread}</span>}
              {t !== 'Semua' && list.filter(n => n.tipe===t && !n.is_read).length > 0 && (
                <span className="notif-tab-badge">{list.filter(n=>n.tipe===t&&!n.is_read).length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="notif-list">
          {loading && <div style={{textAlign:'center',padding:'40px',color:'var(--text3)'}}>Memuat...</div>}
          {!loading && filtered.length === 0 && <div className="notif-empty"><p>Tidak ada notifikasi</p></div>}
          {filtered.map(n => (
            <div key={n.id} className={`notif-item ${!n.is_read?'unread':''}`} onClick={() => !n.is_read && doRead(n.id)}>
              <div className="notif-body">
                <div className="notif-top">
                  <div className="notif-top-left">
                    <span className="notif-tipe-badge" style={{ background:TIPE_COLOR[n.tipe]?.bg, color:TIPE_COLOR[n.tipe]?.color }}>
                      {n.tipe}
                    </span>
                    {!n.is_read && <span className="notif-unread-dot"/>}
                  </div>
                  <div className="notif-actions">
                    <span className="notif-waktu">{n.waktu}</span>
                    <button className="notif-hapus-btn" onClick={e => { e.stopPropagation(); doHapus(n.id) }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>
                <h4 className="notif-judul">{n.judul}</h4>
                <p className="notif-isi">{n.isi}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
