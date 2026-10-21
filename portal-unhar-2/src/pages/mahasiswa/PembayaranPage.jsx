import { useState, useEffect, useRef, useCallback } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import { useFetch } from '../../hooks/useFetch'
import { pembayaranService } from '../../services/services'
import { getErrorMessage } from '../../services/api'
import './PembayaranPage.css'

/* ─── Konstanta ─────────────────────────────────────── */
const METODE = [
  { id: 'Transfer Bank',  label: 'Transfer Bank',  desc: 'BNI · BRI · Mandiri · BCA · BSI', icon: '🏦' },
  { id: 'Dompet Digital', label: 'Dompet Digital', desc: 'GoPay · OVO · DANA · ShopeePay',   icon: '📱' },
  { id: 'Minimarket',     label: 'Minimarket',     desc: 'Indomaret · Alfamart',              icon: '🏪' },
]

function formatRp(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID')
}
function pad2(n) { return String(n).padStart(2, '0') }

/* ─── Countdown Timer ────────────────────────────────── */
function CountdownTimer({ deadline, onExpired }) {
  const [sisa, setSisa] = useState(null)

  useEffect(() => {
    if (!deadline) return
    const target = new Date(deadline).getTime()

    function tick() {
      const diff = target - Date.now()
      if (diff <= 0) {
        setSisa(0)
        onExpired?.()
        return
      }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setSisa({ m, s, total: diff })
    }

    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [deadline, onExpired])

  if (sisa === null) return null
  if (sisa === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '14px', borderRadius: 12,
        background: '#fef2f2', border: '2px solid #fca5a5', color: '#991b1b'
      }}>
        <p style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>⏰ Waktu habis!</p>
        <p style={{ fontSize: 12, margin: '4px 0 0', color: '#b91c1c' }}>
          Sesi pembayaran berakhir. Silakan mulai ulang.
        </p>
      </div>
    )
  }

  const pct = Math.min(100, (sisa.total / (15 * 60 * 1000)) * 100)
  const isWarning = sisa.total < 3 * 60 * 1000
  const color = isWarning ? '#dc2626' : '#059669'
  const bg    = isWarning ? '#fef2f2' : '#f0fdf4'
  const border= isWarning ? '#fca5a5' : '#86efac'

  return (
    <div style={{ borderRadius: 12, border: `2px solid ${border}`, background: bg, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontWeight: 700, fontSize: 13, color, margin: 0 }}>
          ⏳ Batas waktu konfirmasi
        </p>
        <span style={{
          fontFamily: 'monospace', fontSize: 22, fontWeight: 900, color,
          letterSpacing: 2, background: 'rgba(0,0,0,0.06)', padding: '4px 10px', borderRadius: 8
        }}>
          {pad2(sisa.m)}:{pad2(sisa.s)}
        </span>
      </div>
      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 99, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99, background: color,
          width: pct + '%', transition: 'width 0.5s linear'
        }}/>
      </div>
      <p style={{ fontSize: 11, color: isWarning ? '#b91c1c' : '#065f46', marginTop: 6, marginBottom: 0 }}>
        {isWarning
          ? '⚠️ Segera klik Konfirmasi Pembayaran!'
          : 'Selesaikan pembayaran lalu klik konfirmasi sebelum waktu habis.'}
      </p>
    </div>
  )
}

