<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pembayaran', function (Blueprint $table) {
            $table->string('nomor_rekening', 30)->nullable()->after('kode_va');
            $table->string('nama_bank', 50)->nullable()->after('nomor_rekening');
            $table->string('atas_nama', 100)->nullable()->after('nama_bank');
        });
    }

    public function down(): void
    {
        Schema::table('pembayaran', function (Blueprint $table) {
            $table->dropColumn(['nomor_rekening', 'nama_bank', 'atas_nama']);
        });
    }
};
