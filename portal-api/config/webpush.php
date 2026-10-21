<?php
/**
 * Konfigurasi Web Push Notification.
 *
 * PENTING: Generate VAPID keys dengan cara:
 *   composer require minishlink/web-push
 *   php artisan tinker
 *   >>> \Minishlink\WebPush\VAPID::createVapidKeys()
 *
 * Salin hasilnya ke .env:
 *   VAPID_PUBLIC_KEY=...
 *   VAPID_PRIVATE_KEY=...
 *   VAPID_SUBJECT=mailto:admin@unhar.ac.id
 */
return [
    'vapid' => [
        'subject'     => env('VAPID_SUBJECT', 'mailto:admin@unhar.ac.id'),
        'public_key'  => env('VAPID_PUBLIC_KEY', ''),
        'private_key' => env('VAPID_PRIVATE_KEY', ''),
    ],
];
