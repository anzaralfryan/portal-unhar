<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Persentase bonus nilai kuis per kelas (jadwal) — diatur dosen.
        // 0 = tidak ada bonus (default, perilaku lama tetap sama).
        Schema::table('jadwal', function (Blueprint $table) {
            $table->decimal('bonus_kuis_persen', 5, 2)->default(0)->after('kapasitas');
        });

        // Snapshot rata-rata nilai kuis & besaran bonus yang diterapkan,
        // disimpan saat dosen menyimpan nilai akhir — supaya transparan
        // (mahasiswa & dosen bisa lihat berapa bonus yang didapat).
        Schema::table('nilai', function (Blueprint $table) {
            $table->decimal('nilai_kuis_avg', 5, 2)->nullable()->after('nilai_kehadiran');
            $table->decimal('bonus_diterapkan', 5, 2)->nullable()->after('nilai_kuis_avg');
        });
    }

    public function down(): void
    {
        Schema::table('jadwal', function (Blueprint $table) {
            $table->dropColumn('bonus_kuis_persen');
        });
        Schema::table('nilai', function (Blueprint $table) {
            $table->dropColumn(['nilai_kuis_avg', 'bonus_diterapkan']);
        });
    }
};
