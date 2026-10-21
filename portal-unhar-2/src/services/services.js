import api, { apiUpload } from './api'

/* ════════════════════════════════════════════════════════════
   AUTH
════════════════════════════════════════════════════════════ */
export const authService = {
  login:          (email, password) => api.post('/auth/login', { email, password }),
  logout:         ()               => api.post('/auth/logout'),
  refresh:        ()               => api.post('/auth/refresh'),
  me:             ()               => api.get('/auth/me'),
  updatePassword: (data)           => api.put('/auth/password', data),
}

/* ════════════════════════════════════════════════════════════
   MAHASISWA
════════════════════════════════════════════════════════════ */
export const mahasiswaService = {
  getProfil:      ()       => api.get('/mahasiswa/profil'),
  updateProfil:   (data)   => api.put('/mahasiswa/profil', data),
  uploadFoto:     (file)   => {
    const fd = new FormData()
    fd.append('foto', file)
    return apiUpload('/mahasiswa/profil/foto', fd)
  },
  deleteFoto: () => api.delete('/mahasiswa/profil/foto'),
}

/* ════════════════════════════════════════════════════════════
   JADWAL
════════════════════════════════════════════════════════════ */
export const jadwalService = {
  getMahasiswaJadwal: (params) => api.get('/mahasiswa/jadwal', { params }),
  getDosenJadwal:     (params) => api.get('/dosen/jadwal', { params }),
}

/* ════════════════════════════════════════════════════════════
   KRS
════════════════════════════════════════════════════════════ */
export const sharedService = {
  // Tahun akademik aktif — dipakai semua role untuk banner "Tahun Ajaran Aktif"
  getTahunAktif: () => api.get('/mahasiswa/tahun-aktif')
    .catch(() => api.get('/dosen/tahun-aktif'))
    .catch(() => api.get('/admin/tahun-aktif')),

  // Cara lebih bersih: gunakan endpoint sesuai role (didaftarkan di semua middleware group)
  getTahunAktifMhs:   () => api.get('/mahasiswa/tahun-aktif'),
  getTahunAktifDosen: () => api.get('/dosen/tahun-aktif'),
  getTahunAktifAdmin: () => api.get('/admin/tahun-aktif'),

  // Semua tahun akademik (untuk dropdown filter)
  getSemuaTahun: () => api.get('/mahasiswa/semua-tahun'),
}

export const semesterService = {
  // Admin: preview kenaikan semester (dry_run)
  preview:  (tahunAkademikId) => api.post('/admin/semester/preview', {
    tahun_akademik_id: tahunAkademikId, dry_run: true,
  }),
  // Admin: eksekusi kenaikan semester
  naikkan:  (tahunAkademikId) => api.post('/admin/semester/naikkan', {
    tahun_akademik_id: tahunAkademikId, dry_run: false,
  }),
}

export const krsService = {
  getAll:       ()              => api.get('/mahasiswa/krs'),
  getByTahun:   (tahunId)      => api.get(`/mahasiswa/krs/${tahunId}`),
  create:       ()              => api.post('/mahasiswa/krs'),
  addMatkul:    (krsId, jadwalId) => api.post(`/mahasiswa/krs/${krsId}/matkul`, { jadwal_id: jadwalId }),
  removeMatkul: (krsId, jId)   => api.delete(`/mahasiswa/krs/${krsId}/matkul/${jId}`),
  requestUnlock:(krsId, data={})=> api.post(`/mahasiswa/krs/${krsId}/request-unlock`, data),
  submit:       (krsId)        => api.post(`/mahasiswa/krs/${krsId}/submit`),

  // Admin
  adminGetAll:  (params)        => api.get('/admin/krs', { params }),
  adminDetail:  (id)            => api.get(`/admin/krs/${id}/detail`),
  adminAddMatkul:    (id, jadwalId) => api.post(`/admin/krs/${id}/matkul`, { jadwal_id: jadwalId }),
  adminRemoveMatkul: (id, jadwalId) => api.delete(`/admin/krs/${id}/matkul/${jadwalId}`),
  lock:         (id)            => api.put(`/admin/krs/${id}/lock`),
  unlock:       (id)            => api.put(`/admin/krs/${id}/unlock`),
}

