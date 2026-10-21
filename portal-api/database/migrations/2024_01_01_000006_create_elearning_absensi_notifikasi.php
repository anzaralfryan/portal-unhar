<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Materi
        Schema::create('materi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('jadwal_id')->constrained('jadwal')->cascadeOnDelete();
            $table->string('judul', 150);
            $table->enum('tipe', ['PDF', 'PPTX', 'DOCX', 'VIDEO', 'ZIP', 'LAINNYA'])->default('PDF');
            $table->string('file_path', 255);
            $table->unsignedBigInteger('file_size')->nullable();  // bytes
            $table->unsignedTinyInteger('pertemuan');
            $table->timestamps();
        });

        // Tugas
        Schema::create('tugas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('jadwal_id')->constrained('jadwal')->cascadeOnDelete();
            $table->string('judul', 150);
            $table->text('deskripsi');
            $table->datetime('deadline');
            $table->unsignedTinyInteger('pertemuan')->nullable();
            $table->timestamps();
        });

        // Tugas Submission
        Schema::create('tugas_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tugas_id')->constrained('tugas')->cascadeOnDelete();
            $table->foreignId('mahasiswa_id')->constrained('mahasiswa')->cascadeOnDelete();
            $table->string('file_path', 255);
            $table->string('file_name', 255);
            $table->decimal('nilai', 5, 2)->nullable();
            $table->text('catatan_dosen')->nullable();
            $table->timestamp('submitted_at')->useCurrent();
            $table->timestamps();

            $table->unique(['tugas_id', 'mahasiswa_id']);
        });

        // Kuis
        Schema::create('kuis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('jadwal_id')->constrained('jadwal')->cascadeOnDelete();
            $table->string('judul', 150);
            $table->unsignedSmallInteger('durasi');  // menit
            $table->unsignedTinyInteger('pertemuan')->nullable();
            $table->boolean('is_aktif')->default(true);
            $table->timestamps();
        });

        // Kuis Soal
        Schema::create('kuis_soal', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kuis_id')->constrained('kuis')->cascadeOnDelete();
            $table->text('pertanyaan');
            $table->json('opsi');              // ["A teks","B teks","C teks","D teks"]
            $table->unsignedTinyInteger('jawaban_benar'); // 0-based index
            $table->unsignedTinyInteger('urutan')->default(1);
            $table->timestamps();
        });

        // Kuis Submission
        Schema::create('kuis_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kuis_id')->constrained('kuis')->cascadeOnDelete();
            $table->foreignId('mahasiswa_id')->constrained('mahasiswa')->cascadeOnDelete();
            $table->decimal('nilai', 5, 2)->nullable();
            $table->json('jawaban');            // {"soal_id": index_jawaban, ...}
            $table->timestamp('submitted_at')->useCurrent();
            $table->timestamps();

            $table->unique(['kuis_id', 'mahasiswa_id']);
        });

        // Absensi
        Schema::create('absensi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('jadwal_id')->constrained('jadwal')->cascadeOnDelete();
            $table->foreignId('mahasiswa_id')->constrained('mahasiswa')->cascadeOnDelete();
            $table->unsignedTinyInteger('pertemuan');
            $table->date('tanggal');
            $table->string('topik', 150)->nullable();
            $table->enum('status', ['hadir', 'absen', 'izin', 'sakit', 'online', 'belum'])->default('belum');
            $table->boolean('dosen_masuk')->nullable();   // null = belum, true = masuk, false = tidak
            $table->timestamps();

            $table->unique(['jadwal_id', 'mahasiswa_id', 'pertemuan']);
        });

        // Notifikasi
        Schema::create('notifikasi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('judul', 150);
            $table->text('isi');
            $table->string('tipe', 30)->default('Akademik'); // Akademik | Nilai | Jadwal | Pembayaran
            $table->boolean('is_read')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifikasi');
        Schema::dropIfExists('absensi');
        Schema::dropIfExists('kuis_submissions');
        Schema::dropIfExists('kuis_soal');
        Schema::dropIfExists('kuis');
        Schema::dropIfExists('tugas_submissions');
        Schema::dropIfExists('tugas');
        Schema::dropIfExists('materi');
    }
};
