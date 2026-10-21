<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel site_visits — mencatat setiap sesi kunjungan unik per user per hari.
 * Satu user hanya dicatat 1x per hari (tidak per request) agar tidak inflate angka.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_visits', function (Blueprint $table) {
            $table->id();
            // user_id nullable — untuk kunjungan dari halaman login (belum login)
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('role', 20)->nullable();          // mahasiswa / dosen / admin
            $table->string('ip_address', 45)->nullable();
            // last_active — diupdate setiap request; dipakai untuk cek "online sekarang"
            $table->timestamp('last_active')->nullable();
            $table->timestamps();                            // created_at = waktu pertama kunjungan hari ini

            // Unique per user per hari — hindari duplikasi
            $table->unique(['user_id', 'created_at'], 'unique_visit_per_day');
            // Index untuk query statistik
            $table->index('created_at');
            $table->index('role');
            $table->index('last_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_visits');
    }
};
