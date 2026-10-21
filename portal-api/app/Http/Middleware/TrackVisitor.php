<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TrackVisitor
{
    private const SKIP_PATHS = [
        'api/push',
        'api/storage-file',
        'api/auth/refresh',
        'api/auth/login',
        'api/auth/logout',
    ];

    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        $user = auth()->user();
        if (! $user) return $response;

        foreach (self::SKIP_PATHS as $path) {
            if ($request->is($path . '*')) return $response;
        }

        try {
            $today = now()->toDateString();
            $now   = now()->toDateTimeString();

            $existing = DB::table('site_visits')
                ->where('user_id', $user->id)
                ->whereDate('created_at', $today)
                ->lockForUpdate()
                ->first();

            if ($existing) {
                DB::table('site_visits')
                    ->where('id', $existing->id)
                    ->update(['last_active' => $now, 'updated_at' => $now]);
            } else {
                DB::table('site_visits')->insertOrIgnore([
                    'user_id'     => $user->id,
                    'role'        => $user->role ?? 'unknown',
                    'ip_address'  => $request->ip(),
                    'last_active' => $now,
                    'created_at'  => $now,
                    'updated_at'  => $now,
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('[TrackVisitor] Gagal catat kunjungan: ' . $e->getMessage());
        }

        return $response;
    }
}