<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Absensi;
use App\Models\Jadwal;
use App\Models\Notifikasi;
use Illuminate\Http\Request;
use App\Services\WebPushService;
use Illuminate\Support\Facades\Log;

class AbsensiController extends Controller
{
    /** GET /api/mahasiswa/absensi/{jadwalId} */
    public function mahasiswaAbsensi(int $jadwalId)
    {
        $mahasiswa = auth()->user()->mahasiswa;

        $absensi = Absensi::where('jadwal_id', $jadwalId)
            ->where('mahasiswa_id', $mahasiswa->id)
            ->orderBy('pertemuan')
            ->get();

        $hadir  = $absensi->whereIn('status', ['hadir','online'])->count();
        $total  = $absensi->whereNotIn('status', ['belum'])->count();
        $persen = $total > 0 ? round($hadir / $total * 100) : 0;

        return response()->json([
            'success' => true,
            'data'    => [
                'ringkasan' => [
                    'hadir'   => $hadir,
                    'absen'   => $absensi->where('status', 'absen')->count(),
                    'online'  => $absensi->where('status', 'online')->count(),
                    'persen'  => $persen,
                    'aman'    => $persen >= 75,
                ],
                'pertemuan' => $absensi->map(fn($a) => [
                    'id'          => $a->id,
                    'pertemuan'   => $a->pertemuan,
                    'tanggal'     => $a->tanggal?->format('d M Y'),
                    'topik'       => $a->topik,
                    'status'      => $a->status,
                    'dosen_masuk' => $a->dosen_masuk,
                    'alasan'      => $a->alasan,
                ])->values(),
            ],
        ]);
    }

