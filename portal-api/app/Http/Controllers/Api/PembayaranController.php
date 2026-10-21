<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Pembayaran;
use App\Models\Mahasiswa;
use App\Models\TahunAkademik;
use Illuminate\Http\Request;
use Carbon\Carbon;

class PembayaranController extends Controller
{
    /** GET /api/mahasiswa/pembayaran */
    public function index()
    {
        $mahasiswa = auth()->user()->mahasiswa;
        $list = Pembayaran::where('mahasiswa_id', $mahasiswa->id)
            ->with('tahunAkademik')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($p) => $this->format($p));

        $tagihan = $list->whereIn('status', ['belum', 'menunggu', 'kadaluarsa'])->first();

        return response()->json([
            'success' => true,
            'data'    => [
                'tagihan_aktif' => $tagihan,
                'riwayat'       => $list->where('status', 'lunas')->values(),
            ],
        ]);
    }

    /**
     * POST /api/mahasiswa/pembayaran/mulai
     * Step 1 — mahasiswa pilih metode & input nominal.
     * Sistem simpan metode + nominal_dibayar, set status = 'menunggu',
     * dan kembalikan deadline_konfirmasi (15 menit dari sekarang).
     * Belum langsung lunas — mahasiswa harus konfirmasi lagi setelah benar-benar transfer.
     */
    public function mulaiPembayaran(Request $request)
    {
        $request->validate([
            'pembayaran_id'  => 'required|exists:pembayaran,id',
            'metode'         => 'required|string|max:50',
            'nominal_dibayar'=> 'required|numeric|min:1',
        ]);

        $mahasiswa  = auth()->user()->mahasiswa;
        $pembayaran = Pembayaran::where('id', $request->pembayaran_id)
            ->where('mahasiswa_id', $mahasiswa->id)
            ->firstOrFail();

        if ($pembayaran->status === 'lunas') {
            return response()->json(['success' => false, 'message' => 'Tagihan sudah lunas.'], 422);
        }

        if ($pembayaran->status === 'kadaluarsa') {
            return response()->json([
                'success' => false,
                'message' => 'Tagihan sudah kadaluarsa. Hubungi Admin untuk tagihan baru.',
            ], 422);
        }

        // Cek jatuh tempo tagihan
        if ($pembayaran->jatuh_tempo && Carbon::today()->gt($pembayaran->jatuh_tempo)) {
            $pembayaran->update(['status' => 'kadaluarsa']);
            return response()->json([
                'success' => false,
                'message' => 'Tagihan telah melewati jatuh tempo. Hubungi Admin.',
            ], 422);
        }

        // Validasi nominal: harus >= jumlah tagihan
        if ((float) $request->nominal_dibayar < (float) $pembayaran->jumlah) {
            return response()->json([
                'success' => false,
                'message' => 'Nominal yang dibayar kurang dari jumlah tagihan (Rp ' .
                             number_format($pembayaran->jumlah, 0, ',', '.') . '). ' .
                             'Pastikan nominal sesuai atau lebih.',
            ], 422);
        }

        // Set deadline konfirmasi: 15 menit dari sekarang
        $deadline = now()->addMinutes(15);

        $pembayaran->update([
            'metode'              => $request->metode,
            'nominal_dibayar'     => $request->nominal_dibayar,
            'status'              => 'menunggu',
            'deadline_konfirmasi' => $deadline,
        ]);

        return response()->json([
            'success'  => true,
            'message'  => 'Lanjutkan pembayaran sesuai metode yang dipilih, lalu klik Konfirmasi.',
            'data'     => [
                'deadline_konfirmasi'     => $deadline->toISOString(),
                'deadline_konfirmasi_str' => $deadline->format('H:i:s'),
                'menit_tersisa'           => 15,
            ],
        ]);
    }

    /**
     * POST /api/mahasiswa/pembayaran/konfirmasi
     * Step 2 — mahasiswa klik "Sudah Bayar".
     * Sistem cek apakah nominal_dibayar >= jumlah tagihan dan deadline belum lewat.
     * Jika lolos → lunas. Jika deadline lewat → kembali ke 'belum'.
     */
    public function konfirmasiPembayaran(Request $request)
    {
        $request->validate([
            'pembayaran_id' => 'required|exists:pembayaran,id',
        ]);

        $mahasiswa  = auth()->user()->mahasiswa;
        $pembayaran = Pembayaran::where('id', $request->pembayaran_id)
            ->where('mahasiswa_id', $mahasiswa->id)
            ->firstOrFail();

        if ($pembayaran->status === 'lunas') {
            return response()->json(['success' => false, 'message' => 'Tagihan sudah lunas.'], 422);
        }

        if ($pembayaran->status !== 'menunggu') {
            return response()->json([
                'success' => false,
                'message' => 'Belum ada sesi pembayaran aktif. Silakan mulai ulang proses pembayaran.',
            ], 422);
        }

        // Cek apakah deadline konfirmasi sudah lewat
        if ($pembayaran->deadline_konfirmasi && now()->gt($pembayaran->deadline_konfirmasi)) {
            // Reset ke 'belum' — mahasiswa harus mulai ulang
            $pembayaran->update([
                'status'              => 'belum',
                'nominal_dibayar'     => null,
                'deadline_konfirmasi' => null,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Waktu konfirmasi sudah habis (15 menit). Silakan ulangi proses pembayaran.',
            ], 422);
        }

        // Verifikasi nominal: nominal_dibayar harus >= jumlah tagihan
        if ((float) $pembayaran->nominal_dibayar < (float) $pembayaran->jumlah) {
            return response()->json([
                'success' => false,
                'message' => 'Nominal pembayaran tidak mencukupi. Pembayaran dibatalkan.',
            ], 422);
        }

        // LUNAS — sistem yang verifikasi otomatis
        $pembayaran->update([
            'status'        => 'lunas',
            'tanggal_bayar' => now(),
            'konfirmasi_at' => now(),
        ]);

        // Notifikasi ke mahasiswa
        \App\Models\Notifikasi::create([
            'user_id' => auth()->id(),
            'judul'   => '✅ Pembayaran Berhasil',
            'isi'     => 'Pembayaran "' . $pembayaran->label . '" sebesar Rp ' .
                         number_format($pembayaran->jumlah, 0, ',', '.') .
                         ' via ' . $pembayaran->metode . ' telah dikonfirmasi dan dinyatakan LUNAS. Terima kasih!',
            'tipe'    => 'Pembayaran',
            'is_read' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => '✅ Pembayaran berhasil! Status tagihan sudah LUNAS.',
            'data'    => $this->format($pembayaran->fresh('tahunAkademik')),
        ]);
    }

    /**
     * POST /api/mahasiswa/pembayaran (alias lama — backward compat)
     * Tetap bisa dipanggil, langsung lunas tanpa step menunggu.
     * Dipertahankan agar tidak breaking change jika ada code lama yang masih pakai.
     */
    public function store(Request $request)
    {
        $request->validate([
            'pembayaran_id' => 'required|exists:pembayaran,id',
            'metode'        => 'required|string|max:50',
        ]);

        $mahasiswa  = auth()->user()->mahasiswa;
        $pembayaran = Pembayaran::where('id', $request->pembayaran_id)
            ->where('mahasiswa_id', $mahasiswa->id)
            ->firstOrFail();

        if ($pembayaran->status === 'lunas') {
            return response()->json(['success' => false, 'message' => 'Pembayaran sudah lunas.'], 422);
        }
        if ($pembayaran->status === 'kadaluarsa') {
            return response()->json(['success' => false, 'message' => 'Tagihan kadaluarsa.'], 422);
        }
        if ($pembayaran->jatuh_tempo && Carbon::today()->gt($pembayaran->jatuh_tempo)) {
            $pembayaran->update(['status' => 'kadaluarsa']);
            return response()->json(['success' => false, 'message' => 'Tagihan melewati jatuh tempo.'], 422);
        }

        $pembayaran->update([
            'metode'        => $request->metode,
            'status'        => 'lunas',
            'tanggal_bayar' => now(),
            'konfirmasi_at' => now(),
        ]);

        \App\Models\Notifikasi::create([
            'user_id' => auth()->id(),
            'judul'   => '✅ Pembayaran Berhasil',
            'isi'     => 'Pembayaran "' . $pembayaran->label . '" sebesar Rp ' .
                         number_format($pembayaran->jumlah, 0, ',', '.') .
                         ' via ' . $request->metode . ' berhasil dikonfirmasi.',
            'tipe'    => 'Pembayaran',
            'is_read' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => '✅ Pembayaran berhasil dikonfirmasi! Status tagihan sudah LUNAS.',
            'data'    => $this->format($pembayaran->fresh('tahunAkademik')),
        ]);
    }

    public function uploadBukti(Request $request, int $id)
    {
        return response()->json(['success' => false, 'message' => 'Fitur tidak digunakan.'], 410);
    }

    /** GET /api/admin/pembayaran */
    public function adminIndex(Request $request)
    {
        $query = Pembayaran::with(['mahasiswa.user', 'tahunAkademik'])
            ->orderByDesc('created_at');

        if ($request->filled('status'))   $query->where('status', $request->status);
        if ($request->filled('tahun_id')) $query->where('tahun_akademik_id', $request->tahun_id);

        return response()->json(['success' => true, 'data' => $query->paginate(20)]);
    }

    /** PUT /api/admin/pembayaran/{id}/lunas */
    public function markLunas(int $id)
    {
        $p = Pembayaran::with('mahasiswa.user')->findOrFail($id);
        $p->update(['status' => 'lunas', 'tanggal_bayar' => now()]);

        $uid = $p->mahasiswa?->user?->id;
        if ($uid) {
            \App\Models\Notifikasi::create([
                'user_id' => $uid,
                'judul'   => '✅ Pembayaran Dikonfirmasi Admin',
                'isi'     => 'Pembayaran "' . $p->label . '" telah dikonfirmasi lunas oleh Admin.',
                'tipe'    => 'Pembayaran',
                'is_read' => false,
            ]);
        }

        return response()->json(['success' => true, 'message' => 'Pembayaran ditandai lunas oleh Admin.']);
    }

    /** PUT /api/admin/pembayaran/{id}/reset */
    public function resetTagihan(int $id)
    {
        $p = Pembayaran::with('mahasiswa.user')->findOrFail($id);

        if ($p->status === 'lunas') {
            return response()->json(['success' => false, 'message' => 'Tagihan sudah lunas, tidak bisa direset.'], 422);
        }

        $p->update([
            'status'              => 'belum',
            'metode'              => null,
            'nominal_dibayar'     => null,
            'tanggal_bayar'       => null,
            'konfirmasi_at'       => null,
            'deadline_konfirmasi' => null,
        ]);

        $uid = $p->mahasiswa?->user?->id;
        if ($uid) {
            \App\Models\Notifikasi::create([
                'user_id' => $uid,
                'judul'   => 'Tagihan UKT Direset',
                'isi'     => 'Tagihan "' . $p->label . '" telah direset oleh Admin. Silakan lakukan pembayaran kembali.',
                'tipe'    => 'Pembayaran',
                'is_read' => false,
            ]);
        }

        return response()->json(['success' => true, 'message' => 'Tagihan berhasil direset ke status Belum Bayar.']);
    }

    public function verifikasiBukti(Request $request, int $id)
    {
        return response()->json(['success' => false, 'message' => 'Fitur tidak digunakan.'], 410);
    }

    /** POST /api/admin/pembayaran/generate */
    public function generateTagihan(Request $request)
    {
        $request->validate([
            'tahun_akademik_id' => 'required|exists:tahun_akademik,id',
            'jumlah'            => 'required|numeric|min:0',
            'jatuh_tempo'       => 'required|date',
            'nomor_rekening'    => 'nullable|string|max:30',
            'kode_bank'         => 'nullable|string|max:20',
            'kode_antarbank'    => 'nullable|string|max:10',
            'nama_bank'         => 'nullable|string|max:50',
            'atas_nama'         => 'nullable|string|max:100',
        ]);

        $tahun = TahunAkademik::findOrFail($request->tahun_akademik_id);
        $mahasiswaList = Mahasiswa::where('status', 'aktif')->get();
        $count = 0;

        foreach ($mahasiswaList as $mhs) {
            if (Pembayaran::where('mahasiswa_id', $mhs->id)
                    ->where('tahun_akademik_id', $request->tahun_akademik_id)->exists()) continue;

            Pembayaran::create([
                'mahasiswa_id'      => $mhs->id,
                'tahun_akademik_id' => $request->tahun_akademik_id,
                'label'             => "UKT Semester {$tahun->semester} {$tahun->tahun}",
                'jumlah'            => $request->jumlah,
                'va_bank_utama'     => $request->filled('kode_bank') ? $request->kode_bank . $mhs->nim : null,
                'va_bank_lain'      => ($request->filled('kode_antarbank') && $request->filled('kode_bank'))
                    ? $request->kode_antarbank . $request->kode_bank . $mhs->nim : null,
                'kode_bank'         => $request->kode_bank,
                'kode_antarbank'    => $request->kode_antarbank,
                'kode_va'           => $request->filled('kode_bank') ? $request->kode_bank . $mhs->nim : null,
                'nomor_rekening'    => $request->nomor_rekening,
                'nama_bank'         => $request->nama_bank,
                'atas_nama'         => $request->atas_nama,
                'jatuh_tempo'       => $request->jatuh_tempo,
            ]);

            \App\Models\Notifikasi::create([
                'user_id' => $mhs->user_id,
                'judul'   => 'Tagihan UKT Baru',
                'isi'     => "Tagihan UKT Semester {$tahun->semester} {$tahun->tahun} telah tersedia. " .
                             'Jatuh tempo: ' . \Carbon\Carbon::parse($request->jatuh_tempo)->format('d M Y') . '.',
                'tipe'    => 'Pembayaran',
                'is_read' => false,
            ]);

            $count++;
        }

        return response()->json(['success' => true, 'message' => "{$count} tagihan berhasil dibuat."]);
    }

    private function format(Pembayaran $p): array
    {
        return [
            'id'                      => $p->id,
            'label'                   => $p->label,
            'jumlah'                  => $p->jumlah,
            'status'                  => $p->status,
            'kode_va'                 => $p->kode_va,
            'va_bank_utama'           => $p->va_bank_utama,
            'va_bank_lain'            => $p->va_bank_lain,
            'kode_bank'               => $p->kode_bank,
            'kode_antarbank'          => $p->kode_antarbank,
            'nomor_rekening'          => $p->nomor_rekening,
            'nama_bank'               => $p->nama_bank,
            'atas_nama'               => $p->atas_nama,
            'metode'                  => $p->metode,
            'nominal_dibayar'         => $p->nominal_dibayar,
            'tanggal_bayar'           => $p->tanggal_bayar?->format('d M Y'),
            'jatuh_tempo'             => $p->jatuh_tempo?->format('d M Y'),
            'jatuh_tempo_raw'         => $p->jatuh_tempo?->toISOString(),
            'tahun_akademik'          => $p->tahunAkademik?->label,
            'konfirmasi_at'           => $p->konfirmasi_at?->format('d M Y H:i'),
            'deadline_konfirmasi'     => $p->deadline_konfirmasi?->toISOString(),
            'sisa_hari'               => ($p->status === 'belum' && $p->jatuh_tempo)
                ? max(0, (int) now()->startOfDay()->diffInDays($p->jatuh_tempo->startOfDay(), false))
                : null,
        ];
    }
}
