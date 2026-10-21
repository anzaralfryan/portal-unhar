<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class TugasSubmission extends Model {
    protected $table = 'tugas_submissions';
    protected $fillable = ['tugas_id','mahasiswa_id','file_path','file_name','nilai','catatan_dosen','submitted_at'];
    protected $casts = ['submitted_at' => 'datetime'];
    public function tugas()     { return $this->belongsTo(Tugas::class); }
    public function mahasiswa() { return $this->belongsTo(Mahasiswa::class); }
    public function getFileUrlAttribute(): ?string {
        return $this->file_path ? asset('storage/'.$this->file_path) : null;
    }
}
