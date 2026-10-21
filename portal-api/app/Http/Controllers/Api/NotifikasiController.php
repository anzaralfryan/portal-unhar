<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Services\WebPushService;
use App\Models\{Notifikasi, User, Mahasiswa, Dosen, BroadcastLog};
use Illuminate\Http\Request;

class NotifikasiController extends Controller
{
    /** GET /api/mahasiswa/notifikasi  atau  GET /api/dosen/notifikasi */
    public function index(Request $request)
    {
        $query = Notifikasi::where('user_id', auth()->id())
            ->orderByDesc('created_at');

        if ($request->filled('tipe')) {
            $query->where('tipe', $request->tipe);
        }

        $list  = $query->get();
        $unread = $list->where('is_read', false)->count();

        return response()->json([
            'success' => true,
            'data'    => [
                'unread' => $unread,
                'list'   => $list->map(fn($n) => [
                    'id'         => $n->id,
                    'judul'      => $n->judul,
                    'isi'        => $n->isi,
                    'tipe'       => $n->tipe,
                    'is_read'    => $n->is_read,
                    'waktu'      => $n->created_at->diffForHumans(),
                    'created_at' => $n->created_at->format('d M Y H:i'),
                ])->values(),
            ],
        ]);
    }

    /** PUT /api/mahasiswa/notifikasi/{id}/baca */
    public function markRead(int $id)
    {
        $notif = Notifikasi::where('id', $id)->where('user_id', auth()->id())->firstOrFail();
        $notif->update(['is_read' => true]);
        return response()->json(['success' => true]);
    }

    /** PUT /api/mahasiswa/notifikasi/baca-semua */
    public function markAllRead()
    {
        Notifikasi::where('user_id', auth()->id())->update(['is_read' => true]);
        return response()->json(['success' => true, 'message' => 'Semua notifikasi ditandai dibaca.']);
    }

    /** DELETE /api/mahasiswa/notifikasi/{id} */
    public function destroy(int $id)
    {
        Notifikasi::where('id', $id)->where('user_id', auth()->id())->firstOrFail()->delete();
        return response()->json(['success' => true]);
    }

    /**
     * GET /api/admin/notifikasi/broadcast-history
     * Riwayat broadcast dari tabel broadcast_logs (1 baris per pengiriman, akurat).
     */
    public function broadcastHistory()
    {
        $logs = BroadcastLog::with('sender:id,name')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn($log) => [
                'id'               => $log->id,
                'judul'            => $log->judul,
                'isi'              => $log->isi,
                'tipe'             => $log->tipe,
                'role_target'      => $log->role_target,
                'jumlah_penerima'  => $log->jumlah_penerima,
                'sent_by_nama'     => $log->sender?->name ?? 'Admin',
                'created_at'       => $log->created_at->format('d M Y H:i'),
                'created_at_raw'   => $log->created_at->toISOString(),
            ]);

        return response()->json(['success' => true, 'data' => $logs]);
    }

    /** POST /api/admin/notifikasi/broadcast — kirim ke semua / per role */
    public function broadcast(Request $request)
    {
        $request->validate([
            'judul'   => 'required|string|max:150',
            'isi'     => 'required|string',
            'tipe'    => 'nullable|string|max:30',
            'role'    => 'nullable|in:mahasiswa,dosen,semua',
        ]);

        $role = $request->role ?? 'semua';

        $users = $role === 'semua'
    ? User::whereIn('role', ['mahasiswa', 'dosen'])->where('is_active', true)->pluck('id')
    : User::where('role', $role)->where('is_active', true)->pluck('id');

        $data = $users->map(fn($uid) => [
            'user_id'    => $uid,
            'judul'      => $request->judul,
            'isi'        => $request->isi,
            'tipe'       => $request->tipe ?? 'Akademik',
            'is_read'    => false,
            'created_at' => now(),
            'updated_at' => now(),
        ])->toArray();

        Notifikasi::insert($data);

        // Kirim Web Push ke semua user yang punya subscription aktif
        try {
            $subs = \App\Models\PushSubscription::whereIn('user_id', $users)->get();
            if ($subs->isNotEmpty()) {
                app(WebPushService::class)->sendToSubscriptions($subs, [
                    'judul' => $request->judul,
                    'isi'   => $request->isi,
                    'url'   => '/',
                    'tag'   => 'broadcast-' . now()->timestamp,
                ]);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('[WebPush] Broadcast gagal: ' . $e->getMessage());
        }

        // Simpan log ke broadcast_logs (1 baris per pengiriman — akurat & bersih)
        BroadcastLog::create([
            'judul'           => $request->judul,
            'isi'             => $request->isi,
            'tipe'            => $request->tipe ?? 'Akademik',
            'role_target'     => $role,
            'jumlah_penerima' => $users->count(),
            'sent_by'         => auth()->id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Notifikasi berhasil dikirim ke {$users->count()} pengguna.",
        ]);
    }

    /**
     * POST /api/admin/notifikasi/broadcast/{id}/resend
     * Kirim ulang broadcast berdasarkan log yang sudah ada.
     * Data judul/isi/tipe/role diambil dari broadcast_logs.
     */
    public function resendBroadcast(int $id)
    {
        $log  = BroadcastLog::findOrFail($id);
        $role = $log->role_target ?? 'semua';

        $users = $role === 'semua'
            ? User::whereIn('role', ['mahasiswa', 'dosen'])->where('is_active', true)->pluck('id')
            : User::where('role', $role)->where('is_active', true)->pluck('id');

        $now  = now();
        $data = $users->map(fn($uid) => [
            'user_id'    => $uid,
            'judul'      => $log->judul,
            'isi'        => $log->isi,
            'tipe'       => $log->tipe,
            'is_read'    => false,
            'created_at' => $now,
            'updated_at' => $now,
        ])->toArray();

        Notifikasi::insert($data);

        // Web Push
        try {
            $subs = \App\Models\PushSubscription::whereIn('user_id', $users)->get();
            if ($subs->isNotEmpty()) {
                app(WebPushService::class)->sendToSubscriptions($subs, [
                    'judul' => $log->judul,
                    'isi'   => $log->isi,
                    'url'   => '/',
                    'tag'   => 'broadcast-resend-' . $now->timestamp,
                ]);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('[WebPush] Resend gagal: ' . $e->getMessage());
        }

        // Simpan entri baru di log (resend juga tercatat sebagai pengiriman baru)
        BroadcastLog::create([
            'judul'           => $log->judul,
            'isi'             => $log->isi,
            'tipe'            => $log->tipe,
            'role_target'     => $role,
            'jumlah_penerima' => $users->count(),
            'sent_by'         => auth()->id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Notifikasi berhasil dikirim ulang ke {$users->count()} pengguna.",
        ]);
    }

    /**
     * DELETE /api/admin/notifikasi/broadcast/{id}
     * Hapus entri dari broadcast_logs.
     * Notifikasi yang sudah diterima user TIDAK ikut dihapus (sudah terkirim).
     */
    public function destroyBroadcast(int $id)
    {
        BroadcastLog::findOrFail($id)->delete();
        return response()->json(['success' => true, 'message' => 'Riwayat broadcast dihapus.']);
    }
}