/* ════════════════════════════════════════════════════════════
   NILAI
════════════════════════════════════════════════════════════ */
export const nilaiService = {
  getAll:       ()              => api.get('/mahasiswa/nilai'),
  getBySemester:(tahunId)      => api.get(`/mahasiswa/nilai/${tahunId}`),
  getTranskrip: ()              => api.get('/mahasiswa/transkrip'),

  // Dosen
  getByJadwal:  (jadwalId)     => api.get(`/dosen/nilai/${jadwalId}`),
  store:        (data)          => api.post('/dosen/nilai', data),
  storeHuruf:   (data)          => api.post('/dosen/nilai/huruf', data),
  update:       (id, data)      => api.put(`/dosen/nilai/${id}`, data),
  setBonusKuis: (jadwalId, persen) => api.put(`/dosen/nilai/jadwal/${jadwalId}/bonus-kuis`, { bonus_kuis_persen: persen }),
}

/* Alias — beberapa halaman dosen dulu pakai nama ini */
export const jadwalServiceDosen = {
  getAll: (params) => api.get('/dosen/jadwal', { params }),
}
export const absensiServiceDosen = {
  get:            (jadwalId)          => api.get(`/dosen/absensi/${jadwalId}`),
  bukaPertemuan:  (jadwalId, payload) => api.post(`/dosen/absensi/${jadwalId}`, payload),
  updateStatus:   (id, status)        => api.put(`/dosen/absensi/${id}`, { status }),
}

/* ════════════════════════════════════════════════════════════
   PEMBAYARAN
════════════════════════════════════════════════════════════ */
export const pembayaranService = {
  // Mahasiswa — GET tagihan aktif & riwayat
  get:              ()      => api.get('/mahasiswa/pembayaran'),

  // Step 1: Mulai pembayaran — pilih metode & input nominal
  // Response: { deadline_konfirmasi, menit_tersisa }
  mulai:            (data)  => api.post('/mahasiswa/pembayaran/mulai', data),

  // Step 2: Konfirmasi sudah bayar — sistem cek nominal & deadline lalu tandai lunas
  konfirmasi:       (data)  => api.post('/mahasiswa/pembayaran/konfirmasi', data),

  // Admin
  adminGetAll:      (params)=> api.get('/admin/pembayaran', { params }),
  markLunas:        (id)    => api.put(`/admin/pembayaran/${id}/lunas`),
  resetTagihan:     (id)    => api.put(`/admin/pembayaran/${id}/reset`),
  generateTagihan:  (data)  => api.post('/admin/pembayaran/generate', data),
}

/* ════════════════════════════════════════════════════════════
   E-LEARNING
════════════════════════════════════════════════════════════ */
export const elearningService = {
  // Mahasiswa
  getMatkul:      ()              => api.get('/mahasiswa/elearning'),
  getMateri:      (jadwalId)     => api.get(`/mahasiswa/elearning/${jadwalId}/materi`),
  downloadMateri: (id)            => api.get(`/mahasiswa/elearning/materi/${id}/download`, { responseType: 'blob' }),
  getTugas:       (jadwalId)     => api.get(`/mahasiswa/elearning/${jadwalId}/tugas`),
  submitTugas:    (tugasId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return apiUpload(`/mahasiswa/elearning/tugas/${tugasId}/submit`, fd)
  },
  getKuis:        (jadwalId)     => api.get(`/mahasiswa/elearning/${jadwalId}/kuis`),
  getSoalKuis:    (kuisId)       => api.get(`/mahasiswa/elearning/kuis/${kuisId}/soal`),
  submitKuis:     (kuisId, jawaban) => api.post(`/mahasiswa/elearning/kuis/${kuisId}/submit`, { jawaban }),

  // Dosen
  uploadMateri:   (data)          => {
    const fd = new FormData()
    Object.entries(data).forEach(([k, v]) => fd.append(k, v))
    return apiUpload('/dosen/elearning/materi', fd)
  },
  deleteMateri:   (id)            => api.delete(`/dosen/elearning/materi/${id}`),
  buatTugas:      (data)          => api.post('/dosen/elearning/tugas', data),
  updateTugas:    (id, data)      => api.put(`/dosen/elearning/tugas/${id}`, data),
  getSubmission:  (tugasId)       => api.get(`/dosen/elearning/tugas/${tugasId}/submission`),
  nilaiTugas:     (subId, data)   => api.put(`/dosen/elearning/submission/${subId}/nilai`, data),
  buatKuis:       (data)          => api.post('/dosen/elearning/kuis', data),
  hasilKuis:      (kuisId)        => api.get(`/dosen/elearning/kuis/${kuisId}/hasil`),
}

