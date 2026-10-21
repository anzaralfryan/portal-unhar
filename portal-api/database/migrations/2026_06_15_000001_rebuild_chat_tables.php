<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * REBUILD CHAT TABLES — Skema generik untuk mendukung:
 *  - Personal chat: mahasiswa<->dosen, mahasiswa<->admin, dosen<->admin
 *  - Group chat per matkul (untuk batch berikutnya)
 *
 * Data chat lama dihapus (sesuai keputusan — mulai bersih).
 */
return new class extends Migration
{
    public function up(): void
    {
        // Hapus tabel lama
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_rooms');

        // ── chat_rooms — generic, bisa personal atau group ──
        Schema::create('chat_rooms', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['personal', 'group'])->default('personal');
            $table->string('nama')->nullable();              // untuk group: nama kelas/matkul
            $table->foreignId('jadwal_id')->nullable()
                ->constrained('jadwal')->nullOnDelete();      // untuk group chat per matkul
            $table->foreignId('created_by')->nullable()
                ->constrained('users')->nullOnDelete();
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            $table->index(['type', 'jadwal_id']);
        });

        // ── chat_participants — siapa saja yang ada di room ──
        Schema::create('chat_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('chat_rooms')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role_label', 50)->nullable();    // ex: "Dosen Wali", "Admin", "Pengampu KB01"
            $table->timestamp('last_read_at')->nullable();   // untuk hitung unread per-user
            $table->timestamps();

            $table->unique(['room_id', 'user_id']);
            $table->index('user_id');
        });

        // ── chat_messages — tetap sederhana, generic room_id ──
        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('chat_rooms')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('pesan');
            $table->timestamps();

            $table->index('room_id');
            $table->index(['room_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_participants');
        Schema::dropIfExists('chat_rooms');
    }
};
