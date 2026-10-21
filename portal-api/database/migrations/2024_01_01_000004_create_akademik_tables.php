<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tahun Akademik
        Schema::create('tahun_akademik', function (Blueprint $table) {
            $table->id();
            $table->string('tahun', 9);        // contoh: 2024/2025
            $table->enum('semester', ['Ganjil', 'Genap']);
            $table->boolean('is_aktif')->default(false);
            $table->timestamps();

            $table->unique(['tahun', 'semester']);
        });

        // Mata Kuliah
        Schema::create('matkul', function (Blueprint $table) {
            $table->id();
            $table->foreignId('prodi_id')->constrained('prodi')->cascadeOnDelete();
            $table->string('kode', 10)->unique();
            $table->string('nama', 100);
            $table->unsignedTinyInteger('sks');
            $table->unsignedTinyInteger('semester'); // semester ke berapa matkul ini ditawarkan
            $table->timestamps();
        });

        // Jadwal
        Schema::create('jadwal', function (Blueprint $table) {
            $table->id();
            $table->foreignId('matkul_id')->constrained('matkul')->cascadeOnDelete();
            $table->foreignId('dosen_id')->constrained('dosen')->cascadeOnDelete();
            $table->foreignId('tahun_akademik_id')->constrained('tahun_akademik')->cascadeOnDelete();
            $table->enum('hari', ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']);
            $table->time('jam_mulai');
            $table->time('jam_selesai');
            $table->string('ruang', 30);
            $table->enum('kelas_type', ['pagi', 'sore', 'karyawan'])->default('pagi');
            $table->unsignedSmallInteger('kapasitas')->default(40);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jadwal');
        Schema::dropIfExists('matkul');
        Schema::dropIfExists('tahun_akademik');
    }
};