/* ════════════════════════════════════════════════════════════
   ABSENSI
════════════════════════════════════════════════════════════ */
export const absensiService = {
  // Mahasiswa
  get:            (jadwalId)     => api.get(`/mahasiswa/absensi/${jadwalId}`),
  absenOnline:    (jadwalId)     => api.post(`/mahasiswa/absensi/${jadwalId}/online`),
  // Fix11: mahasiswa tandai diri sendiri hadir (kuliah digital/hybrid)
  checkIn:        (jadwalId)     => api.post(`/mahasiswa/absensi/${jadwalId}/check-in`),

  // Dosen
  dosenGet:       (jadwalId)     => api.get(`/dosen/absensi/${jadwalId}`),
  bukaPertemuan:  (jadwalId, data) => api.post(`/dosen/absensi/${jadwalId}`, data),
  updateStatus:   (id, status)   => api.put(`/dosen/absensi/${id}`, { status }),
}

/* ════════════════════════════════════════════════════════════
   NOTIFIKASI — MAHASISWA
   Batch 7b: dibersihkan, fungsi admin dipindah ke adminService
════════════════════════════════════════════════════════════ */
export const notifikasiService = {
  get:          (params)  => api.get('/mahasiswa/notifikasi', { params }),
  markRead:     (id)      => api.put(`/mahasiswa/notifikasi/${id}/baca`),
  markAllRead:  ()        => api.put('/mahasiswa/notifikasi/baca-semua'),
  destroy:      (id)      => api.delete(`/mahasiswa/notifikasi/${id}`),
}

/* ════════════════════════════════════════════════════════════
   NOTIFIKASI — DOSEN
════════════════════════════════════════════════════════════ */
export const notifikasiServiceDosen = {
  get:         (params) => api.get('/dosen/notifikasi', { params }),
  markRead:    (id)     => api.put(`/dosen/notifikasi/${id}/baca`),
  markAllRead: ()       => api.put('/dosen/notifikasi/baca-semua'),
  destroy:     (id)     => api.delete(`/dosen/notifikasi/${id}`),
}

