import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { landingService } from '../services/services'
import api from '../services/api'
import './LandingPage.css'

/* ══════════════════════════════════════════════════════
   DATA STATIS
══════════════════════════════════════════════════════ */
const SLIDES_FALLBACK = [
  { img: '/img/unhar1.jpeg', tag: 'Akademik Digital',  title: 'Portal Akademik\nUniversitas Harapan Medan',   sub: 'Kelola KRS, Nilai, Jadwal, dan Pembayaran dalam satu platform terintegrasi.' },
  { img: '/img/unhar2.jpeg', tag: 'Fasilitas Modern',   title: 'Kampus dengan\nFasilitas Lengkap',           sub: 'Didukung infrastruktur modern untuk proses belajar yang optimal dan nyaman.' },
  { img: '/img/unhar3.jpeg', tag: 'Prestasi',           title: 'Raih Prestasi\nBersama UNHAR',              sub: 'Bergabunglah dengan ribuan alumni sukses yang berkarir di berbagai bidang.' },
  { img: '/img/unhar4.jpeg', tag: 'Komunitas',          title: 'Berkarakter, Berilmu,\nBerkarya',            sub: 'Komunitas akademik yang solid dan suportif untuk perkembangan mahasiswa.' },
]

const STATS_FALLBACK = [
  { val: '2280', lbl: 'Total Mahasiswa' },
  { val: '148',  lbl: 'Pengajar' },
  { val: '14',   lbl: 'Program Studi' },
  { val: '4',    lbl: 'Fakultas & 1 Pascasarjana' },
]

const BERITA_FALLBACK = []

const PENGUMUMAN_FALLBACK = []

const AGENDA_FALLBACK = []

const LAYANAN_FALLBACK = [
  { icon: 'monitor', label: 'SIAUNHAR',    desc: 'Sistem Akademik Pengelolaan KRS, KHS, Jadwal Kuliah dan Transkrip',  href: '/login',   color: '#5D8736' },
  { icon: 'users',   label: 'PMB',         desc: 'Sistem Informasi Penerimaan Mahasiswa Baru',                          href: '#',        color: '#31511E' },
  { icon: 'book',    label: 'E-LEARNING',  desc: 'Sistem Aplikasi Pembelajaran Online',                                 href: '#',        color: '#859F3D' },
  { icon: 'archive', label: 'REPOSITORI',  desc: 'Sistem Dokumen Hasil Karya Civitas Akademik',                         href: '#',        color: '#5D8736' },
]

const KEUNGGULAN_FALLBACK = [
  { icon: 'globe',    judul: 'Program Magang Luar Negeri',      isi: 'Tersedia program magang ke Jepang & magang di Dunia Usaha & Industri.' },
  { icon: 'monitor', judul: 'Hybrid Class',                    isi: 'Pembelajaran melalui kelas Hybrid dengan LMS yang bisa diakses kapanpun dan dimanapun.' },
  { icon: 'award',   judul: 'Lulusan Bersertifikat Kompetensi', isi: 'Lulusan dibekali sertifikat kompetensi & TOEFL untuk meningkatkan daya saing.' },
  { icon: 'users',   judul: 'Kelas Karyawan & RPL',            isi: 'Memberikan kesempatan masyarakat melanjutkan pendidikan formal dengan pengakuan kompetensi.' },
]

const MITRA_FALLBACK = []

/* ══════════════════════════════════════════════════════
   HELPER: Normalisasi URL gambar dari CMS
   Gambar bisa tersimpan sebagai:
   1. URL absolut lama dari environment sebelumnya → biarkan, browser akan load
   2. URL http://localhost/..  → tidak bisa diakses dari luar (HP/domain lain)
   3. Path relatif /img/...   → biarkan apa adanya (served Vite/hosting)
   4. Base64 data:image/...   → biarkan apa adanya
══════════════════════════════════════════════════════ */
function resolveImg(url) {
  if (!url) return null
  // Base64 atau path relatif → langsung pakai
  if (url.startsWith('data:') || url.startsWith('/')) return url
  try {
    const parsed = new URL(url)
    // Jika host = localhost atau IP lokal → tidak bisa diakses dari luar
    // Ganti dengan path relatif saja, biar resolve ke origin saat ini
    const isLocal = parsed.hostname === 'localhost' ||
                    parsed.hostname === '127.0.0.1' ||
                    /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(parsed.hostname)
    if (isLocal) {
      // Ambil path-nya saja → resolve otomatis ke origin saat ini (dev/prod)
      return parsed.pathname + parsed.search
    }
    // URL absolut lain (mis. dari deployment sebelumnya) → biarkan, browser akan load
    return url
  } catch {
    return url
  }
}

