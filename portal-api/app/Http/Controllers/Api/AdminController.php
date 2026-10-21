<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{User, Mahasiswa, Dosen, Prodi, Fakultas, Matkul, Jadwal, TahunAkademik, Krs, Pembayaran, Notifikasi, SiteVisit, Ruangan};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

class AdminController extends Controller
{
    /* ════════════════════════════════════════════════════
       DASHBOARD
    ════════════════════════════════════════════════════ */

    /** GET /api/admin/dashboard */
    public function dashboard()
    {
        $tahunAktif = TahunAkademik::where('is_aktif', true)->first();

        // ── Statistik Pengunjung — dibungkus try-catch agar tidak crash jika tabel belum ada ──
        $visitStats = [
            'online_sekarang'  => 0,
            'online_mahasiswa' => 0,
            'online_dosen'     => 0,
            'online_admin'     => 0,
            'kunjungan_hari_ini'  => 0,
            'kunjungan_bulan_ini' => 0,
            'kunjungan_total'     => 0,
            'grafik_7_hari'       => collect(range(6, 0))->map(fn($i) => [
                'label'     => now()->subDays($i)->locale('id')->isoFormat('ddd'),
                'tanggal'   => now()->subDays($i)->toDateString(),
                'total'     => 0, 'mahasiswa' => 0, 'dosen' => 0,
            ])->values(),
        ];

        try {
            $cutoff = now()->subMinutes(5);
            $visitStats = [
                'online_sekarang'     => SiteVisit::where('last_active', '>=', $cutoff)->count(),
                'online_mahasiswa'    => SiteVisit::where('last_active', '>=', $cutoff)->where('role', 'mahasiswa')->count(),
                'online_dosen'        => SiteVisit::where('last_active', '>=', $cutoff)->where('role', 'dosen')->count(),
                'online_admin'        => SiteVisit::where('last_active', '>=', $cutoff)->where('role', 'admin')->count(),
                'kunjungan_hari_ini'  => SiteVisit::whereDate('created_at', today())->count(),
                'kunjungan_bulan_ini' => SiteVisit::whereYear('created_at', now()->year)->whereMonth('created_at', now()->month)->count(),
                'kunjungan_total'     => SiteVisit::count(),
                'grafik_7_hari'       => collect(range(6, 0))->map(function ($i) {
                    $tgl = now()->subDays($i)->toDateString();
                    return [
                        'label'     => now()->subDays($i)->locale('id')->isoFormat('ddd'),
                        'tanggal'   => $tgl,
                        'total'     => SiteVisit::whereDate('created_at', $tgl)->count(),
                        'mahasiswa' => SiteVisit::whereDate('created_at', $tgl)->where('role', 'mahasiswa')->count(),
                        'dosen'     => SiteVisit::whereDate('created_at', $tgl)->where('role', 'dosen')->count(),
                    ];
                })->values(),
            ];
        } catch (\Throwable $e) {
            Log::warning('[Dashboard] SiteVisit query gagal: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'data' => array_merge([
                'tahun_aktif'        => $tahunAktif?->label,
                'total_mahasiswa'    => Mahasiswa::where('status', 'aktif')->count(),
                'total_dosen'        => Dosen::count(),
                'total_prodi'        => Prodi::count(),
                'total_jadwal'       => $tahunAktif
                    ? Jadwal::where('tahun_akademik_id', $tahunAktif->id)->count()
                    : 0,
                'krs_diajukan'       => $tahunAktif
                    ? Krs::where('tahun_akademik_id', $tahunAktif->id)->where('status', 'diajukan')->count()
                    : 0,
                'tagihan_belum_lunas'=> $tahunAktif
                    ? Pembayaran::where('tahun_akademik_id', $tahunAktif->id)->where('status', 'belum')->count()
                    : 0,
            ], $visitStats),
        ]);
    }

    /* ════════════════════════════════════════════════════
        PROFIL ADMIN
        ════════════════════════════════════════════════════ */

        /** GET /api/admin/profil */
        public function profil()
        {
            $user = auth()->user();
            return response()->json([
                'success' => true,
                'data' => [
                    'id'      => $user->id,
                    'nama'    => $user->name,
                    'email'   => $user->email,
                    'telepon' => $user->telepon ?? null,
                    'role'    => $user->role,
                ],
            ]);
        }

        /** PUT /api/admin/profil */
        public function updateProfil(Request $request)
        {
            $user = auth()->user();

            $request->validate([
                'nama'    => 'nullable|string|max:100',
                'email'   => 'nullable|email|unique:users,email,'.$user->id,
                'telepon' => 'nullable|string|max:20',
            ]);

            if ($request->filled('nama'))    $user->name = $request->nama;
            if ($request->filled('email'))   $user->email = $request->email;
            if ($request->filled('telepon') && Schema::hasColumn('users', 'telepon')) {
                $user->telepon = $request->telepon;
            }
            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Profil berhasil diperbarui.',
                'data' => [
                    'nama'    => $user->name,
                    'email'   => $user->email,
                    'telepon' => $user->telepon ?? null,
                ],
            ]);
        }

    /* ════════════════════════════════════════════════════
       MAHASISWA
    ════════════════════════════════════════════════════ */

    public function mahasiswaIndex(Request $request)
    {
        $query = Mahasiswa::with(['user', 'prodi'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('prodi_id')) $query->where('prodi_id', $request->prodi_id);
        if ($request->filled('status'))   $query->where('status', $request->status);
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn($q) => $q
                ->where('nim', 'like', "%$s%")
                ->orWhereHas('user', fn($q) => $q->where('name', 'like', "%$s%"))
            );
        }

        return response()->json(['success' => true, 'data' => $query->paginate(20)]);
    }

    public function mahasiswaShow(int $id)
    {
        $mhs = Mahasiswa::with(['user', 'prodi.fakultas'])->findOrFail($id);
        return response()->json(['success' => true, 'data' => $mhs]);
    }

    public function mahasiswaStore(Request $request)
    {
        $request->validate([
            'name'      => 'required|string|max:100',
            'email'     => 'required|email|unique:users,email',
            'nim'       => 'required|string|unique:mahasiswa,nim',
            'prodi_id'  => 'required|exists:prodi,id',
            'angkatan'  => 'required|integer|min:2000|max:2099',
            'semester'  => 'required|integer|min:1|max:14',
            'kelas'     => 'required|in:pagi,sore,karyawan',
            'password'  => 'nullable|string|min:8',
        ]);

        DB::transaction(function () use ($request, &$mhs) {
            $user = User::create([
                'name'     => $request->name,
                'email'    => $request->email,
                'password' => Hash::make($request->filled('password') ? trim($request->password) : trim($request->nim)),
                'role'     => 'mahasiswa',
                'is_active'=> true,
            ]);

            $mhs = Mahasiswa::create([
                'user_id'  => $user->id,
                'nim'      => $request->nim,
                'prodi_id' => $request->prodi_id,
                'angkatan' => $request->angkatan,
                'semester' => $request->semester,
                'kelas'    => $request->kelas,
                'status'   => 'aktif',
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Mahasiswa berhasil ditambahkan. Password default: NIM.',
            'data'    => $mhs->load(['user', 'prodi']),
        ], 201);
    }

    public function mahasiswaUpdate(Request $request, int $id)
    {
        $mhs = Mahasiswa::findOrFail($id);

        $request->validate([
            'name'     => 'nullable|string|max:100',
            'semester' => 'nullable|integer|min:1|max:14',
            'status'   => 'nullable|in:aktif,cuti,lulus,keluar',
            'kelas'      => 'nullable|in:pagi,sore,karyawan',
            'prodi_id'   => 'nullable|exists:prodi,id',
            'dosen_pa_id'=> 'nullable|exists:dosen,id',
        ]);

        if ($request->filled('name')) {
            $mhs->user->update(['name' => $request->name]);
        }

        $updateData = $request->only(['semester', 'status', 'kelas']);
        if ($request->filled('prodi_id')) {
            $updateData['prodi_id'] = $request->prodi_id;
        }
        // Dosen PA — boleh null untuk melepas assign
        if ($request->has('dosen_pa_id')) {
            $updateData['dosen_pa_id'] = $request->dosen_pa_id ?: null;
        }

        $mhs->update($updateData);

        return response()->json(['success' => true, 'message' => 'Data mahasiswa diperbarui.']);
    }

    public function mahasiswaDestroy(int $id)
    {
        $mhs = Mahasiswa::findOrFail($id);
        $mhs->user->update(['is_active' => false]);
        return response()->json(['success' => true, 'message' => 'Akun mahasiswa dinonaktifkan.']);
    }

    /** DELETE permanen — hanya boleh jika mahasiswa sudah nonaktif */
    public function mahasiswaForceDelete(int $id)
    {
        $mhs = Mahasiswa::findOrFail($id);

        if ($mhs->user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Nonaktifkan akun terlebih dahulu sebelum menghapus permanen.',
            ], 422);
        }
        if ($mhs->krs()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak bisa menghapus — mahasiswa ini masih memiliki data KRS.',
            ], 422);
        }

        $user = $mhs->user;
        $mhs->delete();
        $user->delete();

        return response()->json(['success' => true, 'message' => 'Data mahasiswa berhasil dihapus permanen.']);
    }

    /* ════════════════════════════════════════════════════
       DOSEN
    ════════════════════════════════════════════════════ */

    public function dosenIndex(Request $request)
    {
        $query = Dosen::with(['user', 'prodi'])->orderBy('created_at', 'desc');

        if ($request->filled('prodi_id')) $query->where('prodi_id', $request->prodi_id);
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn($q) => $q
                ->where('nip', 'like', "%$s%")
                ->orWhereHas('user', fn($q) => $q->where('name', 'like', "%$s%"))
            );
        }

        return response()->json(['success' => true, 'data' => $query->paginate(20)]);
    }

    public function dosenShow(int $id)
    {
        return response()->json(['success' => true, 'data' => Dosen::with(['user','prodi.fakultas'])->findOrFail($id)]);
    }

    public function dosenStore(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:100',
            'email'    => 'required|email|unique:users,email',
            'nip'      => 'required|string|unique:dosen,nip',
            'prodi_id' => 'required|exists:prodi,id',
            'jabatan'  => 'nullable|string|max:100',
            'password' => 'nullable|string|min:8',
        ]);

        DB::transaction(function () use ($request, &$dosen) {
            $user = User::create([
                'name'     => $request->name,
                'email'    => $request->email,
                'password' => Hash::make($request->filled('password') ? trim($request->password) : trim($request->nip)),
                'role'     => 'dosen',
                'is_active'=> true,
            ]);

            $dosen = Dosen::create([
                'user_id'  => $user->id,
                'nip'      => $request->nip,
                'prodi_id' => $request->prodi_id,
                'jabatan'  => $request->jabatan,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Dosen berhasil ditambahkan. Password default: NIP.',
            'data'    => $dosen->load(['user', 'prodi']),
        ], 201);
    }

    public function dosenUpdate(Request $request, int $id)
    {
        $dosen = Dosen::findOrFail($id);
        if ($request->filled('name'))    $dosen->user->update(['name' => $request->name]);
        if ($request->filled('jabatan')) $dosen->update(['jabatan' => $request->jabatan]);
        if ($request->filled('prodi_id')) $dosen->update(['prodi_id' => $request->prodi_id]);
        return response()->json(['success' => true, 'message' => 'Data dosen diperbarui.']);
    }

    public function dosenDestroy(int $id)
    {
        $dosen = Dosen::findOrFail($id);
        $dosen->user->update(['is_active' => false]);
        return response()->json(['success' => true, 'message' => 'Akun dosen dinonaktifkan.']);
    }

    /** DELETE permanen — hanya boleh jika dosen sudah nonaktif */
    public function dosenForceDelete(int $id)
    {
        $dosen = Dosen::findOrFail($id);

        if ($dosen->user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Nonaktifkan akun terlebih dahulu sebelum menghapus permanen.',
            ], 422);
        }
        if ($dosen->jadwal()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak bisa menghapus — dosen ini masih memiliki data jadwal.',
            ], 422);
        }

        $user = $dosen->user;
        $dosen->delete();
        $user->delete();

        return response()->json(['success' => true, 'message' => 'Data dosen berhasil dihapus permanen.']);
    }

    /* ════════════════════════════════════════════════════
       PRODI & MATKUL & JADWAL (simple CRUD)
    ════════════════════════════════════════════════════ */

    // Prodi
    public function prodiIndex(Request $request)
    {
        try {
            $q = Prodi::with('fakultas')->withCount('matkul');
            if ($request->filled('fakultas_id')) $q->where('fakultas_id', $request->fakultas_id);
            return response()->json(['success'=>true,'data'=>$q->orderBy('is_aktif','desc')->orderBy('nama')->get()]);
        } catch (\Throwable $e) {
            // Fallback: kolom is_aktif belum ada
            $q = Prodi::with('fakultas');
            if ($request->filled('fakultas_id')) $q->where('fakultas_id', $request->fakultas_id);
            return response()->json(['success'=>true,'data'=>$q->orderBy('nama')->get()]);
        }
    }

    public function prodiToggle(int $id)
    {
        try {
            $prodi = Prodi::findOrFail($id);
            $prodi->update(['is_aktif' => !$prodi->is_aktif]);
            $status = $prodi->is_aktif ? 'diaktifkan' : 'dinonaktifkan';
            return response()->json(['success' => true, 'message' => "Prodi berhasil $status."]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Kolom is_aktif belum ada. Jalankan: php artisan migrate (atau lihat SQL di panduan).'], 422);
        }
    }
    public function prodiStore(Request $request)
    {
        $request->validate(['nama'=>'required|string','kode'=>'required|string|unique:prodi,kode','fakultas_id'=>'required|exists:fakultas,id']);
        $prodi = Prodi::create($request->only(['nama','kode','fakultas_id']));
        return response()->json(['success'=>true,'data'=>$prodi],201);
    }
    public function prodiUpdate(Request $request, int $id)
    {
        $prodi = Prodi::findOrFail($id);
        $request->validate([
            'nama'        => 'nullable|string|max:255',
            'kode'        => 'nullable|string|max:10|unique:prodi,kode,'.$id,
            'fakultas_id' => 'nullable|exists:fakultas,id',
        ]);

        $fields = array_filter(
            $request->only(['nama','kode','fakultas_id']),
            fn($v) => $v !== null && $v !== ''
        );
        $prodi->update($fields);

        return response()->json(['success'=>true,'message'=>'Prodi diperbarui.']);
    }
    
    public function prodiDestroy(int $id)
    {
        $p = Prodi::findOrFail($id);
        $mhsCount = Mahasiswa::where('prodi_id', $id)->count();
        $dosenCount = Dosen::where('prodi_id', $id)->count();
        $matkulCount = Matkul::where('prodi_id', $id)->count();
        
        if ($mhsCount + $dosenCount + $matkulCount > 0) {
            $parts = [];
            if ($mhsCount > 0) $parts[] = "{$mhsCount} mahasiswa";
            if ($dosenCount > 0) $parts[] = "{$dosenCount} dosen";
            if ($matkulCount > 0) $parts[] = "{$matkulCount} mata kuliah";
            return response()->json([
                'success' => false,
                'message' => 'Tidak bisa menghapus prodi karena masih memiliki: ' . implode(', ', $parts) . '.',
            ], 422);
        }
        $p->delete();
        return response()->json(['success'=>true,'message'=>'Prodi dihapus.']);
    }

    // Matkul
    public function matkulIndex(Request $request)
    {
        $q = Matkul::with('prodi');
        if ($request->filled('prodi_id')) $q->where('prodi_id',$request->prodi_id);
        return response()->json(['success'=>true,'data'=>$q->get()]);
    }
    public function matkulStore(Request $request)
    {
        $request->validate(['kode'=>'required|unique:matkul,kode','nama'=>'required','sks'=>'required|integer|min:1|max:6','semester'=>'required|integer|min:1|max:14','prodi_id'=>'required|exists:prodi,id']);
        $m = Matkul::create($request->only(['kode','nama','sks','semester','prodi_id']));
        return response()->json(['success'=>true,'data'=>$m],201);
    }
    public function matkulUpdate(Request $request, int $id)
    {
        $matkul = Matkul::findOrFail($id);
        $request->validate([
            'nama'     => 'nullable|string|max:255',
            'kode'     => 'nullable|string|max:20|unique:matkul,kode,'.$id,
            'sks'      => 'nullable|integer|min:1|max:6',
            'semester' => 'nullable|integer|min:1|max:8',
            'prodi_id' => 'nullable|exists:prodi,id',
        ]);

        $fields = array_filter(
            $request->only(['nama','kode','sks','semester','prodi_id']),
            fn($v) => $v !== null && $v !== ''
        );
        $matkul->update($fields);

        return response()->json(['success'=>true,'message'=>'Mata kuliah diperbarui.']);
    }
    
    public function matkulToggle(int $id)
    {
        try {
            $m = Matkul::findOrFail($id);
            $m->update(['is_aktif' => !$m->is_aktif]);
            $status = $m->is_aktif ? 'diaktifkan' : 'dinonaktifkan';
            return response()->json(['success' => true, 'message' => "Mata kuliah berhasil $status."]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Kolom is_aktif belum ada. Jalankan: php artisan migrate (atau lihat SQL di panduan).'], 422);
        }
    }

    public function matkulDestroy(int $id)
    {
        $m = Matkul::findOrFail($id);
        if (Jadwal::where('matkul_id', $id)->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak bisa menghapus mata kuliah karena masih digunakan di jadwal. Hapus jadwal terlebih dahulu.',
            ], 422);
        }
        $m->delete();
        return response()->json(['success'=>true]);
    }

    // Ruangan
    public function ruanganIndex()
    {
        try {
            return response()->json(['success'=>true,'data'=>Ruangan::orderBy('is_aktif','desc')->orderBy('nama')->get()]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Tabel ruangan belum ada. Jalankan: php artisan migrate (atau lihat SQL di panduan Batch 2).','data'=>[]], 200);
        }
    }
    public function ruanganStore(Request $request)
    {
        $request->validate([
            'nama'      => 'required|string|max:50',
            'gedung'    => 'nullable|string|max:30',
            'kapasitas' => 'nullable|integer|min:1|max:500',
        ]);
        $r = Ruangan::create($request->only(['nama','gedung','kapasitas']));
        return response()->json(['success'=>true,'data'=>$r],201);
    }
    public function ruanganUpdate(Request $request, int $id)
    {
        Ruangan::findOrFail($id)->update($request->only(['nama','gedung','kapasitas']));
        return response()->json(['success'=>true]);
    }
    public function ruanganToggle(int $id)
    {
        $r = Ruangan::findOrFail($id);
        $r->update(['is_aktif' => !$r->is_aktif]);
        $status = $r->is_aktif ? 'diaktifkan' : 'dinonaktifkan';
        return response()->json(['success'=>true,'message'=>"Ruangan berhasil $status."]);
    }
    public function ruanganDestroy(int $id)
    {
        Ruangan::findOrFail($id)->delete();
        return response()->json(['success'=>true]);
    }

    // Jadwal
    public function jadwalIndex(Request $request)
    {
        $q = Jadwal::with(['matkul','dosen.user','tahunAkademik']);
        if ($request->filled('tahun_id')) $q->where('tahun_akademik_id',$request->tahun_id);
        return response()->json(['success'=>true,'data'=>$q->get()]);
    }
    public function jadwalStore(Request $request)
    {
        $request->validate([
            'matkul_id'=>'required|exists:matkul,id',
            'dosen_id'=>'required|exists:dosen,id',
            'tahun_akademik_id'=>'required|exists:tahun_akademik,id',
            'hari'=>'required|in:Senin,Selasa,Rabu,Kamis,Jumat,Sabtu',
            'jam_mulai'=>'required|date_format:H:i',
            'jam_selesai'=>'required|date_format:H:i|after:jam_mulai',
            'ruang'=>'required|string|max:30',
            'kelas_type'=>'required|in:pagi,sore,karyawan',
        ]);

        $conflict = $this->findJadwalConflict($request);
        if ($conflict) {
            return response()->json([
                'success' => false,
                'message' => $conflict,
            ], 422);
        }

        $j = Jadwal::create($request->only(['matkul_id','dosen_id','tahun_akademik_id','hari','jam_mulai','jam_selesai','ruang','kelas_type','kapasitas']));
        return response()->json(['success'=>true,'data'=>$j->load(['matkul','dosen.user'])],201);
    }
    public function jadwalUpdate(Request $request, int $id)
    {
        $jadwal = Jadwal::findOrFail($id);

        $request->validate([
            'hari'        => 'nullable|in:Senin,Selasa,Rabu,Kamis,Jumat,Sabtu',
            'jam_mulai'   => 'nullable|date_format:H:i',
            'jam_selesai' => 'nullable|date_format:H:i',
            'ruang'       => 'nullable|string|max:30',
            'dosen_id'    => 'nullable|exists:dosen,id',
        ]);

        $conflict = $this->findJadwalConflict($request, $jadwal);
        if ($conflict) {
            return response()->json([
                'success' => false,
                'message' => $conflict,
            ], 422);
        }

        $jadwal->update($request->only(['hari','jam_mulai','jam_selesai','ruang','dosen_id']));
        return response()->json(['success'=>true]);
    }

    /**
     * Cek apakah ada jadwal lain yang bentrok (tahun ajaran + hari sama,
     * dan jam saling overlap, DAN dosen sama ATAU ruangan sama).
     *
     * @param  Request $request
     * @param  Jadwal|null $ignore  Jadwal yang sedang diedit (dikecualikan dari cek)
     * @return string|null  Pesan error jika bentrok, null jika aman
     */
    private function findJadwalConflict(Request $request, ?Jadwal $ignore = null): ?string
    {
        // Ambil nilai final (gunakan data baru jika ada, fallback ke data lama saat update)
        $tahunId   = $request->input('tahun_akademik_id', $ignore?->tahun_akademik_id);
        $hari      = $request->input('hari', $ignore?->hari);
        $jamMulai  = $request->input('jam_mulai', $ignore?->jam_mulai);
        $jamSelesai= $request->input('jam_selesai', $ignore?->jam_selesai);
        $ruang     = $request->input('ruang', $ignore?->ruang);
        $dosenId   = $request->input('dosen_id', $ignore?->dosen_id);

        if (!$tahunId || !$hari || !$jamMulai || !$jamSelesai) {
            return null; // data belum lengkap, biarkan validasi standar yang menangani
        }

        $query = Jadwal::where('tahun_akademik_id', $tahunId)
            ->where('hari', $hari)
            // overlap jam: (mulai_baru < selesai_lama) AND (selesai_baru > mulai_lama)
            ->where('jam_mulai', '<', $jamSelesai)
            ->where('jam_selesai', '>', $jamMulai)
            ->where(function ($q) use ($dosenId, $ruang) {
                if ($dosenId) $q->orWhere('dosen_id', $dosenId);
                if ($ruang)   $q->orWhere('ruang', $ruang);
            });

        if ($ignore) {
            $query->where('id', '!=', $ignore->id);
        }

        $bentrok = $query->with(['matkul', 'dosen.user'])->first();

        if (!$bentrok) {
            return null;
        }

        $samaDosen  = $dosenId && $bentrok->dosen_id == $dosenId;
        $samaRuang  = $ruang && $bentrok->ruang === $ruang;

        $sebab = [];
        if ($samaDosen) $sebab[] = 'dosen yang sama (' . ($bentrok->dosen?->user?->name ?? '-') . ')';
        if ($samaRuang) $sebab[] = 'ruangan yang sama (' . $bentrok->ruang . ')';

        $sebabText = $sebab ? implode(' dan ', $sebab) : 'jam yang sama';

        return "Jadwal bentrok dengan \"{$bentrok->matkul?->nama}\" pada hari {$bentrok->hari} jam "
            . substr($bentrok->jam_mulai, 0, 5) . '-' . substr($bentrok->jam_selesai, 0, 5)
            . " ({$sebabText}). Silakan pilih jam, ruangan, atau dosen yang berbeda.";
    }
    public function jadwalDestroy(int $id)
    {
        Jadwal::findOrFail($id)->delete();
        return response()->json(['success'=>true]);
    }

    /* ════════════════════════════════════════════════════
       TAHUN AKADEMIK
    ════════════════════════════════════════════════════ */

    public function tahunIndex()
    {
        return response()->json(['success'=>true,'data'=>TahunAkademik::orderByDesc('created_at')->get()]);
    }

    public function tahunStore(Request $request)
    {
        $request->validate([
            'tahun'    => 'required|string|max:9',
            'semester' => 'required|in:Ganjil,Genap',
        ]);

        $tahun = TahunAkademik::create([
            'tahun'    => $request->tahun,
            'semester' => $request->semester,
            'is_aktif' => false,
        ]);

        return response()->json(['success'=>true,'data'=>$tahun],201);
    }

    public function tahunAktifkan(int $id)
    {
        DB::transaction(function () use ($id) {
            TahunAkademik::where('is_aktif', true)->update(['is_aktif' => false]);
            TahunAkademik::findOrFail($id)->update(['is_aktif' => true]);
        });

        return response()->json(['success'=>true,'message'=>'Tahun akademik diaktifkan.']);
    }

    /* ════════════════════════════════════════════════════
       FAKULTAS
    ════════════════════════════════════════════════════ */

    public function fakultasIndex()
    {
        $data = Fakultas::withCount('prodi')
            ->with(['prodi' => function($q) {
                $q->withCount('matkul')->orderBy('nama');
            }])
            ->orderBy('nama')
            ->get();
        return response()->json(['success'=>true,'data'=>$data]);
    }

    public function fakultasStore(Request $request)
    {
        $request->validate([
            'nama' => 'required|string|max:255',
            'kode' => 'required|string|max:10|unique:fakultas,kode',
        ]);
        $f = Fakultas::create($request->only(['nama','kode']));
        return response()->json(['success'=>true,'data'=>$f], 201);
    }

    public function fakultasUpdate(Request $request, int $id)
    {
        $f = Fakultas::findOrFail($id);
        $request->validate([
            'nama' => 'required|string|max:255',
            'kode' => 'required|string|max:10|unique:fakultas,kode,'.$id,
        ]);
        $f->update($request->only(['nama','kode']));
        return response()->json(['success'=>true,'message'=>'Fakultas diperbarui.']);
    }

    public function fakultasDestroy(int $id)
    {
        $f = Fakultas::findOrFail($id);
        if ($f->prodi()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak bisa menghapus fakultas karena masih memiliki program studi. Hapus atau pindahkan prodi terlebih dahulu.',
            ], 422);
        }
        $f->delete();
        return response()->json(['success'=>true,'message'=>'Fakultas dihapus.']);
    }

    /* ════════════════════════════════════════════════════
       RESET PASSWORD
    ════════════════════════════════════════════════════ */

    public function resetPasswordMahasiswa(int $id)
    {
        try {
            $mhs = Mahasiswa::with('user')->find($id);

            if (! $mhs) {
                return response()->json(['success' => false, 'message' => 'Mahasiswa tidak ditemukan.'], 404);
            }
            if (! $mhs->user) {
                Log::warning('resetPasswordMahasiswa: relasi user kosong', ['mhs_id' => $id, 'user_id' => $mhs->user_id]);
                return response()->json(['success' => false, 'message' => 'Akun user untuk mahasiswa ini tidak ada di tabel users (user_id=' . ($mhs->user_id ?? 'null') . '). Hubungi administrator.'], 422);
            }
            if (empty($mhs->nim)) {
                return response()->json(['success' => false, 'message' => 'NIM mahasiswa kosong, tidak bisa direset.'], 422);
            }

            $newHash = Hash::make($mhs->nim);
            $mhs->user->password = $newHash;
            $saved = $mhs->user->save();

            if (! $saved) {
                Log::error('resetPasswordMahasiswa: save() return false', ['mhs_id' => $id, 'user_id' => $mhs->user->id]);
                return response()->json(['success' => false, 'message' => 'Gagal menyimpan password baru ke database.'], 500);
            }

            return response()->json(['success' => true, 'message' => 'Password mahasiswa direset ke NIM (' . $mhs->nim . ').']);
        } catch (\Throwable $e) {
            Log::error('resetPasswordMahasiswa exception', [
                'mhs_id'    => $id,
                'exception' => get_class($e),
                'message'   => $e->getMessage(),
                'file'      => $e->getFile(),
                'line'      => $e->getLine(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Gagal reset password: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function resetPasswordDosen(int $id)
    {
        try {
            $dosen = Dosen::with('user')->find($id);

            if (! $dosen) {
                return response()->json(['success' => false, 'message' => 'Dosen tidak ditemukan.'], 404);
            }
            if (! $dosen->user) {
                Log::warning('resetPasswordDosen: relasi user kosong', ['dosen_id' => $id, 'user_id' => $dosen->user_id]);
                return response()->json(['success' => false, 'message' => 'Akun user untuk dosen ini tidak ada di tabel users (user_id=' . ($dosen->user_id ?? 'null') . '). Hubungi administrator.'], 422);
            }
            if (empty($dosen->nip)) {
                return response()->json(['success' => false, 'message' => 'NIP dosen kosong, tidak bisa direset.'], 422);
            }

            $newHash = Hash::make($dosen->nip);
            $dosen->user->password = $newHash;
            $saved = $dosen->user->save();

            if (! $saved) {
                Log::error('resetPasswordDosen: save() return false', ['dosen_id' => $id, 'user_id' => $dosen->user->id]);
                return response()->json(['success' => false, 'message' => 'Gagal menyimpan password baru ke database.'], 500);
            }

            return response()->json(['success' => true, 'message' => 'Password dosen direset ke NIP (' . $dosen->nip . ').']);
        } catch (\Throwable $e) {
            Log::error('resetPasswordDosen exception', [
                'dosen_id'  => $id,
                'exception' => get_class($e),
                'message'   => $e->getMessage(),
                'file'      => $e->getFile(),
                'line'      => $e->getLine(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Gagal reset password: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reset SEMUA password mahasiswa & dosen ke default (NIM / NIP).
     * Berguna untuk memperbaiki akun lama yang gagal login karena
     * password lama tersimpan tidak konsisten (mis. sebelum perbaikan
     * pada fitur tambah mahasiswa/dosen).
     *
     * PUT /api/admin/reset-password-massal
     */
    public function resetPasswordMassal()
    {
        $jumlahMhs = 0;
        $jumlahDosen = 0;

        DB::transaction(function () use (&$jumlahMhs, &$jumlahDosen) {
            Mahasiswa::with('user')->whereHas('user')->each(function ($mhs) use (&$jumlahMhs) {
                if (empty($mhs->nim)) return;
                $mhs->user->password = Hash::make(trim($mhs->nim));
                $mhs->user->save();
                $jumlahMhs++;
            });

            Dosen::with('user')->whereHas('user')->each(function ($dosen) use (&$jumlahDosen) {
                if (empty($dosen->nip)) return;
                $dosen->user->password = Hash::make(trim($dosen->nip));
                $dosen->user->save();
                $jumlahDosen++;
            });
        });

        return response()->json([
            'success' => true,
            'message' => "Password berhasil direset ke default untuk $jumlahMhs mahasiswa dan $jumlahDosen dosen. (Mahasiswa = NIM, Dosen = NIP)",
        ]);
    }

    /* ════════════════════════════════════════════════════
       AKTIFKAN ULANG AKUN (dari status nonaktif)
    ════════════════════════════════════════════════════ */

    public function mahasiswaActivate(int $id)
    {
        $mhs = Mahasiswa::with('user')->findOrFail($id);
        $mhs->user->update(['is_active' => true]);
        return response()->json(['success'=>true,'message'=>'Akun mahasiswa diaktifkan kembali.']);
    }

    public function dosenActivate(int $id)
    {
        $dosen = Dosen::with('user')->findOrFail($id);
        $dosen->user->update(['is_active' => true]);
        return response()->json(['success'=>true,'message'=>'Akun dosen diaktifkan kembali.']);
    }

    /* ════════════════════════════════════════════════════
       TAHUN AKADEMIK — DESTROY (safe)
    ════════════════════════════════════════════════════ */

    public function tahunDestroy(int $id)
    {
        $t = TahunAkademik::findOrFail($id);
        if ($t->is_aktif) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak bisa menghapus tahun akademik yang sedang aktif.',
            ], 422);
        }
        $jadwalCount = Jadwal::where('tahun_akademik_id', $id)->count();
        if ($jadwalCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "Tidak bisa menghapus tahun akademik karena masih memiliki {$jadwalCount} jadwal.",
            ], 422);
        }
        $t->delete();
        return response()->json(['success'=>true,'message'=>'Tahun akademik dihapus.']);
    }



    /**
     * POST /api/admin/admin — Tambah admin baru oleh admin yang sudah login
     */
    public function storeAdmin(\Illuminate\Http\Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:100',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
        ]);

        $user = \App\Models\User::create([
            'name'      => $request->name,
            'email'     => $request->email,
            'password'  => \Illuminate\Support\Facades\Hash::make($request->password),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Admin baru ' . $user->name . ' berhasil ditambahkan.',
            'data'    => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email],
        ], 201);
    }

    /* ════════════════════════════════════════════════════
       ONLINE USERS — daftar siapa yang online sekarang
    ════════════════════════════════════════════════════ */

    /**
     * GET /api/admin/online-users
     * Kembalikan daftar user yang last_active dalam 5 menit terakhir,
     * beserta nama dan role-nya (join ke tabel users).
     */
    public function onlineUsers()
    {
        try {
            $cutoff = now()->subMinutes(5);

            $online = SiteVisit::where('last_active', '>=', $cutoff)
                ->with('user:id,name,email,role')
                ->orderBy('last_active', 'desc')
                ->get()
                ->map(function ($visit) {
                    return [
                        'user_id'     => $visit->user_id,
                        'name'        => $visit->user?->name ?? '–',
                        'email'       => $visit->user?->email ?? '–',
                        'role'        => $visit->role ?? $visit->user?->role ?? 'unknown',
                        'last_active' => $visit->last_active?->toDateTimeString(),
                    ];
                });

            return response()->json([
                'success' => true,
                'data'    => [
                    'total'       => $online->count(),
                    'mahasiswa'   => $online->where('role', 'mahasiswa')->values(),
                    'dosen'       => $online->where('role', 'dosen')->values(),
                    'admin'       => $online->where('role', 'admin')->values(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::warning('[onlineUsers] Gagal: ' . $e->getMessage());
            return response()->json([
                'success' => true,
                'data'    => ['total' => 0, 'mahasiswa' => [], 'dosen' => [], 'admin' => []],
            ]);
        }
    }
}
