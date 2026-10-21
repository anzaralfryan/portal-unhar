<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{ChatRoom, ChatParticipant, ChatMessage, Mahasiswa, Dosen, User, KrsDetail};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ChatController — Live Chat generik (personal & group)
 *
 * Mendukung kombinasi personal chat:
 *   - mahasiswa <-> dosen   (dosen wali ATAU dosen pengampu matkul yang KRS-nya terkunci)
 *   - mahasiswa <-> admin
 *   - dosen     <-> admin
 *   - admin     <-> siapapun (mahasiswa / dosen)
 *
 * Endpoint:
 *   GET  /api/chat/rooms           — daftar room chat milik user
 *   POST /api/chat/rooms           — buat / ambil room personal dengan user lain
 *   GET  /api/chat/messages        — ambil pesan (room_id, last_id)
 *   POST /api/chat/send            — kirim pesan
 *   GET  /api/chat/listen          — long polling
 *   POST /api/chat/rooms/{id}/read — tandai room sebagai sudah dibaca
 *
 *   GET  /api/chat/contacts        — daftar kontak yang bisa dihubungi (role-aware)
 */
class ChatController extends Controller
{
    // ── Daftar room milik user ini ──────────────────────────────────────
    public function rooms()
    {
        $user = auth()->user();

        $roomIds = ChatParticipant::where('user_id', $user->id)->pluck('room_id');

        $rooms = ChatRoom::whereIn('id', $roomIds)
            ->with(['participants.user.mahasiswa', 'participants.user.dosen', 'lastMessage', 'jadwal.matkul', 'jadwal.dosen.user'])
            ->orderByDesc('last_message_at')
            ->get()
            ->map(fn($r) => $this->formatRoom($r, $user))
            // Sembunyikan room personal yang belum ada pesan sama sekali DAN bukan dibuat user ini
            ->values();

        return response()->json(['success' => true, 'data' => $rooms]);
    }

    // ── Buat / ambil room personal dengan user lain ─────────────────────
    public function createOrGetRoom(Request $request)
    {
        $request->validate([
            'with_user_id' => 'required|exists:users,id',
        ]);

        $user      = auth()->user();
        $otherUser = User::findOrFail($request->with_user_id);

        if ($otherUser->id === $user->id) {
            return response()->json(['success' => false, 'message' => 'Tidak bisa membuat chat dengan diri sendiri.'], 422);
        }

        // Validasi kombinasi role yang diizinkan
        $allowed = $this->isAllowedPair($user, $otherUser);
        if (!$allowed) {
            return response()->json(['success' => false, 'message' => 'Anda tidak dapat memulai chat dengan pengguna ini.'], 422);
        }

        // Cari room personal yang sudah ada untuk pasangan ini
        $existing = ChatRoom::where('type', 'personal')
            ->whereHas('participants', fn($q) => $q->where('user_id', $user->id))
            ->whereHas('participants', fn($q) => $q->where('user_id', $otherUser->id))
            ->first();

        if ($existing) {
            $existing->load(['participants.user.mahasiswa', 'participants.user.dosen', 'lastMessage']);
            return response()->json(['success' => true, 'data' => $this->formatRoom($existing, $user)]);
        }

        // Buat room baru
        $room = ChatRoom::create([
            'type'       => 'personal',
            'created_by' => $user->id,
        ]);

        ChatParticipant::create([
            'room_id'    => $room->id,
            'user_id'    => $user->id,
            'role_label' => $this->roleLabelFor($user, $otherUser),
        ]);
        ChatParticipant::create([
            'room_id'    => $room->id,
            'user_id'    => $otherUser->id,
            'role_label' => $this->roleLabelFor($otherUser, $user),
        ]);

        $room->load(['participants.user.mahasiswa', 'participants.user.dosen', 'lastMessage']);

        return response()->json([
            'success' => true,
            'data'    => $this->formatRoom($room, $user),
        ], 201);
    }

