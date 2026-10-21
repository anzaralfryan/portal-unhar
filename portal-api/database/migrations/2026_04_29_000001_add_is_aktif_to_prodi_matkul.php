<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tambah kolom is_aktif ke tabel prodi dan matkul.
 * Default true (aktif), sehingga data lama otomatis tetap aktif.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prodi', function (Blueprint $table) {
            $table->boolean('is_aktif')->default(true)->after('kode');
        });

        Schema::table('matkul', function (Blueprint $table) {
            $table->boolean('is_aktif')->default(true)->after('semester');
        });
    }

    public function down(): void
    {
        Schema::table('prodi', function (Blueprint $table) {
            $table->dropColumn('is_aktif');
        });
        Schema::table('matkul', function (Blueprint $table) {
            $table->dropColumn('is_aktif');
        });
    }
};
