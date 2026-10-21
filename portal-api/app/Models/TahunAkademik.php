<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TahunAkademik extends Model {
    use HasFactory;
    protected $table = 'tahun_akademik';
    protected $fillable = ['tahun','semester','is_aktif'];
    protected $casts = ['is_aktif' => 'boolean'];
    public function jadwal()    { return $this->hasMany(Jadwal::class); }
    public function krs()       { return $this->hasMany(Krs::class); }
    public function nilai()     { return $this->hasMany(Nilai::class); }
    public function getLabelAttribute(): string
    {
        return "Semester {$this->semester} {$this->tahun}";
    }
}