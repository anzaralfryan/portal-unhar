<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WebPushService;
use App\Models\Krs;
use App\Models\KrsDetail;
use App\Models\Jadwal;
use App\Models\TahunAkademik;
use App\Models\Pembayaran;
use App\Models\ChatRoom;
use App\Models\ChatParticipant;
use Illuminate\Http\Request;

class KrsController extends Controller
{
    /** GET /api/mahasiswa/krs — semua KRS mahasiswa */
    public function index()
    {
        $mahasiswa = auth()->user()->mahasiswa;

        $krsList = Krs::where('mahasiswa_id', $mahasiswa->id)
            ->with(['tahunAkademik', 'detail.jadwal.matkul', 'detail.jadwal.dosen.user'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($krs) => $this->formatKrs($krs));

        return response()->json(['success' => true, 'data' => $krsList]);
    }

    /** GET /api/mahasiswa/krs/{tahunId} — KRS semester tertentu */
    public function show(int $tahunId)
    {
        $mahasiswa = auth()->user()->mahasiswa;

        $krs = Krs::where('mahasiswa_id', $mahasiswa->id)
            ->where('tahun_akademik_id', $tahunId)
            ->with(['tahunAkademik', 'detail.jadwal.matkul', 'detail.jadwal.dosen.user'])
            ->firstOrFail();

        // Ambil semua jadwal tersedia (belum dipilih) untuk semester ini
        $dipilihIds = $krs->detail->pluck('jadwal_id')->toArray();
        $tersedia = Jadwal::where('tahun_akademik_id', $tahunId)
            ->whereNotIn('id', $dipilihIds)
            ->with(['matkul', 'dosen.user'])
            ->get()
            ->map(fn($j) => $this->formatJadwal($j))
            ->filter()
            ->values();

        return response()->json([
            'success' => true,
            'data'    => [
                'krs'                   => $this->formatKrs($krs),
                'tersedia'              => $tersedia,
                'tersedia_per_semester' => $this->groupJadwalPerSemester($tersedia),
                'semester_mahasiswa'    => $mahasiswa->semester,
            ],
        ]);
    }

    /** POST /api/mahasiswa/krs — buat KRS baru di semester aktif */
    public function store(Request $request)
    {
        $mahasiswa = auth()->user()->mahasiswa;

        $tahun = TahunAkademik::where('is_aktif', true)->firstOrFail();

        if ($belum = $this->cekTagihanBelumLunas($mahasiswa->id, $tahun->id)) {
            return $belum;
        }

        if (Krs::where('mahasiswa_id', $mahasiswa->id)
                ->where('tahun_akademik_id', $tahun->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'KRS untuk semester ini sudah dibuat.',
            ], 422);
        }

        $krs = Krs::create([
            'mahasiswa_id'      => $mahasiswa->id,
            'tahun_akademik_id' => $tahun->id,
            'status'            => 'draft',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'KRS berhasil dibuat.',
            'data'    => $this->formatKrs($krs->load('tahunAkademik')),
        ], 201);
    }

