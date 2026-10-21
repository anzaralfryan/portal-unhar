<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Tugas extends Model {
    use HasFactory;
    protected $table = 'tugas';
    protected $fillable = ['jadwal_id','judul','deskripsi','deadline','pertemuan'];
    protected $casts = ['deadline' => 'datetime'];
    public function jadwal()      { return $this->belongsTo(Jadwal::class); }
    public function submissions() { return $this->hasMany(TugasSubmission::class); }
    public function isDeadlineLewat(): bool { return now()->isAfter($this->deadline); }
}
