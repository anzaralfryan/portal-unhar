<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Kuis extends Model {
    use HasFactory;
    protected $table = 'kuis';
    protected $fillable = ['jadwal_id','judul','durasi','pertemuan','is_aktif'];
    protected $casts = ['is_aktif' => 'boolean'];
    public function jadwal()      { return $this->belongsTo(Jadwal::class); }
    public function soal()        { return $this->hasMany(KuisSoal::class); }
    public function submissions() { return $this->hasMany(KuisSubmission::class); }
}
