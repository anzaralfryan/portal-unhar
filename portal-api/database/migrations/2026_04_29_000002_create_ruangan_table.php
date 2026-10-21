<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel ruangan — daftar ruang kuliah yang bisa dikelola admin.
 * Dipilih dari dropdown saat membuat jadwal.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ruangan', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 50);         // contoh: Lab 3.1, Ruang A.101
            $table->string('gedung', 30)->nullable(); // contoh: Gedung A, Lab Komputer
            $table->integer('kapasitas')->default(40);
            $table->boolean('is_aktif')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ruangan');
    }
};
