<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Pembayaran extends Model {
    use HasFactory;
    protected $table = 'pembayaran';

    protected $fillable = [
        'mahasiswa_id',
        'tahun_akademik_id',
        'label',
        'jumlah',
        'status',
        'kode_va',
        'va_bank_utama',     // ← tambah: VA via bank yang sama (mis: 248801222370066)
        'va_bank_lain',      // ← tambah: VA via bank lain (mis: 900248801222370066)
        'kode_bank',         // ← tambah: kode bank utama (mis: 248801)
        'kode_antarbank',    // ← tambah: kode antar bank (mis: 900)
        'nomor_rekening',
        'nama_bank',
        'atas_nama',
        'metode',
        'tanggal_bayar',
        'jatuh_tempo',
        'konfirmasi_at',
        // Batch 7b — kolom bukti & verifikasi pembayaran.
        // PENTING: tanpa ini, $pembayaran->update([...]) di
        // PembayaranController (store/uploadBukti/verifikasiBukti)
        // SILENT-DROP keempat kolom ini (mass-assignment protection),
        // sehingga bukti_path selalu NULL dan tombol "Verifikasi Bukti"
        // di Admin tidak pernah muncul meski mahasiswa sudah upload.
        'bukti_path',
        'bukti_nama',
        'status_verifikasi',
        'catatan_verifikasi',
        // Logika 2-step pembayaran
        'nominal_dibayar',
        'deadline_konfirmasi',
    ];

    protected $casts = [
        'tanggal_bayar' => 'date',
        'jatuh_tempo'   => 'date',
        'konfirmasi_at'           => 'datetime',
        'deadline_konfirmasi'     => 'datetime',
    ];

    public function mahasiswa()     { return $this->belongsTo(Mahasiswa::class); }
    public function tahunAkademik() { return $this->belongsTo(TahunAkademik::class); }
}
