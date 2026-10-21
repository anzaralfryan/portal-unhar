<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class KuisSubmission extends Model {
    protected $table = 'kuis_submissions';
    protected $fillable = ['kuis_id','mahasiswa_id','nilai','jawaban','submitted_at'];
    protected $casts = ['jawaban' => 'array', 'submitted_at' => 'datetime'];
    public function kuis()      { return $this->belongsTo(Kuis::class); }
    public function mahasiswa() { return $this->belongsTo(Mahasiswa::class); }
}