    // ── Ambil pesan ──────────────────────────────────────────────────────
    public function messages(Request $request)
    {
        $request->validate(['room_id' => 'required|exists:chat_rooms,id']);

        $room = ChatRoom::findOrFail($request->room_id);
        $this->authorizeRoom($room);

        $query = ChatMessage::where('room_id', $room->id)
            ->with('user')
            ->orderBy('id');

        if ($request->filled('last_id')) {
            $query->where('id', '>', (int) $request->last_id);
        } else {
            $total = ChatMessage::where('room_id', $room->id)->count();
            if ($total > 50) {
                $query->skip($total - 50)->take(50);
            }
        }

        $messages = $query->get()->map(fn($m) => $this->formatMessage($m));

        // Update last_read_at untuk participant ini
        ChatParticipant::where('room_id', $room->id)
            ->where('user_id', auth()->id())
            ->update(['last_read_at' => now()]);

        return response()->json([
            'success' => true,
            'data'    => $messages,
            'last_id' => $messages->last()['id'] ?? ($request->last_id ?? 0),
        ]);
    }

    // ── Kirim pesan ──────────────────────────────────────────────────────
    public function send(Request $request)
    {
        $request->validate([
            'room_id' => 'required|exists:chat_rooms,id',
            'pesan'   => 'required|string|max:2000',
        ]);

        $room = ChatRoom::findOrFail($request->room_id);
        $this->authorizeRoom($room);

        $msg = ChatMessage::create([
            'room_id' => $room->id,
            'user_id' => auth()->id(),
            'pesan'   => trim($request->pesan),
        ]);

        $room->update(['last_message_at' => now()]);

        // Pengirim langsung dianggap sudah membaca sampai pesan ini
        ChatParticipant::where('room_id', $room->id)
            ->where('user_id', auth()->id())
            ->update(['last_read_at' => now()]);

        $msg->load('user');

        return response()->json([
            'success' => true,
            'data'    => $this->formatMessage($msg),
        ], 201);
    }

    // ── Tandai room sudah dibaca ─────────────────────────────────────────
    public function markRead(int $roomId)
    {
        $room = ChatRoom::findOrFail($roomId);
        $this->authorizeRoom($room);

        ChatParticipant::where('room_id', $room->id)
            ->where('user_id', auth()->id())
            ->update(['last_read_at' => now()]);

        return response()->json(['success' => true]);
    }

    // ── LONG POLLING ─────────────────────────────────────────────────────
    public function listen(Request $request)
    {
        $request->validate([
            'room_id' => 'required|exists:chat_rooms,id',
            'last_id' => 'nullable|integer',
        ]);

        $room = ChatRoom::findOrFail($request->room_id);
        $this->authorizeRoom($room);

        $lastId  = (int) ($request->last_id ?? 0);
        $timeout = 25;
        $start   = time();

        while (time() - $start < $timeout) {
            $messages = ChatMessage::where('room_id', $room->id)
                ->where('id', '>', $lastId)
                ->with('user')
                ->orderBy('id')
                ->get();

            if ($messages->isNotEmpty()) {
                ChatParticipant::where('room_id', $room->id)
                    ->where('user_id', auth()->id())
                    ->update(['last_read_at' => now()]);

                return response()->json([
                    'success'  => true,
                    'messages' => $messages->map(fn($m) => $this->formatMessage($m)),
                    'last_id'  => $messages->last()->id,
                ]);
            }

            sleep(1);
        }

        return response()->json([
            'success'  => true,
            'messages' => [],
            'last_id'  => $lastId,
        ]);
    }

    // ── Daftar kontak yang bisa dihubungi (role-aware) ──────────────────
    public function contacts()
    {
        $user = auth()->user();

        return match ($user->role) {
            'mahasiswa' => $this->contactsForMahasiswa($user),
            'dosen'     => $this->contactsForDosen($user),
            'admin'     => $this->contactsForAdmin($user),
            default     => response()->json(['success' => true, 'data' => []]),
        };
    }

