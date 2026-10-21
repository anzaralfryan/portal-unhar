import { useState, useMemo, useRef, useEffect } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import { useFetch } from '../../hooks/useFetch'
import { jadwalService } from '../../services/services'
import './JadwalPage.css'

/* ── Konstanta ── */
const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const NAMA_BULAN_S = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']
const HARI_LABEL = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
const HARI_IDX   = { Senin:0, Selasa:1, Rabu:2, Kamis:3, Jumat:4, Sabtu:5 }
const HARI_S     = ['Sen','Sel','Rab','Kam','Jum','Sab']

function getMondayOf(d) {
  const r = new Date(d); const day = r.getDay()
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day))
  r.setHours(0,0,0,0); return r
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function jam(t) { return (t || '').slice(0, 5) }

/* Deterministic color per matkul */
const CARD_COLORS = [
  { bg:'#2563eb', text:'#fff', light:'#dbeafe' },
  { bg:'#7c3aed', text:'#fff', light:'#ede9fe' },
  { bg:'#059669', text:'#fff', light:'#d1fae5' },
  { bg:'#d97706', text:'#fff', light:'#fef3c7' },
  { bg:'#e53e3e', text:'#fff', light:'#fee2e2' },
  { bg:'#0891b2', text:'#fff', light:'#cffafe' },
  { bg:'#9333ea', text:'#fff', light:'#f3e8ff' },
  { bg:'#0d9488', text:'#fff', light:'#ccfbf1' },
]
function cardColor(kode) {
  let hash = 0
  for (let i = 0; i < String(kode || '').length; i++) hash = (hash * 31 + String(kode).charCodeAt(i)) | 0
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length]
}

/* Convert "HH:MM:SS" to minutes from midnight */
function toMins(t) {
  const [h, m] = (t || '00:00').split(':').map(Number)
  return h * 60 + (m || 0)
}

