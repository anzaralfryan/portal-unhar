<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('pembayaran', function (Blueprint $table) {
            // Waktu mahasiswa klik "Saya Sudah Bayar" — otomatis lunas oleh sistem
            $table->timestamp('konfirmasi_at')->nullable()->after('tanggal_bayar');

            // Ubah enum status: tambah 'kadaluarsa'
            // MySQL: ALTER COLUMN enum tidak bisa langsung, gunakan CHANGE
            \DB::statement("ALTER TABLE pembayaran MODIFY COLUMN status ENUM('belum','lunas','kadaluarsa') NOT NULL DEFAULT 'belum'");
        });
    }

    public function down(): void
    {
        Schema::table('pembayaran', function (Blueprint $table) {
            $table->dropColumn('konfirmasi_at');
            \DB::statement("ALTER TABLE pembayaran MODIFY COLUMN status ENUM('belum','lunas') NOT NULL DEFAULT 'belum'");
        });
    }
};
