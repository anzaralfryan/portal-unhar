<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tambah kolom dosen_pa_id ke tabel mahasiswa.
 * Admin bisa assign dosen PA ke mahasiswa.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mahasiswa', function (Blueprint $table) {
            $table->foreignId('dosen_pa_id')
                  ->nullable()
                  ->after('semester')
                  ->constrained('dosen')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('mahasiswa', function (Blueprint $table) {
            $table->dropForeign(['dosen_pa_id']);
            $table->dropColumn('dosen_pa_id');
        });
    }
};
