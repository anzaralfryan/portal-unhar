<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // KRS (header)
        Schema::create('krs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mahasiswa_id')->constrained('mahasiswa')->cascadeOnDelete();
            $table->foreignId('tahun_akademik_id')->constrained('tahun_akademik')->cascadeOnDelete();
            $table->enum('status', ['draft', 'diajukan', 'disetujui', 'locked'])->default('draft');
            $table->timestamps();

            $table->unique(['mahasiswa_id', 'tahun_akademik_id']);
        });

        // KRS Detail (matkul yang dipilih)
        Schema::create('krs_detail', function (Blueprint $table) {
            $table->id();
            $table->foreignId('krs_id')->constrained('krs')->cascadeOnDelete();
            $table->foreignId('jadwal_id')->constrained('jadwal')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['krs_id', 'jadwal_id']);
        });

        // Nilai
        Schema::create('nilai', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mahasiswa_id')->constrained('mahasiswa')->cascadeOnDelete();
            $table->foreignId('matkul_id')->constrained('matkul')->cascadeOnDelete();
            $table->foreignId('tahun_akademik_id')->constrained('tahun_akademik')->cascadeOnDelete();
            $table->foreignId('dosen_id')->constrained('dosen')->cascadeOnDelete();
            $table->string('nilai_huruf', 3)->nullable();   // A, A-, B+, B, dst
            $table->decimal('nilai_angka', 5, 2)->nullable();
            $table->decimal('nilai_uts', 5, 2)->nullable();
            $table->decimal('nilai_uas', 5, 2)->nullable();
            $table->decimal('nilai_tugas', 5, 2)->nullable();
            $table->decimal('nilai_kehadiran', 5, 2)->nullable();
            $table->timestamps();

            $table->unique(['mahasiswa_id', 'matkul_id', 'tahun_akademik_id']);
        });

        // Pembayaran
        Schema::create('pembayaran', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mahasiswa_id')->constrained('mahasiswa')->cascadeOnDelete();
            $table->foreignId('tahun_akademik_id')->constrained('tahun_akademik')->cascadeOnDelete();
            $table->string('label', 100);           // ex: "UKT Semester Ganjil 2024/2025"
            $table->decimal('jumlah', 12, 2);
            $table->enum('status', ['belum', 'lunas'])->default('belum');
            $table->string('kode_va', 30)->nullable();
            $table->string('metode', 50)->nullable();
            $table->date('tanggal_bayar')->nullable();
            $table->date('jatuh_tempo')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pembayaran');
        Schema::dropIfExists('nilai');
        Schema::dropIfExists('krs_detail');
        Schema::dropIfExists('krs');
    }
};