/* ════════════════════════════════════════════════════════════
   ADMIN
════════════════════════════════════════════════════════════ */
export const adminService = {
  getDashboard:   ()              => api.get('/admin/dashboard'),
  getOnlineUsers: ()              => api.get('/admin/online-users').then(r => r.data.data),
  getProfil:      ()              => api.get('/admin/profil'),
  updateProfil:   (data)          => api.put('/admin/profil', data),

  // Mahasiswa
  getMahasiswa:   (params)        => api.get('/admin/mahasiswa', { params }),
  getMahasiswaById:(id)           => api.get(`/admin/mahasiswa/${id}`),
  storeMahasiswa: (data)          => api.post('/admin/mahasiswa', data),
  updateMahasiswa:(id, data)      => api.put(`/admin/mahasiswa/${id}`, data),
  deleteMahasiswa:(id)            => api.delete(`/admin/mahasiswa/${id}`),
  forceDeleteMahasiswa:(id)       => api.delete(`/admin/mahasiswa/${id}/force`),
  resetPwMahasiswa:(id)           => api.put(`/admin/mahasiswa/${id}/reset-password`),
  resetPasswordMassal:()           => api.put('/admin/reset-password-massal'),
  activateMahasiswa:(id)          => api.put(`/admin/mahasiswa/${id}/activate`),

  // Dosen
  getDosen:          (params) => api.get('/admin/dosen', { params }),
  getDosenById:      (id)     => api.get(`/admin/dosen/${id}`),
  storeDosen:        (data)   => api.post('/admin/dosen', data),
  updateDosen:       (id, d)  => api.put(`/admin/dosen/${id}`, d),
  deleteDosen:       (id)     => api.delete(`/admin/dosen/${id}`),
  forceDeleteDosen:  (id)     => api.delete(`/admin/dosen/${id}/force`),
  resetPwDosen:      (id)     => api.put(`/admin/dosen/${id}/reset-password`),
  activateDosen:     (id)     => api.put(`/admin/dosen/${id}/activate`),

  // Fakultas
  getFakultas:    ()              => api.get('/admin/fakultas'),
  storeFakultas:  (data)          => api.post('/admin/fakultas', data),
  updateFakultas: (id, data)      => api.put(`/admin/fakultas/${id}`, data),
  deleteFakultas: (id)            => api.delete(`/admin/fakultas/${id}`),

  // Prodi
  getProdi:       (params)        => api.get('/admin/prodi', { params }),
  storeProdi:     (data)          => api.post('/admin/prodi', data),
  updateProdi:    (id, data)      => api.put(`/admin/prodi/${id}`, data),
  deleteProdi:    (id)            => api.delete(`/admin/prodi/${id}`),
  toggleProdi:    (id)            => api.patch(`/admin/prodi/${id}/toggle`),

  // Matkul
  getMatkul:      (params)        => api.get('/admin/matkul', { params }),
  storeMatkul:    (data)          => api.post('/admin/matkul', data),
  updateMatkul:   (id, data)      => api.put(`/admin/matkul/${id}`, data),
  toggleMatkul:   (id)            => api.patch(`/admin/matkul/${id}/toggle`),
  deleteMatkul:   (id)            => api.delete(`/admin/matkul/${id}`),

  // Ruangan
  getRuangan:     ()              => api.get('/admin/ruangan'),
  storeRuangan:   (data)          => api.post('/admin/ruangan', data),
  updateRuangan:  (id, data)      => api.put(`/admin/ruangan/${id}`, data),
  toggleRuangan:  (id)            => api.patch(`/admin/ruangan/${id}/toggle`),
  deleteRuangan:  (id)            => api.delete(`/admin/ruangan/${id}`),

  // Jadwal
  getJadwal:      (params)        => api.get('/admin/jadwal', { params }),
  storeJadwal:    (data)          => api.post('/admin/jadwal', data),
  updateJadwal:   (id, data)      => api.put(`/admin/jadwal/${id}`, data),
  deleteJadwal:   (id)            => api.delete(`/admin/jadwal/${id}`),

  // Tahun Akademik
  getTahun:       ()              => api.get('/admin/tahun-akademik'),
  storeTahun:     (data)          => api.post('/admin/tahun-akademik', data),
  aktifkanTahun:  (id)            => api.put(`/admin/tahun-akademik/${id}/aktif`),
  deleteTahun:    (id)            => api.delete(`/admin/tahun-akademik/${id}`),

  // KRS
  getKrs:         (params)        => api.get('/admin/krs', { params }),
  lockKrs:        (id)            => api.put(`/admin/krs/${id}/lock`),
  unlockKrs:      (id)            => api.put(`/admin/krs/${id}/unlock`),

  // Pembayaran
  getPembayaran:  (params)        => api.get('/admin/pembayaran', { params }),

  // Notifikasi
  broadcast:              (data) => api.post('/admin/notifikasi/broadcast', data),
  getBroadcastHistory:    ()     => api.get('/admin/notifikasi/broadcast-history'),
  resendBroadcast:        (id)   => api.post(`/admin/notifikasi/broadcast/${id}/resend`),
  deleteBroadcastLog:     (id)   => api.delete(`/admin/notifikasi/broadcast/${id}`),
  getNotifikasi:  (params)        => api.get('/admin/notifikasi', { params }),
  markNotifRead:  (id)            => api.put(`/admin/notifikasi/${id}/baca`),
  markAllNotifRead: ()            => api.put('/admin/notifikasi/baca-semua'),
  destroyNotif:   (id)            => api.delete(`/admin/notifikasi/${id}`),
}


