<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Nilai;
use App\Models\TahunAkademik;
use Illuminate\Http\Request;
use App\Services\WebPushService;

class NilaiController extends Controller
{
    /** GET /api/mahasiswa/nilai — semua nilai mahasiswa + IPK */
    public function mahasiswaNilai()
    {
        $mahasiswa = auth()->user()->mahasiswa;

        $nilai = Nilai::where('mahasiswa_id', $mahasiswa->id)
            ->with(['matkul', 'tahunAkademik', 'dosen.user'])
            ->orderByDesc('created_at')
            ->get();

        // Hitung IPK
        $ipk  = $this->hitungIPK($nilai);
        $sks  = $nilai->sum(fn($n) => $n->matkul?->sks ?? 0);

        // Kelompokkan per semester
        $grouped = $nilai->groupBy('tahun_akademik_id')->map(function ($items, $tahunId) {
            $ta    = $items->first()->tahunAkademik;
            $ips   = $this->hitungIPK($items);
            $sksSem= $items->sum(fn($n) => $n->matkul?->sks ?? 0);
            return [
                'tahun_akademik_id' => $tahunId,
                'label'             => $ta?->label,
                'tahun'             => $ta?->tahun,
                'semester'          => $ta?->semester,
                'ips'               => $ips,
                'sks_total'         => $sksSem,
                'matkul'            => $items->map(fn($n) => $this->formatNilai($n))->values(),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data'    => [
                'ipk'           => $ipk,
                'sks_lulus'     => $sks,
                'semester_count'=> $grouped->count(),
                'semester'      => $grouped,
            ],
        ]);
    }

    /** GET /api/mahasiswa/nilai/{tahunId} — nilai semester tertentu */
    public function bySemester(int $tahunId)
    {
        $mahasiswa = auth()->user()->mahasiswa;

        $nilai = Nilai::where('mahasiswa_id', $mahasiswa->id)
            ->where('tahun_akademik_id', $tahunId)
            ->with(['matkul', 'tahunAkademik', 'dosen.user'])
            ->get();

        $tahun = \App\Models\TahunAkademik::find($tahunId);

        return response()->json([
            'success' => true,
            'data'    => [
                'tahun_akademik' => $tahun?->label,
                'ips'            => $this->hitungIPK($nilai),
                'sks_total'      => $nilai->sum(fn($n) => $n->matkul?->sks ?? 0),
                'matkul'         => $nilai->map(fn($n) => $this->formatNilai($n))->values(),
            ],
        ]);
    }

    /**
     * GET /api/mahasiswa/transkrip — transkrip akademik (semua semester, siap cetak)
     * Return IPK + list semester + matkul + nilai lengkap.
     */
    public function transkrip()
    {
        $mahasiswa = auth()->user()->mahasiswa()->with(['user', 'prodi.fakultas'])->firstOrFail();

        $nilai = Nilai::where('mahasiswa_id', $mahasiswa->id)
            ->with(['matkul', 'tahunAkademik', 'dosen.user'])
            ->get();

        $grouped = $nilai
            ->sortBy(fn($n) => $n->tahunAkademik?->tahun . '-' . $n->tahunAkademik?->semester)
            ->groupBy('tahun_akademik_id')
            ->map(function ($items) {
                $ta = $items->first()->tahunAkademik;
                return [
                    'tahun_akademik_id' => $ta?->id,
                    'label'             => $ta?->label,
                    'tahun'             => $ta?->tahun,
                    'semester'          => $ta?->semester,
                    'ips'               => $this->hitungIPK($items),
                    'sks_total'         => $items->sum(fn($n) => $n->matkul?->sks ?? 0),
                    'matkul'            => $items->map(fn($n) => [
                        'kode'        => $n->matkul?->kode,
                        'nama'        => $n->matkul?->nama,
                        'sks'         => $n->matkul?->sks,
                        'dosen'       => $n->dosen?->user?->name,
                        'nilai_huruf' => $n->nilai_huruf,
                        'nilai_angka' => $n->nilai_angka,
                        'bobot'       => $this->hurufKeBobot($n->nilai_huruf),
                        'mutu'        => round(($n->matkul?->sks ?? 0) * $this->hurufKeBobot($n->nilai_huruf), 2),
                    ])->values(),
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'mahasiswa' => [
                    'nim'      => $mahasiswa->nim,
                    'nama'     => $mahasiswa->user?->name,
                    'prodi'    => $mahasiswa->prodi?->nama,
                    'fakultas' => $mahasiswa->prodi?->fakultas?->nama,
                    'angkatan' => $mahasiswa->angkatan,
                    'foto_url' => $mahasiswa->foto_url,
                ],
                'ipk'          => $this->hitungIPK($nilai),
                'sks_total'    => $nilai->sum(fn($n) => $n->matkul?->sks ?? 0),
                'matkul_count' => $nilai->count(),
                'semester'     => $grouped,
            ],
        ]);
    }

