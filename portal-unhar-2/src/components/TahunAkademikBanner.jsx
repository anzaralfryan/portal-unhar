/**
 * TahunAkademikBanner
 * Komponen banner "Tahun Ajaran Aktif" yang tampil di dashboard
 * mahasiswa, dosen, dan admin.
 *
 * Props:
 *   role: 'mahasiswa' | 'dosen' | 'admin'
 */
import { useState, useEffect } from 'react'
import api from '../services/api'
import './TahunAkademikBanner.css'

export default function TahunAkademikBanner({ role = 'mahasiswa' }) {
  const [tahun,   setTahun]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/${role}/tahun-aktif`)
      .then(r => setTahun(r.data?.data || null))
      .catch(() => setTahun(null))
      .finally(() => setLoading(false))
  }, [role])

  if (loading) return null  // silent load — tidak tampil skeleton
  if (!tahun)  return null  // tidak ada tahun aktif — tidak tampil

  const semesterColor = tahun.semester === 'Ganjil'
    ? { bg: 'linear-gradient(90deg,#31511E,#5D8736)', badge: '#A9C46C' }
    : { bg: 'linear-gradient(90deg,#1e3a5f,#2563eb)', badge: '#93c5fd' }

  return (
    <div className="ta-banner" style={{ background: semesterColor.bg }}>
      <div className="ta-banner-left">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.85)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
        <span className="ta-banner-lbl">Tahun Ajaran Aktif</span>
      </div>
      <div className="ta-banner-right">
        <span className="ta-banner-badge" style={{ background: semesterColor.badge }}>
          {tahun.semester}
        </span>
        <span className="ta-banner-label">{tahun.label}</span>
      </div>
    </div>
  )
}
