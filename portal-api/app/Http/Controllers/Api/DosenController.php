<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Dosen;
use App\Models\TahunAkademik;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DosenController extends Controller
{
    public function profil()
    {
        $dosen = auth()->user()->dosen()->with(['prodi.fakultas','user'])->firstOrFail();
        return response()->json(['success' => true, 'data' => $this->format($dosen)]);
    }

    public function updateProfil(Request $request)
    {
        $request->validate([
            'no_hp'   => 'nullable|string|max:20',
            'alamat'  => 'nullable|string|max:255',
            'name'    => 'nullable|string|min:3|max:100',
        ]);

        $dosen = auth()->user()->dosen;
        $dosen->update($request->only(['no_hp','alamat']));

        if ($request->filled('name')) {
            auth()->user()->update(['name' => trim($request->name)]);
        }

        return response()->json(['success' => true, 'message' => 'Profil berhasil diperbarui.']);
    }

    public function uploadFoto(Request $request)
    {
        $request->validate([
            'foto' => 'required|image|mimes:jpg,jpeg,png|max:2048',
        ]);

        $dosen = auth()->user()->dosen;

        if ($dosen->foto) {
            Storage::disk('public')->delete($dosen->foto);
        }

        $path = $request->file('foto')->store('foto/dosen', 'public');
        $dosen->update(['foto' => $path]);

        return response()->json([
            'success'  => true,
            'message'  => 'Foto berhasil diperbarui.',
            'foto_url' => '/api/storage-file/'.$path,
        ]);
    }

    private function format(Dosen $d): array
    {
        // Ambil mata kuliah yang sedang diampu (dari jadwal tahun aktif)
        $tahunAktif = TahunAkademik::where('is_aktif', true)->first();
        $matkulDiampu = collect();
        if ($tahunAktif) {
            $matkulDiampu = $d->jadwal()
                ->where('tahun_akademik_id', $tahunAktif->id)
                ->with('matkul')
                ->get()
                ->map(fn($j) => [
                    'id'    => $j->matkul?->id,
                    'nama'  => $j->matkul?->nama,
                    'kode'  => $j->matkul?->kode,
                    'sks'   => $j->matkul?->sks,
                    'hari'  => $j->hari,
                    'ruang' => $j->ruang,
                ])
                ->unique('id')
                ->values();
        }

        return [
            'id'            => $d->id,
            'nidn'          => $d->nidn ?? $d->nip,
            'nip'           => $d->nip,
            'nama'          => $d->user->name,
            'email'         => $d->user->email,
            'jabatan'       => $d->jabatan,
            'no_hp'         => $d->no_hp,
            'alamat'        => $d->alamat,
            'prodi'         => $d->prodi?->nama,
            'fakultas'      => $d->prodi?->fakultas?->nama,
            'foto_url'      => $d->foto_url,
            'matkul_diampu' => $matkulDiampu,
        ];
    }

    /**
     * DELETE /api/dosen/profil/foto — Hapus foto profil dosen
     */
    public function deleteFoto()
    {
        $dosen = auth()->user()->dosen;
        if (!$dosen) {
            return response()->json(['success' => false, 'message' => 'Profil tidak ditemukan'], 404);
        }

        if ($dosen->foto) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($dosen->foto);
            $dosen->update(['foto' => null]);
        }

        return response()->json(['success' => true, 'message' => 'Foto profil berhasil dihapus.']);
    }
}
