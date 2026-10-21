import { useState, useEffect, useRef, useCallback } from 'react'
import api, { getErrorMessage } from '../../services/api'
import './ChatPage.css'

function getInitial(nama) {
  return (nama || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Kemarin ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) + ' ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function formatDateLabel(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString()) return 'Hari ini'
  if (d.toDateString() === yesterday.toDateString()) return 'Kemarin'
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

export default function ChatPage() {
  const [rooms,        setRooms]        = useState([])
  // BUG FIX: ganti dosenList → contactList, pakai /chat/contacts (endpoint yang benar)
  const [contactList,  setContactList]  = useState([])
  const [contactsLoaded, setContactsLoaded] = useState(false)
  const [selRoom,      setSelRoom]      = useState(null)
  const [messages,     setMessages]     = useState([])
  const [input,        setInput]        = useState('')
  const [sending,      setSending]      = useState(false)
  const [lastId,       setLastId]       = useState(0)
  const [loadingMsg,   setLoadingMsg]   = useState(false)
  const [msgError,     setMsgError]     = useState('')
  const [showNew,      setShowNew]      = useState(false)
  const [mobileView,   setMobileView]   = useState('list') // 'list' | 'chat'

  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const pollActive = useRef(false)

  // ── Load rooms ───────────────────────────────────────────────────────
  async function loadRooms() {
    try {
      const r = await api.get('/chat/rooms')
      setRooms(r.data?.data || [])
    } catch {}
  }

  // BUG FIX: /chat/dosen-list tidak ada → pakai /chat/contacts (lazy load, sekali saja)
  async function loadContacts() {
    if (contactsLoaded) return
    try {
      const r = await api.get('/chat/contacts')
      // contacts untuk mahasiswa: array flat (bukan {dosen, mahasiswa})
      const list = r.data?.data || []
      setContactList(Array.isArray(list) ? list : [])
    } catch {}
    finally { setContactsLoaded(true) }
  }

  useEffect(() => { loadRooms() }, [])

  // ── Lazy load kontak saat modal dibuka ──────────────────────────────
  useEffect(() => {
    if (showNew) loadContacts()
  }, [showNew])

  // ── Open room ────────────────────────────────────────────────────────
  async function openRoom(room) {
    stopPolling()
    setSelRoom(room)
    setMessages([])
    setLastId(0)
    setMsgError('')
    setLoadingMsg(true)
    setMobileView('chat')
    try {
      const r = await api.get('/chat/messages', { params: { room_id: room.id } })
      const msgs = r.data?.data || []
      setMessages(msgs)
      const newLastId = r.data?.last_id ?? (msgs.length ? msgs[msgs.length - 1].id : 0)
      setLastId(newLastId)
      setTimeout(() => scrollBottom('instant'), 80)
      startPolling(room.id, newLastId)
    } catch (e) {
      setMsgError('Gagal memuat pesan: ' + getErrorMessage(e))
    } finally {
      setLoadingMsg(false)
    }
  }

  function backToList() {
    stopPolling()
    setSelRoom(null)
    setMobileView('list')
  }

  // ── Mulai chat baru dari kontak ─────────────────────────────────────
  async function startChat(contact) {
    if (!contact?.user_id) return
    setShowNew(false)
    try {
      const r = await api.post('/chat/rooms', { with_user_id: contact.user_id })
      const roomData = r.data?.data
      if (roomData) {
        const rRooms = await api.get('/chat/rooms')
        const freshRooms = rRooms.data?.data || []
        setRooms(freshRooms)
        const found = freshRooms.find(rm => rm.id === roomData.id)
        openRoom(found || roomData)
      }
    } catch (e) { alert(getErrorMessage(e)) }
  }

  // ── Long Polling ─────────────────────────────────────────────────────
  const startPolling = useCallback((roomId, startLastId) => {
    pollActive.current = true
    let currentLastId = startLastId

    async function poll() {
      if (!pollActive.current) return
      try {
        const r = await api.get('/chat/listen', {
          params: { room_id: roomId, last_id: currentLastId },
          timeout: 32000,
        })
        if (!pollActive.current) return
        const newMsgs = r.data?.messages || []
        if (newMsgs.length > 0) {
          setMessages(prev => {
            const ids = new Set(prev.map(m => m.id))
            return [...prev, ...newMsgs.filter(m => !ids.has(m.id))]
          })
          currentLastId = r.data.last_id
          setLastId(currentLastId)
          loadRooms()
          setTimeout(() => scrollBottom('smooth'), 80)
        }
      } catch {}
      if (pollActive.current) poll()
    }
    poll()
  }, [])

  function stopPolling() { pollActive.current = false }
  useEffect(() => () => stopPolling(), [])

  // ── Kirim pesan ──────────────────────────────────────────────────────
  async function handleSend() {
    if (!input.trim() || !selRoom || sending) return
    setSending(true)
    const teks = input.trim()
    setInput('')
    try {
      const r = await api.post('/chat/send', { room_id: selRoom.id, pesan: teks })
      const msg = r.data?.data
      if (msg) {
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
        setLastId(msg.id)
        setTimeout(() => scrollBottom('smooth'), 80)
        loadRooms()
      }
    } catch (e) { alert(getErrorMessage(e)); setInput(teks) }
    finally { setSending(false); inputRef.current?.focus() }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function scrollBottom(behavior = 'smooth') {
    bottomRef.current?.scrollIntoView({ behavior })
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="chat-root">

      {/* ══ PANEL KIRI: Daftar Room ══ */}
      <div className={`chat-sidebar ${mobileView === 'chat' ? 'mobile-hidden' : ''}`}>
        <div className="chat-sidebar-header">
          <div>
            <h2>Live Chat</h2>
            <p className="chat-sidebar-sub">{rooms.length} percakapan</p>
          </div>
          <button className="chat-new-btn" onClick={() => setShowNew(true)} title="Chat baru">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        <div className="chat-room-list">
          {rooms.length === 0 ? (
            <div className="chat-empty-rooms">
              <div className="chat-empty-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>
              <p>Belum ada percakapan</p>
              <button onClick={() => setShowNew(true)}>Mulai Chat</button>
            </div>
          ) : rooms.map(r => (
            <div key={r.id}
              className={`chat-room-item ${selRoom?.id === r.id ? 'active' : ''}`}
              onClick={() => openRoom(r)}>
              <div className="chat-room-avatar">
                {getInitial(r.lawan_bicara?.nama)}
              </div>
              <div className="chat-room-info">
                <div className="chat-room-row">
                  <span className="chat-room-name">{r.lawan_bicara?.nama || '–'}</span>
                  {r.last_message_at && (
                    <span className="chat-room-time">{formatTime(r.last_message_at)}</span>
                  )}
                </div>
                <div className="chat-room-row">
                  <span className="chat-room-last">{r.last_message || r.lawan_bicara?.sub || 'Belum ada pesan'}</span>
                  {r.unread > 0 && <span className="chat-unread-badge">{r.unread}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ AREA CHAT ══ */}
      <div className={`chat-main ${mobileView === 'list' ? 'mobile-hidden' : ''}`}>
        {!selRoom ? (
          <div className="chat-placeholder">
            <div className="chat-placeholder-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>
            <p className="chat-placeholder-title">Pilih percakapan</p>
            <p className="chat-placeholder-sub">atau mulai chat baru</p>
            <button className="chat-start-btn" onClick={() => setShowNew(true)}>Mulai Chat</button>
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="chat-header">
              <button className="chat-back-btn" onClick={backToList}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <div className="chat-header-avatar">{getInitial(selRoom.lawan_bicara?.nama)}</div>
              <div className="chat-header-info">
                <p className="chat-header-name">{selRoom.lawan_bicara?.nama}</p>
                <p className="chat-header-sub">{selRoom.lawan_bicara?.sub}</p>
              </div>
            </div>

            {/* ── Messages ── */}
            <div className="chat-messages">
              {loadingMsg ? (
                <div className="chat-loading">
                  <div className="chat-loading-dots"><span/><span/><span/></div>
                  <p>Memuat pesan...</p>
                </div>
              ) : msgError ? (
                <div className="chat-msg-error">
                  <p>⚠️ {msgError}</p>
                  <button onClick={() => openRoom(selRoom)}>Coba lagi</button>
                </div>
              ) : messages.length === 0 ? (
                <div className="chat-empty-msg">
                  <p>Belum ada pesan.</p>
                  <p style={{ fontSize: 12, color: 'var(--text4)', marginTop: 4 }}>Mulai percakapan sekarang!</p>
                </div>
              ) : (
                messages.map((m, i) => {
                  const showDate = i === 0 || formatDateLabel(messages[i - 1].created_at) !== formatDateLabel(m.created_at)
                  const isFirst = i === 0 || messages[i - 1].user_id !== m.user_id
                  const isLast = i === messages.length - 1 || messages[i + 1].user_id !== m.user_id

                  return (
                    <div key={m.id}>
                      {showDate && (
                        <div className="chat-date-divider">
                          <span>{formatDateLabel(m.created_at)}</span>
                        </div>
                      )}
                      <div className={`chat-bubble-wrap ${m.is_self ? 'self' : 'other'} ${isFirst ? 'first' : ''} ${isLast ? 'last' : ''}`}>
                        {!m.is_self && (
                          <div className={`chat-msg-avatar ${isLast ? '' : 'invisible'}`}>
                            {getInitial(m.nama)}
                          </div>
                        )}
                        <div className="chat-bubble">
                          {!m.is_self && isFirst && (
                            <p className="chat-bubble-sender">{m.nama}</p>
                          )}
                          <p className="chat-bubble-text">{m.pesan}</p>
                          <div className="chat-bubble-meta">
                            <span className="chat-bubble-time">{formatTime(m.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* ── Input ── */}
            <div className="chat-input-area">
              <textarea
                ref={inputRef}
                className="chat-input"
                rows={1}
                placeholder="Tulis pesan..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
              />
              <button
                className="chat-send-btn"
                onClick={handleSend}
                disabled={!input.trim() || sending}
              >
                {sending ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="9"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ══ MODAL: Pilih Kontak ══ */}
      {showNew && (
        <div className="chat-modal-bg" onClick={() => setShowNew(false)}>
          <div className="chat-modal" onClick={e => e.stopPropagation()}>
            <div className="chat-modal-header">
              <h3>Mulai Chat</h3>
              <button onClick={() => setShowNew(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {!contactsLoaded ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                Memuat kontak...
              </div>
            ) : contactList.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                <p>Belum ada kontak tersedia.</p>
                <p style={{ fontSize: 12, marginTop: 6, lineHeight: 1.6 }}>
                  Pastikan KRS sudah terkunci atau sudah memiliki Dosen PA.
                </p>
              </div>
            ) : contactList.map(c => (
              <div key={c.user_id} className="chat-dosen-item" onClick={() => startChat(c)}>
                <div className="chat-room-avatar">{getInitial(c.nama)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{c.nama}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 2 }}>
                    {c.sub || c.role}
                  </p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
