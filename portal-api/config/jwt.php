<?php

return [
    'secret'  => env('JWT_SECRET'),
    'keys'    => ['public' => null, 'private' => null, 'passphrase' => null],
    'ttl'     => env('JWT_TTL', 1440),          // menit — 1 hari
    'refresh_ttl' => env('JWT_REFRESH_TTL', 20160), // 2 minggu
    'algo'    => 'HS256',
    'required_claims' => ['iss','iat','exp','nbf','sub','jti'],
    'persistent_claims' => ['role'],
    'lock_subject' => true,
    'leeway'  => env('JWT_LEEWAY', 0),
    'blacklist_enabled'   => env('JWT_BLACKLIST_ENABLED', true),
    'blacklist_grace_period' => env('JWT_BLACKLIST_GRACE_PERIOD', 0),
    'decrypt_cookies' => false,
    'providers' => [
        'jwt'   => Tymon\JWTAuth\Providers\JWT\Lcobucci::class,
        'auth'  => Tymon\JWTAuth\Providers\Auth\Illuminate::class,
        'storage' => Tymon\JWTAuth\Providers\Storage\Illuminate::class,
    ],
];
