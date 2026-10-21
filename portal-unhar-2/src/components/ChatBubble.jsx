import { useState, useEffect, useRef } from 'react'
import api, { getErrorMessage } from '../services/api'
import './ChatBubble.css'

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })
  return d.toLocaleDateString('id-ID', { day:'2-digit', month:'short' })
}
function getInitial(nama = '') {
  return (nama||'?').trim().split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?'
}

export default function ChatBubble({ role }) {
  if (role !== 'dosen' && role !== 'mahasiswa') return null

  const [open,     setOpen]     = useState(false)
  const [tab,      setTab]      = useState('rooms')   // 'rooms' | 'groups' | 'contacts'
  const [rooms,    setRooms]    = useState([])
  const [contacts, setContacts] = useState([])
  const [contactsLoaded, setContactsLoaded] = useState(false)
  const [selRoom,  setSelRoom]  = useState(null)
  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [unread,   setUnread]   = useState(0)
  const [loading,  setLoading]  = useState(false)
  const [opening,  setOpening]  = useState(false)
  const [error,    setError]    = useState(null)

  function showError(msg) {
    setError(msg)
    setTimeout(() => setError(null), 4000)
  }
  const bottomRef = useRef(null)
  const pollRef   = useRef(null)
  const lastIdRef = useRef(0)

  /* ── Normalise room dari backend format ──
     Backend: { id, lawan_bicara: {nama, sub, user_id, foto}, last_message, last_message_at, unread }
  */
  function normaliseRoom(rm) {
    const lawan = rm.lawan_bicara || {}
    return {
      ...rm,
      other_name:   lawan.nama  || '–',
      other_sub:    lawan.sub   || (role === 'dosen' ? 'Mahasiswa' : 'Dosen'),
      other_foto:   lawan.foto  || null,
      other_user_id:lawan.user_id || null,
      unread_count: rm.unread   ?? 0,
    }
  }

  /* ── Load rooms ── */
  async function loadRooms() {
    try {
      const r = await api.get('/chat/rooms')
      const raw = r.data?.data || []
      const list = Array.isArray(raw) ? raw.map(normaliseRoom).filter(Boolean) : []
      setRooms(list)
      setUnread(list.reduce((s, rm) => s + (rm.unread_count || 0), 0))
      return list
    } catch (err) {
      getErrorMessage(err)
      return []
    }
  }

  /* ── Load contacts (lazy, sekali saja) ── */
  async function loadContacts() {
    try {
      const r = await api.get('/chat/contacts')
      const list = r.data?.data || []
      setContacts(Array.isArray(list) ? list : [])
      setContactsLoaded(true)
    } catch (err) {
      getErrorMessage(err)
      showError('Gagal memuat daftar kontak.')
      setContactsLoaded(true)
    }
  }

  useEffect(() => {
    loadRooms()
    const id = setInterval(loadRooms, 15000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (tab === 'contacts' && !contactsLoaded) loadContacts()
  }, [tab])

  /* ── Poll pesan aktif ── */
  useEffect(() => {
    if (!selRoom) { clearInterval(pollRef.current); return }
    lastIdRef.current = 0

    async function fetchMessages(isInitial = false) {
      try {
        const params = { room_id: selRoom.id }
        if (!isInitial && lastIdRef.current > 0) {
          params.last_id = lastIdRef.current
        }
        const r = await api.get('/chat/messages', { params })
        const msgs = Array.isArray(r.data?.data) ? r.data.data : []
        if (msgs.length > 0) {
          const newLastId = r.data?.last_id ?? Math.max(...msgs.map(m => m.id))
          lastIdRef.current = newLastId
          if (isInitial) {
            setMessages(msgs)
          } else {
            setMessages(prev => {
              const ids = new Set(prev.map(m => m.id))
              const fresh = msgs.filter(m => !ids.has(m.id))
              return fresh.length > 0 ? [...prev, ...fresh] : prev
            })
          }
        } else if (isInitial) {
          setMessages([])
        }
      } catch (err) {
        if (isInitial) showError(getErrorMessage(err) || 'Gagal memuat pesan.')
      }
    }

    setLoading(true)
    fetchMessages(true).finally(() => setLoading(false))

    pollRef.current = setInterval(() => fetchMessages(false), 3000)
    return () => clearInterval(pollRef.current)
  }, [selRoom?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function openRoom(room) {
    if (!room?.id) return
    clearInterval(pollRef.current)
    lastIdRef.current = 0
    setSelRoom(room)
    setMessages([])
    try { await api.post(`/chat/rooms/${room.id}/read`) } catch (err) { getErrorMessage(err) }
    setRooms(prev => prev.map(rm => rm.id === room.id ? { ...rm, unread_count: 0 } : rm))
    setUnread(prev => Math.max(0, prev - (room.unread_count || 0)))
  }

  /* ── Mulai chat baru dari kontak ── */
  async function startChatWith(contact) {
    if (!contact?.user_id) {
      showError('Kontak tidak valid.')
      return
    }
    setOpening(true)
    try {
      const r = await api.post('/chat/rooms', { with_user_id: contact.user_id })
      const roomData = r.data?.data
      if (!roomData) throw new Error('Respons server tidak valid.')
      const room = normaliseRoom(roomData)
      // Masukkan/update room di list
      setRooms(prev => {
        const exists = prev.find(rm => rm.id === room.id)
        return exists ? prev.map(rm => rm.id === room.id ? room : rm) : [room, ...prev]
      })
      setTab('rooms')
      await openRoom(room)
    } catch (err) {
      showError(getErrorMessage(err) || 'Gagal memulai percakapan.')
    } finally {
      setOpening(false)
    }
  }

  async function sendMsg(e) {
    e.preventDefault()
    if (!input.trim() || !selRoom || sending) return
    setSending(true)
    const txt = input.trim()
    setInput('')
    try {
      const r = await api.post('/chat/send', { room_id: selRoom.id, pesan: txt })
      const sent = r.data?.data
      if (sent) {
        setMessages(prev => {
          const ids = new Set(prev.map(m => m.id))
          return ids.has(sent.id) ? prev : [...prev, sent]
        })
        lastIdRef.current = Math.max(lastIdRef.current, sent.id)
      }
      // Update preview di room list
      setRooms(prev => prev.map(rm => rm.id === selRoom.id
        ? { ...rm, last_message: txt, last_message_at: new Date().toISOString() }
        : rm))
    } catch (err) {
      setInput(txt) // kembalikan teks supaya tidak hilang
      showError(getErrorMessage(err) || 'Gagal mengirim pesan.')
    } finally {
      setSending(false)
    }
  }

  /* ── Avatar helper ── */
  function Avatar({ nama, foto, size = 'sm' }) {
    const cls = size === 'sm' ? 'cb-room-avatar cb-room-avatar--sm' : 'cb-room-avatar'
    return (
      <div className={cls}
        style={{ overflow:'hidden', padding:0,
          background: foto ? 'transparent'
            : (size === 'sm' ? 'var(--primary-light)' : 'rgba(255,255,255,0.25)') }}>
        {foto
          ? <img src={foto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }}
              onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display='flex' }}/>
          : null
        }
        <span style={{
          display: foto ? 'none' : 'flex',
          width:'100%', height:'100%',
          alignItems:'center', justifyContent:'center',
          fontSize: size === 'sm' ? 11 : 12, fontWeight:800,
          color: size === 'sm' ? 'var(--primary)' : '#fff',
        }}>
          {getInitial(nama)}
        </span>
      </div>
    )
  }

  /* ── Badge label peran ── */
  function RoleBadge({ label }) {
    if (!label) return null
    const isAdmin = label.toLowerCase().includes('admin')
    const isWali  = label.toLowerCase().includes('wali') || label.toLowerCase().includes('bimbingan')
    return (
      <span className={`cb-role-badge ${isAdmin ? 'cb-role-badge--admin' : isWali ? 'cb-role-badge--wali' : ''}`}>
        {label}
      </span>
    )
  }

  // Pisahkan room personal vs grup
  const personalRooms = rooms.filter(rm => rm.type !== 'group')
  const groupRooms    = rooms.filter(rm => rm.type === 'group')
  const personalUnread = personalRooms.reduce((s, rm) => s + (rm.unread_count || 0), 0)
  const groupUnread    = groupRooms.reduce((s, rm) => s + (rm.unread_count || 0), 0)

  // Filter kontak yang belum punya room (supaya tidak duplikat dengan tab Percakapan)
  const existingUserIds = new Set(personalRooms.map(rm => rm.other_user_id).filter(Boolean))

  return (
    <>
      {/* ── Window chat ── */}
      {open && (
        <div className="cb-window">
          <div className="cb-window-header">
            {selRoom ? (
              <>
                <button className="cb-back" onClick={() => { setSelRoom(null); clearInterval(pollRef.current) }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                {selRoom.type === 'group' ? (
                  <>
                    <div className="cb-group-avatar cb-group-avatar--md">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                      </svg>
                    </div>
                    <div className="cb-room-info">
                      <p className="cb-room-name">{selRoom.group_info?.nama || selRoom.nama || 'Grup Kelas'}</p>
                      <p className="cb-room-sub">{selRoom.group_info?.dosen_nama ? `Dosen: ${selRoom.group_info.dosen_nama}` : 'Grup Kelas'}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Avatar nama={selRoom.other_name} foto={selRoom.other_foto} size="md"/>
                    <div className="cb-room-info">
                      <p className="cb-room-name">{selRoom.other_name}</p>
                      <p className="cb-room-sub">{selRoom.other_sub}</p>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <span className="cb-header-title">Live Chat</span>
                <span className="cb-header-count">{rooms.length} percakapan</span>
              </>
            )}
            <button className="cb-close" onClick={() => setOpen(false)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {error && (
            <div className="cb-error-toast">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {!selRoom ? (
            <>
              {/* ── Tab bar ── */}
              <div className="cb-tabs">
                <button className={`cb-tab ${tab==='rooms'?'cb-tab--active':''}`} onClick={() => setTab('rooms')}>
                  Personal
                  {personalUnread > 0 && <span className="cb-tab-badge">{personalUnread > 9 ? '9+' : personalUnread}</span>}
                </button>
                <button className={`cb-tab ${tab==='groups'?'cb-tab--active':''}`} onClick={() => setTab('groups')}>
                  Grup Kelas
                  {groupUnread > 0 && <span className="cb-tab-badge">{groupUnread > 9 ? '9+' : groupUnread}</span>}
                </button>
                <button className={`cb-tab ${tab==='contacts'?'cb-tab--active':''}`} onClick={() => setTab('contacts')}>
                  Mulai Chat
                </button>
              </div>

              {tab === 'rooms' ? (
                /* ── Daftar room personal ── */
                <div className="cb-rooms">
                  {personalRooms.length === 0 ? (
                    <div className="cb-empty">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                      </svg>
                      <p>Belum ada percakapan</p>
                      <button className="cb-empty-cta" onClick={() => setTab('contacts')}>Mulai Chat Baru</button>
                    </div>
                  ) : personalRooms.map(rm => (
                    <button key={rm.id} className="cb-room-item" onClick={() => openRoom(rm)}>
                      <Avatar nama={rm.other_name} foto={rm.other_foto} size="sm"/>
                      <div className="cb-room-body">
                        <div className="cb-room-row">
                          <span className="cb-room-name">{rm.other_name}</span>
                          <span className="cb-room-time">{formatTime(rm.last_message_at)}</span>
                        </div>
                        <div className="cb-room-row">
                          <span className="cb-room-preview">{rm.last_message || '–'}</span>
                          {(rm.unread_count || 0) > 0 && (
                            <span className="cb-unread-badge">{rm.unread_count}</span>
                          )}
                        </div>
                        <RoleBadge label={rm.other_sub}/>
                      </div>
                    </button>
                  ))}
                </div>
              ) : tab === 'groups' ? (
                /* ── Daftar grup kelas ── */
                <div className="cb-rooms">
                  {groupRooms.length === 0 ? (
                    <div className="cb-empty">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><circle cx="19" cy="6" r="2.5"/>
                      </svg>
                      <p>Belum ada grup kelas</p>
                      <p style={{fontSize:11, marginTop:2}}>Grup otomatis dibuat saat KRS dikunci Admin</p>
                    </div>
                  ) : groupRooms.map(rm => (
                    <button key={rm.id} className="cb-room-item" onClick={() => openRoom(rm)}>
                      <div className="cb-group-avatar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                        </svg>
                      </div>
                      <div className="cb-room-body">
                        <div className="cb-room-row">
                          <span className="cb-room-name">{rm.group_info?.nama || rm.nama || 'Grup Kelas'}</span>
                          <span className="cb-room-time">{formatTime(rm.last_message_at)}</span>
                        </div>
                        <div className="cb-room-row">
                          <span className="cb-room-preview">{rm.last_message || '–'}</span>
                          {(rm.unread_count || 0) > 0 && (
                            <span className="cb-unread-badge">{rm.unread_count}</span>
                          )}
                        </div>
                        {rm.group_info?.jumlah_anggota && (
                          <span className="cb-role-badge">{rm.group_info.jumlah_anggota} anggota</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                /* ── Daftar kontak ── */
                <div className="cb-rooms">
                  {!contactsLoaded ? (
                    <div className="cb-loading">Memuat kontak...</div>
                  ) : contacts.length === 0 ? (
                    <div className="cb-empty">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                      </svg>
                      <p>Belum ada kontak tersedia</p>
                    </div>
                  ) : contacts.map(c => {
                    const hasRoom = existingUserIds.has(c.user_id)
                    return (
                      <button key={c.user_id} className="cb-room-item" onClick={() => startChatWith(c)} disabled={opening}>
                        <Avatar nama={c.nama} foto={c.foto_url} size="sm"/>
                        <div className="cb-room-body">
                          <div className="cb-room-row">
                            <span className="cb-room-name">{c.nama}</span>
                            {hasRoom && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                              </svg>
                            )}
                          </div>
                          <RoleBadge label={c.sub}/>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            /* ── Area chat ── */
            <>
              <div className="cb-messages">
                {loading && <div className="cb-loading">Memuat pesan...</div>}
                {!loading && messages.length === 0 && (
                  <div className="cb-empty" style={{flex:1}}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                    <p style={{fontSize:12}}>Mulai percakapan...</p>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={m.id || i} className={`cb-msg ${m.is_self ? 'cb-msg--self' : 'cb-msg--other'}`}>
                    <div className="cb-msg-bubble">
                      {selRoom.type === 'group' && !m.is_self && (
                        <p className="cb-msg-author">{m.nama}</p>
                      )}
                      <p className="cb-msg-text">{m.pesan}</p>
                      <span className="cb-msg-time">{formatTime(m.created_at)}</span>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef}/>
              </div>
              <form className="cb-input-row" onSubmit={sendMsg}>
                <input
                  className="cb-input"
                  placeholder="Tulis pesan..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                />
                <button type="submit" className="cb-send" disabled={!input.trim() || sending}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* ── Floating bubble ── */}
      <button className="cb-fab" onClick={() => setOpen(v => !v)} aria-label="Live Chat">
        {open
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        }
        {!open && unread > 0 && (
          <span className="cb-fab-badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
    </>
  )
}
