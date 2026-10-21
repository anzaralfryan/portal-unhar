<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Jadwal;
use App\Models\KrsDetail;
use Illuminate\Http\Request;

class JadwalController extends Controller
{
    /**
     * GET /api/mahasiswa/jadwal
     * Jadwal mahasiswa berdasarkan KRS aktif, bisa filter hari & kelas_type.
     */
    public function mahasiswaJadwal(Request $request)
    {
        $mahasiswa  = auth()->user()->mahasiswa;

        // Ambil jadwal dari KRS aktif mahasiswa
        $krsIds = $mahasiswa->krs()->pluck('id');
        $jadwalIds = KrsDetail::whereIn('krs_id', $krsIds)->pluck('jadwal_id');

        $query = Jadwal::whereIn('id', $jadwalIds)
            ->with(['matkul', 'dosen.user', 'tahunAkademik']);

        if ($request->filled('tahun_id')) {
            $query->where('tahun_akademik_id', $request->tahun_id);
        }
        if ($request->filled('kelas_type')) {
            $query->where('kelas_type', $request->kelas_type);
        }
        if ($request->filled('hari')) {
            $query->where('hari', $request->hari);
        }

        $jadwal = $query->orderByRaw("FIELD(hari,'Senin','Selasa','Rabu','Kamis','Jumat','Sabtu')")
            ->orderBy('jam_mulai')
            ->get()
            ->map(fn($j) => $this->format($j));

        return response()->json(['success' => true, 'data' => $jadwal]);
    }

    /**
     * GET /api/dosen/jadwal
     * Jadwal mengajar dosen.
     */
    public function dosenJadwal(Request $request)
    {
        $dosen = auth()->user()->dosen;

        $query = Jadwal::where('dosen_id', $dosen->id)
            ->with(['matkul', 'tahunAkademik']);

        if ($request->filled('tahun_id')) {
            $query->where('tahun_akademik_id', $request->tahun_id);
        }

        $jadwal = $query->orderByRaw("FIELD(hari,'Senin','Selasa','Rabu','Kamis','Jumat','Sabtu')")
            ->orderBy('jam_mulai')
            ->get()
            ->map(fn($j) => $this->format($j));

        return response()->json(['success' => true, 'data' => $jadwal]);
    }

    private function format(Jadwal $j): array
    {
        return [
            'id'             => $j->id,
            // PENTING: 'matkul' dikembalikan sebagai STRING (nama) untuk kompatibilitas frontend
            // Gunakan 'matkul_detail' jika membutuhkan objek lengkap
            'matkul'         => $j->matkul?->nama,
            'nama_matkul'    => $j->matkul?->nama,
            'kode_matkul'    => $j->matkul?->kode,
            'sks'            => $j->matkul?->sks,
            'matkul_id'      => $j->matkul_id,
            // Objek detail untuk akses j.matkul?.nama di komponen baru
            'matkul_detail'  => $j->matkul ? [
                'id'   => $j->matkul->id,
                'nama' => $j->matkul->nama,
                'kode' => $j->matkul->kode,
                'sks'  => $j->matkul->sks,
            ] : null,
            'dosen'          => $j->dosen?->user?->name,
            'dosen_id'       => $j->dosen_id,
            'tahun_akademik' => $j->tahunAkademik?->label,
            'tahun_id'       => $j->tahun_akademik_id,
            'hari'           => $j->hari,
            'jam_mulai'      => $j->jam_mulai,
            'jam_selesai'    => $j->jam_selesai,
            'ruang'          => $j->ruang,
            'ruangan'        => $j->ruang,
            'kelas_type'     => $j->kelas_type,
            'kelas'          => $j->kelas_type,
        ];
    }
}