/* Build mini calendar (7xN grid for current month) */
function buildCalendar(year, month) {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  let startDow = first.getDay() === 0 ? 6 : first.getDay() - 1 // Mon=0
  const days = []
  for (let i = 0; i < startDow; i++) days.push(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(d)
  while (days.length % 7 !== 0) days.push(null)
  return days
}

/* Timeline config: jam 07:00 – 20:00, 1 hour = PX_PER_H px */
const START_H   = 7
const END_H     = 20
const PX_PER_H  = 64

export default function JadwalPage() {
  const today     = new Date(); today.setHours(0,0,0,0)
  const [weekStart, setWeekStart] = useState(getMondayOf(today))
  const [hariAktif, setHariAktif] = useState(() => {
    const d = today.getDay()
    return d === 0 ? 'Senin' : d === 6 ? 'Sabtu' : HARI_LABEL[d - 1]
  })
  const [calYear,  setCalYear]  = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

  const timelineRef = useRef(null)
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()

  const { data, loading, error } = useFetch(() => jadwalService.getMahasiswaJadwal(), [])
  const jadwalArr = useMemo(() => Array.isArray(data) ? data : data?.data || [], [data])

  const jadwalByHari = useMemo(() => {
    const map = {}
    HARI_LABEL.forEach(h => { map[h] = [] })
    jadwalArr.forEach(j => { if (map[j.hari]) map[j.hari].push(j) })
    Object.values(map).forEach(arr => arr.sort((a,b) => (a.jam_mulai||'').localeCompare(b.jam_mulai||'')))
    return map
  }, [jadwalArr])

  const tahunList = [...new Set(jadwalArr.map(j => j.tahun_akademik).filter(Boolean))]
  const thisWeekStart = getMondayOf(today)
  const isThis = weekStart.getTime() === thisWeekStart.getTime()

  function getTgl(h) { return addDays(weekStart, HARI_IDX[h]) }
  function prevWeek() { setWeekStart(w => addDays(w, -7)) }
  function nextWeek() { if (weekStart < thisWeekStart) setWeekStart(w => addDays(w, 7)) }

  const jadwalHariAktif = jadwalByHari[hariAktif] || []
  const tglAktif = getTgl(hariAktif)
  const isToday  = tglAktif.toDateString() === today.toDateString()

  // Calendar data
  const calDays = useMemo(() => buildCalendar(calYear, calMonth), [calYear, calMonth])
  const daysWithClass = useMemo(() => {
    const tgl = getTgl
    const set = new Set()
    HARI_LABEL.forEach(h => {
      if (jadwalByHari[h]?.length > 0) {
        const d = getTgl(h)
        set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
      }
    })
    return set
  }, [jadwalByHari, weekStart])

  // Scroll timeline to current time on mount
  useEffect(() => {
    if (isToday && timelineRef.current) {
      const top = Math.max(0, (nowMins - START_H * 60) * (PX_PER_H / 60) - 80)
      setTimeout(() => timelineRef.current?.scrollTo({ top, behavior: 'smooth' }), 300)
    }
  }, [hariAktif, isToday])

  // ── Loading ──
  if (loading) return (
    <div className="page-single">
      <PageHeader title="Jadwal Kuliah" subtitle="Memuat..."/>
      <div style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>Memuat jadwal...</div>
    </div>
  )

  if (jadwalArr.length === 0) return (
    <div className="page-single">
      <PageHeader title="Jadwal Kuliah" subtitle="Belum ada jadwal"/>
      <div className="content-body">
        <div className="jdw-empty-big">
          <div className="jdw-empty-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div>
          <p>Jadwal belum tersedia</p>
          <small>Isi KRS terlebih dahulu untuk melihat jadwal kuliah</small>
          {error && <p style={{ color:'var(--red)', fontSize:12, marginTop:8 }}>{error}</p>}
        </div>
      </div>
    </div>
  )

  // ── Hours for timeline ──
  const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i)

  return (
    <div className="jdw-root">

      {/* ════ PANEL KIRI ════ */}
      <div className="jdw-sidebar">

        {/* Mini Calendar */}
        <div className="jdw-cal">
          <div className="jdw-cal-hdr">
            <button className="jdw-cal-nav" onClick={() => {
              if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1) }
              else setCalMonth(m => m-1)
            }}>‹</button>
            <span className="jdw-cal-title">{NAMA_BULAN_S[calMonth]} {calYear}</span>
            <button className="jdw-cal-nav" onClick={() => {
              if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1) }
              else setCalMonth(m => m+1)
            }}>›</button>
          </div>
          <div className="jdw-cal-grid">
            {['S','S','R','K','J','S','M'].map((d,i) => (
              <span key={i} className="jdw-cal-dow">{d}</span>
            ))}
            {calDays.map((d, i) => {
              if (!d) return <span key={i}/>
              const date = new Date(calYear, calMonth, d)
              const isT  = date.toDateString() === today.toDateString()
              const key  = `${calYear}-${calMonth}-${d}`
              const hasClass = daysWithClass.has(key)
              return (
                <button key={i} className={`jdw-cal-day ${isT ? 'today' : ''}`}>
                  {d}
                  {hasClass && <span className="jdw-cal-dot"/>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Week navigator */}
        <div className="jdw-week-nav-wrap">
          <button className="jdw-nav-btn" onClick={prevWeek}>‹</button>
          <div className="jdw-week-info">
            <span>{addDays(weekStart,0).getDate()} – {addDays(weekStart,5).getDate()} {NAMA_BULAN_S[addDays(weekStart,5).getMonth()]}</span>
          </div>
          <button className="jdw-nav-btn" onClick={nextWeek} disabled={isThis}>›</button>
        </div>

        {/* Hari buttons */}
        <div className="jdw-hari-list">
          {HARI_LABEL.map((h, hi) => {
            const tgl    = getTgl(h)
            const isT    = tgl.toDateString() === today.toDateString()
            const count  = jadwalByHari[h]?.length || 0
            const active = hariAktif === h
            return (
              <button key={h}
                className={`jdw-hari-btn2 ${active ? 'active' : ''} ${isT ? 'today' : ''}`}
                onClick={() => setHariAktif(h)}>
                <span className="jdw-hari-dow">{HARI_S[hi]}</span>
                <span className={`jdw-hari-date ${isT ? 'today' : ''}`}>{tgl.getDate()}</span>
                {count > 0 && <span className="jdw-hari-count">{count}</span>}
              </button>
            )
          })}
        </div>

        {/* Periode */}
        {tahunList.length > 0 && (
          <div className="jdw-periode">
            <span className="jdw-periode-label">Periode</span>
            <span className="jdw-periode-val">{tahunList[0]}</span>
          </div>
        )}
      </div>

      {/* ════ MAIN: Timeline ════ */}
      <div className="jdw-main">
        <PageHeader
          title={`${hariAktif}, ${tglAktif.getDate()} ${NAMA_BULAN[tglAktif.getMonth()]} ${tglAktif.getFullYear()}`}
          subtitle={`${jadwalHariAktif.length} kelas · ${isToday ? 'Hari ini' : tahunList[0] || '–'}`}
          actions={
            isToday && (
              <span style={{ fontSize:12, fontWeight:700, background:'var(--primary-light)', color:'var(--primary)', padding:'5px 12px', borderRadius:20 }}>
                ● Hari ini
              </span>
            )
          }
        />

        {/* Timeline */}
        <div className="jdw-timeline-wrap" ref={timelineRef}>
          <div className="jdw-timeline" style={{ height: `${(END_H - START_H) * PX_PER_H}px` }}>

            {/* Hour lines */}
            {hours.map(h => (
              <div key={h} className="jdw-hour-row" style={{ top: `${(h - START_H) * PX_PER_H}px` }}>
                <span className="jdw-hour-label">{String(h).padStart(2,'0')}:00</span>
                <div className="jdw-hour-line"/>
              </div>
            ))}

            {/* Current time indicator */}
            {isToday && nowMins >= START_H * 60 && nowMins <= END_H * 60 && (
              <div className="jdw-now-line" style={{ top: `${(nowMins - START_H * 60) * (PX_PER_H / 60)}px` }}>
                <span className="jdw-now-dot"/>
                <div className="jdw-now-bar"/>
                <span className="jdw-now-time">{jam(now.toTimeString())}</span>
              </div>
            )}

            {/* Event blocks */}
            {jadwalHariAktif.length === 0 ? (
              <div className="jdw-timeline-empty">
                <span><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary-mid)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></span>
                <p>Tidak ada kelas hari ini</p>
                <small>Nikmati waktu untuk belajar mandiri</small>
              </div>
            ) : (
              jadwalHariAktif.map((item, i) => {
                const startMins = toMins(item.jam_mulai)
                const endMins   = toMins(item.jam_selesai)
                const dur       = Math.max(endMins - startMins, 30)
                const top       = (startMins - START_H * 60) * (PX_PER_H / 60)
                const height    = dur * (PX_PER_H / 60)
                const clr       = cardColor(item.kode || item.matkul || i)
                const isNow     = isToday && nowMins >= startMins && nowMins < endMins

                return (
                  <div key={item.id || i}
                    className={`jdw-event ${isNow ? 'now' : ''}`}
                    style={{
                      top:    `${top}px`,
                      height: `${height}px`,
                      background: clr.bg,
                      minHeight: 44,
                    }}>
                    <div className="jdw-event-inner">
                      <p className="jdw-event-time">
                        {jam(item.jam_mulai)} – {jam(item.jam_selesai)}
                        {dur >= 60 && <span className="jdw-event-dur">{Math.floor(dur/60)}j{dur%60>0?` ${dur%60}m`:''}</span>}
                      </p>
                      <p className="jdw-event-title">{item.matkul || '–'}</p>
                      {height >= 60 && (
                        <p className="jdw-event-sub">
                          {item.dosen || 'Dosen TBD'}
                          {item.ruang ? ` · ${item.ruang}` : ''}
                        </p>
                      )}
                      {height >= 80 && item.sks && (
                        <span className="jdw-event-badge">{item.sks} SKS</span>
                      )}
                      {isNow && <span className="jdw-event-live">● Berlangsung</span>}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