/* ════════════════════════════════════════════════════════════
   LANDING CMS — Public + Admin
════════════════════════════════════════════════════════════ */
export const landingService = {
  // Public — ambil semua konten landing
  getAll:   ()          => api.get('/landing').then(r => r.data.data),

  // Admin CRUD
  getList:  (tipe)      => api.get('/admin/landing', { params: { tipe } }).then(r => r.data.data),
  store:    (data)      => api.post('/admin/landing', data),
  update:   (id, data)  => api.put(`/admin/landing/${id}`, data),
  toggle:   (id)        => api.patch(`/admin/landing/${id}/toggle`),
  destroy:  (id)        => api.delete(`/admin/landing/${id}`),
  reorder:  (items)     => api.post('/admin/landing/reorder', { items }),
}

/* ════════════════════════════════════════════════════════════
   DOSEN PROFIL
════════════════════════════════════════════════════════════ */
export const dosenService = {
  getProfil:    ()     => api.get('/dosen/profil'),
  updateProfil: (data) => api.put('/dosen/profil', data),
  uploadFoto:   (file) => {
    const fd = new FormData()
    fd.append('foto', file)
    return apiUpload('/dosen/profil/foto', fd)
  },
  deleteFoto:   ()     => api.delete('/dosen/profil/foto'),
}

/* ════════════════════════════════════════════════════════════
   E-LEARNING — DOSEN (alias lengkap)
════════════════════════════════════════════════════════════ */
export const elearningServiceDosen = {
  getMateri:     (id)       => api.get(`/dosen/elearning/${id}/materi`),
  uploadMateri:  (data)     => {
    const fd = new FormData()
    Object.entries(data).forEach(([k, v]) => fd.append(k, v))
    return apiUpload('/dosen/elearning/materi', fd)
  },
  deleteMateri:  (id)       => api.delete(`/dosen/elearning/materi/${id}`),
  getTugas:      (id)       => api.get(`/dosen/elearning/${id}/tugas`),
  buatTugas:     (data)     => api.post('/dosen/elearning/tugas', data),
  getSubmission: (id)       => api.get(`/dosen/elearning/tugas/${id}/submission`),
  nilaiTugas:    (id, data) => api.put(`/dosen/elearning/submission/${id}/nilai`, data),
  getKuis:       (id)       => api.get(`/dosen/elearning/${id}/kuis`),
  buatKuis:      (data)     => api.post('/dosen/elearning/kuis', data),
  hasilKuis:     (id)       => api.get(`/dosen/elearning/kuis/${id}/hasil`),
}

/* ════════════════════════════════════════════════════════════
   FAKULTAS (admin shortcut)
════════════════════════════════════════════════════════════ */
export const fakultasService = {
  getAll:    ()       => api.get('/admin/fakultas'),
  store:     (data)   => api.post('/admin/fakultas', data),
  update:    (id, d)  => api.put(`/admin/fakultas/${id}`, d),
  destroy:   (id)     => api.delete(`/admin/fakultas/${id}`),
}

/* ════════════════════════════════════════════════════════════
   PUSH NOTIFICATION — diperlukan oleh usePushNotification.js
════════════════════════════════════════════════════════════ */
export const pushService = {
  getVapidKey: ()          => api.get('/push/vapid-public-key'),
  subscribe:   (subObject) => api.post('/push/subscribe', subObject),
  unsubscribe: (endpoint)  => api.delete('/push/unsubscribe', { data: { endpoint } }),
  sendTest:    ()          => api.post('/push/test'),
}
