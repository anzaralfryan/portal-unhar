<?php
namespace App\Services;

use App\Models\PushSubscription;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;
use Illuminate\Support\Facades\Log;

/**
 * WebPushService — wrapper around minishlink/web-push.
 *
 * Cara pakai dari controller/event:
 *   app(WebPushService::class)->sendToUser($userId, [...]);
 *   app(WebPushService::class)->sendToAll([...]);
 *
 * Install library:
 *   composer require minishlink/web-push
 */
class WebPushService
{
    private WebPush $webPush;

    public function __construct()
    {
        $this->webPush = new WebPush([
            'VAPID' => [
                'subject'    => config('webpush.vapid.subject'),
                'publicKey'  => config('webpush.vapid.public_key'),
                'privateKey' => config('webpush.vapid.private_key'),
            ],
        ]);

        // Batch kirim — tidak tunggu response satu per satu
        $this->webPush->setAutomaticPadding(false);
    }

    /**
     * Kirim notifikasi ke semua subscription milik satu user.
     * Dipakai saat nilai keluar, KRS diverifikasi, dll.
     */
    public function sendToUser(int $userId, array $payload): void
    {
        $subs = PushSubscription::where('user_id', $userId)->get();
        $this->sendToSubscriptions($subs, $payload);
    }

    /**
     * Kirim ke koleksi subscription (dari query apapun).
     */
    public function sendToSubscriptions($subscriptions, array $payload): void
    {
        if ($subscriptions->isEmpty()) return;

        $json = json_encode([
            'judul' => $payload['judul'] ?? 'Notifikasi',
            'isi'   => $payload['isi']   ?? '',
            'url'   => $payload['url']   ?? '/',
            'icon'  => '/icon-192.png',
        ]);

        foreach ($subscriptions as $sub) {
            $this->webPush->queueNotification(
                Subscription::create([
                    'endpoint'        => $sub->endpoint,
                    'contentEncoding' => 'aesgcm',
                    'keys'            => [
                        'p256dh' => $sub->p256dh,
                        'auth'   => $sub->auth,
                    ],
                ]),
                $json
            );
        }

        // Flush semua yang di-queue
        foreach ($this->webPush->flush() as $report) {
            $endpoint = $report->getRequest()->getUri()->__toString();

            if ($report->isSuccess()) {
                // Update last_used_at
                PushSubscription::where('endpoint', $endpoint)
                    ->update(['last_used_at' => now()]);
            } else {
                $reason = $report->getReason();
                Log::warning("[WebPush] Gagal kirim ke {$endpoint}: {$reason}");

                // 410 Gone = subscription tidak valid, hapus dari DB
                if ($report->isSubscriptionExpired()) {
                    PushSubscription::where('endpoint', $endpoint)->delete();
                    Log::info("[WebPush] Subscription expired, dihapus: {$endpoint}");
                }
            }
        }
    }

    /**
     * Kirim ke semua user (broadcast admin).
     * Dibatasi per 500 subscription untuk menghindari timeout.
     */
    public function sendToAll(array $payload): int
    {
        $total = 0;
        PushSubscription::chunk(500, function ($chunk) use ($payload, &$total) {
            $this->sendToSubscriptions($chunk, $payload);
            $total += $chunk->count();
        });
        return $total;
    }
}
