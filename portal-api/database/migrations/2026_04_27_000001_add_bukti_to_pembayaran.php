<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Batch 7b — Tambah kolom bukti pembayaran ke tabel pembayaran.
 * Mahasiswa bisa upload foto/scan bukti transfer setelah konfirmasi.
 * Admin bisa verifikasi manual berdasarkan bukti yang diupload.
 *
 * Cara apply:
 *   php artisan migrate
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pembayaran', function (Blueprint $table) {
            // Path file bukti pembayaran (foto/scan transfer) yang diupload mahasiswa
            $table->string('bukti_path')->nullable()->after('tanggal_bayar');
            // Nama file asli yang diupload (untuk display)
            $table->string('bukti_nama')->nullable()->after('bukti_path');
            // Status verifikasi manual oleh admin: null = belum ada bukti, pending = menunggu, verified = sudah diverifikasi
            $table->enum('status_verifikasi', ['pending', 'verified', 'ditolak'])->nullable()->after('bukti_nama');
            // Catatan dari admin saat verifikasi/menolak
            $table->text('catatan_verifikasi')->nullable()->after('status_verifikasi');
        });
    }

    public function down(): void
    {
        Schema::table('pembayaran', function (Blueprint $table) {
            $table->dropColumn(['bukti_path', 'bukti_nama', 'status_verifikasi', 'catatan_verifikasi']);
        });
    }
};
