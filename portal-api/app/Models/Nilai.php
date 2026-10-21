<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Nilai extends Model {
    use HasFactory;
    protected $table = 'nilai';
    protected $fillable = ['mahasiswa_id','matkul_id','tahun_akademik_id','dosen_id','nilai_huruf','nilai_angka','nilai_uts','nilai_uas','nilai_tugas','nilai_kehadiran','nilai_kuis_avg','bonus_diterapkan'];
    public function mahasiswa()    { return $this->belongsTo(Mahasiswa::class); }
    public function matkul()       { return $this->belongsTo(Matkul::class); }
    public function tahunAkademik(){ return $this->belongsTo(TahunAkademik::class); }
    public function dosen()        { return $this->belongsTo(Dosen::class); }
}
