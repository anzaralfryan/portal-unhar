<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // CORS — izinkan request dari frontend React
        $middleware->append(\Illuminate\Http\Middleware\HandleCors::class);

        // Percayai header X-Forwarded-* dari reverse proxy / load balancer
        // (termasuk yang dipakai hosting seperti Dewaweb) supaya url()/asset()
        // tetap menghasilkan https:// yang benar di balik proxy.
        $middleware->trustProxies(at: '*', headers: \Illuminate\Http\Request::HEADER_X_FORWARDED_FOR
            | \Illuminate\Http\Request::HEADER_X_FORWARDED_HOST
            | \Illuminate\Http\Request::HEADER_X_FORWARDED_PORT
            | \Illuminate\Http\Request::HEADER_X_FORWARDED_PROTO);

        // Daftarkan middleware alias
        // TrackVisitor: catat kunjungan per user per hari (untuk statistik pengunjung)
        $middleware->append(\App\Http\Middleware\TrackVisitor::class);

        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Format error response jadi JSON untuk semua API exception
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak terautentikasi. Silakan login.',
                ], 401);
            }
        });

        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data tidak valid.',
                    'errors'  => $e->errors(),
                ], 422);
            }
        });

        $exceptions->render(function (\Illuminate\Database\Eloquent\ModelNotFoundException $e, $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data tidak ditemukan.',
                ], 404);
            }
        });

        // Catch-all: pastikan SEMUA exception di endpoint API mengembalikan JSON,
        // bukan halaman HTML default Laravel — agar frontend selalu bisa parse error.
        $exceptions->render(function (\Throwable $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $status = 500;
                if (method_exists($e, 'getStatusCode')) {
                    $status = $e->getStatusCode();
                } elseif ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                    $status = $e->getStatusCode();
                }

                $payload = [
                    'success' => false,
                    'message' => $e->getMessage() ?: 'Terjadi kesalahan pada server.',
                ];

                // Saat APP_DEBUG=true, sertakan detail teknis untuk debugging
                if (config('app.debug')) {
                    $payload['exception'] = class_basename($e);
                    $payload['file']      = $e->getFile();
                    $payload['line']      = $e->getLine();
                }

                return response()->json($payload, $status);
            }
        });
    })->create();