    /** POST /api/mahasiswa/krs/{id}/matkul — tambah matkul ke KRS */
    public function addMatkul(Request $request, int $id)
    {
        $request->validate(['jadwal_id' => 'required|exists:jadwal,id']);

        $krs = Krs::findOrFail($id);
        $this->authorizeKrs($krs);

        if ($belum = $this->cekTagihanBelumLunas($krs->mahasiswa_id, $krs->tahun_akademik_id)) {
            return $belum;
        }

        if ($krs->isLocked()) {
            return response()->json(['success' => false, 'message' => 'KRS sudah terkunci.'], 403);
        }

        $jadwal = Jadwal::with('matkul')->findOrFail($request->jadwal_id);

        // Cek total SKS
        $totalSks = $krs->detail()->with('jadwal.matkul')->get()
            ->sum(fn($d) => $d->jadwal->matkul->sks ?? 0);

        if ($totalSks + $jadwal->matkul->sks > 24) {
            return response()->json(['success' => false, 'message' => 'Batas maksimum 24 SKS terlampaui.'], 422);
        }

        if ($krs->detail()->where('jadwal_id', $request->jadwal_id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Mata kuliah sudah ada di KRS.'], 422);
        }

        $krs->detail()->create(['jadwal_id' => $request->jadwal_id]);

        return response()->json([
            'success' => true,
            'message' => 'Mata kuliah berhasil ditambahkan.',
            'data'    => $this->formatKrs($krs->fresh(['detail.jadwal.matkul', 'detail.jadwal.dosen.user', 'tahunAkademik'])),
        ]);
    }

    /** DELETE /api/mahasiswa/krs/{id}/matkul/{jId} — hapus matkul dari KRS */
    public function removeMatkul(int $id, int $jId)
    {
        $krs = Krs::findOrFail($id);
        $this->authorizeKrs($krs);

        if ($krs->isLocked()) {
            return response()->json(['success' => false, 'message' => 'KRS sudah terkunci. Hubungi Admin Prodi.'], 403);
        }

        $deleted = $krs->detail()->where('jadwal_id', $jId)->delete();

        if (! $deleted) {
            return response()->json(['success' => false, 'message' => 'Mata kuliah tidak ditemukan.'], 404);
        }

        return response()->json(['success' => true, 'message' => 'Mata kuliah berhasil dihapus dari KRS.']);
    }

    /** GET /api/admin/krs */
    public function adminIndex(Request $request)
    {
        $query = Krs::with(['mahasiswa.user', 'tahunAkademik', 'detail'])
            ->orderByDesc('updated_at');

        if ($request->filled('tahun_id')) {
            $query->where('tahun_akademik_id', $request->tahun_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json([
            'success' => true,
            'data'    => $query->paginate(20),
        ]);
    }

    /** PUT /api/admin/krs/{id}/lock */
    public function lock(int $id)
    {
        $krs = Krs::with('mahasiswa')->findOrFail($id);
        $krs->update(['status' => 'locked']);

        // Sinkronkan grup chat per mata kuliah untuk setiap jadwal di KRS ini
        $this->syncGroupChatsForKrs($krs);

        // Buat notifikasi in-app + Web Push ke MAHASISWA (bukan admin yang mengunci)
        $mhsUserId = $krs->mahasiswa?->user_id;
        if ($mhsUserId) {
            try {
                \App\Models\Notifikasi::create([
                    'user_id' => $mhsUserId,
                    'judul'   => 'KRS Berhasil Dikunci',
                    'isi'     => 'KRS semester ini sudah dikunci oleh Admin.',
                    'tipe'    => 'KRS',
                    'is_read' => false,
                ]);
                app(WebPushService::class)->sendToUser($mhsUserId, [
                    'judul' => '✅ KRS Dikunci',
                    'isi'   => 'KRS semester ini sudah dikunci oleh Admin.',
                    'url'   => '/mahasiswa/krs',
                    'tag'   => 'krs-lock',
                ]);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('[WebPush] KRS lock gagal: ' . $e->getMessage());
            }
        }

        return response()->json(['success' => true, 'message' => 'KRS berhasil dikunci.']);
    }

    /** PUT /api/admin/krs/{id}/unlock */
    public function unlock(int $id)
    {
        $krs = Krs::findOrFail($id);
        $krs->update(['status' => 'draft']);
        return response()->json(['success' => true, 'message' => 'KRS berhasil dibuka kembali.']);
    }

    /**
     * GET /api/admin/krs/{id}/detail — admin lihat detail KRS mahasiswa lengkap
     * (matkul dipilih + jadwal tersedia di tahun akademik yang sama).
     */
    public function adminDetail(int $id)
    {
        $krs = Krs::with(['mahasiswa.user', 'mahasiswa.prodi', 'tahunAkademik', 'detail.jadwal.matkul', 'detail.jadwal.dosen.user'])
            ->findOrFail($id);

        // Ambil semua jadwal tersedia (belum dipilih) untuk semester ini
        // Admin bisa lihat semua jadwal tanpa filter semester
        $dipilihIds = $krs->detail->pluck('jadwal_id')->toArray();
        $tersedia = Jadwal::where('tahun_akademik_id', $krs->tahun_akademik_id)
            ->whereNotIn('id', $dipilihIds)
            ->with(['matkul', 'dosen.user'])
            ->get()
            ->map(fn($j) => $this->formatJadwal($j))
            ->filter()
            ->values();

        // Kelompokkan per semester untuk tampilan admin
        $tersediaPerSemester = $this->groupJadwalPerSemester($tersedia);

        return response()->json([
            'success' => true,
            'data' => [
                'krs' => array_merge(
                    $this->formatKrs($krs),
                    [
                        'mahasiswa' => [
                            'id'       => $krs->mahasiswa?->id,
                            'nim'      => $krs->mahasiswa?->nim,
                            'nama'     => $krs->mahasiswa?->user?->name,
                            'prodi'    => $krs->mahasiswa?->prodi?->nama,
                            'semester' => $krs->mahasiswa?->semester,
                        ],
                    ]
                ),
                'tersedia'              => $tersedia->values(),
                'tersedia_per_semester' => $tersediaPerSemester,
            ],
        ]);
    }

    /**
     * POST /api/admin/krs/{id}/matkul — admin tambah matkul ke KRS mahasiswa,
     * boleh meski KRS sudah locked (intervensi admin).
     */
    public function adminAddMatkul(Request $request, int $id)
    {
        $request->validate(['jadwal_id' => 'required|exists:jadwal,id']);

        $krs = Krs::with('detail.jadwal.matkul')->findOrFail($id);
        $jadwal = Jadwal::with('matkul')->findOrFail($request->jadwal_id);

        // Pastikan jadwal di tahun akademik yang sama dengan KRS
        if ($jadwal->tahun_akademik_id !== $krs->tahun_akademik_id) {
            return response()->json([
                'success' => false,
                'message' => 'Jadwal harus di tahun akademik yang sama dengan KRS.',
            ], 422);
        }

        // Cek duplikat
        if ($krs->detail()->where('jadwal_id', $request->jadwal_id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Matkul sudah ada di KRS.'], 422);
        }

        // Cek total SKS
        $totalSks = $krs->detail->sum(fn($d) => $d->jadwal->matkul->sks ?? 0);
        if ($totalSks + $jadwal->matkul->sks > 24) {
            return response()->json(['success' => false, 'message' => 'Batas maksimum 24 SKS terlampaui.'], 422);
        }

        $krs->detail()->create(['jadwal_id' => $request->jadwal_id]);

        // Notifikasi ke mahasiswa
        $mhsUser = $krs->mahasiswa?->user;
        if ($mhsUser) {
            \App\Models\Notifikasi::create([
                'user_id' => $mhsUser->id,
                'judul'   => 'KRS Diubah oleh Admin',
                'isi'     => "Admin menambahkan mata kuliah {$jadwal->matkul->nama} ke KRS Anda.",
                'tipe'    => 'Akademik',
                'is_read' => false,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => "Mata kuliah {$jadwal->matkul->nama} berhasil ditambahkan.",
        ]);
    }

    /**
     * DELETE /api/admin/krs/{id}/matkul/{jadwalId} — admin hapus matkul dari KRS mahasiswa,
     * boleh meski KRS sudah locked.
     */
    public function adminRemoveMatkul(int $id, int $jadwalId)
    {
        $krs = Krs::with('mahasiswa.user')->findOrFail($id);
        $jadwal = Jadwal::with('matkul')->find($jadwalId);

        $deleted = $krs->detail()->where('jadwal_id', $jadwalId)->delete();
        if (! $deleted) {
            return response()->json(['success' => false, 'message' => 'Matkul tidak ditemukan di KRS.'], 404);
        }

        // Notifikasi ke mahasiswa
        $mhsUser = $krs->mahasiswa?->user;
        if ($mhsUser && $jadwal) {
            \App\Models\Notifikasi::create([
                'user_id' => $mhsUser->id,
                'judul'   => 'KRS Diubah oleh Admin',
                'isi'     => "Admin menghapus mata kuliah {$jadwal->matkul?->nama} dari KRS Anda.",
                'tipe'    => 'Akademik',
                'is_read' => false,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Mata kuliah berhasil dihapus dari KRS.',
        ]);
    }

    /**
     * POST /api/mahasiswa/krs/{id}/submit
     * Mahasiswa mengunci KRS sendiri — langsung berstatus LOCKED (terverifikasi otomatis).
     * Admin tidak perlu verifikasi manual lagi. Group chat otomatis dibuat.
     * Mahasiswa tetap bisa minta buka kunci lewat requestUnlock().
     */
    public function submit(int $id)
    {
        $krs = Krs::with(['mahasiswa.user', 'tahunAkademik', 'detail'])->findOrFail($id);
        $this->authorizeKrs($krs);

        if ($krs->isLocked()) {
            return response()->json([
                'success' => false,
                'message' => 'KRS sudah terkunci.',
            ], 422);
        }

        if ($krs->detail->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'KRS masih kosong. Tambahkan minimal 1 mata kuliah sebelum mengunci.',
            ], 422);
        }

        if ($belum = $this->cekTagihanBelumLunas($krs->mahasiswa_id, $krs->tahun_akademik_id)) {
            return $belum;
        }

        // Langsung kunci — diverifikasi otomatis oleh sistem
        $krs->update(['status' => 'locked']);

        // Sinkronkan grup chat mata kuliah otomatis
        $this->syncGroupChatsForKrs($krs->fresh('detail.jadwal.matkul'));

        // Notifikasi konfirmasi ke mahasiswa sendiri
        try {
            \App\Models\Notifikasi::create([
                'user_id' => $krs->mahasiswa->user_id,
                'judul'   => '✅ KRS Berhasil Dikunci',
                'isi'     => 'KRS Anda telah dikunci dan terverifikasi otomatis oleh sistem. Tidak perlu menunggu verifikasi Admin.',
                'tipe'    => 'KRS',
                'is_read' => false,
            ]);
            app(WebPushService::class)->sendToUser($krs->mahasiswa->user_id, [
                'judul' => '✅ KRS Terkunci & Terverifikasi',
                'isi'   => 'KRS sudah dikunci otomatis. Untuk perubahan, gunakan fitur Minta Buka Kunci.',
                'url'   => '/mahasiswa/krs',
                'tag'   => 'krs-submit',
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('[WebPush] KRS submit gagal: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'KRS berhasil dikunci dan terverifikasi otomatis oleh sistem.',
            'data'    => $this->formatKrs($krs->fresh(['detail.jadwal.matkul','detail.jadwal.dosen.user','tahunAkademik'])),
        ]);
    }

    /**
     * POST /api/mahasiswa/krs/{id}/request-unlock
     * Mahasiswa meminta Admin membuka kunci KRS agar bisa diubah sendiri.
     * Terima juga parameter opsional: tipe = 'buka_kunci' | 'minta_admin_ubah'
     * dan 'catatan' untuk penjelasan ke admin.
     */
    public function requestUnlock(Request $request, int $id)
    {
        $krs = Krs::with(['mahasiswa.user', 'tahunAkademik'])->findOrFail($id);
        $this->authorizeKrs($krs);

        if (! $krs->isLocked()) {
            return response()->json([
                'success' => false,
                'message' => 'KRS belum terkunci.',
            ], 422);
        }

        $tipe    = $request->input('tipe', 'buka_kunci'); // 'buka_kunci' | 'minta_admin_ubah'
        $catatan = $request->input('catatan', '');

        $mhsNama = $krs->mahasiswa->user->name ?? '-';
        $mhsNim  = $krs->mahasiswa->nim ?? '-';
        $tahun   = $krs->tahunAkademik?->label ?? '';

        if ($tipe === 'minta_admin_ubah') {
            $judul = 'Permintaan Admin Ubah KRS';
            $isi   = "Mahasiswa {$mhsNama} ({$mhsNim}) meminta Admin untuk mengubah KRS {$tahun} langsung." .
                     ($catatan ? " Catatan: {$catatan}" : '');
        } else {
            $judul = 'Permintaan Buka Kunci KRS';
            $isi   = "Mahasiswa {$mhsNama} ({$mhsNim}) meminta buka kunci KRS {$tahun} untuk diubah sendiri." .
                     ($catatan ? " Catatan: {$catatan}" : '');
        }

        $admins = \App\Models\User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            \App\Models\Notifikasi::create([
                'user_id' => $admin->id,
                'judul'   => $judul,
                'isi'     => $isi,
                'tipe'    => 'Akademik',
                'is_read' => false,
            ]);
        }

        $pesanBalik = $tipe === 'minta_admin_ubah'
            ? 'Permintaan perubahan terkirim. Admin akan mengubah KRS Anda.'
            : 'Permintaan buka kunci terkirim. Tunggu Admin membuka kunci KRS.';

        return response()->json([
            'success' => true,
            'message' => $pesanBalik,
        ]);
    }

    // ─── Helpers ───────────────────────────────────────

    /**
     * Cek apakah mahasiswa punya tagihan UKT yang belum lunas pada
     * tahun akademik tertentu. Jika ada, kembalikan response 422 yang
     * akan ditangkap frontend (lihat KrsPage.jsx — cek kata
     * "pembayaran"/"tagihan" pada pesan error).
     *
     * @return \Illuminate\Http\JsonResponse|null  null jika tidak ada tagihan tertunggak
     */
    private function cekTagihanBelumLunas(int $mahasiswaId, int $tahunAkademikId)
    {
        $belumLunas = Pembayaran::where('mahasiswa_id', $mahasiswaId)
            ->where('tahun_akademik_id', $tahunAkademikId)
            ->where('status', 'belum')
            ->exists();

        if (! $belumLunas) {
            return null;
        }

        return response()->json([
            'success' => false,
            'message' => 'Tagihan pembayaran UKT semester ini belum lunas. Selesaikan pembayaran terlebih dahulu sebelum mengisi KRS.',
        ], 422);
    }

    private function authorizeKrs(Krs $krs): void
    {
        $mhsId = auth()->user()->mahasiswa?->id;
        abort_if($krs->mahasiswa_id !== $mhsId, 403, 'Akses ditolak.');
    }

    private function formatKrs(Krs $krs): array
    {
        $detail = $krs->detail ?? collect();
        return [
            'id'             => $krs->id,
            'tahun_akademik' => $krs->tahunAkademik?->label,
            'tahun_id'       => $krs->tahun_akademik_id,
            'status'         => $krs->status,
            'is_locked'      => $krs->isLocked(),
            'total_sks'      => $detail->sum(fn($d) => $d->jadwal?->matkul?->sks ?? 0),
            'matkul'         => $detail->map(fn($d) => $this->formatJadwal($d->jadwal))->filter()->values(),
        ];
    }

    private function formatJadwal(?object $j): ?array
    {
        if (! $j) return null;
        return [
            'jadwal_id' => $j->id,
            'kode'      => $j->matkul?->kode,
            'nama'      => $j->matkul?->nama,
            'sks'       => $j->matkul?->sks,
            'semester'  => $j->matkul?->semester,
            'dosen'     => $j->dosen?->user?->name,
            'hari'      => $j->hari,
            'jam_mulai' => $j->jam_mulai,
            'jam_selesai'=> $j->jam_selesai,
            'ruang'     => $j->ruang,
            'kelas_type'=> $j->kelas_type,
        ];
    }

    /**
     * Kelompokkan list jadwal (hasil formatJadwal) berdasarkan semester matkul.
     * Dipakai untuk menyusun accordion "Mata Kuliah Tersedia per Semester" di frontend.
     */
    private function groupJadwalPerSemester($tersedia)
    {
        return collect($tersedia)
            ->groupBy(fn($j) => $j['semester'] ?? 0)
            ->sortKeys()
            ->map(fn($items, $sem) => [
                'semester' => (int) $sem,
                'jadwal'   => $items->values(),
            ])
            ->values();
    }

    /**
     * Sinkronkan grup chat per mata kuliah saat KRS dikunci.
     *
     * Untuk setiap jadwal di KRS ini:
     *  - Cari/buat room type=group dengan jadwal_id tersebut
     *  - Pastikan mahasiswa pemilik KRS jadi participant
     *  - Pastikan dosen pengampu jadwal jadi participant
     *
     * Dipanggil otomatis dari KrsController::lock().
     */
    private function syncGroupChatsForKrs(Krs $krs): void
    {
        $krs->load(['mahasiswa.user', 'detail.jadwal.matkul', 'detail.jadwal.dosen.user']);

        $mahasiswaUserId = $krs->mahasiswa?->user_id;
        if (!$mahasiswaUserId) return;

        foreach ($krs->detail as $d) {
            $jadwal = $d->jadwal;
            if (!$jadwal) continue;

            // Cari atau buat room grup untuk jadwal ini
            $room = ChatRoom::where('type', 'group')
                ->where('jadwal_id', $jadwal->id)
                ->first();

            if (!$room) {
                $namaMatkul = $jadwal->matkul?->nama ?? 'Kelas';
                $kelasType  = $jadwal->kelas_type ? ucfirst($jadwal->kelas_type) : '';
                $room = ChatRoom::create([
                    'type'      => 'group',
                    'nama'      => trim($namaMatkul . ($kelasType ? " ($kelasType)" : '')),
                    'jadwal_id' => $jadwal->id,
                    'created_by'=> auth()->id(),
                ]);
            }

            // Pastikan mahasiswa jadi participant
            ChatParticipant::firstOrCreate(
                ['room_id' => $room->id, 'user_id' => $mahasiswaUserId],
                ['role_label' => 'Mahasiswa']
            );

            // Pastikan dosen pengampu jadi participant
            $dosenUserId = $jadwal->dosen?->user_id;
            if ($dosenUserId) {
                ChatParticipant::firstOrCreate(
                    ['room_id' => $room->id, 'user_id' => $dosenUserId],
                    ['role_label' => 'Dosen Pengampu']
                );
            }
        }
    }
}