/* ─── Modal Pembayaran Aktif (setelah pilih metode) ─── */
function ModalBayarAktif({ tagihan, deadline, metode, onKonfirmasi, onBatal, loading }) {
  const [expired, setExpired] = useState(false)
  const handleExpired = useCallback(() => setExpired(true), [])

  return (
    <div className="pem-modal-overlay" onClick={onBatal}>
      <div className="pem-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="pem-modal-hdr">
          <h3>💳 Pembayaran Berlangsung</h3>
          <button className="pem-modal-close" onClick={onBatal}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="pem-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Info tagihan */}
          <div style={{ background: 'var(--primary-light)', borderRadius: 10, padding: '13px 16px' }}>
            <p style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700, margin: '0 0 2px' }}>
              {tagihan.label}
            </p>
            <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary)', margin: '0 0 2px' }}>
              {formatRp(tagihan.jumlah)}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>
              via {metode}
            </p>
          </div>

          {/* Info rekening tujuan */}
          {(tagihan.va_bank_utama || tagihan.nomor_rekening) && (
            <div style={{ background: '#1e293b', borderRadius: 10, padding: '13px 16px', color: '#f8fafc' }}>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px', fontWeight: 600 }}>
                TRANSFER KE:
              </p>
              {tagihan.va_bank_utama && (
                <p style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, margin: '0 0 2px' }}>
                  {tagihan.va_bank_utama}
                </p>
              )}
              {!tagihan.va_bank_utama && tagihan.nomor_rekening && (
                <p style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, margin: '0 0 2px' }}>
                  {tagihan.nomor_rekening}
                </p>
              )}
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                {tagihan.nama_bank || 'Bank'}{tagihan.atas_nama ? ' · a.n. ' + tagihan.atas_nama : ''}
              </p>
            </div>
          )}

          {/* Countdown */}
          <CountdownTimer deadline={deadline} onExpired={handleExpired} />

          {/* Instruksi */}
          {!expired && (
            <div style={{ background: '#fffbeb', borderRadius: 10, padding: '11px 14px',
              border: '1.5px solid #fcd34d', fontSize: 12.5, color: '#78350f', lineHeight: 1.6 }}>
              <strong>Langkah:</strong>
              <ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                <li>Buka aplikasi bank / e-wallet Anda</li>
                <li>Transfer ke nomor di atas sebesar <strong>{formatRp(tagihan.jumlah)}</strong></li>
                <li>Kembali ke halaman ini dan klik <strong>Konfirmasi Sudah Bayar</strong></li>
              </ol>
            </div>
          )}
        </div>

        <div className="pem-modal-footer">
          <button className="pem-btn-cancel" onClick={onBatal}>
            Batalkan
          </button>
          <button
            onClick={onKonfirmasi}
            disabled={expired || loading}
            style={{
              padding: '11px 22px', borderRadius: 10, border: 'none',
              background: expired ? '#d1d5db' : '#059669',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: expired ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}>
            {loading ? '⏳ Memproses...' : '✅ Konfirmasi Sudah Bayar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Modal Pilih Metode & Input Nominal ─────────────── */
function ModalPilihMetode({ tagihan, onSubmit, onBatal, loading }) {
  const [metodeIdx,  setMetodeIdx]  = useState(null)
  const [nominal,    setNominal]    = useState('')
  const [err,        setErr]        = useState('')

  const nominalNum = parseFloat(nominal.replace(/[^0-9]/g, '')) || 0
  const kurang     = nominalNum > 0 && nominalNum < tagihan.jumlah

  function handleNominalInput(e) {
    // Format angka saja
    const raw = e.target.value.replace(/[^0-9]/g, '')
    setNominal(raw ? Number(raw).toLocaleString('id-ID') : '')
    setErr('')
  }

  function handleSubmit() {
    if (metodeIdx === null) { setErr('Pilih metode pembayaran terlebih dahulu.'); return }
    if (!nominalNum)        { setErr('Masukkan nominal yang akan dibayarkan.'); return }
    if (nominalNum < tagihan.jumlah) {
      setErr('Nominal kurang dari jumlah tagihan. Pastikan minimal Rp ' +
             Number(tagihan.jumlah).toLocaleString('id-ID') + '.')
      return
    }
    onSubmit({ metode: METODE[metodeIdx].id, nominal_dibayar: nominalNum })
  }

  return (
    <div className="pem-modal-overlay" onClick={onBatal}>
      <div className="pem-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="pem-modal-hdr">
          <h3>Pilih Metode & Nominal</h3>
          <button className="pem-modal-close" onClick={onBatal}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="pem-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Nominal tagihan */}
          <div style={{ textAlign: 'center', padding: '14px', background: 'var(--primary-light)',
            borderRadius: 10, border: '1.5px solid var(--primary)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', margin: '0 0 2px',
              textTransform: 'uppercase', letterSpacing: 1 }}>Jumlah Tagihan</p>
            <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--primary)', margin: 0, letterSpacing: -0.5 }}>
              {formatRp(tagihan.jumlah)}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text3)', margin: '2px 0 0' }}>{tagihan.label}</p>
          </div>

          {/* Input nominal */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)',
              display: 'block', marginBottom: 6 }}>
              Nominal yang Anda Bayarkan <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                fontSize: 13, color: 'var(--text3)', fontWeight: 700 }}>Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={nominal}
                onChange={handleNominalInput}
                placeholder={Number(tagihan.jumlah).toLocaleString('id-ID')}
                style={{
                  width: '100%', padding: '11px 13px 11px 36px',
                  border: `1.5px solid ${kurang ? 'var(--red)' : err && !nominal ? 'var(--red)' : 'var(--border)'}`,
                  borderRadius: 10, fontSize: 16, fontWeight: 700, color: 'var(--text)',
                  outline: 'none', fontFamily: 'var(--font-heading)', boxSizing: 'border-box',
                  background: 'var(--card)',
                }}
              />
            </div>
            {kurang && (
              <p style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 4, fontWeight: 600 }}>
                ⚠ Nominal masih kurang Rp {Number(tagihan.jumlah - nominalNum).toLocaleString('id-ID')}
              </p>
            )}
            {nominalNum >= tagihan.jumlah && nominalNum > 0 && (
              <p style={{ fontSize: 11.5, color: '#059669', marginTop: 4, fontWeight: 600 }}>
                ✓ Nominal mencukupi
              </p>
            )}
          </div>

          {/* Pilih metode */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 8 }}>
              Metode Pembayaran <span style={{ color: 'var(--red)' }}>*</span>
            </p>
            {METODE.map((m, i) => (
              <div
                key={i}
                className={`pem-metode-item ${metodeIdx === i ? 'active' : ''}`}
                onClick={() => { setMetodeIdx(i); setErr('') }}>
                <span style={{ fontSize: 20 }}>{m.icon}</span>
                <div className="list-body">
                  <h4>{m.label}</h4>
                  <p>{m.desc}</p>
                </div>
                <div className={`pem-radio ${metodeIdx === i ? 'checked' : ''}`}/>
              </div>
            ))}
          </div>

          {/* Error */}
          {err && (
            <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 9,
              padding: '10px 13px', fontSize: 12.5, color: '#991b1b', fontWeight: 600 }}>
              ⚠ {err}
            </div>
          )}
        </div>

        <div className="pem-modal-footer">
          <button className="pem-btn-cancel" onClick={onBatal}>Batal</button>
          <button
            onClick={handleSubmit}
            disabled={loading || metodeIdx === null || !nominal}
            style={{
              padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: (metodeIdx === null || !nominal) ? '#d1d5db' : 'var(--primary)',
              color: '#fff', fontSize: 13, fontWeight: 700, opacity: loading ? 0.7 : 1,
            }}>
            {loading ? 'Memproses...' : 'Lanjut ke Pembayaran →'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Halaman Utama ──────────────────────────────────── */
export default function PembayaranPage() {
  const { data, loading, error, refetch } = useFetch(() => pembayaranService.get(), [])

  const [step,          setStep]          = useState('idle')  // idle | pilih | bayar | sukses
  const [metodeAktif,   setMetodeAktif]   = useState(null)
  const [deadline,      setDeadline]      = useState(null)
  const [toast,         setToast]         = useState(null)
  const [toastErr,      setToastErr]      = useState(false)
  const [submitting,    setSubmitting]    = useState(false)
  const [copied,        setCopied]        = useState(null)    // key string yg di-copy

  const tagihan = data?.tagihan_aktif
  const riwayat = data?.riwayat || []

  // Jika dari server ada status 'menunggu' (reload saat bayar aktif), pulihkan state
  useEffect(() => {
    if (tagihan?.status === 'menunggu' && tagihan?.deadline_konfirmasi) {
      const dl = new Date(tagihan.deadline_konfirmasi)
      if (dl > new Date()) {
        setDeadline(tagihan.deadline_konfirmasi)
        setMetodeAktif(tagihan.metode)
        setStep('bayar')
      } else {
        // Deadline sudah lewat di server, kembali ke idle
        setStep('idle')
      }
    }
  }, [tagihan])

  function showToast(msg, isErr = false) {
    setToast(msg); setToastErr(isErr)
    setTimeout(() => setToast(null), 4000)
  }
  function copyText(text, key) {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(key); setTimeout(() => setCopied(null), 2000)
  }

  function getCountdownStyle(hari) {
    if (hari <= 0) return { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' }
    if (hari <= 2) return { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' }
    if (hari <= 7) return { bg: '#fff7ed', color: '#c2410c', border: '#fdba74' }
    return { bg: '#f0fdf4', color: '#065f46', border: '#86efac' }
  }

  /* ── Step 1: Mahasiswa submit pilihan metode + nominal ── */
  async function handleMulai({ metode, nominal_dibayar }) {
    setSubmitting(true)
    try {
      const res = await pembayaranService.mulai({
        pembayaran_id:  tagihan.id,
        metode,
        nominal_dibayar,
      })
      const dl = res.data?.data?.deadline_konfirmasi
      setDeadline(dl)
      setMetodeAktif(metode)
      setStep('bayar')
    } catch (err) {
      showToast(getErrorMessage(err), true)
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Step 2: Mahasiswa konfirmasi sudah bayar ── */
  async function handleKonfirmasi() {
    setSubmitting(true)
    try {
      await pembayaranService.konfirmasi({ pembayaran_id: tagihan.id })
      setStep('sukses')
      refetch()
      showToast('✅ Pembayaran berhasil! Status tagihan sudah LUNAS.')
    } catch (err) {
      const msg = getErrorMessage(err)
      showToast(msg, true)
      // Jika deadline habis → server reset ke 'belum', kita kembali ke idle
      if (msg.includes('waktu') || msg.includes('habis') || msg.includes('Belum ada sesi')) {
        setStep('idle'); setDeadline(null); setMetodeAktif(null)
        refetch()
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleBatalBayar() {
    // Hanya close modal — status 'menunggu' di server tetap berjalan sampai deadline
    setStep('idle')
  }

  /* ── Render ── */
  if (loading) {
    return (
      <div className="page-single">
        <PageHeader title="Pembayaran" subtitle="Memuat..."/>
        <div className="content-body" style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
          Memuat data pembayaran...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-single">
        <PageHeader title="Pembayaran" subtitle="Tagihan & riwayat transaksi"/>
        <div className="content-body">
          <div className="card" style={{ padding: 30, textAlign: 'center', color: 'var(--red)' }}>{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-single">
      <PageHeader title="Pembayaran" subtitle="Tagihan & riwayat transaksi"/>
      <div className="content-body">
        {toast && (
          <div style={{
            background: toastErr ? 'var(--red)' : '#059669',
            color: '#fff', padding: '10px 14px', borderRadius: 8, marginBottom: 12,
            fontSize: 13, fontWeight: 600
          }}>{toast}</div>
        )}

        <div className="pem-grid">
          {/* ── Kolom Kiri: Tagihan ── */}
          <div className="pem-col-left">
            {tagihan ? (
              <div className="pem-tagihan-card">
                <div className="pem-tagihan-top">
                  <div>
                    <p className="pem-tagihan-label">Tagihan Aktif</p>
                    <p className="pem-tagihan-nominal">{formatRp(tagihan.jumlah)}</p>
                    <p className="pem-tagihan-desc">{tagihan.label}</p>
                    {tagihan.jatuh_tempo && (
                      <div className="pem-tagihan-due">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        Jatuh tempo: {tagihan.jatuh_tempo}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    {tagihan.status === 'kadaluarsa'
                      ? <span className="badge" style={{ background: '#374151', color: '#fff' }}>Kadaluarsa</span>
                      : tagihan.status === 'menunggu'
                        ? <span className="badge" style={{ background: '#d97706', color: '#fff' }}>Menunggu Konfirmasi</span>
                        : <span className="badge badge-red">Belum Bayar</span>
                    }
                    {tagihan.status === 'belum' && tagihan.sisa_hari !== null && (() => {
                      const cs = getCountdownStyle(tagihan.sisa_hari)
                      return (
                        <div style={{ background: cs.bg, border: `1.5px solid ${cs.border}`, borderRadius: 9,
                          padding: '5px 11px', fontSize: 12, fontWeight: 700, color: cs.color, textAlign: 'center' }}>
                          {tagihan.sisa_hari === 0
                            ? '⚠ Jatuh tempo hari ini!'
                            : tagihan.sisa_hari < 0
                              ? '❌ Sudah lewat jatuh tempo'
                              : `⏳ ${tagihan.sisa_hari} hari lagi`}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Info rekening */}
                {(tagihan.va_bank_utama || tagihan.va_bank_lain || tagihan.nomor_rekening) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {tagihan.va_bank_utama && (
                      <div className="pem-va-box">
                        <div style={{ flex: 1 }}>
                          <p className="pem-va-label">Via {tagihan.nama_bank || 'Bank'} <span style={{ opacity: 0.7, fontSize: 10 }}>(Mobile/ATM/Teller)</span></p>
                          <p className="pem-va-kode">{tagihan.va_bank_utama}</p>
                          {tagihan.atas_nama && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>a.n. {tagihan.atas_nama}</p>}
                        </div>
                        <button className="pem-copy-btn" onClick={() => copyText(tagihan.va_bank_utama, 'va_utama')}>
                          {copied === 'va_utama' ? '✓ Tersalin' : 'Salin'}
                        </button>
                      </div>
                    )}
                    {tagihan.va_bank_lain && (
                      <div className="pem-va-box" style={{ background: 'rgba(255,255,255,0.12)' }}>
                        <div style={{ flex: 1 }}>
                          <p className="pem-va-label">Via Bank Lain <span style={{ opacity: 0.7, fontSize: 10 }}>(transfer antar bank)</span></p>
                          <p className="pem-va-kode">{tagihan.va_bank_lain}</p>
                        </div>
                        <button className="pem-copy-btn" onClick={() => copyText(tagihan.va_bank_lain, 'va_lain')}>
                          {copied === 'va_lain' ? '✓ Tersalin' : 'Salin'}
                        </button>
                      </div>
                    )}
                    {tagihan.nomor_rekening && !tagihan.va_bank_utama && (
                      <div className="pem-va-box">
                        <div style={{ flex: 1 }}>
                          <p className="pem-va-label">{tagihan.nama_bank ? 'Rekening ' + tagihan.nama_bank : 'Nomor Rekening'}</p>
                          <p className="pem-va-kode">{tagihan.nomor_rekening}</p>
                          {tagihan.atas_nama && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>a.n. {tagihan.atas_nama}</p>}
                        </div>
                        <button className="pem-copy-btn" onClick={() => copyText(tagihan.nomor_rekening, 'rek')}>
                          {copied === 'rek' ? '✓ Tersalin' : 'Salin'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pem-va-box" style={{ background: '#fef3c7', border: '1px dashed #d97706', marginBottom: 12 }}>
                    <p className="pem-va-label" style={{ color: '#d97706' }}>⏳ Menunggu rekening dari Admin</p>
                  </div>
                )}

                {/* Tombol aksi berdasarkan status */}
                {tagihan.status === 'belum' && (
                  <button
                    onClick={() => setStep('pilih')}
                    style={{
                      width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                      background: 'rgba(255,255,255,0.18)', color: '#fff',
                      border: '2px solid rgba(255,255,255,0.35)',
                      fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      backdropFilter: 'blur(6px)',
                    }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                    Bayar Sekarang
                  </button>
                )}

                {tagihan.status === 'menunggu' && (
                  <button
                    onClick={() => setStep('bayar')}
                    style={{
                      width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                      background: 'rgba(255,255,255,0.18)', color: '#fff',
                      border: '2px solid rgba(255,255,255,0.5)',
                      fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      backdropFilter: 'blur(6px)',
                    }}>
                    ✅ Konfirmasi Pembayaran
                  </button>
                )}

                {tagihan.status === 'kadaluarsa' && (
                  <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca',
                    borderRadius: 12, padding: '14px 16px' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', margin: '0 0 4px' }}>
                      ❌ Tagihan Kadaluarsa
                    </p>
                    <p style={{ fontSize: 12, color: '#b91c1c', margin: 0, lineHeight: 1.55 }}>
                      Tagihan telah melewati jatuh tempo. Hubungi Admin untuk tagihan baru.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--primary)"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
                  <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                <h3 style={{ fontSize: 15, marginBottom: 8 }}>Tidak ada tagihan aktif</h3>
                <p style={{ fontSize: 13, color: 'var(--text3)', maxWidth: 320, margin: '0 auto' }}>
                  Tagihan baru akan muncul di sini setelah Admin membuat tagihan semester.
                </p>
              </div>
            )}

            {/* Ringkasan */}
            {tagihan && (
              <div className="card" style={{ marginTop: 0 }}>
                <div className="card-title">Ringkasan</div>
                <div className="list-item">
                  <div className="list-body"><h4>Total Tagihan</h4><p>{tagihan.label}</p></div>
                  <div className="list-right"><h4>{formatRp(tagihan.jumlah)}</h4></div>
                </div>
                <div className="list-item" style={{ borderBottom: 'none' }}>
                  <div className="list-body"><h4>Status</h4>
                    <p>{tagihan.status === 'menunggu' ? 'Menunggu konfirmasi mahasiswa' : 'Perlu dikonfirmasi'}</p>
                  </div>
                  <span className="badge" style={{
                    background: tagihan.status === 'menunggu' ? '#d97706' : 'var(--red)',
                    color: '#fff'
                  }}>
                    {tagihan.status === 'menunggu' ? 'Menunggu' : 'Belum Lunas'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Kolom Kanan: Riwayat ── */}
          <div className="pem-col-right">
            <p className="section-title">Riwayat Transaksi</p>
            <div className="card">
              {riwayat.length === 0 ? (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                  Belum ada riwayat pembayaran.
                </div>
              ) : (
                <>
                  <div className="card-title">{riwayat.length} transaksi selesai</div>
                  {riwayat.map((r, i) => (
                    <div key={r.id} className="list-item"
                      style={{ borderBottom: i < riwayat.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div className="pem-riwayat-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                      <div className="list-body">
                        <h4>{r.label}</h4>
                        <p>{r.tanggal_bayar || '–'} · {r.metode || '–'}</p>
                        {r.nominal_dibayar && r.nominal_dibayar !== r.jumlah && (
                          <p style={{ fontSize: 11, color: 'var(--text3)' }}>
                            Dibayar: {formatRp(r.nominal_dibayar)}
                          </p>
                        )}
                      </div>
                      <div className="list-right">
                        <h4 style={{ color: '#059669', fontSize: 13 }}>Lunas</h4>
                        <p style={{ fontSize: 12, color: 'var(--text3)' }}>{formatRp(r.jumlah)}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal Step 1: Pilih Metode + Nominal ── */}
      {step === 'pilih' && tagihan && (
        <ModalPilihMetode
          tagihan={tagihan}
          onSubmit={handleMulai}
          onBatal={() => setStep('idle')}
          loading={submitting}
        />
      )}

      {/* ── Modal Step 2: Countdown + Konfirmasi ── */}
      {step === 'bayar' && tagihan && deadline && (
        <ModalBayarAktif
          tagihan={tagihan}
          deadline={deadline}
          metode={metodeAktif}
          onKonfirmasi={handleKonfirmasi}
          onBatal={handleBatalBayar}
          loading={submitting}
        />
      )}
    </div>
  )
}
