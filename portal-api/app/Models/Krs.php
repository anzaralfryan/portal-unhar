<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Krs extends Model {
    use HasFactory;
    protected $table = 'krs';
    protected $fillable = ['mahasiswa_id','tahun_akademik_id','status'];
    public function mahasiswa()    { return $this->belongsTo(Mahasiswa::class); }
    public function tahunAkademik(){ return $this->belongsTo(TahunAkademik::class); }
    public function detail()       { return $this->hasMany(KrsDetail::class); }
    public function jadwal()       { return $this->hasManyThrough(Jadwal::class, KrsDetail::class, 'krs_id', 'id', 'id', 'jadwal_id'); }
    public function isLocked(): bool { return in_array($this->status, ['locked','disetujui']); }
}
