<?php

return [
    'paths'                    => ['api/*'],
    'allowed_methods'          => ['*'],
    'allowed_origins'          => [
        'http://localhost:5173',   // Vite dev server (npm run dev)
        'http://localhost:4173',   // Vite preview server (npm run preview) — untuk tes PWA
        'http://localhost:3000',   // Cadangan (Create React App / Next.js dev)
        env('FRONTEND_URL', 'http://localhost:5173'),
        // ↑ Di produksi, isi FRONTEND_URL di .env server dengan domain asli
        //   (mis. https://domainkamu.com). Kalau frontend & backend satu origin
        //   (Laravel serve React build), CORS ini tidak akan pernah kepakai
        //   karena request dianggap same-origin oleh browser.
    ],
    // Regex pattern — izinkan semua IP LAN (192.168.x.x) untuk tes PWA di HP
    // saat laptop dan HP di WiFi yang sama (dev only, tidak berlaku di produksi).
    'allowed_origins_patterns' => [
        '/^http:\/\/192\.168\.\d+\.\d+:(5173|4173|3000)$/',
        '/^http:\/\/10\.\d+\.\d+\.\d+:(5173|4173|3000)$/',
    ],
    'allowed_headers'          => ['*'],
    'exposed_headers'          => [],
    'max_age'                  => 0,
    'supports_credentials'     => true,
];
