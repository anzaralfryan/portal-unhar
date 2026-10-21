import { useState } from 'react'
import PageHeader from '../../components/PageHeader.jsx'
import { useFetch } from '../../hooks/useFetch'
import { nilaiService } from '../../services/services'
import './NilaiPage.css'
import './KrsPage.css'   // reuse krs-modal, krs-print, etc styles for transkrip

const GC = {'A':'#059669','A-':'#059669','B+':'#2563eb','B':'#2563eb','B-':'#d97706','C+':'#d97706','C':'#e53e3e','D':'#991b1b','E':'#991b1b'}
const GB = {'A':'#d1fae5','A-':'#d1fae5','B+':'#dbeafe','B':'#dbeafe','B-':'#fef3c7','C+':'#fef3c7','C':'#fee2e2','D':'#fee2e2','E':'#fee2e2'}

const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
function tglHariIni(){ const d=new Date(); return `${d.getDate()} ${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}` }

function Skeleton() {
  return <div className="nil-skeleton"/>
}

// Modal Transkrip — cetak transkrip akademik lengkap
function TranskripModal({ onClose }) {
  const { data, loading, error } = useFetch(() => nilaiService.getTranskrip(), [])

  const totalMutu = data?.semester?.reduce((t, s) =>
    t + (s.matkul || []).reduce((tt, m) => tt + (Number(m.mutu) || 0), 0), 0
  ) || 0

  return (
    <div className="krs-modal-overlay" onClick={onClose}>
      <div className="krs-modal" onClick={e => e.stopPropagation()}>
        <div className="krs-modal-header">
          <h3>Transkrip Akademik</h3>
          <button className="krs-modal-close" onClick={onClose}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
        </div>
        <div className="krs-modal-body">
          {loading ? (
            <div style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>Memuat transkrip...</div>
          ) : error ? (
            <div style={{ padding:20, color:'var(--red)' }}>{error}</div>
          ) : !data || !data.semester?.length ? (
            <div style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>
              Belum ada nilai yang bisa dicetak sebagai transkrip.
            </div>
          ) : (
            <div className="krs-print-scroll">
              <div className="krs-print-area">
                {/* Header */}
                <div className="print-header">
                  <div className="print-kop-logo" style={{width:60,height:60,flexShrink:0}}>
                    <img src="/logo-unhar.png" alt="Logo UNHAR"
                      onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling.style.display='flex' }}
                      style={{width:'100%',height:'100%',objectFit:'contain'}}/>
                    <div style={{display:'none',alignItems:'center',justifyContent:'center',width:'100%',height:'100%',fontSize:9,color:'#666',fontWeight:700,textAlign:'center',border:'1px dashed #ccc',flexDirection:'column',gap:2}}>
                      <span>LOGO</span><span>UNHAR</span>
                    </div>
                  </div>
                  <div className="print-header-text">
                    <p className="print-instansi">UNIVERSITAS HARAPAN MEDAN</p>
                    <p className="print-sub-instansi">
                      Fakultas {data.mahasiswa?.fakultas || '–'} · Program Studi {data.mahasiswa?.prodi || '–'}
                    </p>
                    <p className="print-alamat">Jl. HM. Jhoni No.70, Medan, Sumatera Utara 20217</p>
                  </div>
                </div>
                <div className="print-divider"/>
                <p className="print-judul">TRANSKRIP AKADEMIK</p>

                {/* Data mahasiswa */}
                <div className="print-data-mhs">
                  <table className="print-table-data"><tbody>
                    <tr><td>Nama</td><td>: {data.mahasiswa?.nama || '–'}</td></tr>
                    <tr><td>NIM</td><td>: {data.mahasiswa?.nim || '–'}</td></tr>
                    <tr><td>Program Studi</td><td>: {data.mahasiswa?.prodi || '–'}</td></tr>
                    <tr><td>Fakultas</td><td>: {data.mahasiswa?.fakultas || '–'}</td></tr>
                    <tr><td>Angkatan</td><td>: {data.mahasiswa?.angkatan || '–'}</td></tr>
                  </tbody></table>
                  <div className="print-foto">
                    {data.mahasiswa?.foto_url
                      ? <img src={data.mahasiswa.foto_url} alt="Foto 3x4" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                      : <span>Foto<br/>3×4</span>
                    }
                  </div>
                </div>

                {/* Ringkasan IPK */}
                <div style={{
                  display:'flex', gap:20, padding:'12px 16px',
                  background:'#f3f4f6', borderRadius:6,
                  margin:'12px 0 16px', fontSize:12, fontWeight:600
                }}>
                  <div>IPK Kumulatif: <strong style={{ color:'#059669', fontSize:14 }}>{data.ipk || '0.00'}</strong></div>
                  <div>Total SKS: <strong>{data.sks_total || 0}</strong></div>
                  <div>Mata Kuliah: <strong>{data.matkul_count || 0}</strong></div>
                  <div>Total Mutu: <strong>{totalMutu.toFixed(2)}</strong></div>
                </div>

                {/* Tabel per semester */}
                {data.semester.map((sem, idx) => (
                  <div key={sem.tahun_akademik_id || idx} style={{ marginBottom:18 }}>
                    <p style={{ fontWeight:700, fontSize:12, marginBottom:6 }}>
                      {sem.label} — IPS: {sem.ips} · {sem.sks_total} SKS
                    </p>
                    <table className="print-table-matkul">
                      <thead>
                        <tr>
                          <th style={{ width:'6%' }}>No</th>
                          <th style={{ width:'12%' }}>Kode</th>
                          <th>Mata Kuliah</th>
                          <th style={{ width:'7%' }}>SKS</th>
                          <th style={{ width:'10%' }}>Nilai</th>
                          <th style={{ width:'10%' }}>Bobot</th>
                          <th style={{ width:'10%' }}>Mutu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(sem.matkul || []).map((m, i) => (
                          <tr key={m.kode || i}>
                            <td style={{ textAlign:'center' }}>{i+1}</td>
                            <td style={{ textAlign:'center' }}>{m.kode || '–'}</td>
                            <td>{m.nama || '–'}</td>
                            <td style={{ textAlign:'center' }}>{m.sks ?? '–'}</td>
                            <td style={{ textAlign:'center', fontWeight:600 }}>{m.nilai_huruf || '–'}</td>
                            <td style={{ textAlign:'center' }}>{Number(m.bobot ?? 0).toFixed(2)}</td>
                            <td style={{ textAlign:'center' }}>{Number(m.mutu ?? 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                {/* Tanda tangan */}
                <div className="print-ttd-area">
                  <p className="print-ttd-tempat">Medan, {tglHariIni()}</p>
                  <div className="print-ttd-row" style={{ justifyContent:'flex-end' }}>
                    <div className="print-ttd-box">
                      <p className="print-ttd-jabatan">Ketua Program Studi</p>
                      <div className="print-ttd-space"/>
                      <p className="print-ttd-nama">___________________</p>
                      <p className="print-ttd-nim">NIP. ________________</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="krs-modal-footer">
          <button className="krs-btn-secondary" onClick={onClose}>Tutup</button>
          <button className="krs-btn-cetak"
            onClick={() => { onClose(); setTimeout(() => window.print(), 100) }}
            disabled={!data || !data.semester?.length}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
            Cetak / Simpan PDF
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NilaiPage() {
  const [filterTahun, setFilterTahun] = useState('semua')
  const [aktivId,     setAktivId]     = useState(null)
  const [showTrans,   setShowTrans]   = useState(false)
  const [mobileTab,   setMobileTab]   = useState('main') // 'panel' | 'main'

  const { data, loading, error } = useFetch(() => nilaiService.getAll(), [])

  const semList = data?.semester || []
  const filtered = filterTahun === 'semua'
    ? semList
    : semList.filter(s => s.tahun === filterTahun)

  // Set default aktif semester pertama
  const aktivSem = semList.find(s => s.tahun_akademik_id === aktivId) || filtered[0]

  // Unik tahun akademik
  const tahunList = [...new Set(semList.map(s => s.tahun))]

  return (
    <div className="page-root nil-root">
      {/* ── MOBILE: IPK bar ringkas + tab ── */}
      <div className="nil-mobile-top">
        <div className="nil-mobile-ipk">
          <div className="nil-mobile-ipk-val">{loading ? '…' : (data?.ipk || '–')}</div>
          <div className="nil-mobile-ipk-info">
            <span>IPK Kumulatif</span>
            <div className="nil-mobile-ipk-stats">
              <span>{data?.sks_lulus || 0} SKS Lulus</span>
              <span>·</span>
              <span>{data?.semester_count || 0} Semester</span>
            </div>
          </div>
          <button className="krs-btn-cetak nil-mobile-transkrip-btn"
            onClick={() => setShowTrans(true)}
            disabled={loading || !data?.semester_count}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Transkrip
          </button>
        </div>
        {/* Filter + pilih semester row */}
        <div className="nil-mobile-filters">
          <select className="panel-select nil-mobile-select"
            value={filterTahun}
            onChange={e => setFilterTahun(e.target.value)}>
            <option value="semua">Semua Tahun</option>
            {tahunList.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="nil-mobile-sems">
            {filtered.map(s => (
              <button key={s.tahun_akademik_id}
                className={`nil-mobile-sem-chip ${aktivId === s.tahun_akademik_id || (!aktivId && filtered[0]?.tahun_akademik_id === s.tahun_akademik_id) ? 'active' : ''}`}
                onClick={() => setAktivId(s.tahun_akademik_id)}>
                {s.label}
                <span className="nil-mobile-sem-ips">{s.ips}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Panel sidebar — hanya tampil di desktop */}
      <div className="page-panel nil-desktop-panel">
        <div className="nil-ipk-box nil-desktop-ipk">
          {loading ? <Skeleton/> : (
            <>
              <div className="nil-ipk-val">{data?.ipk || '–'}</div>
              <div className="nil-ipk-lbl">IPK Kumulatif</div>
              <div className="nil-ipk-stats">
                <div><span>{data?.sks_lulus || 0}</span><small>SKS Lulus</small></div>
                <div><span>{data?.semester_count || 0}</span><small>Semester</small></div>
              </div>
            </>
          )}
        </div>

        <div className="panel-section">
          <p className="panel-label">Tahun Akademik</p>
          <select className="panel-select" value={filterTahun} onChange={e => setFilterTahun(e.target.value)}>
            <option value="semua">Semua Tahun</option>
            {tahunList.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="panel-section" style={{ flex:1 }}>
          <p className="panel-label">Pilih Semester</p>
          {loading ? [1,2,3].map(i => <div key={i} className="nil-skeleton" style={{marginBottom:6}}/>) :
            filtered.map(s => (
              <button key={s.tahun_akademik_id}
                className={`nil-sem-btn ${aktivId === s.tahun_akademik_id ? 'active' : ''}`}
                onClick={() => setAktivId(s.tahun_akademik_id)}>
                <div className="nil-sem-info">
                  <span className="nil-sem-label">{s.label}</span>
                  <span className="nil-sem-sub">{s.semester} · {s.tahun}</span>
                </div>
                <span className="nil-ips-pill">{s.ips}</span>
              </button>
            ))
          }
        </div>
      </div>

      {/* Main content */}
      <div className="page-main">
        <div className="nil-desktop-header">
        <PageHeader
          title="Nilai Akademik"
          subtitle="Transkrip & nilai per semester"
          actions={
            <button className="krs-btn-cetak" onClick={() => setShowTrans(true)} disabled={loading || !data?.semester_count}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Cetak Transkrip
            </button>
          }
        />
        </div>
        <div className="content-body">
          {error && <div className="nil-error">{error}</div>}

          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[1,2,3].map(i => <div key={i} className="nil-skeleton" style={{ height:70 }}/>)}
            </div>
          ) : !aktivSem ? (
            <div className="nil-empty">Belum ada data nilai.</div>
          ) : (
            <>
              <div className="nil-sem-hdr">
                <div>
                  <h2 className="nil-sem-title">{aktivSem.label}</h2>
                  <p className="nil-sem-sub2">{aktivSem.semester} · {aktivSem.tahun}</p>
                </div>
                <div className="nil-ips-badge">
                  <span className="nil-ips-big">{aktivSem.ips}</span>
                  <span className="nil-ips-lbl2">IPS</span>
                </div>
              </div>

              <div className="card">
                <div className="card-title">{aktivSem.sks_total} SKS · {aktivSem.matkul?.length || 0} Mata Kuliah</div>
                {aktivSem.matkul?.map((m, i) => (
                  <div key={i} className="list-item"
                    style={{ borderBottom: i < aktivSem.matkul.length-1 ? '1px solid var(--border)' : 'none' }}>
                    <div className="list-body">
                      <h4>{m.matkul}</h4>
                      <p>{m.sks} SKS · {m.dosen || '–'}</p>
                      {m.bonus_diterapkan > 0 && (
                        <p style={{ fontSize:11, color:'#059669', marginTop:2 }}>
                          + Bonus nilai kuis: +{Number(m.bonus_diterapkan).toFixed(1)}
                          {m.nilai_kuis_avg != null ? ` (rata-rata kuis ${Number(m.nilai_kuis_avg).toFixed(1)})` : ''}
                        </p>
                      )}
                    </div>
                    <div className="nil-grade">
                      <span className="nil-grade-huruf"
                        style={{ color: GC[m.nilai_huruf] || 'var(--text)', background: GB[m.nilai_huruf] || 'var(--bg)' }}>
                        {m.nilai_huruf || '–'}
                      </span>
                      <span className="nil-grade-angka">{m.nilai_angka ?? '–'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showTrans && <TranskripModal onClose={() => setShowTrans(false)}/>}
    </div>
  )
}