/* ══════════════════════════════════════════════════════
   ICON COMPONENT
══════════════════════════════════════════════════════ */
function Icon({ name, size = 20 }) {
  const paths = {
    monitor:  <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>,
    book:     <><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>,
    building: <><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22V12h6v10"/><path d="M9 7h1"/><path d="M9 11h1"/><path d="M14 7h1"/><path d="M14 11h1"/></>,
    award:    <><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></>,
    users:    <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    login:    <><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></>,
    chevron:  <polyline points="6 9 12 15 18 9"/>,
    phone:    <><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.64A2 2 0 012 .99H5a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></>,
    mail:     <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    map:      <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>,
    menu:     <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    x:        <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    arrow:    <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    music:    <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>,
    globe:    <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></>,
    archive:  <><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></>,
    instagram:<><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></>,
    facebook: <><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></>,
    youtube:  <><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/></>,
    play:     <><polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"/></>,
    externalLink: <><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
    activity:     <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    calendar:     <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate  = useNavigate()
  const [slide,       setSlide]       = useState(0)
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [scrolled,    setScrolled]    = useState(false)
  const [tentangOpen,      setTentangOpen]      = useState(false)
  const [akademikOpen,     setAkademikOpen]     = useState(false)
  const [beritaDropOpen,   setBeritaDropOpen]   = useState(false)
  const [kelembagaanOpen,  setKelembagaanOpen]  = useState(false)
  const [informasiOpen,    setInformasiOpen]    = useState(false)
  const tentangTimer     = useRef(null)
  const akademikTimer    = useRef(null)
  const beritaDropTimer  = useRef(null)
  const kelembagaanTimer = useRef(null)
  const informasiTimer   = useRef(null)

  /* Stats pengunjung — public endpoint */
  const [siteStats, setSiteStats] = useState(null)
  useEffect(() => {
    // Gunakan axios (instance 'api') agar Authorization/base URL konsisten dengan request lain
    api.get('/stats/public')
      .then(r => setSiteStats(r.data?.data ?? null))
      .catch(() => {})
  }, [])

  /* ── Konten dari API (CMS) — fallback ke data statis jika gagal ── */
  const [cmsData, setCmsData] = useState(null)
  useEffect(() => {
    landingService.getAll()
      .then(d => setCmsData(d))
      .catch(() => setCmsData(null)) // silent — gunakan fallback
  }, [])

  /* Helper: ambil dari CMS atau fallback statis */
  function cms(key, fallback) {
    const list = cmsData?.[key]
    return list && list.length > 0 ? list : fallback
  }

  /* Map data CMS ke struktur yang diharapkan komponen */
  const SLIDES       = cms('hero', SLIDES_FALLBACK).map(i => ({
    img: resolveImg(i.gambar) || '/img/unhar1.jpeg',
    tag: i.meta?.tag || 'UNHAR Medan',
    title: i.judul || 'Universitas Harapan Medan',
    sub: i.isi || '',
  }))
  const STATS        = cms('stats', STATS_FALLBACK).map(i => ({
    val: i.meta?.val ?? i.judul ?? '–',
    lbl: i.isi || i.judul || '',
  }))
  const BERITA       = cms('berita', BERITA_FALLBACK).map(i => ({
    id: i.id, kategori: i.kategori || 'Berita Universitas',
    judul: i.judul || '', tgl: i.tanggal_tampil || '', foto: resolveImg(i.gambar) || '/img/unhar1.jpeg',
  }))
  const PENGUMUMAN   = cms('pengumuman', PENGUMUMAN_FALLBACK).map(i => ({
    tgl: i.tanggal_tampil || '', bln: i.bulan_tampil || '',
    judul: i.judul || '', kategori: i.kategori || 'Pengumuman',
  }))
  const AGENDA       = cms('agenda', AGENDA_FALLBACK).map(i => ({
    tgl: i.tanggal_tampil || '', bln: i.bulan_tampil || '',
    judul: i.judul || '', kategori: i.kategori || 'Agenda Kegiatan',
  }))
  const LAYANAN      = cms('layanan', LAYANAN_FALLBACK).map(i => ({
    icon: i.meta?.icon || 'monitor', label: i.judul || 'Layanan',
    desc: i.isi || '', href: i.link || '#', color: i.meta?.color || '#5D8736',
  }))
  const KEUNGGULAN   = cms('keunggulan', KEUNGGULAN_FALLBACK).map(i => ({
    icon: i.meta?.icon || 'award', judul: i.judul || '', isi: i.isi || '',
  }))
  const MITRA        = cms('mitra', MITRA_FALLBACK).map(i => i.judul || i.gambar || 'Mitra')

  const heroRef        = useRef(null)
  const tentangRef     = useRef(null)
  const beritaRef      = useRef(null)
  const akademikRef    = useRef(null)
  const kelembagaanRef = useRef(null)
  const informasiRef   = useRef(null)

  /* Auto-slide */
  useEffect(() => {
    const id = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 5000)
    return () => clearInterval(id)
  }, [])

  /* Navbar scroll */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  /* Scroll-reveal: tambah class 'visible' ke elemen .reveal saat masuk viewport */
  useEffect(() => {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target) } }),
      { threshold: 0.12 }
    )
    document.querySelectorAll('.reveal').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  /* Counter animasi untuk stats */
  const [counted, setCounted] = useState(false)
  const statsRef = useRef(null)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !counted) { setCounted(true); io.disconnect() }
    }, { threshold: 0.5 })
    if (statsRef.current) io.observe(statsRef.current)
    return () => io.disconnect()
  }, [counted])

  function closeAllDropdowns() {
    setTentangOpen(false); setAkademikOpen(false)
    setBeritaDropOpen(false); setKelembagaanOpen(false); setInformasiOpen(false)
  }
  function scrollTo(ref) {
    setMenuOpen(false)
    closeAllDropdowns()
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /* ════════════════════════════════════════════════════
     JSX
  ════════════════════════════════════════════════════ */
  return (
    <div className="lnd-root">

      {/* ══ TOPBAR ══ */}
      <div className="lnd-topbar">
        <div className="lnd-topbar-inner">
          <a href="mailto:admin@unhar.ac.id" className="lnd-topbar-email">
            <Icon name="mail" size={14} />
            admin@unhar.ac.id
          </a>
          <div className="lnd-topbar-socials">
            <a href="https://www.instagram.com/universitasharapanmedan/" target="_blank" rel="noreferrer" aria-label="Instagram">
              <Icon name="instagram" size={15} />
            </a>
            <a href="https://www.facebook.com/universitasharapanmedan/" target="_blank" rel="noreferrer" aria-label="Facebook">
              <Icon name="facebook" size={15} />
            </a>
            <a href="https://www.youtube.com/channel/UCuN3Ws0Fr1o1TzI-BGT3e1Q" target="_blank" rel="noreferrer" aria-label="YouTube">
              <Icon name="youtube" size={15} />
            </a>
          </div>
        </div>
      </div>

      {/* ══ NAVBAR ══ */}
      <header className={`lnd-nav ${scrolled ? 'lnd-nav--scrolled' : ''}`}>
        <div className="lnd-nav-inner">

          {/* Brand */}
          <div className="lnd-nav-brand" onClick={() => scrollTo(heroRef)}>
            <img src="/logo-unhar.png" alt="UNHAR" className="lnd-nav-logo" />
            <div className="lnd-nav-brand-text">
              <p className="lnd-nav-name">UNIVERSITAS</p>
              <p className="lnd-nav-name">HARAPAN</p>
              <p className="lnd-nav-name">MEDAN</p>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="lnd-nav-links">
            <button className="lnd-nav-link" onClick={() => scrollTo(heroRef)}>Home</button>

            {/* Tentang Kami — Mega Menu */}
            <div
              className="lnd-mega-wrap"
              onMouseEnter={() => { clearTimeout(tentangTimer.current); setTentangOpen(true) }}
              onMouseLeave={() => { tentangTimer.current = setTimeout(() => setTentangOpen(false), 180) }}
            >
              <button
                className={`lnd-nav-link lnd-nav-link--mega ${tentangOpen ? 'lnd-nav-link--active' : ''}`}
                onClick={() => setTentangOpen(v => !v)}
              >
                Tentang Kami
                <svg className="lnd-mega-chevron" width="11" height="11" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {tentangOpen && (
                <div className="lnd-mega-panel">
                  <div className="lnd-mega-inner">

                    {/* Kolom 1 — UNIVERSITAS */}
                    <div className="lnd-mega-col">
                      <p className="lnd-mega-col-title">UNIVERSITAS</p>
                      {[
                        ['Sambutan Rektor',       'sambutan-rektor'],
                        ['Sejarah',               'sejarah'],
                        ['Lambang & Filosofi',    'lambang-filosofi'],
                        ['Visi, Misi dan Tujuan', 'visi-misi'],
                        ['Catur Prasetya',        'catur-prasetya'],
                        ['Mars',                  'mars'],
                      ].map(([lbl, slug]) => (
                        <button key={slug} className="lnd-mega-item"
                          onClick={() => { setTentangOpen(false); navigate(`/tentang/${slug}`) }}>
                          {lbl}
                        </button>
                      ))}
                    </div>

                    {/* Kolom 2 — STRUKTUR UNHAR */}
                    <div className="lnd-mega-col">
                      <p className="lnd-mega-col-title">STRUKTUR UNHAR</p>
                      {[
                        'Pimpinan Universitas',
                        'Pimpinan Fakultas',
                        'Lembaga Penjaminan Mutu & Penagawasan Internal',
                        'Lembaga Penelitian dan Pengabdian Masyarakat',
                        'Biro Akademik & SDM',
                        'Biro Administrasi, Sarana & Prasarana',
                      ].map(lbl => (
                        <button key={lbl} className="lnd-mega-item lnd-mega-item--disabled" disabled>{lbl}</button>
                      ))}
                    </div>

                    {/* Kolom 3 — LAYANAN DIGITAL */}
                    <div className="lnd-mega-col">
                      <p className="lnd-mega-col-title">LAYANAN DIGITAL</p>
                      {['E-Jurnal', 'E-Library', 'Repositori'].map(lbl => (
                        <button key={lbl} className="lnd-mega-item lnd-mega-item--disabled" disabled>{lbl}</button>
                      ))}
                    </div>

                    {/* Kolom 4 — KAMPUS */}
                    <div className="lnd-mega-col">
                      <p className="lnd-mega-col-title">KAMPUS</p>
                      {['Fasilitas', 'Ruang Belajar', 'Peta Lokasi Kampus', 'Kontak'].map(lbl => (
                        <button key={lbl} className="lnd-mega-item lnd-mega-item--disabled" disabled>{lbl}</button>
                      ))}
                    </div>

                  </div>
                </div>
              )}
            </div>

            {/* ── Akademik Dropdown ── */}
            <div className="lnd-mega-wrap"
              onMouseEnter={() => { clearTimeout(akademikTimer.current); setAkademikOpen(true) }}
              onMouseLeave={() => { akademikTimer.current = setTimeout(() => setAkademikOpen(false), 160) }}>
              <button className={`lnd-nav-link lnd-nav-link--mega ${akademikOpen ? 'lnd-nav-link--active' : ''}`}
                onClick={() => setAkademikOpen(v => !v)}>
                Akademik
                <svg className="lnd-mega-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {akademikOpen && (
                <div className="lnd-mega-panel lnd-mega-panel--slim">
                  <div className="lnd-mega-slim-inner">
                    <div className="lnd-mega-slim-col">
                      <p className="lnd-mega-col-title">FAKULTAS</p>
                      {[['Bahasa & Komunikasi','https://fbk.unhar.ac.id/'],['Ekonomi Bisnis','https://feb.unhar.ac.id/'],['Teknik & Komputer','https://ftk.unhar.ac.id/'],['Hukum','https://fh.unhar.ac.id/']].map(([lbl,url]) => (
                        <a key={lbl} className="lnd-mega-item" href={url} target="_blank" rel="noreferrer" onClick={() => setAkademikOpen(false)}>{lbl}</a>
                      ))}
                    </div>
                    <div className="lnd-mega-slim-col">
                      <p className="lnd-mega-col-title">LAYANAN</p>
                      {['Akreditasi','Kalender Akademik','Biaya Pendidikan','Beasiswa','Prestasi Mahasiswa','Peraturan Akademik'].map(lbl => (
                        <button key={lbl} className="lnd-mega-item lnd-mega-item--disabled" disabled>{lbl}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Berita dan Pengumuman Dropdown ── */}
            <div className="lnd-mega-wrap"
              onMouseEnter={() => { clearTimeout(beritaDropTimer.current); setBeritaDropOpen(true) }}
              onMouseLeave={() => { beritaDropTimer.current = setTimeout(() => setBeritaDropOpen(false), 160) }}>
              <button className={`lnd-nav-link lnd-nav-link--mega ${beritaDropOpen ? 'lnd-nav-link--active' : ''}`}
                onClick={() => setBeritaDropOpen(v => !v)}>
                Berita dan Pengumuman
                <svg className="lnd-mega-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {beritaDropOpen && (
                <div className="lnd-mega-panel lnd-mega-panel--slim">
                  <div className="lnd-mega-slim-inner lnd-mega-slim-inner--single">
                    <div className="lnd-mega-slim-col">
                      {[['Berita', beritaRef],['Pengumuman', beritaRef],['Agenda', beritaRef],['Event Universitas', beritaRef]].map(([lbl, ref]) => (
                        <button key={lbl} className="lnd-mega-item" onClick={() => { setBeritaDropOpen(false); scrollTo(ref) }}>{lbl}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Kelembagaan Dropdown ── */}
            <div className="lnd-mega-wrap"
              onMouseEnter={() => { clearTimeout(kelembagaanTimer.current); setKelembagaanOpen(true) }}
              onMouseLeave={() => { kelembagaanTimer.current = setTimeout(() => setKelembagaanOpen(false), 160) }}>
              <button className={`lnd-nav-link lnd-nav-link--mega ${kelembagaanOpen ? 'lnd-nav-link--active' : ''}`}
                onClick={() => setKelembagaanOpen(v => !v)}>
                Kelembagaan
                <svg className="lnd-mega-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {kelembagaanOpen && (
                <div className="lnd-mega-panel lnd-mega-panel--slim">
                  <div className="lnd-mega-slim-inner lnd-mega-slim-inner--single">
                    <div className="lnd-mega-slim-col">
                      {['Penjaminan Mutu & Pengawasan Internal','Penelitian dan Pengabdian','Pengembangan dan Kerjasama','Pusat Karir & Hubungan Alumni','Inkubator Bisnis'].map(lbl => (
                        <button key={lbl} className="lnd-mega-item lnd-mega-item--disabled" disabled>{lbl}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Informasi Dropdown ── */}
            <div className="lnd-mega-wrap"
              onMouseEnter={() => { clearTimeout(informasiTimer.current); setInformasiOpen(true) }}
              onMouseLeave={() => { informasiTimer.current = setTimeout(() => setInformasiOpen(false), 160) }}>
              <button className={`lnd-nav-link lnd-nav-link--mega ${informasiOpen ? 'lnd-nav-link--active' : ''}`}
                onClick={() => setInformasiOpen(v => !v)}>
                Informasi
                <svg className="lnd-mega-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {informasiOpen && (
                <div className="lnd-mega-panel lnd-mega-panel--slim">
                  <div className="lnd-mega-slim-inner lnd-mega-slim-inner--single">
                    <div className="lnd-mega-slim-col">
                      {['Brosur PMB','Informasi Penerimaan Mahasiswa Baru','Sistem Informasi Akademik Dosen','Sistem Informasi Akademik Mhs','Informasi Lowongan Kerja','Kontak'].map((lbl, i) => (
                        i < 2
                          ? <button key={lbl} className="lnd-mega-item" onClick={() => { setInformasiOpen(false); scrollTo(akademikRef) }}>{lbl}</button>
                          : <button key={lbl} className="lnd-mega-item lnd-mega-item--disabled" disabled>{lbl}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </nav>

          <div className="lnd-nav-actions">
            <button className="lnd-btn-pmb" onClick={() => navigate('/login')}>PMB</button>
            <button className="lnd-nav-hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
              <Icon name={menuOpen ? 'x' : 'menu'} size={22} />
            </button>
          </div>
        </div>

        {/* ── Mobile menu ── */}
        {menuOpen && (
          <div className="lnd-mobile-menu">
            <button className="lnd-mobile-link" onClick={() => scrollTo(heroRef)}>Home</button>

            <div className="lnd-mobile-acc">
              <button className="lnd-mobile-link lnd-mobile-link--acc"
                onClick={() => setTentangOpen(v => !v)}>
                Tentang Kami
                <svg className={`lnd-mob-chev ${tentangOpen ? 'open' : ''}`} width="14" height="14"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {tentangOpen && (
                <div className="lnd-mobile-sub">
                  {[
                    ['Sambutan Rektor',       'sambutan-rektor'],
                    ['Sejarah',               'sejarah'],
                    ['Lambang & Filosofi',    'lambang-filosofi'],
                    ['Visi, Misi dan Tujuan', 'visi-misi'],
                    ['Catur Prasetya',        'catur-prasetya'],
                    ['Mars',                  'mars'],
                  ].map(([lbl, slug]) => (
                    <button key={slug} className="lnd-mobile-sub-link"
                      onClick={() => { setMenuOpen(false); setTentangOpen(false); navigate(`/tentang/${slug}`) }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Akademik accordion */}
            <div className="lnd-mobile-acc">
              <button className="lnd-mobile-link lnd-mobile-link--acc" onClick={() => setAkademikOpen(v => !v)}>
                Akademik
                <svg className={`lnd-mob-chev ${akademikOpen?'open':''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {akademikOpen && (
                <div className="lnd-mobile-sub">
                  {[['Bahasa & Komunikasi','https://fbk.unhar.ac.id/'],['Ekonomi Bisnis','https://feb.unhar.ac.id/'],['Teknik & Komputer','https://ftk.unhar.ac.id/'],['Hukum','https://fh.unhar.ac.id/']].map(([lbl,url]) => (
                    <a key={lbl} className="lnd-mobile-sub-link" href={url} target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)}>{lbl}</a>
                  ))}
                  {['Akreditasi','Kalender Akademik','Biaya Pendidikan','Beasiswa'].map(lbl => (
                    <button key={lbl} className="lnd-mobile-sub-link lnd-mobile-sub-link--dis" disabled>{lbl}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Berita dan Pengumuman accordion */}
            <div className="lnd-mobile-acc">
              <button className="lnd-mobile-link lnd-mobile-link--acc" onClick={() => setBeritaDropOpen(v => !v)}>
                Berita dan Pengumuman
                <svg className={`lnd-mob-chev ${beritaDropOpen?'open':''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {beritaDropOpen && (
                <div className="lnd-mobile-sub">
                  {['Berita','Pengumuman','Agenda','Event Universitas'].map(lbl => (
                    <button key={lbl} className="lnd-mobile-sub-link" onClick={() => { setMenuOpen(false); scrollTo(beritaRef) }}>{lbl}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Kelembagaan accordion */}
            <div className="lnd-mobile-acc">
              <button className="lnd-mobile-link lnd-mobile-link--acc" onClick={() => setKelembagaanOpen(v => !v)}>
                Kelembagaan
                <svg className={`lnd-mob-chev ${kelembagaanOpen?'open':''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {kelembagaanOpen && (
                <div className="lnd-mobile-sub">
                  {['Penjaminan Mutu & Pengawasan Internal','Penelitian dan Pengabdian','Pengembangan dan Kerjasama','Pusat Karir & Hubungan Alumni','Inkubator Bisnis'].map(lbl => (
                    <button key={lbl} className="lnd-mobile-sub-link lnd-mobile-sub-link--dis" disabled>{lbl}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Informasi accordion */}
            <div className="lnd-mobile-acc">
              <button className="lnd-mobile-link lnd-mobile-link--acc" onClick={() => setInformasiOpen(v => !v)}>
                Informasi
                <svg className={`lnd-mob-chev ${informasiOpen?'open':''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {informasiOpen && (
                <div className="lnd-mobile-sub">
                  {['Brosur PMB','Informasi PMB'].map(lbl => (
                    <button key={lbl} className="lnd-mobile-sub-link" onClick={() => { setMenuOpen(false); scrollTo(akademikRef) }}>{lbl}</button>
                  ))}
                  {['SIAUNHAR Dosen','SIAUNHAR Mahasiswa','Lowongan Kerja','Kontak'].map(lbl => (
                    <button key={lbl} className="lnd-mobile-sub-link lnd-mobile-sub-link--dis" disabled>{lbl}</button>
                  ))}
                </div>
              )}
            </div>
            <button className="lnd-mobile-pmb" onClick={() => { setMenuOpen(false); navigate('/login') }}>
              PMB 2026/2027
            </button>
          </div>
        )}
      </header>

      {/* ══ HERO SLIDER ══ */}
      <section className="lnd-hero" ref={heroRef}>
        {SLIDES.map((s, i) => (
          <div key={i} className={`lnd-hero-slide ${i === slide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${s.img})` }}>
            <div className="lnd-hero-overlay" />
          </div>
        ))}
        <div className="lnd-hero-content">
          <span className="lnd-hero-tag">{SLIDES[slide].tag}</span>
          <h1 className="lnd-hero-title">{SLIDES[slide].title}</h1>
          <p className="lnd-hero-sub">{SLIDES[slide].sub}</p>
          <div className="lnd-hero-btns">
            <button className="lnd-hero-btn lnd-hero-btn--primary" onClick={() => navigate('/login')}>
              <Icon name="login" size={18} /> Masuk Portal
            </button>
            <a className="lnd-hero-btn lnd-hero-btn--secondary" href="https://pmb.harapan.ac.id/" target="_blank" rel="noreferrer">
              DAFTAR SEKARANG →
            </a>
          </div>
        </div>
        <div className="lnd-hero-dots">
          {SLIDES.map((_, i) => (
            <button key={i} className={`lnd-hero-dot ${i === slide ? 'active' : ''}`}
              onClick={() => setSlide(i)} />
          ))}
        </div>
      </section>

      {/* ══ STATS — Universitas dalam Angka ══ */}
      <section className="lnd-stats-bar" ref={statsRef}>
        <div className="lnd-stats-inner">
          <p className="lnd-stats-heading">Universitas Harapan Medan dalam Angka</p>
          <div className="lnd-stats-row">
            {STATS.map(({ val, lbl }) => (
              <div key={lbl} className="lnd-stat-item">
                <p className={`lnd-stat-val ${counted ? "counted" : ""}`}>{val}</p>
                <p className="lnd-stat-lbl">{lbl}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ BERITA UNHAR ══ */}
      <section className="lnd-section" ref={beritaRef}>
        <div className="lnd-section-inner">
          <div className="lnd-section-hdr reveal">
            <h2 className="lnd-section-title">Berita UNHAR</h2>
          </div>

          <div className="lnd-news-layout">
            {/* Kiri — grid berita */}
            <div className="lnd-news-grid reveal">
              {BERITA.map((b, i) => (
                <article key={b.id} className={`lnd-news-card ${i === 0 ? 'lnd-news-card--featured' : ''}`}>
                  <div className="lnd-news-img-wrap">
                    <img src={b.foto} alt={b.judul} className="lnd-news-img" loading="lazy" />
                    <span className="lnd-news-badge">{b.kategori}</span>
                  </div>
                  <div className="lnd-news-body">
                    <p className="lnd-news-date">{b.tgl}</p>
                    <h3 className="lnd-news-title">{b.judul}</h3>
                    <button className="lnd-news-readmore">Baca Selengkapnya <Icon name="arrow" size={13}/></button>
                  </div>
                </article>
              ))}
            </div>

            {/* Kanan — Pengumuman + Agenda */}
            <div className="lnd-sidebar reveal reveal--right">

              <div className="lnd-sidebar-block">
                <h3 className="lnd-sidebar-title">Pengumuman</h3>
                <div className="lnd-sidebar-list">
                  {PENGUMUMAN.map((p, i) => (
                    <div key={i} className="lnd-sidebar-item">
                      <div className="lnd-sidebar-date">
                        <span className="lnd-sidebar-day">{p.tgl}</span>
                        <span className="lnd-sidebar-month">{p.bln}</span>
                      </div>
                      <div className="lnd-sidebar-text">
                        <span className="lnd-sidebar-cat">{p.kategori}</span>
                        <p className="lnd-sidebar-judul">{p.judul}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lnd-sidebar-block">
                <h3 className="lnd-sidebar-title">Agenda</h3>
                <div className="lnd-sidebar-list">
                  {AGENDA.map((a, i) => (
                    <div key={i} className="lnd-sidebar-item">
                      <div className="lnd-sidebar-date">
                        <span className="lnd-sidebar-day">{a.tgl}</span>
                        <span className="lnd-sidebar-month">{a.bln}</span>
                      </div>
                      <div className="lnd-sidebar-text">
                        <span className="lnd-sidebar-cat">{a.kategori}</span>
                        <p className="lnd-sidebar-judul">{a.judul}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ══ LAYANAN DIGITAL ══ */}
      <section className="lnd-section lnd-section--green" ref={akademikRef}>
        <div className="lnd-section-inner">
          <div className="lnd-section-hdr">
            <h2 className="lnd-section-title lnd-title--light">Informasi Pendaftaran Mahasiswa Baru</h2>
            <p className="lnd-section-sub lnd-sub--light">TA. 2026/2027 — Universitas Harapan Medan</p>
            <a href="https://pmb.harapan.ac.id/" target="_blank" rel="noreferrer" className="lnd-pmb-link">
              pmb.harapan.ac.id →
            </a>
          </div>
          <div className="lnd-layanan-grid reveal">
            {LAYANAN.map(l => (
              <button key={l.label} className="lnd-layanan-card"
                onClick={() => l.href === '/login' ? navigate('/login') : null}>
                <div className="lnd-layanan-icon" style={{ background: l.color }}>
                  <Icon name={l.icon} size={30} />
                </div>
                <h4 className="lnd-layanan-label">{l.label}</h4>
                <p className="lnd-layanan-desc">{l.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TENTANG KAMI — Galeri Kartu ══ */}
      <section className="lnd-section" ref={tentangRef}>
        <div className="lnd-section-inner">
          <div className="lnd-section-hdr">
            <h2 className="lnd-section-title">Tentang Kami</h2>
            <p className="lnd-section-sub">Kenali lebih dekat Universitas Harapan Medan</p>
          </div>
          <div className="lnd-tentang-grid reveal">
            {[
              { slug: 'sambutan-rektor',  icon: 'users',    judul: 'Sambutan Rektor',    desc: 'Pesan dan harapan pimpinan universitas.',                 img: '/img/unhar1.jpeg', color: '#5D8736' },
              { slug: 'sejarah',          icon: 'book',     judul: 'Sejarah',            desc: 'Perjalanan UNHAR sejak didirikan hingga kini.',           img: '/img/unhar2.jpeg', color: '#31511E' },
              { slug: 'lambang-filosofi', icon: 'award',    judul: 'Lambang & Filosofi', desc: 'Makna identitas visual universitas.',                     img: '/img/unhar3.jpeg', color: '#859F3D' },
              { slug: 'visi-misi',        icon: 'building', judul: 'Visi, Misi & Tujuan', desc: 'Arah dan cita-cita pendidikan berkualitas.',            img: '/img/unhar4.jpeg', color: '#5D8736' },
              { slug: 'catur-prasetya',   icon: 'award',    judul: 'Catur Prasetya',     desc: 'Empat komitmen mahasiswa UNHAR.',                        img: '/img/unhar1.jpeg', color: '#31511E' },
              { slug: 'mars',             icon: 'music',    judul: 'Mars UNHAR',         desc: 'Hymne kebanggaan civitas akademika.',                    img: '/img/unhar2.jpeg', color: '#859F3D' },
            ].map(item => (
              <div key={item.slug} className="lnd-tentang-card"
                onClick={() => navigate(`/tentang/${item.slug}`)}
                role="button" tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(`/tentang/${item.slug}`)}>
                <div className="lnd-tentang-img-wrap">
                  <img src={item.img} alt={item.judul} className="lnd-tentang-img" loading="lazy" />
                  <div className="lnd-tentang-overlay" />
                  <div className="lnd-tentang-icon-badge" style={{ background: item.color }}>
                    <Icon name={item.icon} size={20} />
                  </div>
                </div>
                <div className="lnd-tentang-body">
                  <h3 className="lnd-tentang-title">{item.judul}</h3>
                  <p className="lnd-tentang-desc">{item.desc}</p>
                  <span className="lnd-tentang-cta">Selengkapnya <Icon name="arrow" size={13} /></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WHY CHOOSE UNHAR ══ */}
      <section className="lnd-section lnd-section--alt">
        <div className="lnd-section-inner">
          <div className="lnd-section-hdr">
            <span className="lnd-section-tag">Keunggulan</span>
            <h2 className="lnd-section-title">Why Choose UnHar Medan</h2>
            <p className="lnd-section-sub">Berkarakter, Berilmu, Berkarya</p>
          </div>
          <div className="lnd-why-grid reveal">
            {KEUNGGULAN.map((k, i) => (
              <div key={i} className="lnd-why-card">
                <div className="lnd-why-no">{String(i + 1).padStart(2, '0')}</div>
                <div className="lnd-why-icon"><Icon name={k.icon} size={26} /></div>
                <h4 className="lnd-why-judul">{k.judul}</h4>
                <p className="lnd-why-isi">{k.isi}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ KERJASAMA ══ */}
      <section className="lnd-section lnd-section--mitra" ref={kelembagaanRef}>
        <div className="lnd-section-inner">
          <div className="lnd-section-hdr">
            <h2 className="lnd-section-title">Kerjasama UNHAR Medan</h2>
          </div>
          <div className="lnd-mitra-track-wrap">
            <div className="lnd-mitra-track">
              {[...MITRA, ...MITRA].map((m, i) => (
                <div key={i} className="lnd-mitra-logo">
                  <img src="/logo-unhar.png" alt={m} />
                  <span>{m}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ KONTAK ══ */}
      <section className="lnd-section lnd-section--dark" ref={informasiRef}>
        <div className="lnd-section-inner">
          <div className="lnd-kontak-layout reveal">
            <div className="lnd-kontak-kiri">
              <img src="/logo-unhar.png" alt="UNHAR" className="lnd-kontak-logo" />
              <h3 className="lnd-kontak-nama">Universitas Harapan Medan</h3>
              <p className="lnd-kontak-tagline">Berkarakter, Berilmu, Berkarya</p>
              <div className="lnd-kontak-socials">
                <a href="https://www.instagram.com/universitasharapanmedan/" target="_blank" rel="noreferrer"><Icon name="instagram" size={18}/></a>
                <a href="https://www.facebook.com/universitasharapanmedan/" target="_blank" rel="noreferrer"><Icon name="facebook" size={18}/></a>
                <a href="https://www.youtube.com/channel/UCuN3Ws0Fr1o1TzI-BGT3e1Q" target="_blank" rel="noreferrer"><Icon name="youtube" size={18}/></a>
              </div>
            </div>
            <div className="lnd-kontak-kanan">
              <div className="lnd-kontak-item">
                <Icon name="map" size={18} />
                <p>Jl. Imam Bonjol No.35, Medan, Sumatera Utara 20152</p>
              </div>
              <div className="lnd-kontak-item">
                <Icon name="phone" size={18} />
                <p>(061) 4158823</p>
              </div>
              <div className="lnd-kontak-item">
                <Icon name="mail" size={18} />
                <a href="mailto:admin@unhar.ac.id">admin@unhar.ac.id</a>
              </div>
              <button className="lnd-kontak-portal-btn" onClick={() => navigate('/login')}>
                <Icon name="login" size={16} /> Masuk Portal Akademik
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══ STATISTIK PENGUNJUNG ══ */}
      <section className="lnd-section lnd-visitor-section">
        <div className="lnd-section-inner">
          <div className="lnd-section-hdr reveal">
            <span className="lnd-section-tag">Real-time</span>
            <h2 className="lnd-section-title">Statistik Pengunjung Portal</h2>
            <p className="lnd-section-sub">Data kunjungan dan pengguna aktif Portal Akademik UNHAR Medan</p>
          </div>
          <div className="lnd-visitor-grid reveal">
            {[
              { icon: 'users',    label: 'Online Sekarang',   val: siteStats?.online_sekarang   ?? '–', sub: 'pengguna aktif', color: '#5D8736', pulse: true },
              { icon: 'activity', label: 'Kunjungan Hari Ini', val: siteStats?.kunjungan_hari_ini  ?? '–', sub: 'sesi hari ini',   color: '#31511E', pulse: false },
              { icon: 'calendar', label: 'Kunjungan Bulan Ini', val: siteStats?.kunjungan_bulan_ini ?? '–', sub: 'sesi bulan ini',  color: '#859F3D', pulse: false },
              { icon: 'globe',    label: 'Total Kunjungan',    val: siteStats?.kunjungan_total     ?? '–', sub: 'sepanjang masa',  color: '#5D8736', pulse: false },
            ].map(item => (
              <div key={item.label} className="lnd-visitor-card">
                <div className="lnd-visitor-icon-wrap" style={{ background: item.color }}>
                  <Icon name={item.icon} size={24} />
                  {item.pulse && <span className="lnd-visitor-pulse"/>}
                </div>
                <div className="lnd-visitor-body">
                  <p className="lnd-visitor-val">{item.val.toLocaleString?.() ?? item.val}</p>
                  <p className="lnd-visitor-label">{item.label}</p>
                  <p className="lnd-visitor-sub">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Breakdown mahasiswa vs dosen online */}
          {siteStats && (
            <div className="lnd-visitor-breakdown reveal">
              <div className="lnd-vb-item">
                <span className="lnd-vb-dot lnd-vb-dot--mhs"/>
                <span className="lnd-vb-label">Mahasiswa online</span>
                <span className="lnd-vb-val">{siteStats.online_mahasiswa ?? 0}</span>
              </div>
              <div className="lnd-vb-sep"/>
              <div className="lnd-vb-item">
                <span className="lnd-vb-dot lnd-vb-dot--dosen"/>
                <span className="lnd-vb-label">Dosen online</span>
                <span className="lnd-vb-val">{siteStats.online_dosen ?? 0}</span>
              </div>
              <div className="lnd-vb-sep"/>
              <div className="lnd-vb-item">
                <span className="lnd-vb-dot lnd-vb-dot--mhs" style={{background:'#f5a623'}}/>
                <span className="lnd-vb-label">Total Mahasiswa</span>
                <span className="lnd-vb-val">{siteStats.total_mahasiswa ?? 0}</span>
              </div>
              <div className="lnd-vb-sep"/>
              <div className="lnd-vb-item">
                <span className="lnd-vb-dot lnd-vb-dot--dosen" style={{background:'#859F3D'}}/>
                <span className="lnd-vb-label">Total Dosen</span>
                <span className="lnd-vb-val">{siteStats.total_dosen ?? 0}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="lnd-footer">
        <div className="lnd-footer-inner">
          <p className="lnd-footer-copy">© 2026 Universitas Harapan Medan — Portal Akademik. Hak cipta dilindungi.</p>
          <div className="lnd-footer-links">
            <button onClick={() => scrollTo(heroRef)}>Beranda</button>
            <button onClick={() => scrollTo(tentangRef)}>Tentang Kami</button>
            <button onClick={() => scrollTo(beritaRef)}>Berita</button>
            <button onClick={() => navigate('/login')}>Masuk Portal</button>
          </div>
        </div>
      </footer>

    </div>
  )
}
