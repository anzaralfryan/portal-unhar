<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Jadwal, Materi, Tugas, TugasSubmission, Kuis, KuisSoal, KuisSubmission, KrsDetail, Krs, Notifikasi, Mahasiswa};
use App\Services\WebPushService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class ElearningController extends Controller
{
    /** GET /api/mahasiswa/elearning — daftar matkul dari KRS aktif */
    public function matkul()
    {
        $mahasiswa = auth()->user()->mahasiswa;
        $krsIds    = $mahasiswa->krs()->pluck('id');
        $jadwalIds = KrsDetail::whereIn('krs_id', $krsIds)->pluck('jadwal_id');

        $jadwal = Jadwal::whereIn('id', $jadwalIds)
            ->with(['matkul', 'dosen.user', 'materi', 'tugas', 'kuis'])
            ->get()
            ->map(function ($j) use ($mahasiswa) {
                $tugasBelum = $j->tugas->filter(fn($t) =>
                    ! TugasSubmission::where('tugas_id', $t->id)->where('mahasiswa_id', $mahasiswa->id)->exists()
                )->count();
                $kuisBelum = $j->kuis->filter(fn($k) =>
                    ! KuisSubmission::where('kuis_id', $k->id)->where('mahasiswa_id', $mahasiswa->id)->exists()
                )->count();

                return [
                    'jadwal_id'   => $j->id,
                    'matkul'      => $j->matkul?->nama,
                    'kode'        => $j->matkul?->kode,
                    'dosen'       => $j->dosen?->user?->name,
                    'materi_count'=> $j->materi->count(),
                    'tugas_count' => $j->tugas->count(),
                    'kuis_count'  => $j->kuis->count(),
                    'tugas_belum' => $tugasBelum,
                    'kuis_belum'  => $kuisBelum,
                    'badge'       => $tugasBelum + $kuisBelum,
                ];
            });

        return response()->json(['success' => true, 'data' => $jadwal]);
    }

    /** GET /api/mahasiswa/elearning/{jadwalId}/materi */
    public function materi(int $jadwalId)
    {
        $materi = Materi::where('jadwal_id', $jadwalId)
            ->orderBy('pertemuan')
            ->get()
            ->map(fn($m) => [
                'id'         => $m->id,
                'judul'      => $m->judul,
                'tipe'       => $m->tipe,
                'ukuran'     => $m->ukuran_label,
                'pertemuan'  => $m->pertemuan,
            ]);

        return response()->json(['success' => true, 'data' => $materi]);
    }

    /** GET /api/mahasiswa/elearning/materi/{id}/download */
    public function downloadMateri(int $id)
    {
        $materi = Materi::findOrFail($id);

        if (! Storage::disk('public')->exists($materi->file_path)) {
            return response()->json(['success' => false, 'message' => 'File tidak ditemukan.'], 404);
        }

        return Storage::disk('public')->download($materi->file_path, $materi->judul.'.'.$this->ext($materi->file_path));
    }

    /** GET /api/mahasiswa/elearning/{jadwalId}/tugas */
    public function tugas(int $jadwalId)
    {
        $mahasiswa = auth()->user()->mahasiswa;

        $tugas = Tugas::where('jadwal_id', $jadwalId)
            ->orderBy('deadline')
            ->get()
            ->map(function ($t) use ($mahasiswa) {
                $submission = TugasSubmission::where('tugas_id', $t->id)
                    ->where('mahasiswa_id', $mahasiswa->id)
                    ->first();

                return [
                    'id'           => $t->id,
                    'judul'        => $t->judul,
                    'deskripsi'    => $t->deskripsi,
                    'deadline'     => $t->deadline?->format('d M Y H:i'),
                    'is_lewat'     => $t->isDeadlineLewat(),
                    'status'       => $submission ? 'submitted' : 'belum',
                    'file_kirim'   => $submission?->file_name,
                    'nilai'        => $submission?->nilai,
                    'catatan'      => $submission?->catatan_dosen,
                    'submitted_at' => $submission?->submitted_at?->format('d M Y H:i'),
                ];
            });

        return response()->json(['success' => true, 'data' => $tugas]);
    }

    /** POST /api/mahasiswa/elearning/tugas/{tugasId}/submit */
    public function submitTugas(Request $request, int $tugasId)
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf,docx,zip,rar|max:20480',
        ]);

        $mahasiswa = auth()->user()->mahasiswa;
        $tugas     = Tugas::findOrFail($tugasId);

        if ($tugas->deadline && $tugas->isDeadlineLewat()) {
            return response()->json([
                'success' => false,
                'message' => 'Batas waktu pengumpulan tugas "' . $tugas->judul . '" sudah lewat (' . $tugas->deadline->format('d M Y H:i') . '). Hubungi dosen pengampu jika perlu pengumpulan susulan.',
            ], 422);
        }

        $path      = $request->file('file')->store('tugas/submission', 'public');
        $fileName  = $request->file('file')->getClientOriginalName();

        TugasSubmission::updateOrCreate(
            ['tugas_id' => $tugasId, 'mahasiswa_id' => $mahasiswa->id],
            ['file_path' => $path, 'file_name' => $fileName, 'submitted_at' => now()]
        );

        // Notifikasi ke dosen pengampu
        $jadwal = Jadwal::with(['dosen.user', 'matkul'])->find($tugas->jadwal_id);
        if ($jadwal?->dosen?->user) {
            $mhsName = auth()->user()->name ?? 'Mahasiswa';
            Notifikasi::create([
                'user_id' => $jadwal->dosen->user->id,
                'judul'   => 'Tugas Dikumpulkan',
                'isi'     => $mhsName . ' mengumpulkan tugas "' . $tugas->judul . '" (' . ($jadwal->matkul?->nama ?? '') . ').',
                'tipe'    => 'Akademik',
                'is_read' => false,
            ]);
            try {
                app(WebPushService::class)->sendToUser($jadwal->dosen->user->id, [
                    'judul' => '📋 Tugas Masuk',
                    'isi'   => $mhsName . ' — "' . $tugas->judul . '"',
                    'url'   => '/dosen/elearning',
                ]);
            } catch (\Throwable $e) {
                Log::warning('[Push] Tugas: ' . $e->getMessage());
            }
        }

        return response()->json([
            'success'   => true,
            'message'   => 'Tugas berhasil dikumpulkan.',
            'file_name' => $fileName,
        ]);
    }

    /** GET /api/mahasiswa/elearning/{jadwalId}/kuis */
    public function kuis(int $jadwalId)
    {
        $mahasiswa = auth()->user()->mahasiswa;

        $kuis = Kuis::where('jadwal_id', $jadwalId)
            ->where('is_aktif', true)
            ->withCount('soal')
            ->get()
            ->map(function ($k) use ($mahasiswa) {
                $submission = KuisSubmission::where('kuis_id', $k->id)
                    ->where('mahasiswa_id', $mahasiswa->id)
                    ->first();

                return [
                    'id'          => $k->id,
                    'judul'       => $k->judul,
                    'durasi'      => $k->durasi,
                    'jumlah_soal' => $k->soal_count,
                    'status'      => $submission ? 'selesai' : 'belum',
                    'nilai'       => $submission?->nilai,
                ];
            });

        return response()->json(['success' => true, 'data' => $kuis]);
    }

    /** GET /api/mahasiswa/elearning/kuis/{kuisId}/soal */
    public function soalKuis(int $kuisId)
    {
        $mahasiswa = auth()->user()->mahasiswa;

        if (KuisSubmission::where('kuis_id', $kuisId)->where('mahasiswa_id', $mahasiswa->id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Kuis sudah pernah dikerjakan.'], 422);
        }

        $kuis = Kuis::with('soal')->findOrFail($kuisId);

        return response()->json([
            'success' => true,
            'data'    => [
                'kuis_id' => $kuis->id,
                'judul'   => $kuis->judul,
                'durasi'  => $kuis->durasi,
                'soal'    => $kuis->soal->sortBy('urutan')->map(fn($s) => $s->withoutAnswer())->values(),
            ],
        ]);
    }

    /** POST /api/mahasiswa/elearning/kuis/{kuisId}/submit */
    public function submitKuis(Request $request, int $kuisId)
    {
        $request->validate(['jawaban' => 'required|array']);

        $mahasiswa = auth()->user()->mahasiswa;

        if (KuisSubmission::where('kuis_id', $kuisId)->where('mahasiswa_id', $mahasiswa->id)->exists()) {
            return response()->json(['success' => false, 'message' => 'Kuis sudah pernah dikerjakan.'], 422);
        }

        $soal  = KuisSoal::where('kuis_id', $kuisId)->get();
        $benar = 0;

        foreach ($soal as $s) {
            $jawaban = $request->jawaban[$s->id] ?? null;
            if ($jawaban !== null && (int)$jawaban === $s->jawaban_benar) {
                $benar++;
            }
        }

        $nilai = $soal->count() > 0 ? round($benar / $soal->count() * 100, 2) : 0;

        KuisSubmission::create([
            'kuis_id'      => $kuisId,
            'mahasiswa_id' => $mahasiswa->id,
            'nilai'        => $nilai,
            'jawaban'      => $request->jawaban,
            'submitted_at' => now(),
        ]);

        // Notifikasi ke dosen
        $kuisObj = Kuis::with(['jadwal.dosen.user', 'jadwal.matkul'])->find($kuisId);
        if ($kuisObj?->jadwal?->dosen?->user) {
            $mhsName = auth()->user()->name ?? 'Mahasiswa';
            Notifikasi::create([
                'user_id' => $kuisObj->jadwal->dosen->user->id,
                'judul'   => 'Kuis Selesai Dikerjakan',
                'isi'     => $mhsName . ' mengerjakan kuis "' . $kuisObj->judul . '" dengan nilai ' . $nilai . '.',
                'tipe'    => 'Akademik',
                'is_read' => false,
            ]);
            try {
                app(WebPushService::class)->sendToUser($kuisObj->jadwal->dosen->user->id, [
                    'judul' => '📝 Kuis Dikerjakan',
                    'isi'   => $mhsName . ' — Nilai: ' . $nilai . ' pada "' . $kuisObj->judul . '"',
                    'url'   => '/dosen/elearning',
                ]);
            } catch (\Throwable $e) {
                Log::warning('[Push] Kuis: ' . $e->getMessage());
            }
        }

        return response()->json([
            'success'    => true,
            'message'    => 'Kuis berhasil dikumpulkan.',
            'nilai'      => $nilai,
            'benar'      => $benar,
            'total_soal' => $soal->count(),
        ]);
    }

    // ─── DOSEN methods ────────────────────────────────

    /** POST /api/dosen/elearning/materi */
    public function uploadMateri(Request $request)
    {
        $request->validate([
            'jadwal_id'  => 'required|exists:jadwal,id',
            'judul'      => 'required|string|max:150',
            'pertemuan'  => 'nullable|integer|min:1|max:32',
            'file'       => 'required|file|max:51200',
        ]);

        $file = $request->file('file');
        $tipe = strtoupper($file->getClientOriginalExtension());
        $path = $file->store('materi', 'public');

        $materi = Materi::create([
            'jadwal_id'  => $request->jadwal_id,
            'judul'      => $request->judul,
            'tipe'       => in_array($tipe, ['PDF','PPTX','DOCX','VIDEO','ZIP']) ? $tipe : 'LAINNYA',
            'file_path'  => $path,
            'file_size'  => $file->getSize(),
            'pertemuan'  => $request->input('pertemuan', 1),
        ]);

        // Notifikasi ke semua mahasiswa yang terdaftar di jadwal ini
        $jadwalId  = (int) $request->jadwal_id;
        $jadwalObj = Jadwal::with('matkul')->find($jadwalId);
        $namaMatkulNotif = $jadwalObj?->matkul?->nama ?? 'Mata Kuliah';

        // Ambil semua mahasiswa_id dari KRS yang memiliki jadwal ini
        $krsIds       = KrsDetail::where('jadwal_id', $jadwalId)->pluck('krs_id');
        $mahasiswaIds = Krs::whereIn('id', $krsIds)->pluck('mahasiswa_id');

        $mahasiswaList = Mahasiswa::whereIn('id', $mahasiswaIds)->with('user')->get();

        foreach ($mahasiswaList as $mhs) {
            if (! $mhs->user) continue;

            Notifikasi::create([
                'user_id' => $mhs->user->id,
                'judul'   => 'Materi Baru: ' . $namaMatkulNotif,
                'isi'     => 'Dosen mengunggah materi baru: "' . $request->judul . '" (Pertemuan ' . $request->input('pertemuan', 1) . ').',
                'tipe'    => 'Akademik',
                'is_read' => false,
            ]);

            try {
                app(WebPushService::class)->sendToUser($mhs->user->id, [
                    'judul' => '📚 Materi Baru: ' . $namaMatkulNotif,
                    'isi'   => '"' . $request->judul . '" — Pertemuan ' . $request->input('pertemuan', 1),
                    'url'   => '/mahasiswa/elearning',
                ]);
            } catch (\Throwable $e) {
                Log::warning('[Push] Materi: ' . $e->getMessage());
            }
        }

        return response()->json(['success' => true, 'message' => 'Materi berhasil diunggah.', 'data' => $materi], 201);
    }

    /** DELETE /api/dosen/elearning/materi/{id} */
    public function deleteMateri(int $id)
    {
        $materi = Materi::findOrFail($id);
        Storage::disk('public')->delete($materi->file_path);
        $materi->delete();
        return response()->json(['success' => true, 'message' => 'Materi berhasil dihapus.']);
    }

    /** POST /api/dosen/elearning/tugas */
    public function buatTugas(Request $request)
    {
        $request->validate([
            'jadwal_id'  => 'required|exists:jadwal,id',
            'judul'      => 'required|string|max:150',
            'deskripsi'  => 'required|string',
            'deadline'   => 'required|date|after:now',
            'pertemuan'  => 'nullable|integer|min:1',
        ]);

        $tugas = Tugas::create($request->only(['jadwal_id','judul','deskripsi','deadline','pertemuan']));

        return response()->json(['success' => true, 'message' => 'Tugas berhasil dibuat.', 'data' => $tugas], 201);
    }

    /** GET /api/dosen/elearning/tugas/{id}/submission */
    public function lihatSubmission(int $id)
    {
        $submissions = TugasSubmission::where('tugas_id', $id)
            ->with('mahasiswa.user')
            ->get()
            ->map(fn($s) => [
                'id'           => $s->id,
                'nim'          => $s->mahasiswa?->nim,
                'nama'         => $s->mahasiswa?->user?->name,
                'file_name'    => $s->file_name,
                'file_url'     => $s->file_url,
                'nilai'        => $s->nilai,
                'catatan'      => $s->catatan_dosen,
                'submitted_at' => $s->submitted_at?->format('d M Y H:i'),
            ]);

        return response()->json(['success' => true, 'data' => $submissions]);
    }

    /** PUT /api/dosen/elearning/submission/{id}/nilai */
    public function nilaiTugas(Request $request, int $id)
    {
        $request->validate([
            'nilai'   => 'required|numeric|min:0|max:100',
            'catatan' => 'nullable|string|max:500',
        ]);

        $submission = TugasSubmission::findOrFail($id);
        $submission->update(['nilai' => $request->nilai, 'catatan_dosen' => $request->catatan]);

        return response()->json(['success' => true, 'message' => 'Nilai berhasil disimpan.']);
    }

    /** POST /api/dosen/elearning/kuis */
    public function buatKuis(Request $request)
    {
        $request->validate([
            'jadwal_id' => 'required|exists:jadwal,id',
            'judul'     => 'required|string|max:150',
            'durasi'    => 'required|integer|min:5|max:180',
            'soal'      => 'required|array|min:1',
            'soal.*.pertanyaan'    => 'required|string',
            'soal.*.opsi'          => 'required|array|min:2|max:5',
            'soal.*.jawaban_benar' => 'required|integer|min:0',
        ]);

        $kuis = Kuis::create([
            'jadwal_id' => $request->jadwal_id,
            'judul'     => $request->judul,
            'durasi'    => $request->durasi,
        ]);

        foreach ($request->soal as $i => $s) {
            KuisSoal::create([
                'kuis_id'       => $kuis->id,
                'pertanyaan'    => $s['pertanyaan'],
                'opsi'          => $s['opsi'],
                'jawaban_benar' => $s['jawaban_benar'],
                'urutan'        => $i + 1,
            ]);
        }

        return response()->json(['success' => true, 'message' => 'Kuis berhasil dibuat.', 'kuis_id' => $kuis->id], 201);
    }

    /** GET /api/dosen/elearning/kuis/{id}/hasil */
    public function hasilKuis(int $id)
    {
        $submissions = KuisSubmission::where('kuis_id', $id)
            ->with('mahasiswa.user')
            ->get()
            ->map(fn($s) => [
                'nim'          => $s->mahasiswa?->nim,
                'nama'         => $s->mahasiswa?->user?->name,
                'nilai'        => $s->nilai,
                'submitted_at' => $s->submitted_at?->format('d M Y H:i'),
            ]);

        $avg = $submissions->avg('nilai');

        return response()->json([
            'success'   => true,
            'data'      => $submissions,
            'rata_rata' => round($avg, 2),
            'total'     => $submissions->count(),
        ]);
    }

    /** GET /api/dosen/elearning/{jadwalId}/materi */
    public function dosenMateri(int $jadwalId)
    {
        $materi = Materi::where('jadwal_id', $jadwalId)
            ->orderBy('pertemuan')->orderBy('id')
            ->get()
            ->map(fn($m) => [
                'id'         => $m->id,
                'judul'      => $m->judul,
                'tipe'       => $m->tipe,
                'ukuran'     => $m->ukuran_label,
                'file_size'  => $m->ukuran_label,
                'pertemuan'  => $m->pertemuan,
                'created_at' => $m->created_at?->toIso8601String(),
            ]);

        return response()->json(['success' => true, 'data' => $materi]);
    }

    /** GET /api/dosen/elearning/{jadwalId}/tugas */
    public function dosenTugas(int $jadwalId)
    {
        $tugas = Tugas::where('jadwal_id', $jadwalId)
            ->withCount('submissions')
            ->orderBy('deadline')
            ->get()
            ->map(fn($t) => [
                'id'               => $t->id,
                'judul'            => $t->judul,
                'deskripsi'        => $t->deskripsi,
                'deadline'         => $t->deadline?->toIso8601String(),
                'pertemuan'        => $t->pertemuan,
                'submission_count' => $t->submissions_count,
                'is_lewat'         => $t->isDeadlineLewat(),
            ]);

        return response()->json(['success' => true, 'data' => $tugas]);
    }

    /** GET /api/dosen/elearning/{jadwalId}/kuis */
    public function dosenKuis(int $jadwalId)
    {
        $kuis = Kuis::where('jadwal_id', $jadwalId)
            ->withCount('soal')->withCount('submissions')
            ->orderByDesc('id')
            ->get()
            ->map(fn($k) => [
                'id'            => $k->id,
                'judul'         => $k->judul,
                'durasi'        => $k->durasi,
                'pertemuan'     => $k->pertemuan,
                'is_aktif'      => (bool) $k->is_aktif,
                'jumlah_soal'   => $k->soal_count,
                'peserta_count' => $k->submissions_count,
            ]);

        return response()->json(['success' => true, 'data' => $kuis]);
    }

    public function updateTugas(Request $request, int $id)
    {
        $tugas = Tugas::findOrFail($id);
        $tugas->update($request->only(['judul','deskripsi','deadline']));
        return response()->json(['success' => true, 'message' => 'Tugas berhasil diperbarui.']);
    }

    private function ext(string $path): string
    {
        return pathinfo($path, PATHINFO_EXTENSION);
    }
}