    /** GET /api/dosen/nilai/{jadwalId} — list mahasiswa di jadwal + nilai mereka (kalau sudah ada) */
    public function byJadwal(int $jadwalId)
    {
        $dosen = auth()->user()->dosen;

        // Verifikasi jadwal milik dosen ini
        $jadwal = $dosen->jadwal()->with('matkul')->findOrFail($jadwalId);

        // Ambil semua mahasiswa yang punya jadwal ini di KRS-nya (termasuk yang belum lock, supaya dosen bisa input lebih awal)
        $mahasiswaIds = \App\Models\KrsDetail::where('jadwal_id', $jadwalId)
            ->join('krs', 'krs.id', '=', 'krs_detail.krs_id')
            ->pluck('krs.mahasiswa_id')
            ->unique();

        $mahasiswaList = \App\Models\Mahasiswa::with('user')
            ->whereIn('id', $mahasiswaIds)
            ->get();

        // Ambil nilai yang sudah ada untuk matkul ini (kalau ada)
        $nilaiMap = Nilai::where('matkul_id', $jadwal->matkul_id)
            ->where('tahun_akademik_id', $jadwal->tahun_akademik_id)
            ->get()
            ->keyBy('mahasiswa_id');

        // Rata-rata nilai kuis per mahasiswa, dari semua kuis di jadwal ini
        $kuisIds = \App\Models\Kuis::where('jadwal_id', $jadwalId)->pluck('id');
        $kuisAvgMap = collect();
        if ($kuisIds->isNotEmpty()) {
            $kuisAvgMap = \App\Models\KuisSubmission::whereIn('kuis_id', $kuisIds)
                ->whereIn('mahasiswa_id', $mahasiswaIds)
                ->selectRaw('mahasiswa_id, AVG(nilai) as rata')
                ->groupBy('mahasiswa_id')
                ->pluck('rata', 'mahasiswa_id');
        }

        $data = $mahasiswaList->map(function ($mhs) use ($nilaiMap, $kuisAvgMap) {
            $n = $nilaiMap->get($mhs->id);
            $rataKuis = $kuisAvgMap->get($mhs->id);
            return [
                'mahasiswa_id'     => $mhs->id,
                'nilai_id'         => $n?->id,
                'nim'              => $mhs->nim,
                'nama'             => $mhs->user?->name,
                'nilai_huruf'      => $n?->nilai_huruf,
                'nilai_angka'      => $n?->nilai_angka,
                'nilai_uts'        => $n?->nilai_uts,
                'nilai_uas'        => $n?->nilai_uas,
                'nilai_tugas'      => $n?->nilai_tugas,
                'nilai_kehadiran'  => $n?->nilai_kehadiran,
                // Rata-rata nilai kuis mahasiswa ini (null jika belum ada kuis dikerjakan)
                'nilai_kuis_avg'   => $rataKuis !== null ? round((float) $rataKuis, 2) : null,
                // Snapshot bonus yang diterapkan saat terakhir disimpan
                'bonus_diterapkan' => $n?->bonus_diterapkan,
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data'    => [
                'matkul'            => $jadwal->matkul?->nama,
                'kode'              => $jadwal->matkul?->kode,
                'sks'               => $jadwal->matkul?->sks,
                'jadwal_id'         => $jadwal->id,
                'bonus_kuis_persen' => (float) $jadwal->bonus_kuis_persen,
                'jumlah_kuis'       => $kuisIds->count(),
                'mahasiswa'         => $data,
            ],
        ]);
    }

