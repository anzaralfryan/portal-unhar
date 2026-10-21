<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Absensi extends Model {
    use HasFactory;
    protected $table = 'absensi';
    protected $fillable = [
        'jadwal_id','mahasiswa_id','pertemuan','tanggal',
        'topik','status','dosen_masuk',
        'alasan', // Alasan izin/sakit yang diajukan mahasiswa
    ];
    protected $casts = ['tanggal' => 'date', 'dosen_masuk' => 'boolean'];
    public function jadwal()    { return $this->belongsTo(Jadwal::class); }
    public function mahasiswa() { return $this->belongsTo(Mahasiswa::class); }
}
