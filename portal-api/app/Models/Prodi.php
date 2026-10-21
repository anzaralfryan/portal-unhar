<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Prodi extends Model {
    use HasFactory;
    protected $table    = 'prodi';
    protected $fillable = ['fakultas_id', 'nama', 'kode', 'is_aktif'];
    protected $casts    = ['is_aktif' => 'boolean'];

    public function fakultas()  { return $this->belongsTo(Fakultas::class); }
    public function mahasiswa() { return $this->hasMany(Mahasiswa::class); }
    public function matkul()    { return $this->hasMany(Matkul::class); }
    public function dosen()     { return $this->hasMany(Dosen::class); }
}
