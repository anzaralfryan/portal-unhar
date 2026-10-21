<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('broadcast_logs', function (Blueprint $table) {
            $table->id();

            // Konten notifikasi
            $table->string('judul', 150);
            $table->text('isi');
            $table->string('tipe', 30)->default('Akademik');

            // Target: 'semua' | 'mahasiswa' | 'dosen'
            $table->string('role_target', 20)->default('semua');

            // Berapa user yang menerima saat dikirim
            $table->unsignedInteger('jumlah_penerima')->default(0);

            // Admin yang mengirim
            $table->foreignId('sent_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('broadcast_logs');
    }
};