    /** PUT /api/dosen/nilai/jadwal/{jadwalId}/bonus-kuis — atur persentase bonus nilai kuis */
    public function setBonusKuis(Request $request, int $jadwalId)
    {
        $request->validate([
            'bonus_kuis_persen' => 'required|numeric|min:0|max:100',
        ]);

        $dosen  = auth()->user()->dosen;
        $jadwal = $dosen->jadwal()->findOrFail($jadwalId);
        $jadwal->update(['bonus_kuis_persen' => $request->bonus_kuis_persen]);

        return response()->json([
            'success' => true,
            'message' => 'Persentase bonus nilai kuis berhasil disimpan.',
            'data'    => ['bonus_kuis_persen' => (float) $jadwal->bonus_kuis_persen],
        ]);
    }


    /** POST /api/dosen/nilai — input/simpan nilai komponen (UTS/UAS/Tugas/Kehadiran) + bonus kuis otomatis */
    public function store(Request $request)
    {
        $request->validate([
            'jadwal_id'         => 'required|exists:jadwal,id',
            'mahasiswa_id'      => 'required|exists:mahasiswa,id',
            'nilai_uts'         => 'nullable|numeric|min:0|max:100',
            'nilai_uas'         => 'nullable|numeric|min:0|max:100',
            'nilai_tugas'       => 'nullable|numeric|min:0|max:100',
            'nilai_kehadiran'   => 'nullable|numeric|min:0|max:100',
        ]);

        $dosen  = auth()->user()->dosen;
        $jadwal = $dosen->jadwal()->findOrFail($request->jadwal_id);

        $data = [
            'mahasiswa_id'      => $request->mahasiswa_id,
            'matkul_id'         => $jadwal->matkul_id,
            'tahun_akademik_id' => $jadwal->tahun_akademik_id,
            'dosen_id'          => $dosen->id,
            'nilai_uts'         => $request->nilai_uts,
            'nilai_uas'         => $request->nilai_uas,
            'nilai_tugas'       => $request->nilai_tugas,
            'nilai_kehadiran'   => $request->nilai_kehadiran,
        ];

        // Hitung nilai dasar & bonus kuis hanya jika semua komponen sudah diisi
        if ($data['nilai_uts'] !== null && $data['nilai_uas'] !== null
            && $data['nilai_tugas'] !== null && $data['nilai_kehadiran'] !== null) {

            $base = ($data['nilai_uts'] * 0.35) + ($data['nilai_uas'] * 0.40)
                  + ($data['nilai_tugas'] * 0.15) + ($data['nilai_kehadiran'] * 0.10);

            // Rata-rata nilai kuis mahasiswa untuk jadwal ini
            $kuisIds  = \App\Models\Kuis::where('jadwal_id', $jadwal->id)->pluck('id');
            $rataKuis = $kuisIds->isNotEmpty()
                ? \App\Models\KuisSubmission::whereIn('kuis_id', $kuisIds)
                    ->where('mahasiswa_id', $data['mahasiswa_id'])
                    ->avg('nilai')
                : null;

            $bonusPersen = (float) $jadwal->bonus_kuis_persen;
            $bonus = 0;

            // Bonus HANYA membantu nilai yang kurang — kuis tidak pernah
            // menurunkan nilai akhir. Selisih (rata_kuis - base) dikali
            // persentase bonus yang diatur dosen untuk jadwal ini.
            if ($rataKuis !== null && $bonusPersen > 0 && $rataKuis > $base) {
                $bonus = ($rataKuis - $base) * ($bonusPersen / 100);
            }

            $angka = min(100, $base + $bonus);

            $data['nilai_angka']      = round($angka, 2);
            $data['nilai_huruf']      = $this->angkaKeHuruf($angka);
            $data['nilai_kuis_avg']   = $rataKuis !== null ? round((float) $rataKuis, 2) : null;
            $data['bonus_diterapkan'] = round($bonus, 2);
        }

        // Ambil nilai huruf lama (sebelum update) untuk deteksi revisi
        $existing   = Nilai::where('mahasiswa_id', $data['mahasiswa_id'])
            ->where('matkul_id', $data['matkul_id'])
            ->where('tahun_akademik_id', $data['tahun_akademik_id'])
            ->first();
        $hurufLama  = $existing?->nilai_huruf;

        $nilai = Nilai::updateOrCreate(
            ['mahasiswa_id' => $data['mahasiswa_id'], 'matkul_id' => $data['matkul_id'], 'tahun_akademik_id' => $data['tahun_akademik_id']],
            $data
        );

        // Notifikasi ke mahasiswa saat nilai huruf diisi/direvisi
        if (! empty($data['nilai_huruf']) && $data['nilai_huruf'] !== $hurufLama) {
            $mhsUser = \App\Models\Mahasiswa::with('user')->find($data['mahasiswa_id']);
            $matkul  = \App\Models\Matkul::find($data['matkul_id']);
            if ($mhsUser?->user && $matkul) {
                $direvisi = $hurufLama !== null;
                $bonusInfo = (!empty($data['bonus_diterapkan']) && $data['bonus_diterapkan'] > 0)
                    ? " (termasuk bonus nilai kuis +{$data['bonus_diterapkan']})"
                    : '';
                \App\Models\Notifikasi::create([
                    'user_id' => $mhsUser->user->id,
                    'judul'   => $direvisi
                        ? "Nilai {$matkul->nama} Direvisi"
                        : "Nilai {$matkul->nama} Diterbitkan",
                    'isi'     => $direvisi
                        ? "Nilai {$matkul->nama} direvisi dari {$hurufLama} menjadi {$data['nilai_huruf']}{$bonusInfo}. Cek halaman Nilai."
                        : "Nilai {$matkul->nama}: {$data['nilai_huruf']}{$bonusInfo}. Cek halaman Nilai.",
                    'tipe'    => 'Nilai',
                    'is_read' => false,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Nilai berhasil disimpan.',
            'data'    => $this->formatNilai($nilai->load(['matkul','mahasiswa.user'])),
        ], 201);
    }

    /** POST /api/dosen/nilai/huruf — input nilai huruf langsung (A..E), tanpa komponen UTS/UAS/dst */
    public function storeHuruf(Request $request)
    {
        $request->validate([
            'jadwal_id'       => 'required|exists:jadwal,id',
            'nilai'           => 'required|array|min:1',
            'nilai.*.mahasiswa_id' => 'required|exists:mahasiswa,id',
            'nilai.*.huruf'        => 'required|in:A,A-,B+,B,B-,C+,C,D,E',
        ]);

        $dosen  = auth()->user()->dosen;
        $jadwal = $dosen->jadwal()->findOrFail($request->jadwal_id);

        $count = 0;
        foreach ($request->nilai as $item) {
            $angka = $this->hurufKeAngka($item['huruf']);

            $existing  = Nilai::where('mahasiswa_id', $item['mahasiswa_id'])
                ->where('matkul_id', $jadwal->matkul_id)
                ->where('tahun_akademik_id', $jadwal->tahun_akademik_id)
                ->first();
            $hurufLama = $existing?->nilai_huruf;

            Nilai::updateOrCreate(
                [
                    'mahasiswa_id'      => $item['mahasiswa_id'],
                    'matkul_id'         => $jadwal->matkul_id,
                    'tahun_akademik_id' => $jadwal->tahun_akademik_id,
                ],
                [
                    'dosen_id'    => $dosen->id,
                    'nilai_huruf' => $item['huruf'],
                    'nilai_angka' => $angka,
                ]
            );

            // Notifikasi ke mahasiswa hanya jika nilai benar-benar berubah
            if ($item['huruf'] !== $hurufLama) {
                $direvisi = $hurufLama !== null;
                $mhs = \App\Models\Mahasiswa::with('user')->find($item['mahasiswa_id']);
                if ($mhs?->user) {
                    \App\Models\Notifikasi::create([
                        'user_id' => $mhs->user->id,
                        'judul'   => $direvisi
                            ? "Nilai {$jadwal->matkul->nama} Direvisi"
                            : "Nilai {$jadwal->matkul->nama} Keluar",
                        'isi'     => $direvisi
                            ? "Nilai {$jadwal->matkul->nama} direvisi dari {$hurufLama} menjadi {$item['huruf']}."
                            : "Dosen telah memberi nilai {$item['huruf']} untuk mata kuliah {$jadwal->matkul->nama}.",
                        'tipe'    => 'Nilai',
                        'is_read' => false,
                    ]);
                    // Batch 8: kirim Web Push ke browser mahasiswa (jika subscribe)
                    try {
                        app(WebPushService::class)->sendToUser($mhs->user->id, [
                            'judul' => $direvisi
                                ? "Nilai {$jadwal->matkul->nama} Direvisi 📊"
                                : "Nilai {$jadwal->matkul->nama} Keluar 📊",
                            'isi'   => $direvisi
                                ? "Nilai direvisi: {$hurufLama} → {$item['huruf']} — cek detail di portal."
                                : "Nilai kamu: {$item['huruf']} — cek detail di portal.",
                            'url'   => '/mahasiswa/nilai',
                        ]);
                    } catch (\Throwable $e) {
                        // Push gagal tidak boleh blokir response utama
                        \Illuminate\Support\Facades\Log::warning('[WebPush] Gagal kirim nilai: '.$e->getMessage());
                    }
                }
            }
            $count++;
        }

        return response()->json([
            'success' => true,
            'message' => "Nilai {$count} mahasiswa berhasil disimpan.",
        ]);
    }

    /** PUT /api/dosen/nilai/{id} */
    public function update(Request $request, int $id)
    {
        $nilai = Nilai::findOrFail($id);

        $request->validate([
            'nilai_uts'       => 'nullable|numeric|min:0|max:100',
            'nilai_uas'       => 'nullable|numeric|min:0|max:100',
            'nilai_tugas'     => 'nullable|numeric|min:0|max:100',
            'nilai_kehadiran' => 'nullable|numeric|min:0|max:100',
        ]);

        $nilai->fill($request->only(['nilai_uts','nilai_uas','nilai_tugas','nilai_kehadiran']));

        // Fix Revbatch 9 (Bug 1):
        // Gunakan !== null, bukan truthy check — nilai 0 (nol) adalah nilai sah
        // tapi dianggap false oleh PHP, sehingga hitung nilai angka tidak pernah
        // berjalan jika salah satu komponen bernilai 0.
        if ($nilai->nilai_uts !== null && $nilai->nilai_uas !== null
            && $nilai->nilai_tugas !== null && $nilai->nilai_kehadiran !== null) {

            $base = ($nilai->nilai_uts * 0.35) + ($nilai->nilai_uas * 0.40)
                  + ($nilai->nilai_tugas * 0.15) + ($nilai->nilai_kehadiran * 0.10);

            // Fix Revbatch 9 (Bug 4):
            // Recalculate bonus kuis saat update — sebelumnya bonus tidak dihitung ulang
            // sehingga jika dosen ubah komponen nilai setelah awalnya disimpan tanpa bonus,
            // nilai akhir tidak merefleksikan bonus yang seharusnya diterapkan.
            // BUG FIX (Revbatch 13): Nilai model tidak punya kolom jadwal_id.
            // Cari jadwal berdasarkan matkul_id + tahun_akademik_id + dosen_id dari record nilai ini.
            // Jika satu matkul diampu dua dosen berbeda di tahun yang sama, dosen_id memastikan
            // kita mengambil jadwal milik dosen yang menginput nilai ini (bukan jadwal dosen lain).
            $jadwal = \App\Models\Jadwal::where('matkul_id', $nilai->matkul_id)
                ->where('tahun_akademik_id', $nilai->tahun_akademik_id)
                ->where('dosen_id', $nilai->dosen_id)
                ->first();

            $bonusPersen = (float) ($jadwal?->bonus_kuis_persen ?? 0);
            $bonus = 0;

            if ($bonusPersen > 0) {
                $kuisIds  = \App\Models\Kuis::where('jadwal_id', $jadwal->id)->pluck('id');
                $rataKuis = $kuisIds->isNotEmpty()
                    ? \App\Models\KuisSubmission::whereIn('kuis_id', $kuisIds)
                        ->where('mahasiswa_id', $nilai->mahasiswa_id)
                        ->avg('nilai')
                    : null;

                if ($rataKuis !== null && $rataKuis > $base) {
                    $bonus = ($rataKuis - $base) * ($bonusPersen / 100);
                }
                $nilai->nilai_kuis_avg   = $rataKuis !== null ? round((float) $rataKuis, 2) : null;
                $nilai->bonus_diterapkan = round($bonus, 2);
            }

            $angka = min(100, $base + $bonus);
            $nilai->nilai_angka = round($angka, 2);
            $nilai->nilai_huruf = $this->angkaKeHuruf($angka);
        }

        $nilai->save();

        return response()->json([
            'success' => true,
            'message' => 'Nilai berhasil diperbarui.',
            'data'    => $this->formatNilai($nilai->load(['matkul'])),
        ]);
    }

    // ─── Helpers ───────────────────────────────────────
    private function hitungIPK($nilai): string
    {
        $totalBobot = 0; $totalSks = 0;
        foreach ($nilai as $n) {
            $sks = $n->matkul?->sks ?? 0;
            $bobot = $this->hurufKeBobot($n->nilai_huruf);
            $totalBobot += $sks * $bobot;
            $totalSks   += $sks;
        }
        return $totalSks > 0 ? number_format($totalBobot / $totalSks, 2) : '0.00';
    }

    private function hurufKeBobot(?string $huruf): float
    {
        return match ($huruf) {
            'A'  => 4.00, 'A-' => 3.75,
            'B+' => 3.25, 'B'  => 3.00, 'B-' => 2.75,
            'C+' => 2.25, 'C'  => 2.00,
            'D'  => 1.00, 'E'  => 0.00,
            default => 0.00,
        };
    }

    private function angkaKeHuruf(float $angka): string
    {
        return match (true) {
            $angka >= 90 => 'A',
            $angka >= 85 => 'A-',
            $angka >= 80 => 'B+',
            $angka >= 75 => 'B',
            $angka >= 70 => 'B-',
            $angka >= 65 => 'C+',
            $angka >= 60 => 'C',
            $angka >= 50 => 'D',
            default      => 'E',
        };
    }

    /** Kebalikan dari angkaKeHuruf — dipakai saat dosen input nilai huruf langsung */
    private function hurufKeAngka(string $huruf): float
    {
        return match ($huruf) {
            'A'  => 92.50,   // tengah range 90-100
            'A-' => 87.50,   // tengah range 85-90
            'B+' => 82.50,   // tengah range 80-85
            'B'  => 77.50,   // tengah range 75-80
            'B-' => 72.50,   // tengah range 70-75
            'C+' => 67.50,   // tengah range 65-70
            'C'  => 62.50,   // tengah range 60-65
            'D'  => 55.00,   // tengah range 50-60
            'E'  => 40.00,   // bawah 50
            default => 0.00,
        };
    }

    private function formatNilai(Nilai $n): array
    {
        return [
            'id'            => $n->id,
            'matkul'        => $n->matkul?->nama,
            'kode'          => $n->matkul?->kode,
            'sks'           => $n->matkul?->sks,
            'dosen'         => $n->dosen?->user?->name ?? null,
            'nilai_huruf'   => $n->nilai_huruf,
            'nilai_angka'   => $n->nilai_angka,
            'nilai_uts'     => $n->nilai_uts,
            'nilai_uas'     => $n->nilai_uas,
            'nilai_tugas'   => $n->nilai_tugas,
            'nilai_kehadiran'=> $n->nilai_kehadiran,
            'nilai_kuis_avg'   => $n->nilai_kuis_avg,
            'bonus_diterapkan' => $n->bonus_diterapkan,
        ];
    }
}
