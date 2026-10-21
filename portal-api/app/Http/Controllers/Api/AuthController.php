<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;

class AuthController extends Controller
{
    /**
     * Login — mahasiswa, dosen, atau admin.
     * POST /api/auth/login
     */
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        $credentials = [
            'email'    => trim($request->email),
            'password' => trim($request->password),
        ];

        try {
            if (! $token = JWTAuth::attempt($credentials)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Email atau password salah.',
                ], 401);
            }
        } catch (JWTException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak dapat membuat token. Coba lagi.',
            ], 500);
        }

        $user = auth()->user();

        if (! $user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda tidak aktif. Hubungi admin.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil.',
            'data'    => [
                'token'      => $token,
                'token_type' => 'bearer',
                'expires_in' => config('jwt.ttl') * 60,
                'user'       => $this->userPayload($user),
            ],
        ]);
    }

    /**
     * Logout — hapus token JWT.
     * POST /api/auth/logout
     */
    public function logout()
    {
        JWTAuth::invalidate(JWTAuth::getToken());

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.',
        ]);
    }

    /**
     * Refresh token.
     * POST /api/auth/refresh
     */
    public function refresh()
    {
        try {
            $token = JWTAuth::refresh(JWTAuth::getToken());

            return response()->json([
                'success' => true,
                'data'    => [
                    'token'      => $token,
                    'token_type' => 'bearer',
                    'expires_in' => config('jwt.ttl') * 60,
                ],
            ]);
        } catch (JWTException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Token tidak valid atau sudah kadaluarsa.',
            ], 401);
        }
    }

    /**
     * Data user yang sedang login.
     * GET /api/auth/me
     */
    public function me()
    {
    $user = auth()->user();
    
    // Hanya load relasi kalau ada (admin tidak punya relasi tambahan)
    $relation = $this->userRelation();
    if (!empty($relation)) {
        $user->load($relation);
    }

    return response()->json([
        'success' => true,
        'data'    => $this->userPayload($user),
    ]);
    }

    /**
     * Ganti password.
     * PUT /api/auth/password
     */
    public function updatePassword(Request $request)
    {
        $request->validate([
            'password_lama' => 'required|string',
            'password_baru' => 'required|string|min:8|confirmed',
        ]);

        $user = auth()->user();

        if (! Hash::check($request->password_lama, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Password lama tidak sesuai.',
            ], 422);
        }

        $user->update(['password' => Hash::make($request->password_baru)]);

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil diperbarui.',
        ]);
    }

    /* ─── helpers ─── */

    private function userRelation(): string
    {
        return match (auth()->user()->role) {
            'mahasiswa' => 'mahasiswa.prodi',
            'dosen'     => 'dosen.prodi',
            default     => '',
        };
    }

    private function userPayload(User $user): array
    {
        $base = [
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'role'  => $user->role,
        ];

        if ($user->role === 'mahasiswa' && $user->mahasiswa) {
            $base['mahasiswa'] = [
                'nim'       => $user->mahasiswa->nim,
                'prodi'     => $user->mahasiswa->prodi?->nama,
                'semester'  => $user->mahasiswa->semester,
                'kelas'     => $user->mahasiswa->kelas,
                'foto_url'  => $user->mahasiswa->foto_url,
            ];
        }

        if ($user->role === 'dosen' && $user->dosen) {
            $base['dosen'] = [
                'nip'      => $user->dosen->nip,
                'prodi'    => $user->dosen->prodi?->nama,
                'foto_url' => $user->dosen->foto_url,
            ];
        }

        return $base;
    }

    /**
     * Lupa Password — public endpoint, tanpa auth.
     * Membuat notifikasi ke semua user admin agar bisa diproses.
     * POST /api/auth/lupa-password
     */
    public function lupaPassword(Request $request)
    {
        $request->validate([
            'judul' => 'required|string|max:200',
            'isi'   => 'required|string|max:2000',
            'tipe'  => 'nullable|string|max:30',
        ]);

        // Kirim notifikasi ke semua user admin yang aktif
        $admins = User::where('role', 'admin')->where('is_active', true)->pluck('id');

        if ($admins->isEmpty()) {
            // Jika tidak ada admin, tetap kembalikan sukses agar user tidak kebingungan
            return response()->json([
                'success' => true,
                'message' => 'Permintaan diterima. Admin akan menghubungi Anda.',
            ]);
        }

        $now  = now();
        $data = $admins->map(fn($uid) => [
            'user_id'    => $uid,
            'judul'      => $request->judul,
            'isi'        => $request->isi,
            'tipe'       => $request->tipe ?? 'Sistem',
            'is_read'    => false,
            'created_at' => $now,
            'updated_at' => $now,
        ])->toArray();

        \App\Models\Notifikasi::insert($data);

        return response()->json([
            'success' => true,
            'message' => 'Permintaan reset password berhasil dikirim ke admin.',
        ]);
    }
}
