import { useState, useEffect } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import { useFetch, useSubmit } from '../../hooks/useFetch'
import { jadwalServiceDosen, nilaiService } from '../../services/services'
import './NilaiPage.css'

const GC = { A:'#059669','A-':'#059669','B+':'#2563eb',B:'#2563eb','B-':'#d97706','C+':'#d97706',C:'#e53e3e',D:'#991b1b',E:'#991b1b' }
const GB = { A:'#d1fae5','A-':'#d1fae5','B+':'#dbeafe',B:'#dbeafe','B-':'#fef3c7','C+':'#fef3c7',C:'#fee2e2',D:'#fee2e2',E:'#fee2e2' }

const KOMPONEN = [
  { key: 'nilai_uts',       label: 'UTS',       bobot: 0.35 },
  { key: 'nilai_uas',       label: 'UAS',       bobot: 0.40 },
  { key: 'nilai_tugas',     label: 'Tugas',     bobot: 0.15 },
  { key: 'nilai_kehadiran', label: 'Hadir',     bobot: 0.10 },
]

/** Hitung nilai dasar (UTS×35% + UAS×40% + Tugas×15% + Hadir×10%) */
function hitungBase(row) {
  const { nilai_uts, nilai_uas, nilai_tugas, nilai_kehadiran } = row
  if ([nilai_uts, nilai_uas, nilai_tugas, nilai_kehadiran].some(v => v === '' || v === null || v === undefined)) {
    return null
  }
  return KOMPONEN.reduce((sum, k) => sum + (Number(row[k.key]) || 0) * k.bobot, 0)
}

/** Hitung bonus dari nilai kuis — hanya membantu jika rata kuis > base */
function hitungBonus(base, rataKuis, bonusPersen) {
  if (base === null || rataKuis === null || rataKuis === undefined) return 0
  if (!bonusPersen || bonusPersen <= 0) return 0
  if (rataKuis <= base) return 0
  return (rataKuis - base) * (bonusPersen / 100)
}

function angkaKeHuruf(angka) {
  if (angka >= 90) return 'A'
  if (angka >= 85) return 'A-'
  if (angka >= 80) return 'B+'
  if (angka >= 75) return 'B'
  if (angka >= 70) return 'B-'
  if (angka >= 65) return 'C+'
  if (angka >= 60) return 'C'
  if (angka >= 50) return 'D'
  return 'E'
}