    /**
     * Kontak untuk MAHASISWA:
     *  - Dosen Wali (selalu muncul jika ada)
     *  - Dosen pengampu matkul di KRS yang terkunci (semester aktif)
     *  - Admin (satu entri umum "Admin Kampus")
     */
    private function contactsForMahasiswa(User $user)
    {
        $mhs = $user->mahasiswa;
        $out = [];

        // Dosen Wali
        if ($mhs->dosenPa) {
            $d = $mhs->dosenPa()->with('user')->first();
            if ($d && $d->user) {
                $out[] = $this->contactEntry($d->user, 'Dosen Wali', $d->getFotoUrlAttribute());
            }
        }

        // Dosen pengampu — dari KRS yang terkunci
        $dosenIds = DB::table('krs')
            ->join('krs_detail', 'krs_detail.krs_id', '=', 'krs.id')
            ->join('jadwal', 'jadwal.id', '=', 'krs_detail.jadwal_id')
            ->where('krs.mahasiswa_id', $mhs->id)
            ->whereIn('krs.status', ['disetujui', 'locked'])
            ->pluck('jadwal.dosen_id')
            ->unique();

        $dosenList = Dosen::with(['user', 'jadwal' => function ($q) use ($mhs) {
                $q->whereHas('krsDetail.krs', function ($q2) use ($mhs) {
                    $q2->where('mahasiswa_id', $mhs->id)
                       ->whereIn('status', ['disetujui', 'locked']);
                })->with('matkul');
            }])
            ->whereIn('id', $dosenIds)
            ->get();

        foreach ($dosenList as $d) {
            if (!$d->user) continue;
            // Skip jika sudah masuk sebagai dosen wali
            if ($mhs->dosen_pa_id === $d->id) continue;

            $matkulNames = $d->jadwal->pluck('matkul.nama')->filter()->unique()->values();
            $label = $matkulNames->isNotEmpty()
                ? 'Pengampu ' . $matkulNames->implode(', ')
                : 'Dosen Pengampu';

            $out[] = $this->contactEntry($d->user, $label, $d->getFotoUrlAttribute());
        }

        // Admin — satu entri umum, ambil admin pertama yang aktif
        $admin = User::where('role', 'admin')->where('is_active', true)->first()
              ?? User::where('role', 'admin')->first();
        if ($admin) {
            $out[] = $this->contactEntry($admin, 'Admin Kampus', null);
        }

        return response()->json(['success' => true, 'data' => $out]);
    }

    /**
     * Kontak untuk DOSEN:
     *  - Mahasiswa bimbingan (dosen wali untuk mereka)
     *  - Mahasiswa di KRS terkunci yang jadwalnya diampu dosen ini
     *  - Admin
     */
    private function contactsForDosen(User $user)
    {
        $dosen = $user->dosen;
        $out   = [];
        $seen  = [];

        // Mahasiswa bimbingan (dosen wali)
        $bimbingan = Mahasiswa::where('dosen_pa_id', $dosen->id)->with('user')->get();
        foreach ($bimbingan as $m) {
            if (!$m->user) continue;
            $out[] = $this->contactEntry($m->user, 'Mahasiswa Bimbingan · ' . $m->nim, $m->getFotoUrlAttribute());
            $seen[$m->id] = true;
        }

        // Mahasiswa di kelas yang diampu dosen ini (KRS terkunci)
        $mhsIds = DB::table('krs')
            ->join('krs_detail', 'krs_detail.krs_id', '=', 'krs.id')
            ->join('jadwal', 'jadwal.id', '=', 'krs_detail.jadwal_id')
            ->where('jadwal.dosen_id', $dosen->id)
            ->whereIn('krs.status', ['disetujui', 'locked'])
            ->pluck('krs.mahasiswa_id')
            ->unique();

        $mahasiswaList = Mahasiswa::with(['user', 'krs' => function ($q) use ($dosen) {
                $q->whereIn('status', ['disetujui', 'locked'])
                  ->with(['detail.jadwal.matkul' => function ($q2) use ($dosen) {
                      $q2->whereHas('jadwal', fn($q3) => $q3->where('dosen_id', $dosen->id));
                  }]);
            }])
            ->whereIn('id', $mhsIds)
            ->get();

        foreach ($mahasiswaList as $m) {
            if (!$m->user || isset($seen[$m->id])) continue;

            // Cari nama matkul yang diampu dosen ini untuk mahasiswa ini
            $matkulNames = collect();
            foreach ($m->krs as $krs) {
                foreach ($krs->detail as $d) {
                    $jadwal = $d->jadwal;
                    if ($jadwal && $jadwal->dosen_id == $dosen->id && $jadwal->matkul) {
                        $matkulNames->push($jadwal->matkul->nama);
                    }
                }
            }
            $matkulNames = $matkulNames->filter()->unique()->values();
            $label = 'Mahasiswa · ' . $m->nim . ($matkulNames->isNotEmpty() ? ' · ' . $matkulNames->implode(', ') : '');

            $out[] = $this->contactEntry($m->user, $label, $m->getFotoUrlAttribute());
        }

        // Admin
        $admin = User::where('role', 'admin')->where('is_active', true)->first()
              ?? User::where('role', 'admin')->first();
        if ($admin) {
            $out[] = $this->contactEntry($admin, 'Admin Kampus', null);
        }

        return response()->json(['success' => true, 'data' => $out]);
    }

