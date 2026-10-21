<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Batch 8 — Tabel push_subscriptions untuk Web Push Notification.
 * Menyimpan subscription object dari browser (endpoint + kunci enkripsi).
 *
 * Cara apply:
 *   php artisan migrate
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            // User yang berlangganan (bisa mahasiswa atau dosen)
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            // Endpoint unik per browser dari Push Service (Google FCM, Mozilla, dll)
            $table->text('endpoint');
            // Kunci enkripsi VAPID — dari browser
            $table->text('p256dh');
            $table->text('auth');
            // Kapan terakhir berhasil dikirim
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            // Satu endpoint bisa digunakan oleh banyak user (shared device) — tapi per user unik
            $table->unique(['user_id', 'endpoint'], 'unique_user_endpoint');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
