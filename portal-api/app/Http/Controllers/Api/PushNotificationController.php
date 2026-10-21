<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use App\Services\WebPushService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PushNotificationController extends Controller
{
    public function __construct(private WebPushService $pushService) {}

    /**
     * GET /api/push/vapid-public-key
     * Kirim VAPID public key ke frontend untuk proses subscribe.
     * Route ini PUBLIC — tidak butuh auth (dipanggil sebelum login oleh SW).
     */
    public function vapidPublicKey()
    {
        return response()->json([
            'success'    => true,
            'public_key' => config('webpush.vapid.public_key'),
        ]);
    }

    /**
     * POST /api/push/subscribe
     * Simpan subscription object dari browser.
     * Dipanggil setelah user login dan browser meminta izin notifikasi.
     */
    public function subscribe(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string',
            'keys'     => 'required|array',
            'keys.p256dh' => 'required|string',
            'keys.auth'   => 'required|string',
        ]);

        $userId = auth()->id();

        // Upsert — kalau endpoint sudah ada untuk user ini, update kuncinya
        PushSubscription::updateOrCreate(
            [
                'user_id'  => $userId,
                'endpoint' => $request->endpoint,
            ],
            [
                'p256dh'       => $request->keys['p256dh'],
                'auth'         => $request->keys['auth'],
                'last_used_at' => now(),
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Push notification subscription berhasil disimpan.',
        ]);
    }

    /**
     * DELETE /api/push/unsubscribe
     * Hapus subscription (saat user logout atau cabut izin notifikasi).
     */
    public function unsubscribe(Request $request)
    {
        $request->validate(['endpoint' => 'required|string']);

        PushSubscription::where('user_id', auth()->id())
            ->where('endpoint', $request->endpoint)
            ->delete();

        return response()->json(['success' => true]);
    }

    /**
     * POST /api/push/test  (admin only — untuk debug)
     * Kirim notifikasi test ke diri sendiri.
     */
    public function test(Request $request)
    {
        $subs = PushSubscription::where('user_id', auth()->id())->get();

        if ($subs->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Belum ada subscription terdaftar untuk akun ini.',
            ], 422);
        }

        $this->pushService->sendToSubscriptions($subs, [
            'judul' => 'Test Notifikasi ✓',
            'isi'   => 'Push notification berhasil dikonfigurasi di Portal UNHAR.',
            'url'   => '/',
        ]);

        return response()->json(['success' => true, 'message' => 'Notifikasi test dikirim.']);
    }
}