    /**
     * Kontak untuk ADMIN:
     *  - Semua dosen
     *  - Semua mahasiswa aktif
     * Dikelompokkan agar mudah ditampilkan dengan tab/filter di frontend.
     */
    private function contactsForAdmin(User $user)
    {
        $dosenList = Dosen::with(['user', 'prodi'])->get()->map(function ($d) {
            if (!$d->user) return null;
            return [
                'user_id'  => $d->user->id,
                'nama'     => $d->user->name,
                'role'     => 'dosen',
                'sub'      => 'Dosen · ' . ($d->prodi?->nama ?? '-'),
                'foto_url' => $d->getFotoUrlAttribute(),
            ];
        })->filter()->values();

        $mahasiswaList = Mahasiswa::with(['user', 'prodi'])
            ->where('status', 'aktif')
            ->get()
            ->map(function ($m) {
                if (!$m->user) return null;
                return [
                    'user_id'  => $m->user->id,
                    'nama'     => $m->user->name,
                    'role'     => 'mahasiswa',
                    'sub'      => 'Mahasiswa · ' . $m->nim . ' · ' . ($m->prodi?->nama ?? '-'),
                    'foto_url' => $m->getFotoUrlAttribute(),
                ];
            })->filter()->values();

        return response()->json([
            'success' => true,
            'data'    => [
                'dosen'     => $dosenList,
                'mahasiswa' => $mahasiswaList,
            ],
        ]);
    }

    // ── Helper: validasi pasangan role yang diizinkan untuk mulai chat ──
    private function isAllowedPair(User $a, User $b): bool
    {
        $roles = collect([$a->role, $b->role])->sort()->values();

        // admin selalu boleh dengan siapapun
        if ($a->role === 'admin' || $b->role === 'admin') return true;

        // mahasiswa <-> dosen
        if ($roles->all() === ['dosen', 'mahasiswa']) return true;

        return false;
    }

    // ── Helper: label peran lawan bicara dari sudut pandang $forUser ────
    private function roleLabelFor(User $forUser, User $otherUser): ?string
    {
        if ($otherUser->role === 'admin') return 'Admin Kampus';

        if ($otherUser->role === 'dosen' && $forUser->role === 'mahasiswa') {
            $mhs = $forUser->mahasiswa;
            $dosen = $otherUser->dosen;
            if ($mhs && $dosen && $mhs->dosen_pa_id === $dosen->id) {
                return 'Dosen Wali';
            }
            return 'Dosen Pengampu';
        }

        if ($otherUser->role === 'mahasiswa' && $forUser->role === 'dosen') {
            $mhs   = $otherUser->mahasiswa;
            $dosen = $forUser->dosen;
            if ($mhs && $dosen && $mhs->dosen_pa_id === $dosen->id) {
                return 'Mahasiswa Bimbingan';
            }
            return 'Mahasiswa';
        }

        if ($otherUser->role === 'mahasiswa') return 'Mahasiswa';
        if ($otherUser->role === 'dosen')     return 'Dosen';

        return null;
    }