export default function NilaiPage() {
  const [selectedJadwal, setSelectedJadwal] = useState(null)
  const [rows,           setRows]           = useState({}) // { mahasiswa_id: { nilai_uts, nilai_uas, nilai_tugas, nilai_kehadiran } }
  const [editedIds,      setEditedIds]      = useState(new Set())
  const [successMsg,     setSuccessMsg]     = useState('')
  const [errMsg,         setErrMsg]         = useState('')
  const [bonusInput,     setBonusInput]     = useState('0')
  const [bonusSaved,     setBonusSaved]     = useState('0')

  // Jadwal dosen
  const { data: jadwalData, loading: loadJadwal } = useFetch(() => jadwalServiceDosen.getAll(), [])
  const jadwalArr = Array.isArray(jadwalData) ? jadwalData : jadwalData?.data || []

  // Nilai per jadwal
  const { data: nilaiData, loading: loadNilai, refetch: refetchNilai } = useFetch(
    () => selectedJadwal ? nilaiService.getByJadwal(selectedJadwal.id) : Promise.resolve({ data: null }),
    [selectedJadwal?.id],
    { immediate: !!selectedJadwal }
  )

  const mahasiswaList = nilaiData?.mahasiswa || []
  const matkulInfo    = nilaiData || {}
  const jumlahKuis    = matkulInfo.jumlah_kuis || 0

  // Sinkronkan state lokal saat data nilai baru dimuat
  useEffect(() => {
    if (!nilaiData) return
    const initRows = {}
    for (const mhs of mahasiswaList) {
      initRows[mhs.mahasiswa_id] = {
        nilai_uts:       mhs.nilai_uts       ?? '',
        nilai_uas:       mhs.nilai_uas       ?? '',
        nilai_tugas:     mhs.nilai_tugas     ?? '',
        nilai_kehadiran: mhs.nilai_kehadiran ?? '',
      }
    }
    setRows(initRows)
    setEditedIds(new Set())
    const bonus = String(nilaiData.bonus_kuis_persen ?? 0)
    setBonusInput(bonus)
    setBonusSaved(bonus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nilaiData])

  // Submit handler — simpan satu mahasiswa
  const { submit: simpanSatu, loading: saving } = useSubmit(
    (payload) => nilaiService.store(payload),
    { onError: (msg) => setErrMsg(msg) }
  )

  // Submit handler — simpan bonus kuis untuk jadwal ini
  const { submit: simpanBonus, loading: savingBonus } = useSubmit(
    () => nilaiService.setBonusKuis(selectedJadwal.id, Number(bonusInput) || 0),
    {
      onSuccess: () => { setBonusSaved(bonusInput); setSuccessMsg('Persentase bonus kuis disimpan.'); setTimeout(() => setSuccessMsg(''), 2500); refetchNilai() },
      onError: (msg) => setErrMsg(msg),
    }
  )

  function handleInput(mhsId, key, value) {
    // Hanya terima angka 0-100 atau kosong
    if (value !== '' && (isNaN(Number(value)) || Number(value) < 0 || Number(value) > 100)) return
    setRows(prev => ({ ...prev, [mhsId]: { ...prev[mhsId], [key]: value } }))
    setEditedIds(prev => new Set(prev).add(mhsId))
  }

  async function handleSaveAll() {
    if (editedIds.size === 0) return
    setErrMsg(''); setSuccessMsg('')
    let okCount = 0
    for (const mhsId of editedIds) {
      const row = rows[mhsId]
      const r = await simpanSatu({
        jadwal_id: selectedJadwal.id,
        mahasiswa_id: Number(mhsId),
        nilai_uts: row.nilai_uts === '' ? null : Number(row.nilai_uts),
        nilai_uas: row.nilai_uas === '' ? null : Number(row.nilai_uas),
        nilai_tugas: row.nilai_tugas === '' ? null : Number(row.nilai_tugas),
        nilai_kehadiran: row.nilai_kehadiran === '' ? null : Number(row.nilai_kehadiran),
      })
      if (r?.success) okCount++
    }
    if (okCount > 0) {
      setSuccessMsg(`${okCount} nilai berhasil disimpan!`)
      setEditedIds(new Set())
      refetchNilai()
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  const hasChanges = editedIds.size > 0
  const bonusPersen = Number(bonusSaved) || 0
  const bonusDirty  = bonusInput !== bonusSaved

  return (
    <div className="page-root">
      {/* Panel: pilih jadwal/matkul */}
      <div className="page-panel">
        <div className="panel-section">
          <p className="panel-label">Mata Kuliah</p>
          {loadJadwal ? (
            [1,2,3].map(i => <div key={i} className="nil-skeleton" style={{ marginBottom:6 }}/>)
          ) : jadwalArr.length === 0 ? (
            <p style={{ fontSize:12, color:'var(--text3)' }}>Tidak ada jadwal.</p>
          ) : (
            jadwalArr.map(j => (
              <button key={j.id}
                className={`panel-nav-btn ${selectedJadwal?.id === j.id ? 'active' : ''}`}
                onClick={() => { setSelectedJadwal(j); setSuccessMsg(''); setErrMsg('') }}>
                <div style={{ flex:1 }}>
                  <span className="panel-nav-label">{j.matkul || '–'}</span>
                  <span style={{ display:'block', fontSize:10, color:'var(--text3)', marginTop:1 }}>
                    {j.hari} · {(j.jam_mulai || '').slice(0,5)} · Kelas {j.kelas_type || '–'}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main */}
      <div className="page-main">
        <PageHeader title="Input Nilai" subtitle="Komponen nilai + bonus nilai kuis otomatis"/>
        <div className="content-body">
          {!selectedJadwal ? (
            <div className="nil-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              <p>Pilih mata kuliah di panel kiri untuk mulai input nilai.</p>
            </div>
          ) : (
            <>
              {/* Header info matkul */}
              <div className="nil-matkul-hdr">
                <div>
                  <h2 className="nil-matkul-title">{matkulInfo.matkul || selectedJadwal.matkul || '–'}</h2>
                  <p className="nil-matkul-sub">
                    {matkulInfo.kode || selectedJadwal.kode || '–'} ·{' '}
                    {matkulInfo.sks || selectedJadwal.sks || '–'} SKS ·{' '}
                    Kelas {selectedJadwal.kelas_type || '–'} · {selectedJadwal.hari}
                  </p>
                </div>
                <button className={`nil-save-btn ${!hasChanges ? 'disabled' : ''}`} onClick={handleSaveAll} disabled={saving || !hasChanges}>
                  {saving ? <span className="nil-spinner"/> : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  )}
                  Simpan Nilai
                </button>
              </div>

              {successMsg && <div className="nil-success">{successMsg}</div>}
              {errMsg && <div className="nil-error">{errMsg}</div>}

              {/* Bonus Nilai Kuis */}
              <div className="nil-bonus-card">
                <div className="nil-bonus-label">
                  <strong>Bonus Nilai Kuis</strong>
                  <span>
                    Rata-rata nilai kuis ({jumlahKuis} kuis di kelas ini) akan menambah
                    nilai akhir mahasiswa <strong>hanya jika nilainya lebih tinggi</strong> dari
                    nilai dasar (UTS+UAS+Tugas+Hadir). Persentase di bawah menentukan seberapa
                    besar selisih tersebut diberikan sebagai bonus. 0% = tidak ada bonus.
                  </span>
                </div>
                <div className="nil-bonus-input-group">
                  <input
                    type="number" min="0" max="100" step="1"
                    className="nil-bonus-input"
                    value={bonusInput}
                    onChange={e => {
                      const v = e.target.value
                      if (v === '' || (Number(v) >= 0 && Number(v) <= 100)) setBonusInput(v)
                    }}
                  />
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--text2)' }}>%</span>
                  <button className="nil-bonus-save" onClick={simpanBonus} disabled={savingBonus || !bonusDirty}>
                    {savingBonus ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>

              {loadNilai ? (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[1,2,3,4,5].map(i => <div key={i} className="nil-skeleton" style={{ height:56 }}/>)}
                </div>
              ) : mahasiswaList.length === 0 ? (
                <div className="nil-empty">
                  <p>Belum ada mahasiswa yang mengambil mata kuliah ini.</p>
                  <small>Mahasiswa akan muncul di sini setelah KRS mereka dikunci oleh Admin.</small>
                </div>
              ) : (
                <div className="card nil-table-card">
                  {/* Table header */}
                  <div className="nil-tbl-hdr">
                    <span className="nil-col-no">No</span>
                    <span className="nil-col-nim">NIM</span>
                    <span className="nil-col-nama">Nama Mahasiswa</span>
                    {KOMPONEN.map(k => (
                      <span key={k.key} className="nil-col-komponen">{k.label} <small style={{fontWeight:400}}>({Math.round(k.bobot*100)}%)</small></span>
                    ))}
                    <span className="nil-col-kuis">Kuis</span>
                    <span className="nil-col-bonus">Bonus</span>
                    <span className="nil-col-akhir">Nilai</span>
                    <span className="nil-col-huruf">Huruf</span>
                  </div>
                  {/* Rows */}
                  {mahasiswaList.map((mhs, idx) => {
                    const row = rows[mhs.mahasiswa_id] || { nilai_uts:'', nilai_uas:'', nilai_tugas:'', nilai_kehadiran:'' }
                    const isEdited = editedIds.has(mhs.mahasiswa_id)
                    const base = hitungBase(row)
                    const rataKuis = mhs.nilai_kuis_avg
                    const bonus = hitungBonus(base, rataKuis, bonusPersen)
                    const angkaAkhir = base !== null ? Math.min(100, base + bonus) : null
                    const huruf = angkaAkhir !== null ? angkaKeHuruf(angkaAkhir) : (mhs.nilai_huruf || null)

                    return (
                      <div key={mhs.mahasiswa_id || idx} className={`nil-tbl-row ${isEdited ? 'edited' : ''}`}>
                        <span className="nil-col-no">{idx + 1}</span>
                        <span className="nil-col-nim">{mhs.nim || '–'}</span>
                        <span className="nil-col-nama">{mhs.nama || '–'}</span>
                        {KOMPONEN.map(k => (
                          <span key={k.key} className="nil-col-komponen">
                            <input
                              type="number" min="0" max="100" step="0.01"
                              className="nil-input"
                              placeholder="–"
                              value={row[k.key]}
                              onChange={e => handleInput(mhs.mahasiswa_id, k.key, e.target.value)}
                            />
                          </span>
                        ))}
                        <span className="nil-col-kuis">
                          {rataKuis != null
                            ? <span className="nil-kuis-pill">{rataKuis.toFixed(1)}</span>
                            : <span style={{ color:'var(--text3)', fontSize:11 }}>–</span>}
                        </span>
                        <span className="nil-col-bonus">
                          {base !== null
                            ? <span className={`nil-bonus-pill ${bonus > 0 ? 'has-bonus' : 'no-bonus'}`}>
                                {bonus > 0 ? `+${bonus.toFixed(1)}` : '0'}
                              </span>
                            : <span style={{ color:'var(--text3)', fontSize:11 }}>–</span>}
                        </span>
                        <span className="nil-col-akhir">
                          {angkaAkhir !== null ? angkaAkhir.toFixed(1) : (mhs.nilai_angka != null ? Number(mhs.nilai_angka).toFixed(1) : '–')}
                        </span>
                        <span className="nil-col-huruf">
                          {huruf ? (
                            <span className="nil-grade-pill" style={{ color: GC[huruf] || 'var(--text3)', background: GB[huruf] || 'var(--bg)' }}>
                              {huruf}
                            </span>
                          ) : (
                            <span style={{ color:'var(--text3)', fontSize:12 }}>–</span>
                          )}
                        </span>
                      </div>
                    )
                  })}
                  {/* Footer summary */}
                  <div className="nil-tbl-footer">
                    <span>Total: {mahasiswaList.length} mahasiswa</span>
                    {hasChanges && <span className="nil-changes-badge">{editedIds.size} diubah</span>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
