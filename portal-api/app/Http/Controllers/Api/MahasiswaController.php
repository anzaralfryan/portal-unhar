<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mahasiswa;
use App\Models\Dosen;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MahasiswaController extends Controller
{
    /** GET /api/mahasiswa/profil */
    public function profil()
    {
        $mahasiswa = auth()->user()->mahasiswa()
            ->with(['prodi.fakultas', 'user'])
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data'    => $this->formatProfil($mahasiswa),
        ]);
    }

    /** PUT /api/mahasiswa/profil */
    public function updateProfil(Request $request)
    {
        $request->validate([
            'no_hp'   => 'nullable|string|max:20',
            'alamat'  => 'nullable|string|max:255',
            'name'    => 'nullable|string|min:3|max:100',
        ]);

        $mahasiswa = auth()->user()->mahasiswa;

        // Update kolom yang boleh diubah sendiri
        $mahasiswa->update($request->only(['no_hp', 'alamat']));

        // Update name di users jika dikirim
        if ($request->filled('name')) {
            auth()->user()->update(['name' => trim($request->name)]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Profil berhasil diperbarui.',
            'data'    => $this->formatProfil($mahasiswa->fresh(['prodi.fakultas', 'user'])),
        ]);
    }

    /** POST /api/mahasiswa/profil/foto */
    public function uploadFoto(Request $request)
    {
        $request->validate([
            'foto' => 'required|image|mimes:jpg,jpeg,png|max:2048',
        ]);

        $mahasiswa = auth()->user()->mahasiswa;

        // Hapus foto lama
        if ($mahasiswa->foto) {
            Storage::disk('public')->delete($mahasiswa->foto);
        }

        $path = $request->file('foto')->store('foto/mahasiswa', 'public');
        $mahasiswa->update(['foto' => $path]);

        return response()->json([
            'success'  => true,
            'message'  => 'Foto berhasil diperbarui.',
            'foto_url' => '/api/storage-file/'.$path,
        ]);
    }

    // ─── Helper ───────────────────────────────────────
    private function formatProfil(Mahasiswa $m): array
    {
        // Load relasi dosen PA
        $m->loadMissing(['dosenPa.user']);

        // Hitung IPK dan total SKS menggunakan logika yang sama dengan NilaiController
        $nilai = $m->nilai()->with('matkul')->whereNotNull('nilai_huruf')->get();

        $totalBobot = 0;
        $totalSks   = 0;
        foreach ($nilai as $n) {
            $sks         = $n->matkul?->sks ?? 0;
            $bobot       = $this->hurufKeBobot($n->nilai_huruf);
            $totalBobot += $sks * $bobot;
            $totalSks   += $sks;
        }

        $ipk     = $totalSks > 0 ? number_format($totalBobot / $totalSks, 2) : null;
        $sksLulus = $totalSks;

        return [
            'id'         => $m->id,
            'nim'        => $m->nim,
            'nama'       => $m->user->name,
            'email'      => $m->user->email,
            'no_hp'      => $m->no_hp ?? null,
            'alamat'     => $m->alamat ?? null,
            'prodi'      => $m->prodi?->nama,
            'prodi_id'   => $m->prodi_id,
            'fakultas'   => $m->prodi?->fakultas?->nama,
            'angkatan'   => $m->angkatan,
            'semester'   => $m->semester,
            'kelas'      => $m->kelas,
            'status'     => $m->status,
            'foto_url'   => $m->foto_url,
            'dospem'     => $m->dosenPa?->user?->name,   // Dosen Pembimbing Akademik
            'dosen_pa_id'=> $m->dosen_pa_id,
            'ipk'        => $ipk,          // "3.50" atau null jika belum ada nilai
            'sks_lulus'  => $sksLulus,     // integer total SKS
        ];
    }

    /** Konversi nilai huruf ke bobot angka — identik dengan NilaiController */
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

    /**
     * DELETE /api/mahasiswa/profil/foto — Hapus foto profil mahasiswa
     */
    public function deleteFoto()
    {
        $mahasiswa = auth()->user()->mahasiswa;
        if (!$mahasiswa) {
            return response()->json(['success' => false, 'message' => 'Profil tidak ditemukan'], 404);
        }

        if ($mahasiswa->foto) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($mahasiswa->foto);
            $mahasiswa->update(['foto' => null]);
        }

        return response()->json(['success' => true, 'message' => 'Foto profil berhasil dihapus.']);
    }
}