    // ── Helper: bentuk entri kontak siap pakai untuk frontend ───────────
    private function contactEntry(User $u, string $label, ?string $foto): array
    {
        return [
            'user_id'  => $u->id,
            'nama'     => $u->name,
            'role'     => $u->role,
            'sub'      => $label,
            'foto_url' => $foto,
        ];
    }

    // ── Helper: otorisasi akses room ─────────────────────────────────────
    private function authorizeRoom(ChatRoom $room): void
    {
        $isParticipant = ChatParticipant::where('room_id', $room->id)
            ->where('user_id', auth()->id())
            ->exists();

        if (!$isParticipant && auth()->user()->role !== 'admin') {
            abort(403, 'Akses ditolak.');
        }
    }

    // ── Helper: format room untuk response ──────────────────────────────
    private function formatRoom(ChatRoom $r, User $me): array
    {
        $last = $r->lastMessage;

        // Cari participant lawan bicara (selain user ini) — untuk personal chat
        $myParticipant    = $r->participants->firstWhere('user_id', $me->id);
        $otherParticipant = $r->participants->firstWhere('user_id', '!=', $me->id);

        $lawanBicara = null;
        $groupInfo   = null;

        if ($r->type === 'personal' && $otherParticipant && $otherParticipant->user) {
            $ou = $otherParticipant->user;
            $foto = null;
            if ($ou->role === 'mahasiswa' && $ou->mahasiswa) {
                $foto = $ou->mahasiswa->getFotoUrlAttribute();
            } elseif ($ou->role === 'dosen' && $ou->dosen) {
                $foto = $ou->dosen->getFotoUrlAttribute();
            }
            $lawanBicara = [
                'nama'    => $ou->name,
                'sub'     => $otherParticipant->role_label ?? ucfirst($ou->role),
                'user_id' => $ou->id,
                'foto'    => $foto,
            ];
        }

        if ($r->type === 'group') {
            $jadwal = $r->jadwal;
            $groupInfo = [
                'nama'        => $r->nama,
                'kode_matkul' => $jadwal?->matkul?->kode,
                'dosen_nama'  => $jadwal?->dosen?->user?->name,
                'jumlah_anggota' => $r->participants->count(),
            ];
        }

        // Hitung unread: pesan setelah last_read_at milik participant ini, bukan dari diri sendiri
        $lastReadAt = $myParticipant?->last_read_at;
        $unreadQuery = ChatMessage::where('room_id', $r->id)
            ->where('user_id', '!=', $me->id);
        if ($lastReadAt) {
            $unreadQuery->where('created_at', '>', $lastReadAt);
        }
        $unread = $unreadQuery->count();

        return [
            'id'              => $r->id,
            'type'            => $r->type,
            'nama'            => $r->nama,
            'lawan_bicara'    => $lawanBicara,
            'group_info'      => $groupInfo,
            'last_message'    => $last?->pesan,
            'last_message_at' => $last?->created_at,
            'last_message_id' => $last?->id ?? 0,
            'unread'          => $unread,
        ];
    }

    private function formatMessage(ChatMessage $m): array
    {
        return [
            'id'         => $m->id,
            'room_id'    => $m->room_id,
            'user_id'    => $m->user_id,
            'nama'       => $m->user?->name,
            'pesan'      => $m->pesan,
            'is_self'    => $m->user_id === auth()->id(),
            'created_at' => $m->created_at,
        ];
    }
}
