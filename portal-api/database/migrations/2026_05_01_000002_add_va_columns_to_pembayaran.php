<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tambah kolom virtual account ke tabel pembayaran.
 *
 * va_bank_utama  = {kode_bank}{NPM}          → dipakai jika bayar via bank utama
 * va_bank_lain   = {kode_antarbank}{kode_bank}{NPM} → dipakai jika transfer dari bank lain
 *
 * Contoh BSI:
 *   va_bank_utama : 248801222370066
 *   va_bank_lain  : 900248801222370066
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pembayaran', function (Blueprint $table) {
            $table->string('va_bank_utama', 30)->nullable()->after('kode_va');
            $table->string('va_bank_lain',  30)->nullable()->after('va_bank_utama');
            $table->string('kode_bank',     20)->nullable()->after('va_bank_lain');
            $table->string('kode_antarbank',10)->nullable()->after('kode_bank');
        });
    }

    public function down(): void
    {
        Schema::table('pembayaran', function (Blueprint $table) {
            $table->dropColumn(['va_bank_utama','va_bank_lain','kode_bank','kode_antarbank']);
        });
    }
};
