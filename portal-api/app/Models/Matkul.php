<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Matkul extends Model {
    use HasFactory;
    protected $table    = 'matkul';
    protected $fillable = ['prodi_id', 'kode', 'nama', 'sks', 'semester', 'is_aktif'];
    protected $casts    = ['is_aktif' => 'boolean'];

    public function prodi()  { return $this->belongsTo(Prodi::class); }
    public function jadwal() { return $this->hasMany(Jadwal::class); }
    public function nilai()  { return $this->hasMany(Nilai::class); }
}
