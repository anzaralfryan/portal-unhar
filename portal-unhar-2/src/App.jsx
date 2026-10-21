import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import RoleRedirect from './components/RoleRedirect'
import AppSidebar from './components/AppSidebar.jsx'
import ChatBubble from './components/ChatBubble.jsx'
import MobileTopBar from './components/MobileTopBar.jsx'
import MobileBottomNav from './components/MobileBottomNav.jsx'
import { useIsMobile } from './hooks/useIsMobile'
import LoginPage from './pages/LoginPage.jsx'
import LandingPage from './pages/LandingPage.jsx'
import TentangPage from './pages/tentang/TentangPage.jsx'
const LandingCmsPage = lazy(() => import('./pages/admin/LandingCmsPage.jsx'))

const M = {
  Dashboard:  lazy(() => import('./pages/mahasiswa/DashboardPage.jsx')),
  Jadwal:     lazy(() => import('./pages/mahasiswa/JadwalPage.jsx')),
  Nilai:      lazy(() => import('./pages/mahasiswa/NilaiPage.jsx')),
  Krs:        lazy(() => import('./pages/mahasiswa/KrsPage.jsx')),
  Elearning:  lazy(() => import('./pages/mahasiswa/ElearningPage.jsx')),
  Pembayaran: lazy(() => import('./pages/mahasiswa/PembayaranPage.jsx')),
  Notifikasi: lazy(() => import('./pages/mahasiswa/NotifikasiPage.jsx')),
  Profil:     lazy(() => import('./pages/mahasiswa/ProfilPage.jsx')),
  Chat:       lazy(() => import('./pages/mahasiswa/ChatPage.jsx')),
}
const D = {
  Dashboard:  lazy(() => import('./pages/dosen/DashboardPage.jsx')),
  Jadwal:     lazy(() => import('./pages/dosen/JadwalPage.jsx')),
  Nilai:      lazy(() => import('./pages/dosen/NilaiPage.jsx')),
  Elearning:  lazy(() => import('./pages/dosen/ElearningPage.jsx')),
  Absensi:    lazy(() => import('./pages/dosen/AbsensiPage.jsx')),
  Notifikasi: lazy(() => import('./pages/dosen/NotifikasiPage.jsx')),
  Profil:     lazy(() => import('./pages/dosen/ProfilPage.jsx')),
  Chat:       lazy(() => import('./pages/dosen/ChatPage.jsx')),
}

const A = {
  Dashboard:  lazy(() => import('./pages/admin/DashboardPage.jsx')),
  Fakultas:   lazy(() => import("./pages/admin/FakultasPage.jsx")),
  Mahasiswa:  lazy(() => import('./pages/admin/MahasiswaPage.jsx')),
  Dosen:      lazy(() => import('./pages/admin/DosenPage.jsx')),
  // Prodi dan Matkul sekarang dikelola dari FakultasPage (halaman hierarkis)
  Jadwal:     lazy(() => import('./pages/admin/JadwalPage.jsx')),
  Tahun:      lazy(() => import('./pages/admin/TahunPage.jsx')),
  Krs:        lazy(() => import('./pages/admin/KrsPage.jsx')),
  Notifikasi: lazy(() => import('./pages/admin/NotifikasiPage.jsx')),
  Pembayaran: lazy(() => import('./pages/admin/PembayaranPage.jsx')),
  // Broadcast page dihapus — fungsi broadcast ada di /admin/notifikasi
  Profil:     lazy(() => import('./pages/admin/ProfilPage.jsx')),
  Chat:       lazy(() => import('./pages/admin/ChatPage.jsx')),
}

