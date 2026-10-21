<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('landing_kontens', function (Blueprint $table) {
            $table->id();
            // Tipe konten: 'berita'|'pengumuman'|'agenda'|'hero'|'stats'|'layanan'|'keunggulan'|'mitra'
            $table->string('tipe', 30)->index();
            $table->string('judul')->nullable();
            $table->text('isi')->nullable();
            $table->string('gambar')->nullable();       // path atau URL
            $table->string('kategori', 80)->nullable(); // mis. "Berita Universitas", "Pengumuman"
            $table->string('link', 500)->nullable();    // URL eksternal jika ada
            // Tanggal tampil (berita/pengumuman/agenda)
            $table->string('tanggal_tampil', 20)->nullable();  // "14", "Agu"
            $table->string('bulan_tampil', 10)->nullable();
            // Urutan tampil & status
            $table->unsignedSmallInteger('urutan')->default(0);
            $table->boolean('aktif')->default(true);
            // Metadata ekstra (JSON) — untuk hero: tag, sub; stats: nilai; mitra: nama
            $table->json('meta')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_kontens');
    }
};
