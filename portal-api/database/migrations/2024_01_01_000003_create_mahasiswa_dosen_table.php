<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('mahasiswa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('nim', 20)->unique();
            $table->foreignId('prodi_id')->constrained('prodi');
            $table->year('angkatan');
            $table->unsignedTinyInteger('semester')->default(1);
            $table->enum('kelas', ['pagi', 'sore', 'karyawan'])->default('pagi');
            $table->string('foto')->nullable();
            $table->enum('status', ['aktif', 'cuti', 'lulus', 'DO'])->default('aktif');
            $table->timestamps();
        });

        Schema::create('dosen', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('nip', 30)->unique();
            $table->foreignId('prodi_id')->constrained('prodi');
            $table->string('jabatan')->nullable();
            $table->string('foto')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('dosen');
        Schema::dropIfExists('mahasiswa');
    }
};