    /** POST /api/mahasiswa/absensi/{jadwalId}/online — absen online saat dosen tidak masuk */
    public function absenOnline(int $jadwalId)
    {
        $mahasiswa = auth()->user()->mahasiswa;

        // Cari pertemuan terakhir yang dosen tidak masuk & belum absen online
        $absensi = Absensi::where('jadwal_id', $jadwalId)
            ->where('mahasiswa_id', $mahasiswa->id)
            ->where('dosen_masuk', false)
            ->where('status', '!=', 'online')
            ->orderByDesc('pertemuan')
            ->first();

        if (! $absensi) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada pertemuan yang membutuhkan absen online saat ini.',
            ], 422);
        }

        $absensi->update(['status' => 'online']);

        return response()->json([
            'success'   => true,
            'message'   => "Absensi online pertemuan {$absensi->pertemuan} berhasil dicatat.",
            'pertemuan' => $absensi->pertemuan,
        ]);
    }


    /**
     * POST /api/mahasiswa/absensi/{jadwalId}/check-in
     * Mahasiswa tandai diri sendiri HADIR untuk pertemuan yang aktif HARI INI.
     * Tanpa fallback ke pertemuan lama — mencegah kehadiran palsu.
     */
    public function checkIn(int $jadwalId)
    {
        $mahasiswa = auth()->user()->mahasiswa;

        // Hanya pertemuan yang dibuka HARI INI dengan status 'belum' dan dosen hadir
        $absensi = \App\Models\Absensi::where('jadwal_id', $jadwalId)
            ->where('mahasiswa_id', $mahasiswa->id)
            ->where('status', 'belum')
            ->where('dosen_masuk', true)
            ->whereDate('tanggal', today())
            ->orderByDesc('pertemuan')
            ->first();

        if (! $absensi) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada pertemuan aktif hari ini. Dosen belum membuka pertemuan hari ini, atau kamu sudah absen.',
            ], 422);
        }

        $absensi->update(['status' => 'hadir']);

        return response()->json([
            'success'   => true,
            'message'   => "Berhasil menandai hadir pada pertemuan {$absensi->pertemuan}.",
            'pertemuan' => $absensi->pertemuan,
            'status'    => 'hadir',
        ]);
    }

    /**
     * POST /api/mahasiswa/absensi/{jadwalId}/keterangan
     * Mahasiswa mengajukan izin atau sakit untuk pertemuan tertentu.
     * Body: { keterangan: 'izin'|'sakit', alasan: string, pertemuan?: int }
     * Jika pertemuan tidak diisi, diambil pertemuan terdekat yang statusnya 'belum'.
     */
    public function ajukanKeterangan(Request $request, int $jadwalId)
    {
        $request->validate([
            'keterangan' => 'required|in:izin,sakit',
            'alasan'     => 'required|string|max:500',
            'pertemuan'  => 'nullable|integer|min:1',
        ]);

        $mahasiswa = auth()->user()->mahasiswa;

        // Cari absensi target
        $q = \App\Models\Absensi::where('jadwal_id', $jadwalId)
            ->where('mahasiswa_id', $mahasiswa->id)
            ->where('status', 'belum');

        if ($request->pertemuan) {
            $absensi = $q->where('pertemuan', $request->pertemuan)->first();
        } else {
            // Ambil pertemuan 'belum' terdekat (terkecil nomornya)
            $absensi = $q->orderBy('pertemuan')->first();
        }

        if (! $absensi) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada pertemuan yang bisa diajukan keterangan. Semua pertemuan sudah tercatat.',
            ], 422);
        }

        $absensi->update([
            'status' => $request->keterangan,
            'alasan' => $request->alasan,
        ]);

        $label = $request->keterangan === 'izin' ? 'Izin' : 'Sakit';

        return response()->json([
            'success'   => true,
            'message'   => "{$label} pada pertemuan {$absensi->pertemuan} berhasil dicatat.",
            'pertemuan' => $absensi->pertemuan,
            'status'    => $request->keterangan,
        ]);
    }

    /** GET /api/dosen/absensi/{jadwalId} */
    public function dosenAbsensi(int $jadwalId)
    {
        $dosen  = auth()->user()->dosen;
        $jadwal = $dosen->jadwal()->with('matkul')->findOrFail($jadwalId);

        $absensi = Absensi::where('jadwal_id', $jadwalId)
            ->with('mahasiswa.user')
            ->orderBy('pertemuan')
            ->orderBy('mahasiswa_id')
            ->get();

        // Kelompokkan per pertemuan
        $grouped = $absensi->groupBy('pertemuan')->map(function ($items, $pertemuan) {
            $first = $items->first();
            return [
                'pertemuan'   => $pertemuan,
                'tanggal'     => $first->tanggal?->format('d M Y'),
                'topik'       => $first->topik,
                'dosen_masuk' => $first->dosen_masuk,
                'mahasiswa'   => $items->map(fn($a) => [
                    'absensi_id' => $a->id,
                    'nim'        => $a->mahasiswa?->nim,
                    'nama'       => $a->mahasiswa?->user?->name,
                    'status'     => $a->status,
                ])->values(),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data'    => ['pertemuan' => $grouped],
        ]);
    }

    /** POST /api/dosen/absensi/{jadwalId} — buka pertemuan baru (auto-isi list mahasiswa dari KRS locked) */
    public function bukaPertemuan(Request $request, int $jadwalId)
    {
        $request->validate([
            'tanggal'     => 'required|date',
            'topik'       => 'nullable|string|max:150',
            'dosen_masuk' => 'required|boolean',
        ]);

        $dosen  = auth()->user()->dosen;
        $jadwal = $dosen->jadwal()->with('matkul')->findOrFail($jadwalId);

        // Ambil semua mahasiswa yang punya jadwal ini di KRS locked/disetujui
        $mahasiswaIds = \App\Models\KrsDetail::where('jadwal_id', $jadwalId)
            ->whereHas('krs', function ($q) {
                $q->whereIn('status', ['disetujui', 'locked']);
            })
            ->join('krs', 'krs.id', '=', 'krs_detail.krs_id')
            ->pluck('krs.mahasiswa_id')
            ->unique()
            ->values();

        if ($mahasiswaIds->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Belum ada mahasiswa yang terdaftar di matkul ini (KRS belum dikunci admin).',
            ], 422);
        }

        // Cari pertemuan terakhir
        $last = Absensi::where('jadwal_id', $jadwalId)->max('pertemuan') ?? 0;
        $pertemuan = $last + 1;

        // Status awal: kalau dosen tidak masuk → 'belum' (mahasiswa bisa absen online);
        // kalau dosen masuk → 'belum' juga, menunggu dosen mark tiap mahasiswa manual.
        foreach ($mahasiswaIds as $mhsId) {
            Absensi::updateOrCreate(
                ['jadwal_id' => $jadwalId, 'mahasiswa_id' => $mhsId, 'pertemuan' => $pertemuan],
                [
                    'tanggal'     => $request->tanggal,
                    'topik'       => $request->topik,
                    'status'      => 'belum',
                    'dosen_masuk' => $request->dosen_masuk,
                ]
            );
        }

        // Fix Revbatch 9 (Bug 5 + N+1):
        // - Gabungkan dua loop foreach menjadi satu — sebelumnya ada dua loop
        //   terpisah yang keduanya memanggil Mahasiswa::find($mhsId)?->user per iterasi
        //   (N+1 query problem).
        // - Eager load semua user sekaligus di luar loop, lalu gunakan lookup by id.
        // - Logika notifikasi: dosen hadir → kirim notif pertemuan dibuka,
        //   dosen tidak masuk → kirim notif absen online tersedia. Satu notif per mahasiswa.
        $namaJadwal = $jadwal->matkul?->nama ?? 'Mata Kuliah';
        $dosenHadir = (bool) $request->dosen_masuk;

        // Eager load semua mahasiswa + user sekaligus (hindari N+1 query)
        $mahasiswaMap = \App\Models\Mahasiswa::with('user')
            ->whereIn('id', $mahasiswaIds)
            ->get()
            ->keyBy('id');

        foreach ($mahasiswaIds as $mhsId) {
            $mhsUser = $mahasiswaMap->get($mhsId)?->user;
            if (! $mhsUser) continue;

            if ($dosenHadir) {
                // Dosen hadir — notif pertemuan dibuka
                \App\Models\Notifikasi::create([
                    'user_id' => $mhsUser->id,
                    'judul'   => 'Pertemuan ' . $pertemuan . ' — ' . $namaJadwal,
                    'isi'     => 'Pertemuan ' . $pertemuan . ' telah dibuka. Topik: ' . ($request->topik ?: '-') . '.',
                    'tipe'    => 'Akademik',
                    'is_read' => false,
                ]);
                try {
                    app(WebPushService::class)->sendToUser($mhsUser->id, [
                        'judul' => '📋 ' . $namaJadwal . ' — Pertemuan ' . $pertemuan,
                        'isi'   => 'Topik: ' . ($request->topik ?: '-'),
                        'url'   => '/mahasiswa/elearning',
                    ]);
                } catch (\Throwable $e) {
                    Log::warning('[Push] Absensi: ' . $e->getMessage());
                }
            } else {
                // Dosen tidak masuk — notif absen online tersedia
                Notifikasi::create([
                    'user_id' => $mhsUser->id,
                    'judul'   => 'Absen Online Tersedia',
                    'isi'     => "Dosen tidak hadir pada pertemuan {$pertemuan} {$namaJadwal}. Silakan lakukan absen online.",
                    'tipe'    => 'Akademik',
                    'is_read' => false,
                ]);
            }
        }

        return response()->json([
            'success'   => true,
            'message'   => "Pertemuan {$pertemuan} berhasil dibuka untuk {$mahasiswaIds->count()} mahasiswa.",
            'pertemuan' => $pertemuan,
        ], 201);
    }

    /** PUT /api/dosen/absensi/{id} — ubah status absensi */
    public function updateStatus(Request $request, int $id)
    {
        $request->validate(['status' => 'required|in:hadir,absen,izin,sakit,online,belum']);

        $dosen   = auth()->user()->dosen;
        $absensi = Absensi::findOrFail($id);

        // Pastikan absensi ini milik jadwal yang diampu dosen yang login
        $milikDosen = Jadwal::where('id', $absensi->jadwal_id)
            ->where('dosen_id', $dosen->id)
            ->exists();

        if (! $milikDosen) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak berhak mengubah absensi ini.',
            ], 403);
        }

        $absensi->update(['status' => $request->status]);

        return response()->json([
            'success' => true,
            'message' => 'Status absensi berhasil diperbarui.',
        ]);
    }
}
