<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Jadwal extends Model {
    use HasFactory;
    protected $table = 'jadwal';
    protected $fillable = ['matkul_id','dosen_id','tahun_akademik_id','hari','jam_mulai','jam_selesai','ruang','kelas_type','kapasitas','bonus_kuis_persen'];
    public function matkul()       { return $this->belongsTo(Matkul::class); }
    public function dosen()        { return $this->belongsTo(Dosen::class); }
    public function tahunAkademik(){ return $this->belongsTo(TahunAkademik::class); }
    public function krsDetail()    { return $this->hasMany(KrsDetail::class); }
    public function materi()       { return $this->hasMany(Materi::class); }
    public function tugas()        { return $this->hasMany(Tugas::class); }
    public function kuis()         { return $this->hasMany(Kuis::class); }
    public function absensi()      { return $this->hasMany(Absensi::class); }
}
