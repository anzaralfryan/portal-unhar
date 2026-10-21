import { useState } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import { useFetch } from '../../hooks/useFetch'
import { adminService, semesterService } from '../../services/services'
import { getErrorMessage } from '../../services/api'

function Badge({ s }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
      background: s === 'lunas' ? '#dcfce7' : s === 'belum' ? '#fee2e2' : '#fef3c7',
      color:      s === 'lunas' ? '#166534' : s === 'belum' ? '#991b1b' : '#92400e',
    }}>{s}</span>
  )
}

export default function SemesterPage() {
  const { data: tahunList } = useFetch(() => adminService.getTahun(), [])
  const tahunArr = Array.isArray(tahunList) ? tahunList : (tahunList?.data || [])

  const [selectedTahunId, setSelectedTahunId] = useState('')
  const [preview,   setPreview]   = useState(null)
  const [result,    setResult]    = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [toast,     setToast]     = useState(null)
  const [toastErr,  setToastErr]  = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  function showToast(msg, err = false) {
    setToast(msg); setToastErr(err)
    setTimeout(() => setToast(null), 4500)
  }

  async function handlePreview() {
    if (!selectedTahunId) { showToast('Pilih tahun akademik terlebih dahulu.', true); return }
    setLoading(true); setPreview(null); setResult(null); setConfirmed(false)
    try {
      const res = await semesterService.preview(selectedTahunId)
      setPreview(res.data?.data || null)
    } catch (e) {
      showToast(getErrorMessage(e), true)
    } finally {
      setLoading(false)
    }
  }

  async function handleEksekusi() {
    if (!confirmed) { showToast('Centang konfirmasi terlebih dahulu.', true); return }
    setLoading(true)
    try {
      const res = await semesterService.naikkan(selectedTahunId)
      setResult(res.data?.data || null)
      setPreview(null)
      showToast(`✅ ${res.data?.message || 'Semester berhasil dinaikkan.'}`)
    } catch (e) {
      showToast(getErrorMessage(e), true)
    } finally {
      setLoading(false)
    }
  }

  const selectedTahun = tahunArr.find(t => String(t.id) === String(selectedTahunId))

  return (
    <div className="page-single">
      <PageHeader title="Kenaikan Semester" subtitle="Naikkan semester mahasiswa berdasarkan hasil nilai" />
      <div className="content-body">

        {toast && (
          <div style={{
            background: toastErr ? '#991b1b' : '#059669',
            color: '#fff', padding: '10px 16px', borderRadius: 9,
            fontSize: 13, fontWeight: 600, marginBottom: 14,
          }}>{toast}</div>
        )}

        {/* ── Form Pilih Tahun ── */}
        <div className="card" style={{ padding: '20px 24px', marginBottom: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
            1. Pilih tahun akademik yang sudah selesai (semua nilai sudah diinput dosen)
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={selectedTahunId}
              onChange={e => { setSelectedTahunId(e.target.value); setPreview(null); setResult(null) }}
              style={{
                padding: '9px 14px', borderRadius: 9, border: '1.5px solid var(--border)',
                fontSize: 13, color: 'var(--text)', background: 'var(--card)', flex: 1, minWidth: 220,
              }}>
              <option value="">— Pilih Tahun Akademik —</option>
              {tahunArr.map(t => (
                <option key={t.id} value={t.id}>
                  {t.label || `${t.semester} ${t.tahun}`} {t.is_aktif ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
            <button
              onClick={handlePreview}
              disabled={loading || !selectedTahunId}
              style={{
                padding: '9px 20px', borderRadius: 9, border: 'none',
                background: selectedTahunId ? 'var(--primary)' : '#d1d5db',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                opacity: loading ? 0.7 : 1, flexShrink: 0,
              }}>
              {loading ? 'Memproses...' : '🔍 Preview Kenaikan'}
            </button>
          </div>
          <div style={{
            marginTop: 12, padding: '10px 14px', background: '#fef3c7',
            borderRadius: 8, fontSize: 12.5, color: '#78350f', lineHeight: 1.6,
          }}>
            <strong>Logika kenaikan:</strong> Mahasiswa naik semester jika semua nilai ≥ D (angka ≥ 40).
            Mahasiswa dengan nilai E pada salah satu matkul <strong>tidak naik</strong> tapi tetap bisa ambil
            matkul remedial di KRS semester berikutnya.
          </div>
        </div>

        {/* ── Preview ── */}
        {preview && !result && (
          <div className="card" style={{ marginTop: 16, padding: '20px 24px' }}>
            <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
              2. Preview Kenaikan Semester — {preview.tahun_akademik}
            </p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ background: '#dcfce7', padding: '8px 16px', borderRadius: 9 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: '#166534' }}>{preview.total_naik}</span>
                <p style={{ fontSize: 11, color: '#166534', fontWeight: 700, margin: 0 }}>Mahasiswa Naik</p>
              </div>
              <div style={{ background: '#fee2e2', padding: '8px 16px', borderRadius: 9 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: '#991b1b' }}>{preview.total_tetap}</span>
                <p style={{ fontSize: 11, color: '#991b1b', fontWeight: 700, margin: 0 }}>Tidak Naik / Belum Ada Nilai</p>
              </div>
            </div>

            {/* Tabel mahasiswa naik */}
            {preview.naik?.length > 0 && (
              <>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: '#166534', marginBottom: 6 }}>
                  ✅ Akan Naik Semester ({preview.naik.length})
                </p>
                <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 14 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)', fontWeight: 700, fontSize: 11 }}>
                        <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>NIM</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Nama</th>
                        <th style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Semester</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.naik.map((m, i) => (
                        <tr key={m.id} style={{ background: i % 2 ? 'var(--bg)' : 'var(--card)' }}>
                          <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace' }}>{m.nim}</td>
                          <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>{m.nama}</td>
                          <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                            <span style={{ color: '#6b7280' }}>Sem {m.semester_lama}</span>
                            <span style={{ margin: '0 6px', color: 'var(--primary)', fontWeight: 700 }}>→</span>
                            <span style={{ color: '#059669', fontWeight: 700 }}>Sem {m.semester_baru}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Tabel mahasiswa tidak naik */}
            {preview.tetap?.filter(m => m.matkul_gagal).length > 0 && (
              <>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>
                  ❌ Tidak Naik — Ada Nilai E ({preview.tetap.filter(m => m.matkul_gagal).length})
                </p>
                <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 14 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)', fontWeight: 700, fontSize: 11 }}>
                        <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>NIM</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Nama</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Matkul Gagal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.tetap.filter(m => m.matkul_gagal).map((m, i) => (
                        <tr key={m.id} style={{ background: i % 2 ? 'var(--bg)' : 'var(--card)' }}>
                          <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace' }}>{m.nim}</td>
                          <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>{m.nama}</td>
                          <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', color: '#991b1b', fontSize: 11.5 }}>
                            {m.matkul_gagal?.map(mk => `${mk.nama} (${mk.nilai})`).join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Konfirmasi & Eksekusi */}
            <div style={{
              background: '#fef3c7', borderRadius: 9, padding: '12px 16px',
              border: '1.5px solid #fbbf24', marginBottom: 14,
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={confirmed}
                  onChange={e => setConfirmed(e.target.checked)}
                  style={{ marginTop: 2, width: 15, height: 15, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: '#78350f', fontWeight: 600, lineHeight: 1.5 }}>
                  Saya memahami bahwa tindakan ini akan mengubah semester {preview.total_naik} mahasiswa
                  secara permanen dan mengirimkan notifikasi ke setiap mahasiswa.
                  Pastikan semua nilai sudah diinput dengan benar sebelum melanjutkan.
                </span>
              </label>
            </div>

            <button
              onClick={handleEksekusi}
              disabled={loading || !confirmed}
              style={{
                padding: '11px 24px', borderRadius: 10, border: 'none',
                background: confirmed ? '#059669' : '#d1d5db',
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: confirmed ? 'pointer' : 'not-allowed',
                opacity: loading ? 0.7 : 1,
              }}>
              {loading ? '⏳ Memproses...' : `🎓 Naikkan ${preview.total_naik} Mahasiswa Sekarang`}
            </button>
          </div>
        )}

        {/* ── Hasil Eksekusi ── */}
        {result && (
          <div className="card" style={{ marginTop: 16, padding: '20px 24px' }}>
            <div style={{
              background: '#dcfce7', borderRadius: 10, padding: '14px 18px', marginBottom: 14,
            }}>
              <p style={{ fontWeight: 800, fontSize: 15, color: '#166534', marginBottom: 4 }}>
                ✅ Kenaikan Semester Berhasil Diterapkan
              </p>
              <p style={{ fontSize: 13, color: '#166534' }}>
                {result.total_naik} mahasiswa berhasil naik semester.
                {result.total_tetap > 0 && ` ${result.total_tetap} mahasiswa tidak naik karena ada nilai E.`}
                Notifikasi telah dikirim ke setiap mahasiswa.
              </p>
            </div>
            <button
              onClick={() => { setResult(null); setSelectedTahunId(''); setConfirmed(false) }}
              style={{
                padding: '9px 18px', borderRadius: 9, border: '1.5px solid var(--border)',
                background: 'var(--card)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
              Kembali
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
