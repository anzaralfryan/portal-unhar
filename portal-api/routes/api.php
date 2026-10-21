<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MahasiswaController;
use App\Http\Controllers\Api\DosenController;
use App\Http\Controllers\Api\JadwalController;
use App\Http\Controllers\Api\KrsController;
use App\Http\Controllers\Api\SemesterController;
use App\Http\Controllers\Api\NilaiController;
use App\Http\Controllers\Api\PembayaranController;
use App\Http\Controllers\Api\ElearningController;
use App\Http\Controllers\Api\AbsensiController;
use App\Http\Controllers\Api\NotifikasiController;
use App\Http\Controllers\Api\PushNotificationController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\LandingController;
use App\Http\Controllers\Api\StatsController;

/*
|--------------------------------------------------------------------------
| API Routes — Portal Universitas Harapan Medan
| Prefix  : /api
| Auth    : JWT (tymon/jwt-auth)
| Roles   : mahasiswa | dosen | admin
|--------------------------------------------------------------------------
*/

/* ═══ PUBLIC ══════════════════════════════════════════ */
Route::get('landing', [LandingController::class, 'index']);
Route::get('stats/public', [StatsController::class, 'public']);
Route::prefix('auth')->group(function () {
    Route::post('login',   [AuthController::class, 'login']);
    Route::post('refresh', [AuthController::class, 'refresh']);
});

/* ═══ PUBLIC STORAGE — bypass symlink ═══════════════════
   Foto profil & file publik lain disajikan via route Laravel langsung,
   tanpa perlu `php artisan storage:link`. Reliabel di Windows + production. */
Route::get('storage-file/{path}', function ($path) {
    $full = storage_path('app/public/' . $path);
    if (! file_exists($full) || ! is_file($full)) abort(404);
    // Cegah path traversal (../../etc/passwd)
    $real = realpath($full);
    $base = realpath(storage_path('app/public'));
    if ($real === false || $base === false || strpos($real, $base) !== 0) abort(403);
    return response()->file($real);
})->where('path', '.+');

/* ═══ PROTECTED — JWT valid ═══════════════════════════ */
// Push VAPID key — public, tidak butuh auth
Route::get('push/vapid-public-key', [PushNotificationController::class, 'vapidPublicKey']);

// Lupa password — public, kirim permintaan reset ke admin (tanpa auth)
Route::post('auth/lupa-password', [AuthController::class, 'lupaPassword']);

