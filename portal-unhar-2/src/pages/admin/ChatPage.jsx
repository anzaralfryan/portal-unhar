import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'
import PageHeader from '../../components/PageHeader.jsx'
import './ChatPage.css'

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

export default function ChatPage() {
  const [tab,        setTab]        = useState('rooms')   // 'rooms' | 'dosen' | 'mahasiswa'
  const [rooms,      setRooms]      = useState([])
  const [contacts,   setContacts]   = useState({ dosen:[], mahasiswa:[] })
  const [contactsLoaded, setContactsLoaded] = useState(false)
  const [search,     setSearch]     = useState('')
  const [selRoom,    setSelRoom]    = useState(null)
  const [messages,   setMessages]   = useState([])
  const [input,      setInput]      = useState('')
  const [sending,    setSending]    = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [opening,    setOpening]    = useState(false)
  const bottomRef = useRef(null)
  const pollRef   = useRef(null)
  const lastIdRef = useRef(0)

  /* ── Normalise room ── */
  function normaliseRoom(rm) {
    const lawan = rm.lawan_bicara || {}
    return {
      ...rm,
      other_name:    lawan.nama  || '–',
      other_sub:     lawan.sub   || '–',
      other_foto:    lawan.foto  || null,
      other_user_id: lawan.user_id || null,
      unread_count:  rm.unread ?? 0,
    }
  }

  /* ── Load rooms ── */
  async function loadRooms() {
    try {
      const r = await api.get('/chat/rooms')
      const raw = r.data?.data || []
      setRooms(raw.map(normaliseRoom))
    } catch {}
  }

  /* ── Load contacts (dosen + mahasiswa) — lazy, sekali ── */
  async function loadContacts() {
    try {
      const r = await api.get('/chat/contacts')
      const data = r.data?.data || {}
      setContacts({ dosen: data.dosen || [], mahasiswa: data.mahasiswa || [] })
      setContactsLoaded(true)
    } catch {}
  }

  useEffect(() => {
    loadRooms()
    const id = setInterval(loadRooms, 15000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if ((tab === 'dosen' || tab === 'mahasiswa') && !contactsLoaded) loadContacts()
  }, [tab])

  /* ── Poll pesan aktif ── */
  useEffect(() => {
    if (!selRoom) { clearInterval(pollRef.current); return }
    lastIdRef.current = 0

    async function fetchMessages(isInitial = false) {
      try {
        const params = { room_id: selRoom.id }
        if (!isInitial && lastIdRef.current > 0) params.last_id = lastIdRef.current
        const r = await api.get('/chat/messages', { params })
        const msgs = r.data?.data || []
        if (msgs.length > 0) {
          lastIdRef.current = r.data?.last_id ?? Math.max(...msgs.map(m => m.id))
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
      } catch {}
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
    clearInterval(pollRef.current)
    lastIdRef.current = 0
    setSelRoom(room)
    setMessages([])
    try { await api.post(`/chat/rooms/${room.id}/read`) } catch {}
    setRooms(prev => prev.map(rm => rm.id === room.id ? { ...rm, unread_count: 0 } : rm))
  }

  /* ── Mulai chat baru dari kontak ── */
  async function startChatWith(contact) {
    setOpening(true)
    try {
      const r = await api.post('/chat/rooms', { with_user_id: contact.user_id })
      const room = normaliseRoom(r.data?.data)
      setRooms(prev => {
        const exists = prev.find(rm => rm.id === room.id)
        return exists ? prev.map(rm => rm.id === room.id ? room : rm) : [room, ...prev]
      })
      setTab('rooms')
      await openRoom(room)
    } catch {} finally { setOpening(false) }
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
      setRooms(prev => prev.map(rm => rm.id === selRoom.id
        ? { ...rm, last_message: txt, last_message_at: new Date().toISOString() }
        : rm))
    } catch {} finally { setSending(false) }
  }

  /* ── Avatar ── */
  function Avatar({ nama, foto, size = 40, roleColor }) {
    return (
      <div className="chp-avatar" style={{
        width: size, height: size,
        background: foto ? 'transparent' : (roleColor || 'var(--primary-light)'),
        color: roleColor ? '#fff' : 'var(--primary)',
      }}>
        {foto
          ? <img src={foto} alt="" onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling.style.display='flex' }}/>
          : null
        }
        <span style={{ display: foto ? 'none' : 'flex', fontSize: size*0.36 }}>{getInitial(nama)}</span>
      </div>
    )
  }

  // Role color untuk avatar kontak
  const ROLE_COLOR = { dosen: '#5D8736', mahasiswa: '#859F3D' }

  // Filter pencarian
  const filteredRooms = rooms.filter(rm =>
    !search || rm.other_name.toLowerCase().includes(search.toLowerCase())
  )
  const currentContacts = tab === 'dosen' ? contacts.dosen : tab === 'mahasiswa' ? contacts.mahasiswa : []
  const filteredContacts = currentContacts.filter(c =>
    !search || c.nama.toLowerCase().includes(search.toLowerCase()) || (c.sub||'').toLowerCase().includes(search.toLowerCase())
  )

  const existingUserIds = new Set(rooms.map(rm => rm.other_user_id).filter(Boolean))
  const totalUnread = rooms.reduce((s, rm) => s + (rm.unread_count || 0), 0)

  return (
    <div className="page-root">
      {/* ── Panel kiri: daftar room + tab kontak ── */}
      <div className="page-panel chp-panel">
        <div className="chp-panel-header">
          <PageHeader title="Live Chat" subtitle="Komunikasi dengan dosen & mahasiswa"/>
        </div>

        <div className="chp-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder="Cari nama..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="chp-tabs">
          <button className={`chp-tab ${tab==='rooms'?'chp-tab--active':''}`} onClick={() => setTab('rooms')}>
            Percakapan
            {totalUnread > 0 && <span className="chp-tab-badge">{totalUnread > 9 ? '9+' : totalUnread}</span>}
          </button>
          <button className={`chp-tab ${tab==='dosen'?'chp-tab--active':''}`} onClick={() => setTab('dosen')}>
            Dosen
          </button>
          <button className={`chp-tab ${tab==='mahasiswa'?'chp-tab--active':''}`} onClick={() => setTab('mahasiswa')}>
            Mahasiswa
          </button>
        </div>

        <div className="chp-list">
          {tab === 'rooms' ? (
            filteredRooms.length === 0 ? (
              <div className="chp-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                <p>Belum ada percakapan</p>
              </div>
            ) : filteredRooms.map(rm => (
              <button key={rm.id} className={`chp-item ${selRoom?.id===rm.id?'chp-item--active':''}`} onClick={() => openRoom(rm)}>
                <Avatar nama={rm.other_name} foto={rm.other_foto}/>
                <div className="chp-item-body">
                  <div className="chp-item-row">
                    <span className="chp-item-name">{rm.other_name}</span>
                    <span className="chp-item-time">{formatTime(rm.last_message_at)}</span>
                  </div>
                  <div className="chp-item-row">
                    <span className="chp-item-preview">{rm.last_message || '–'}</span>
                    {(rm.unread_count||0) > 0 && <span className="chp-unread">{rm.unread_count}</span>}
                  </div>
                  {rm.other_sub && <RoleBadge label={rm.other_sub}/>}
                </div>
              </button>
            ))
          ) : (
            !contactsLoaded ? (
              <div className="chp-empty"><p>Memuat...</p></div>
            ) : filteredContacts.length === 0 ? (
              <div className="chp-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
                <p>Tidak ada {tab === 'dosen' ? 'dosen' : 'mahasiswa'}</p>
              </div>
            ) : filteredContacts.map(c => {
              const hasRoom = existingUserIds.has(c.user_id)
              return (
                <button key={c.user_id} className="chp-item" onClick={() => startChatWith(c)} disabled={opening}>
                  <Avatar nama={c.nama} foto={c.foto_url} roleColor={ROLE_COLOR[c.role]}/>
                  <div className="chp-item-body">
                    <div className="chp-item-row">
                      <span className="chp-item-name">{c.nama}</span>
                      <span className="chp-chat-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={hasRoom?'currentColor':'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                        </svg>
                      </span>
                    </div>
                    <p className="chp-item-sub">{c.sub}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Panel kanan: area chat ── */}
      <div className="page-main chp-main">
        {!selRoom ? (
          <div className="chp-placeholder">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <p className="chp-placeholder-title">Pilih percakapan</p>
            <p className="chp-placeholder-sub">atau mulai chat baru dari tab Dosen / Mahasiswa</p>
          </div>
        ) : (
          <>
            <div className="chp-chat-header">
              <Avatar nama={selRoom.other_name} foto={selRoom.other_foto} size={44}/>
              <div className="chp-chat-header-info">
                <p className="chp-chat-header-name">{selRoom.other_name}</p>
                <p className="chp-chat-header-sub">{selRoom.other_sub}</p>
              </div>
            </div>
            <div className="chp-messages">
              {loading && <div className="chp-loading">Memuat pesan...</div>}
              {!loading && messages.length === 0 && (
                <div className="chp-empty" style={{flex:1}}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                  <p>Mulai percakapan...</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={m.id || i} className={`chp-msg ${m.is_self ? 'chp-msg--self' : 'chp-msg--other'}`}>
                  <div className="chp-msg-bubble">
                    <p className="chp-msg-text">{m.pesan}</p>
                    <span className="chp-msg-time">{formatTime(m.created_at)}</span>
                  </div>
                </div>
              ))}
              <div ref={bottomRef}/>
            </div>
            <form className="chp-input-row" onSubmit={sendMsg}>
              <input
                className="chp-input"
                placeholder="Tulis pesan..."
                value={input}
                onChange={e => setInput(e.target.value)}
              />
              <button type="submit" className="chp-send" disabled={!input.trim() || sending}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Role badge ── */
function RoleBadge({ label }) {
  const isAdmin = label.toLowerCase().includes('admin')
  const isWali  = label.toLowerCase().includes('wali') || label.toLowerCase().includes('bimbingan')
  return (
    <span className={`chp-role-badge ${isAdmin ? 'chp-role-badge--admin' : isWali ? 'chp-role-badge--wali' : ''}`}>
      {label}
    </span>
  )
}
