<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TahunAkademik;
use App\Models\Mahasiswa;
use App\Models\Nilai;
use App\Models\Notifikasi;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SemesterController extends Controller
{
    /**
     * GET /api/shared/tahun-aktif
     * Endpoint publik (authenticated) untuk semua role:
     * mahasiswa, dosen, admin mendapat info tahun akademik aktif.
     * Dipakai di banner "Tahun Ajaran Aktif" di dashboard semua role.
     */
    public function tahunAktif()
    {
        $tahun = TahunAkademik::where('is_aktif', true)->first();

        if (! $tahun) {
            return response()->json([
                'success' => true,
                'data'    => null,
                'message' => 'Belum ada tahun akademik yang diaktifkan.',
            ]);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'id'       => $tahun->id,
                'tahun'    => $tahun->tahun,
                'semester' => $tahun->semester,
                'label'    => $tahun->label,
            ],
        ]);
    }

    /**
     * GET /api/shared/semua-tahun
     * Semua tahun akademik (untuk dropdown filter di halaman mahasiswa/dosen).
     */
    public function semuaTahun()
    {
        $list = TahunAkademik::orderByDesc('tahun')->orderByRaw("FIELD(semester,'Genap','Ganjil')")->get()
            ->map(fn($t) => [
                'id'       => $t->id,
                'label'    => $t->label,
                'tahun'    => $t->tahun,
                'semester' => $t->semester,
                'is_aktif' => $t->is_aktif,
            ]);

        return response()->json(['success' => true, 'data' => $list]);
    }

    /**
     * POST /api/admin/semester/naikkan
     * Admin menaikkan semester semua mahasiswa aktif SEKALIGUS
     * berdasarkan hasil nilai semester yang baru saja selesai.
     *
     * Logika:
     * - Mahasiswa dengan nilai semua matkul >= D (angka >= 40) → naik semester
     * - Mahasiswa dengan ada nilai < D (angka < 40 / E) → tetap di semester yang sama
     *   tapi bisa ambil matkul remedial di semester bawah (sudah ditangani oleh filter KRS)
     * - Admin bisa preview dulu sebelum eksekusi (mode dry_run=true)
     */
    public function naikkanSemester(Request $request)
    {
        $request->validate([
            'tahun_akademik_id' => 'required|exists:tahun_akademik,id',
            'dry_run'           => 'nullable|boolean',
        ]);

        $isDryRun  = $request->boolean('dry_run', false);
        $tahunId   = $request->tahun_akademik_id;
        $tahun     = TahunAkademik::findOrFail($tahunId);

        // Ambil semua mahasiswa aktif
        $mahasiswaList = Mahasiswa::with('user')->where('status', 'aktif')->get();

        $naik    = [];
        $tetap   = [];

        foreach ($mahasiswaList as $mhs) {
            // Ambil nilai mahasiswa di tahun akademik yang dipilih
            $nilaiList = Nilai::where('mahasiswa_id', $mhs->id)
                ->where('tahun_akademik_id', $tahunId)
                ->get();

            // Mahasiswa belum punya nilai di tahun ini → lewati (tidak dinaikkan)
            if ($nilaiList->isEmpty()) {
                $tetap[] = [
                    'id'       => $mhs->id,
                    'nim'      => $mhs->nim,
                    'nama'     => $mhs->user?->name,
                    'semester' => $mhs->semester,
                    'alasan'   => 'Belum ada nilai di tahun akademik ini',
                    'nilai'    => [],
                ];
                continue;
            }

            // Cek apakah ada nilai E (angka < 40) → tidak naik karena ada matkul gagal
            $adaNilaiE = $nilaiList->contains(fn($n) =>
                $n->nilai_huruf === 'E' || ((float)($n->nilai_angka ?? 0)) < 40
            );

            if ($adaNilaiE) {
                $matkulGagal = $nilaiList
                    ->filter(fn($n) => $n->nilai_huruf === 'E' || ((float)($n->nilai_angka ?? 0)) < 40)
                    ->map(fn($n) => [
                        'nama'   => $n->matkul?->nama,
                        'nilai'  => $n->nilai_huruf ?? '-',
                        'angka'  => $n->nilai_angka ?? 0,
                    ])->values()->toArray();

                $tetap[] = [
                    'id'           => $mhs->id,
                    'nim'          => $mhs->nim,
                    'nama'         => $mhs->user?->name,
                    'semester'     => $mhs->semester,
                    'alasan'       => 'Ada mata kuliah dengan nilai E',
                    'matkul_gagal' => $matkulGagal,
                ];
            } else {
                $naik[] = [
                    'id'              => $mhs->id,
                    'nim'             => $mhs->nim,
                    'nama'            => $mhs->user?->name,
                    'semester_lama'   => $mhs->semester,
                    'semester_baru'   => $mhs->semester + 1,
                ];
            }
        }

        // Jika dry run → kembalikan preview saja tanpa update
        if ($isDryRun) {
            return response()->json([
                'success' => true,
                'message' => 'Preview kenaikan semester (belum diterapkan).',
                'data'    => [
                    'tahun_akademik' => $tahun->label,
                    'total_naik'     => count($naik),
                    'total_tetap'    => count($tetap),
                    'naik'           => $naik,
                    'tetap'          => $tetap,
                ],
            ]);
        }

        // Eksekusi — update semester mahasiswa yang naik
        DB::transaction(function () use ($naik, $tahun) {
            foreach ($naik as $item) {
                $mhs = Mahasiswa::find($item['id']);
                if (! $mhs) continue;

                $mhs->update(['semester' => $mhs->semester + 1]);

                // Kirim notifikasi ke mahasiswa
                if ($mhs->user_id) {
                    Notifikasi::create([
                        'user_id' => $mhs->user_id,
                        'judul'   => '🎓 Selamat! Kamu Naik Semester',
                        'isi'     => "Semester berhasil dinaikkan ke semester {$item['semester_baru']} " .
                                     "berdasarkan nilai {$tahun->label}. Segera isi KRS untuk semester baru!",
                        'tipe'    => 'Akademik',
                        'is_read' => false,
                    ]);
                }
            }

            // Kirim notifikasi ke mahasiswa yang TIDAK naik
            foreach (array_slice($naik, 0, 0) + [] as $_) {} // placeholder
        });

        // Notifikasi ke mahasiswa yang tidak naik
        foreach ($tetap as $item) {
            if (! isset($item['matkul_gagal'])) continue; // skip yang belum ada nilai
            $mhs = Mahasiswa::find($item['id']);
            if ($mhs?->user_id) {
                $namaGagal = collect($item['matkul_gagal'])->pluck('nama')->join(', ');
                Notifikasi::create([
                    'user_id' => $mhs->user_id,
                    'judul'   => '📋 Info Hasil Semester',
                    'isi'     => "Semester kamu belum naik karena ada nilai E pada: {$namaGagal}. " .
                                 "Kamu bisa mengambil mata kuliah tersebut kembali di semester berikutnya.",
                    'tipe'    => 'Akademik',
                    'is_read' => false,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => count($naik) . ' mahasiswa berhasil dinaikkan semesternya.',
            'data'    => [
                'tahun_akademik' => $tahun->label,
                'total_naik'     => count($naik),
                'total_tetap'    => count($tetap),
                'naik'           => $naik,
                'tetap'          => $tetap,
            ],
        ]);
    }
}
