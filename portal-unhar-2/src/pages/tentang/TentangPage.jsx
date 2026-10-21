import { useParams, useNavigate } from 'react-router-dom'
import './TentangPage.css'

/* ── SVG Icons (sama dengan LandingPage) ── */
function Icon({ name, size = 20 }) {
  const paths = {
    arrowLeft: <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
    home:      <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    users:     <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    book:      <><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>,
    award:     <><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></>,
    building:  <><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22V12h6v10"/><path d="M9 7h1"/><path d="M9 11h1"/><path d="M14 7h1"/><path d="M14 11h1"/></>,
    music:     <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>,
    chevronR:  <polyline points="9 18 15 12 9 6"/>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

/* ══════════════════════════════════════════════════════════
   DATA per slug
══════════════════════════════════════════════════════════ */
const META = {
  'sambutan-rektor': {
    judul: 'Sambutan Rektor',
    tag: 'Tentang Kami',
    icon: 'users',
    img: '/img/unhar1.jpeg',
    color: '#5D8736',
  },
  'sejarah': {
    judul: 'Sejarah',
    tag: 'Tentang Kami',
    icon: 'book',
    img: '/img/unhar2.jpeg',
    color: '#31511E',
  },
  'lambang-filosofi': {
    judul: 'Lambang & Filosofi',
    tag: 'Tentang Kami',
    icon: 'award',
    img: '/img/unhar3.jpeg',
    color: '#859F3D',
  },
  'visi-misi': {
    judul: 'Visi, Misi & Tujuan',
    tag: 'Tentang Kami',
    icon: 'building',
    img: '/img/unhar4.jpeg',
    color: '#5D8736',
  },
  'catur-prasetya': {
    judul: 'Catur Prasetya',
    tag: 'Tentang Kami',
    icon: 'award',
    img: '/img/unhar1.jpeg',
    color: '#31511E',
  },
  'mars': {
    judul: 'Mars UNHAR',
    tag: 'Tentang Kami',
    icon: 'music',
    img: '/img/unhar2.jpeg',
    color: '#859F3D',
  },
}

/* ── Daftar semua item untuk sidebar navigasi ── */
const NAV_ITEMS = [
  { slug: 'sambutan-rektor',  label: 'Sambutan Rektor' },
  { slug: 'sejarah',          label: 'Sejarah' },
  { slug: 'lambang-filosofi', label: 'Lambang & Filosofi' },
  { slug: 'visi-misi',        label: 'Visi, Misi & Tujuan' },
  { slug: 'catur-prasetya',   label: 'Catur Prasetya' },
  { slug: 'mars',             label: 'Mars UNHAR' },
]

/* ══════════════════════════════════════════════════════════
   KONTEN per slug
══════════════════════════════════════════════════════════ */
function SambutanRektor() {
  return (
    <div className="tp-content">
      <div className="tp-sambutan-wrap">
        <div className="tp-sambutan-foto">
          <div className="tp-sambutan-avatar">
            <Icon name="users" size={52} />
          </div>
          <p className="tp-sambutan-nama">Dr. H. Agus Salim Nasution, M.Kom</p>
          <p className="tp-sambutan-jabatan">Rektor Universitas Harapan Medan</p>
        </div>
        <div className="tp-sambutan-teks">
          <p>Assalamu'alaikum Warahmatullahi Wabarakatuh,</p>
          <p>
            Selamat datang di Portal Akademik Universitas Harapan Medan. Dengan penuh rasa syukur kepada
            Allah SWT, kami terus berkomitmen untuk memberikan pelayanan pendidikan terbaik bagi seluruh
            civitas akademika Universitas Harapan Medan.
          </p>
          <p>
            Universitas Harapan Medan hadir sebagai lembaga pendidikan tinggi yang berfokus pada pengembangan
            ilmu pengetahuan, teknologi, dan seni yang berwawasan kebangsaan. Kami terus berinovasi agar
            lulusan kami mampu bersaing di tingkat nasional maupun internasional.
          </p>
          <p>
            Melalui Portal Akademik berbasis teknologi ini, kami berharap seluruh mahasiswa, dosen, dan
            tenaga kependidikan dapat memanfaatkan layanan digital untuk mendukung proses perkuliahan yang
            lebih efektif, efisien, dan transparan.
          </p>
          <p>
            Kami mengajak seluruh civitas akademika untuk terus semangat dalam menuntut ilmu, berinovasi,
            dan berkontribusi bagi kemajuan bangsa dan negara. Bersama kita wujudkan Universitas Harapan
            Medan yang unggul, bermartabat, dan berdaya saing.
          </p>
          <p className="tp-sambutan-ttd">
            Wassalamu'alaikum Warahmatullahi Wabarakatuh.
          </p>
          <div className="tp-sambutan-ttd-box">
            <p>Medan, 2026</p>
            <p className="tp-sambutan-nama-ttd">Dr. H. Agus Salim Nasution, M.Kom</p>
            <p>Rektor</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Sejarah() {
  const timeline = [
    {
      tahun: '2001',
      judul: 'Pendirian Yayasan',
      desc: 'Yayasan Harapan didirikan sebagai landasan penyelenggaraan pendidikan tinggi di Sumatera Utara, dengan visi membangun sumber daya manusia yang unggul dan berkarakter.',
    },
    {
      tahun: '2003',
      judul: 'Berdirinya UNHAR Medan',
      desc: 'Universitas Harapan Medan resmi berdiri dan memulai kegiatan akademik perdananya, membuka program studi di bidang teknologi dan komputer untuk memenuhi kebutuhan industri di Sumatera Utara.',
    },
    {
      tahun: '2008',
      judul: 'Akreditasi Pertama BAN-PT',
      desc: 'Program-program studi Universitas Harapan Medan berhasil memperoleh akreditasi dari Badan Akreditasi Nasional Perguruan Tinggi (BAN-PT) untuk pertama kalinya, menjadi bukti nyata kualitas akademik yang diakui secara nasional.',
    },
    {
      tahun: '2015',
      judul: 'Ekspansi Program Studi',
      desc: 'UNHAR membuka program studi baru dan memperluas kapasitas penerimaan mahasiswa baru, diikuti dengan pembangunan sarana prasarana kampus yang lebih modern dan representatif.',
    },
    {
      tahun: '2020',
      judul: 'Transformasi Digital',
      desc: 'Dimulainya program transformasi digital layanan akademik dan administrasi kampus menuju konsep smart campus berbasis teknologi informasi yang modern dan terintegrasi.',
    },
    {
      tahun: '2026',
      judul: 'Portal Akademik Digital',
      desc: 'Peluncuran Portal Akademik berbasis Progressive Web App (PWA) yang mengintegrasikan seluruh layanan akademik — KRS, nilai, jadwal, pembayaran, dan komunikasi — dalam satu platform digital yang dapat diakses kapan saja dan di mana saja.',
    },
  ]
  return (
    <div className="tp-content">
      <div className="tp-timeline">
        {timeline.map((item, i) => (
          <div key={item.tahun} className={`tp-timeline-item ${i % 2 === 0 ? 'left' : 'right'}`}>
            <div className="tp-timeline-dot" />
            <div className="tp-timeline-card">
              <span className="tp-timeline-year">{item.tahun}</span>
              <h3 className="tp-timeline-judul">{item.judul}</h3>
              <p className="tp-timeline-desc">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LambangFilosofi() {
  const makna = [
    { warna: '#5D8736', label: 'Hijau',     border: null,   teks: 'Melambangkan pertumbuhan, kesuburan ilmu pengetahuan, dan harapan akan masa depan yang cerah dan gemilang bagi seluruh civitas akademika.' },
    { warna: '#F4FFC3', label: 'Kuning',    border: '#ccc', teks: 'Mencerminkan kejayaan, kecemerlangan prestasi akademik, dan semangat yang menyala dalam menuntut ilmu dan berkarya.' },
    { warna: '#31511E', label: 'Hijau Tua', border: null,   teks: 'Merepresentasikan kematangan berpikir, keteguhan pendirian, dan pondasi keilmuan yang kokoh serta berakar kuat dalam tradisi akademik.' },
    { warna: '#ffffff', label: 'Putih',     border: '#d1d5db', teks: 'Menyimbolkan kesucian niat, kejujuran akademik, dan integritas yang menjadi landasan dalam setiap langkah proses pendidikan.' },
  ]
  return (
    <div className="tp-content">
      <div className="tp-lambang-wrap">
        <div className="tp-lambang-kiri">
          <div className="tp-lambang-logo-wrap">
            <img src="/logo-unhar.png" alt="Lambang UNHAR" className="tp-lambang-logo" />
          </div>
          <p className="tp-lambang-caption">Lambang resmi Universitas Harapan Medan</p>
        </div>
        <div className="tp-lambang-kanan">
          <h3 className="tp-sub-heading">Makna Warna</h3>
          <div className="tp-lambang-list">
            {makna.map(m => (
              <div key={m.label} className="tp-lambang-item">
                <span
                  className="tp-lambang-dot"
                  style={{ background: m.warna, border: m.border ? `1.5px solid ${m.border}` : undefined }}
                />
                <div>
                  <strong>{m.label}</strong>
                  <p>{m.teks}</p>
                </div>
              </div>
            ))}
          </div>
          <h3 className="tp-sub-heading" style={{ marginTop: 36 }}>Filosofi Lambang</h3>
          <p className="tp-paragraf">
            Lambang Universitas Harapan Medan menggambarkan semangat dan tekad untuk menjadi institusi
            pendidikan tinggi yang unggul, berintegritas, dan berdaya saing. Setiap elemen dalam lambang
            mengandung makna mendalam yang mencerminkan nilai-nilai luhur yang dipegang teguh oleh
            seluruh civitas akademika Universitas Harapan Medan.
          </p>
        </div>
      </div>
    </div>
  )
}

function VisiMisi() {
  return (
    <div className="tp-content">
      <div className="tp-visi-grid">
        {/* Visi */}
        <div className="tp-visi-card tp-visi-card--visi">
          <div className="tp-visi-icon"><Icon name="award" size={30} /></div>
          <h3 className="tp-visi-label">Visi</h3>
          <p className="tp-visi-teks">
            Menjadi universitas unggul berbasis teknologi informasi yang berdaya saing nasional
            pada tahun 2030.
          </p>
        </div>

        {/* Misi */}
        <div className="tp-visi-card">
          <div className="tp-visi-icon"><Icon name="book" size={30} /></div>
          <h3 className="tp-visi-label">Misi</h3>
          <ul className="tp-visi-list">
            <li>Menyelenggarakan pendidikan tinggi yang berkualitas dan relevan dengan kebutuhan industri serta perkembangan teknologi.</li>
            <li>Melaksanakan penelitian inovatif yang memberikan kontribusi nyata bagi pengembangan ilmu pengetahuan dan masyarakat.</li>
            <li>Menjalankan pengabdian kepada masyarakat berbasis teknologi informasi yang berdampak positif.</li>
            <li>Membangun kemitraan strategis dengan dunia industri, pemerintah, dan institusi pendidikan tinggi lainnya.</li>
          </ul>
        </div>

        {/* Tujuan */}
        <div className="tp-visi-card">
          <div className="tp-visi-icon"><Icon name="building" size={30} /></div>
          <h3 className="tp-visi-label">Tujuan</h3>
          <ul className="tp-visi-list">
            <li>Menghasilkan lulusan yang kompeten, berkarakter, dan siap bersaing di era digital global.</li>
            <li>Meningkatkan kualitas dan kuantitas penelitian serta publikasi ilmiah dosen dan mahasiswa.</li>
            <li>Mewujudkan tata kelola universitas yang transparan, akuntabel, dan profesional.</li>
            <li>Membangun ekosistem kampus yang inklusif, inovatif, dan berwawasan global.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function CaturPrasetya() {
  const prasetya = [
    {
      no: '1',
      judul: 'Taqwa',
      isi: 'Beriman dan bertaqwa kepada Tuhan Yang Maha Esa sebagai landasan utama dalam menuntut ilmu dan menjalani kehidupan akademik di Universitas Harapan Medan.',
    },
    {
      no: '2',
      judul: 'Ilmu',
      isi: 'Menuntut ilmu dengan sungguh-sungguh, jujur, dan penuh tanggung jawab demi kemajuan diri sendiri, keluarga, bangsa, dan negara.',
    },
    {
      no: '3',
      judul: 'Bakti',
      isi: 'Mengabdikan diri kepada masyarakat, bangsa, dan negara sebagai wujud nyata dari ilmu pengetahuan dan keterampilan yang telah diperoleh selama masa studi.',
    },
    {
      no: '4',
      judul: 'Karya',
      isi: 'Menciptakan karya nyata yang bermanfaat, inovatif, dan berdaya saing tinggi sebagai kontribusi konkret bagi kemajuan ilmu pengetahuan dan peradaban manusia.',
    },
  ]
  return (
    <div className="tp-content">
      <p className="tp-intro-teks">
        Catur Prasetya merupakan empat ikrar dan komitmen yang wajib dihayati oleh seluruh mahasiswa
        Universitas Harapan Medan sebagai panduan dalam menjalani kehidupan akademik dan bermasyarakat.
      </p>
      <div className="tp-catur-grid">
        {prasetya.map(p => (
          <div key={p.no} className="tp-catur-card">
            <div className="tp-catur-no">{p.no}</div>
            <h3 className="tp-catur-judul">{p.judul}</h3>
            <p className="tp-catur-isi">{p.isi}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function MarsUnhar() {
  const bait = [
    ['Universitas Harapan, universitas harapan',
     'Tempat menimba ilmu dan pengabdian'],
    ['Dengan tekad bulat dan hati yang teguh',
     'Kami melangkah menuju masa depan'],
    ['Jayalah selalu, Universitas Harapan',
     'Membangun bangsa dengan ilmu dan iman'],
    ['Bersama kami melangkah penuh harapan',
     'Demi Indonesia yang jaya dan gemilang'],
  ]
  return (
    <div className="tp-content">
      <div className="tp-mars-wrap">
        <div className="tp-mars-ikon">
          <Icon name="music" size={36} />
        </div>
        <div className="tp-mars-lirik">
          {bait.map((b, i) => (
            <div key={i} className="tp-mars-bait">
              {b.map((baris, j) => <p key={j}>{baris}</p>)}
            </div>
          ))}
        </div>
        <p className="tp-mars-ket">
          * Lirik mars ini merupakan representasi. Untuk lirik dan notasi resmi,
          silakan menghubungi Biro Administrasi Akademik Universitas Harapan Medan.
        </p>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function TentangPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const meta = META[slug]

  /* Slug tidak dikenal → redirect */
  if (!meta) {
    return (
      <div className="tp-notfound">
        <p>Halaman tidak ditemukan.</p>
        <button onClick={() => navigate('/beranda')}>Kembali ke Beranda</button>
      </div>
    )
  }

  /* Render konten sesuai slug */
  const renderKonten = () => {
    switch (slug) {
      case 'sambutan-rektor':  return <SambutanRektor />
      case 'sejarah':          return <Sejarah />
      case 'lambang-filosofi': return <LambangFilosofi />
      case 'visi-misi':        return <VisiMisi />
      case 'catur-prasetya':   return <CaturPrasetya />
      case 'mars':             return <MarsUnhar />
      default:                 return null
    }
  }

  return (
    <div className="tp-root">

      {/* ── Topbar sederhana ── */}
      <header className="tp-topbar">
        <div className="tp-topbar-inner">
          <button className="tp-back-btn" onClick={() => navigate('/beranda')}>
            <Icon name="arrowLeft" size={18} /> Kembali
          </button>
          <div className="tp-topbar-brand" onClick={() => navigate('/beranda')}>
            <img src="/logo-unhar.png" alt="UNHAR" className="tp-topbar-logo" />
            <span className="tp-topbar-name">UNHAR Medan</span>
          </div>
          <button className="tp-login-btn" onClick={() => navigate('/login')}>
            Masuk Portal
          </button>
        </div>
      </header>

      {/* ── Hero banner ── */}
      <div className="tp-hero" style={{ backgroundImage: `url(${meta.img})` }}>
        <div className="tp-hero-overlay" />
        <div className="tp-hero-content">
          <span className="tp-hero-tag">{meta.tag}</span>
          <h1 className="tp-hero-judul">{meta.judul}</h1>
          {/* Breadcrumb */}
          <nav className="tp-breadcrumb">
            <button onClick={() => navigate('/beranda')}>
              <Icon name="home" size={13} /> Beranda
            </button>
            <Icon name="chevronR" size={13} />
            <span>Tentang Kami</span>
            <Icon name="chevronR" size={13} />
            <span>{meta.judul}</span>
          </nav>
        </div>
      </div>

      {/* ── Layout: sidebar nav + konten ── */}
      <div className="tp-body">
        <aside className="tp-sidebar">
          <p className="tp-sidebar-label">Tentang Kami</p>
          <nav className="tp-sidebar-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.slug}
                className={`tp-sidebar-link ${slug === item.slug ? 'active' : ''}`}
                onClick={() => navigate(`/tentang/${item.slug}`)}
              >
                {item.label}
                {slug === item.slug && <Icon name="chevronR" size={14} />}
              </button>
            ))}
          </nav>
        </aside>

        <main className="tp-main">
          {renderKonten()}
        </main>
      </div>

      {/* ── Footer mini ── */}
      <footer className="tp-footer">
        <p>© 2026 Universitas Harapan Medan — Fakultas Teknik dan Komputer</p>
        <button onClick={() => navigate('/login')}>Masuk Portal →</button>
      </footer>

    </div>
  )
}
