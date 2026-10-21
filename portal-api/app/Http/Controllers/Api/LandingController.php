<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LandingKonten;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class LandingController extends Controller
{
    /* ═══════════════════════════════════════════════════
       PUBLIC — Ambil semua konten untuk ditampilkan di landing page
       GET /api/landing
    ═══════════════════════════════════════════════════ */
    public function index()
    {
        $tipes = ['berita', 'pengumuman', 'agenda', 'hero', 'stats', 'layanan', 'keunggulan', 'mitra'];
        $result = [];

        foreach ($tipes as $tipe) {
            $result[$tipe] = LandingKonten::aktif()->tipe($tipe)->get();
        }

        return response()->json(['data' => $result]);
    }

    /* ═══════════════════════════════════════════════════
       ADMIN — List per tipe
       GET /api/admin/landing?tipe=berita
    ═══════════════════════════════════════════════════ */
    public function adminIndex(Request $request)
    {
        $tipe = $request->query('tipe');

        $q = LandingKonten::orderBy('urutan')->orderBy('id', 'desc');
        if ($tipe) $q->where('tipe', $tipe);

        return response()->json(['data' => $q->get()]);
    }

    /* ═══════════════════════════════════════════════════
       ADMIN — Buat konten baru
       POST /api/admin/landing
    ═══════════════════════════════════════════════════ */
    public function store(Request $request)
    {
        $v = Validator::make($request->all(), [
            'tipe'            => 'required|string|max:30',
            'judul'           => 'nullable|string|max:500',
            'isi'             => 'nullable|string',
            'gambar'          => 'nullable|string|max:500',
            'kategori'        => 'nullable|string|max:80',
            'link'            => 'nullable|string|max:500',
            'tanggal_tampil'  => 'nullable|string|max:20',
            'bulan_tampil'    => 'nullable|string|max:10',
            'urutan'          => 'nullable|integer|min:0',
            'aktif'           => 'nullable|boolean',
            'meta'            => 'nullable|array',
        ]);
        if ($v->fails()) return response()->json(['message' => $v->errors()->first()], 422);

        $item = LandingKonten::create($v->validated());
        return response()->json(['message' => 'Berhasil disimpan.', 'data' => $item], 201);
    }

    /* ═══════════════════════════════════════════════════
       ADMIN — Update konten
       PUT /api/admin/landing/{id}
    ═══════════════════════════════════════════════════ */
    public function update(Request $request, $id)
    {
        $item = LandingKonten::findOrFail($id);

        $v = Validator::make($request->all(), [
            'tipe'            => 'sometimes|string|max:30',
            'judul'           => 'nullable|string|max:500',
            'isi'             => 'nullable|string',
            'gambar'          => 'nullable|string|max:500',
            'kategori'        => 'nullable|string|max:80',
            'link'            => 'nullable|string|max:500',
            'tanggal_tampil'  => 'nullable|string|max:20',
            'bulan_tampil'    => 'nullable|string|max:10',
            'urutan'          => 'nullable|integer|min:0',
            'aktif'           => 'nullable|boolean',
            'meta'            => 'nullable|array',
        ]);
        if ($v->fails()) return response()->json(['message' => $v->errors()->first()], 422);

        $item->update($v->validated());
        return response()->json(['message' => 'Berhasil diperbarui.', 'data' => $item]);
    }

    /* ═══════════════════════════════════════════════════
       ADMIN — Toggle aktif/nonaktif
       PATCH /api/admin/landing/{id}/toggle
    ═══════════════════════════════════════════════════ */
    public function toggle($id)
    {
        $item = LandingKonten::findOrFail($id);
        $item->update(['aktif' => !$item->aktif]);
        return response()->json(['message' => 'Status diperbarui.', 'data' => $item]);
    }

    /* ═══════════════════════════════════════════════════
       ADMIN — Hapus konten
       DELETE /api/admin/landing/{id}
    ═══════════════════════════════════════════════════ */
    public function destroy($id)
    {
        LandingKonten::findOrFail($id)->delete();
        return response()->json(['message' => 'Konten dihapus.']);
    }

    /* ═══════════════════════════════════════════════════
       ADMIN — Reorder (update urutan massal)
       POST /api/admin/landing/reorder
       body: [{ id: 1, urutan: 0 }, ...]
    ═══════════════════════════════════════════════════ */
    public function reorder(Request $request)
    {
        $items = $request->input('items', []);
        foreach ($items as $row) {
            if (!empty($row['id'])) {
                LandingKonten::where('id', $row['id'])->update(['urutan' => $row['urutan'] ?? 0]);
            }
        }
        return response()->json(['message' => 'Urutan diperbarui.']);
    }
}