const Spinner = () => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',flex:1}}>
    <div style={{width:32,height:32,border:'3px solid #e8ecf2',borderTopColor:'#0F9E7B',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
  </div>
)

/**
 * BodyClassManager — atur class di <body> sesuai role + layout mode.
 * Dibutuhkan agar CSS body.mobile-mahasiswa dan body.role-admin aktif.
 */
function BodyClassManager() {
  const { role } = useAuth()
  const isMobile = useIsMobile(768)
  const mobileMahasiswa = role === 'mahasiswa' && isMobile

  useEffect(() => {
    const b = document.body
    b.classList.remove('role-admin', 'role-dosen', 'role-mahasiswa', 'mobile-mahasiswa')
    if (role) b.classList.add(`role-${role}`)
    if (mobileMahasiswa) b.classList.add('mobile-mahasiswa')
    return () => {
      b.classList.remove('role-admin', 'role-dosen', 'role-mahasiswa', 'mobile-mahasiswa')
    }
  }, [role, mobileMahasiswa])

  return null
}

function AppLayout() {
  const [open, setOpen] = useState(true)
  const { role } = useAuth()
  const isMobile = useIsMobile(768)
  const mobileMahasiswa = role === 'mahasiswa' && isMobile

  return (
    <div className="app-layout">
      {mobileMahasiswa && <MobileTopBar />}
      {!mobileMahasiswa && <AppSidebar isOpen={open} onToggle={() => setOpen(v => !v)} />}
      <div className="app-content">
        <ErrorBoundary>
          <Suspense fallback={<Spinner/>}>
            <Outlet context={{ sidebarOpen: open, onToggleSidebar: () => setOpen(v => !v) }} />
          </Suspense>
        </ErrorBoundary>
      </div>
      {mobileMahasiswa && <MobileBottomNav />}
      {/* Chat bubble — mahasiswa & dosen. Dibungkus ErrorBoundary silent
          agar jika gagal render, tidak menghancurkan seluruh layout
          (mis. blank page di halaman lain). */}
      <ErrorBoundary silent>
        <ChatBubble role={role} />
      </ErrorBoundary>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BodyClassManager />
      <Routes>
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/beranda" element={<LandingPage />} />
        <Route path="/tentang/:slug" element={<TentangPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute roles={['mahasiswa']}><AppLayout /></ProtectedRoute>}>
          <Route path="/mahasiswa/dashboard"  element={<M.Dashboard />} />
          <Route path="/mahasiswa/jadwal"     element={<M.Jadwal />} />
          <Route path="/mahasiswa/nilai"      element={<M.Nilai />} />
          <Route path="/mahasiswa/krs"        element={<M.Krs />} />
          <Route path="/mahasiswa/elearning"  element={<M.Elearning />} />
          <Route path="/mahasiswa/pembayaran" element={<M.Pembayaran />} />
          <Route path="/mahasiswa/notifikasi" element={<M.Notifikasi />} />
          <Route path="/mahasiswa/profil"     element={<M.Profil />} />
          <Route path="/mahasiswa/chat"       element={<M.Chat />} />
        </Route>
        <Route element={<ProtectedRoute roles={['dosen']}><AppLayout /></ProtectedRoute>}>
          <Route path="/dosen/dashboard"  element={<D.Dashboard />} />
          <Route path="/dosen/jadwal"     element={<D.Jadwal />} />
          <Route path="/dosen/nilai"      element={<D.Nilai />} />
          <Route path="/dosen/elearning"  element={<D.Elearning />} />
          <Route path="/dosen/absensi"    element={<D.Absensi />} />
          <Route path="/dosen/notifikasi" element={<D.Notifikasi />} />
          <Route path="/dosen/profil"     element={<D.Profil />} />
          <Route path="/dosen/chat"       element={<D.Chat />} />
        </Route>
        <Route element={<ProtectedRoute roles={['admin']}><AppLayout /></ProtectedRoute>}>
          <Route path="/admin/dashboard"  element={<A.Dashboard />} />
          <Route path="/admin/fakultas"   element={<A.Fakultas />} />
          <Route path="/admin/mahasiswa"  element={<A.Mahasiswa />} />
          <Route path="/admin/dosen"      element={<A.Dosen />} />
          {/* Prodi dan Matkul dikelola dari /admin/fakultas */}
          <Route path="/admin/jadwal"     element={<A.Jadwal />} />
          <Route path="/admin/tahun"      element={<A.Tahun />} />
          <Route path="/admin/krs"        element={<A.Krs />} />
          <Route path="/admin/notifikasi"  element={<A.Notifikasi />} />
          <Route path="/admin/pembayaran" element={<A.Pembayaran />} />
          <Route path="/admin/chat"       element={<A.Chat />} />
          {/* Broadcast route dihapus — fitur ada di /admin/notifikasi */}
          <Route path="/admin/landing"    element={<LandingCmsPage />} />
          <Route path="/admin/profil"     element={<A.Profil />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