Route::middleware('auth:api')->group(function () {

    Route::prefix('auth')->group(function () {
        Route::post('logout',   [AuthController::class, 'logout']);
        Route::get('me',        [AuthController::class, 'me']);
        Route::put('password',  [AuthController::class, 'updatePassword']);
    });

    /* ── PUSH NOTIFICATION (semua role yang login) ─────────── */
    Route::post('push/subscribe',    [PushNotificationController::class, 'subscribe']);
    Route::delete('push/unsubscribe',[PushNotificationController::class, 'unsubscribe']);
    Route::post('push/test',         [PushNotificationController::class, 'test']);

    /* ── MAHASISWA ──────────────────────────────────── */
    // ── Chat — semua role authenticated bisa akses ─────────────────
    Route::prefix('chat')->group(function () {
        Route::get('rooms',          [\App\Http\Controllers\Api\ChatController::class, 'rooms']);
        Route::post('rooms',         [\App\Http\Controllers\Api\ChatController::class, 'createOrGetRoom']);
        Route::get('messages',       [\App\Http\Controllers\Api\ChatController::class, 'messages']);
        Route::post('send',          [\App\Http\Controllers\Api\ChatController::class, 'send']);
        Route::get('listen',         [\App\Http\Controllers\Api\ChatController::class, 'listen']);
        Route::post('rooms/{id}/read',[\App\Http\Controllers\Api\ChatController::class, 'markRead']);
        Route::get('contacts',       [\App\Http\Controllers\Api\ChatController::class, 'contacts']);
    });

    Route::middleware('role:mahasiswa')->prefix('mahasiswa')->group(function () {

        // Profil
        Route::get('profil',                    [MahasiswaController::class, 'profil']);
        Route::put('profil',                    [MahasiswaController::class, 'updateProfil']);
        Route::post('profil/foto',              [MahasiswaController::class, 'uploadFoto']);
        Route::delete('profil/foto',              [MahasiswaController::class, 'deleteFoto']);

        // Jadwal
        Route::get('jadwal',                    [JadwalController::class, 'mahasiswaJadwal']);

        // Shared — tahun akademik aktif (dipakai semua role)
        Route::get('tahun-aktif',   [SemesterController::class, 'tahunAktif']);
        Route::get('semua-tahun',   [SemesterController::class, 'semuaTahun']);

        // KRS
        Route::get('krs',                       [KrsController::class, 'index']);
        Route::get('krs/{tahunId}',             [KrsController::class, 'show']);
        Route::post('krs',                      [KrsController::class, 'store']);
        Route::post('krs/{id}/matkul',          [KrsController::class, 'addMatkul']);
        Route::delete('krs/{id}/matkul/{jId}',  [KrsController::class, 'removeMatkul']);
        Route::post('krs/{id}/submit',          [KrsController::class, 'submit']);
        Route::post('krs/{id}/request-unlock',  [KrsController::class, 'requestUnlock']);

        // Nilai
        Route::get('nilai',                     [NilaiController::class, 'mahasiswaNilai']);
        Route::get('transkrip',                 [NilaiController::class, 'transkrip']);
        Route::get('nilai/{tahunId}',           [NilaiController::class, 'bySemester']);

        // Pembayaran
        Route::get('pembayaran',                    [PembayaranController::class, 'index']);
        Route::post('pembayaran',                    [PembayaranController::class, 'store']);          // backward compat
        Route::post('pembayaran/mulai',              [PembayaranController::class, 'mulaiPembayaran']);
        Route::post('pembayaran/konfirmasi',         [PembayaranController::class, 'konfirmasiPembayaran']);
        Route::post('pembayaran/{id}/bukti',     [PembayaranController::class, 'uploadBukti']);

        // E-Learning
        Route::get('elearning',                             [ElearningController::class, 'matkul']);
        Route::get('elearning/{jadwalId}/materi',           [ElearningController::class, 'materi']);
        Route::get('elearning/materi/{id}/download',        [ElearningController::class, 'downloadMateri']);
        Route::get('elearning/{jadwalId}/tugas',            [ElearningController::class, 'tugas']);
        Route::post('elearning/tugas/{tugasId}/submit',     [ElearningController::class, 'submitTugas']);
        Route::get('elearning/{jadwalId}/kuis',             [ElearningController::class, 'kuis']);
        Route::get('elearning/kuis/{kuisId}/soal',          [ElearningController::class, 'soalKuis']);
        Route::post('elearning/kuis/{kuisId}/submit',       [ElearningController::class, 'submitKuis']);

        // Absensi
        Route::get('absensi/{jadwalId}',                    [AbsensiController::class, 'mahasiswaAbsensi']);
        Route::post('absensi/{jadwalId}/online',            [AbsensiController::class, 'absenOnline']);
        // Fix11: mahasiswa tandai diri sendiri hadir (untuk kuliah digital/hybrid)
        Route::post('absensi/{jadwalId}/check-in',          [AbsensiController::class, 'checkIn']);

        // Notifikasi
        Route::get('notifikasi',                            [NotifikasiController::class, 'index']);
        // PENTING: 'baca-semua' harus di atas '{id}/baca' agar tidak ditangkap sebagai {id}
        Route::put('notifikasi/baca-semua',                 [NotifikasiController::class, 'markAllRead']);
        Route::put('notifikasi/{id}/baca',                  [NotifikasiController::class, 'markRead']);
        Route::delete('notifikasi/{id}',                    [NotifikasiController::class, 'destroy']);
    });

    /* ── DOSEN ──────────────────────────────────────── */
    Route::middleware('role:dosen')->prefix('dosen')->group(function () {

        Route::get('profil',                    [DosenController::class, 'profil']);
        Route::put('profil',                    [DosenController::class, 'updateProfil']);
        Route::post('profil/foto',              [DosenController::class, 'uploadFoto']);
        Route::delete('profil/foto',              [DosenController::class, 'deleteFoto']);

        Route::get('jadwal',                    [JadwalController::class, 'dosenJadwal']);

        Route::put('nilai/jadwal/{jadwalId}/bonus-kuis', [NilaiController::class, 'setBonusKuis']);
        Route::get('nilai/{jadwalId}',          [NilaiController::class, 'byJadwal']);
        Route::post('nilai',                    [NilaiController::class, 'store']);
        Route::post('nilai/huruf',              [NilaiController::class, 'storeHuruf']);
        Route::put('nilai/{id}',                [NilaiController::class, 'update']);

        Route::get('absensi/{jadwalId}',        [AbsensiController::class, 'dosenAbsensi']);
        Route::post('absensi/{jadwalId}',       [AbsensiController::class, 'bukaPertemuan']);
        Route::put('absensi/{id}',              [AbsensiController::class, 'updateStatus']);

        Route::post('elearning/materi',                 [ElearningController::class, 'uploadMateri']);
        Route::delete('elearning/materi/{id}',          [ElearningController::class, 'deleteMateri']);
        Route::get('elearning/{jadwalId}/materi',       [ElearningController::class, 'dosenMateri']);
        Route::get('elearning/{jadwalId}/tugas',        [ElearningController::class, 'dosenTugas']);
        Route::get('elearning/{jadwalId}/kuis',         [ElearningController::class, 'dosenKuis']);
        Route::post('elearning/tugas',                  [ElearningController::class, 'buatTugas']);
        Route::put('elearning/tugas/{id}',              [ElearningController::class, 'updateTugas']);
        Route::get('elearning/tugas/{id}/submission',   [ElearningController::class, 'lihatSubmission']);
        Route::put('elearning/submission/{id}/nilai',   [ElearningController::class, 'nilaiTugas']);
        Route::post('elearning/kuis',                   [ElearningController::class, 'buatKuis']);
        Route::get('elearning/kuis/{id}/hasil',         [ElearningController::class, 'hasilKuis']);

        Route::get('notifikasi',                [NotifikasiController::class, 'index']);
        // PENTING: 'baca-semua' harus di atas '{id}/baca' agar tidak ditangkap sebagai {id}
        Route::put('notifikasi/baca-semua',     [NotifikasiController::class, 'markAllRead']);
        Route::put('notifikasi/{id}/baca',      [NotifikasiController::class, 'markRead']);
        Route::delete('notifikasi/{id}',        [NotifikasiController::class, 'destroy']);
    });

    /* ── ADMIN ──────────────────────────────────────── */
    Route::middleware('role:admin')->prefix('admin')->group(function () {

        Route::get('dashboard',                  [AdminController::class, 'dashboard']);
        Route::get('online-users',               [AdminController::class, 'onlineUsers']);
        Route::get('profil',                     [AdminController::class, 'profil']);
        Route::put('profil',                     [AdminController::class, 'updateProfil']);

        // Tambah admin baru
        Route::post('admin',                     [AdminController::class, 'storeAdmin']);

        Route::get('mahasiswa',                  [AdminController::class, 'mahasiswaIndex']);
        Route::get('mahasiswa/{id}',             [AdminController::class, 'mahasiswaShow']);
        Route::post('mahasiswa',                 [AdminController::class, 'mahasiswaStore']);
        Route::put('mahasiswa/{id}',             [AdminController::class, 'mahasiswaUpdate']);
        Route::delete('mahasiswa/{id}',          [AdminController::class, 'mahasiswaDestroy']);
        Route::delete('mahasiswa/{id}/force',    [AdminController::class, 'mahasiswaForceDelete']);
        Route::put('mahasiswa/{id}/reset-password', [AdminController::class, 'resetPasswordMahasiswa']);
        Route::put('mahasiswa/{id}/activate',    [AdminController::class, 'mahasiswaActivate']);

        Route::get('dosen',                      [AdminController::class, 'dosenIndex']);
        Route::get('dosen/{id}',                 [AdminController::class, 'dosenShow']);
        Route::post('dosen',                     [AdminController::class, 'dosenStore']);
        Route::put('dosen/{id}',                 [AdminController::class, 'dosenUpdate']);
        Route::delete('dosen/{id}',              [AdminController::class, 'dosenDestroy']);
        Route::delete('dosen/{id}/force',        [AdminController::class, 'dosenForceDelete']);
        Route::put('dosen/{id}/reset-password',     [AdminController::class, 'resetPasswordDosen']);
        Route::put('dosen/{id}/activate',        [AdminController::class, 'dosenActivate']);

        Route::put('reset-password-massal',     [AdminController::class, 'resetPasswordMassal']);

        Route::get('fakultas',                   [AdminController::class, 'fakultasIndex']);
        Route::post('fakultas',                  [AdminController::class, 'fakultasStore']);
        Route::put('fakultas/{id}',              [AdminController::class, 'fakultasUpdate']);
        Route::delete('fakultas/{id}',           [AdminController::class, 'fakultasDestroy']);

        Route::get('prodi',                      [AdminController::class, 'prodiIndex']);
        Route::post('prodi',                     [AdminController::class, 'prodiStore']);
        Route::put('prodi/{id}',                 [AdminController::class, 'prodiUpdate']);
        Route::patch('prodi/{id}/toggle',        [AdminController::class, 'prodiToggle']);
        Route::delete('prodi/{id}',              [AdminController::class, 'prodiDestroy']);

        Route::get('matkul',                     [AdminController::class, 'matkulIndex']);
        Route::post('matkul',                    [AdminController::class, 'matkulStore']);
        Route::put('matkul/{id}',                [AdminController::class, 'matkulUpdate']);
        Route::patch('matkul/{id}/toggle',       [AdminController::class, 'matkulToggle']);
        Route::delete('matkul/{id}',             [AdminController::class, 'matkulDestroy']);

        // Ruangan
        Route::get('ruangan',                    [AdminController::class, 'ruanganIndex']);
        Route::post('ruangan',                   [AdminController::class, 'ruanganStore']);
        Route::put('ruangan/{id}',               [AdminController::class, 'ruanganUpdate']);
        Route::patch('ruangan/{id}/toggle',      [AdminController::class, 'ruanganToggle']);
        Route::delete('ruangan/{id}',            [AdminController::class, 'ruanganDestroy']);

        Route::get('jadwal',                     [AdminController::class, 'jadwalIndex']);
        Route::post('jadwal',                    [AdminController::class, 'jadwalStore']);
        Route::put('jadwal/{id}',                [AdminController::class, 'jadwalUpdate']);
        Route::delete('jadwal/{id}',             [AdminController::class, 'jadwalDestroy']);

        Route::get('tahun-akademik',             [AdminController::class, 'tahunIndex']);
        Route::post('tahun-akademik',            [AdminController::class, 'tahunStore']);
        Route::put('tahun-akademik/{id}/aktif',  [AdminController::class, 'tahunAktifkan']);
        Route::delete('tahun-akademik/{id}',     [AdminController::class, 'tahunDestroy']);

        Route::get('krs',                        [KrsController::class, 'adminIndex']);

        // Kenaikan Semester
        Route::post('semester/preview',  [SemesterController::class, 'naikkanSemester']); // dry_run=true
        Route::post('semester/naikkan',  [SemesterController::class, 'naikkanSemester']);
        Route::get('krs/{id}/detail',            [KrsController::class, 'adminDetail']);
        Route::post('krs/{id}/matkul',           [KrsController::class, 'adminAddMatkul']);
        Route::delete('krs/{id}/matkul/{jadwalId}', [KrsController::class, 'adminRemoveMatkul']);
        Route::put('krs/{id}/lock',              [KrsController::class, 'lock']);
        Route::put('krs/{id}/unlock',            [KrsController::class, 'unlock']);

        Route::get('pembayaran',                 [PembayaranController::class, 'adminIndex']);
        Route::put('pembayaran/{id}/lunas',      [PembayaranController::class, 'markLunas']);
        Route::put('pembayaran/{id}/reset',      [PembayaranController::class, 'resetTagihan']);
        // Batch 7b: admin verifikasi bukti pembayaran mahasiswa
        Route::put('pembayaran/{id}/verifikasi', [PembayaranController::class, 'verifikasiBukti']);
        Route::post('pembayaran/generate',       [PembayaranController::class, 'generateTagihan']);

        // Notifikasi (admin juga punya inbox sendiri — terima notif KRS unlock request, dll)
        // PENTING: rute literal (broadcast-history, broadcast, baca-semua) harus SEBELUM wildcard /{id}
        Route::get('notifikasi',                              [NotifikasiController::class, 'index']);
        Route::get('notifikasi/broadcast-history',            [NotifikasiController::class, 'broadcastHistory']);
        Route::post('notifikasi/broadcast',                   [NotifikasiController::class, 'broadcast']);
        Route::post('notifikasi/broadcast/{id}/resend',       [NotifikasiController::class, 'resendBroadcast']);
        Route::delete('notifikasi/broadcast/{id}',            [NotifikasiController::class, 'destroyBroadcast']);
        Route::put('notifikasi/baca-semua',                   [NotifikasiController::class, 'markAllRead']);
        Route::put('notifikasi/{id}/baca',                    [NotifikasiController::class, 'markRead']);
        Route::delete('notifikasi/{id}',                      [NotifikasiController::class, 'destroy']);

        Route::get('landing',                   [LandingController::class, 'adminIndex']);
        Route::post('landing',                  [LandingController::class, 'store']);
        Route::put('landing/{id}',              [LandingController::class, 'update']);
        Route::patch('landing/{id}/toggle',     [LandingController::class, 'toggle']);
        Route::delete('landing/{id}',           [LandingController::class, 'destroy']);
        Route::post('landing/reorder',          [LandingController::class, 'reorder']);

        // (duplikat profil dihapus — Batch 7b fix)
    });
});
