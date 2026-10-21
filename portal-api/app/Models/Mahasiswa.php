<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Mahasiswa extends Model
{
    use HasFactory;

    protected $table = 'mahasiswa';

    protected $fillable = [
        'user_id', 'nim', 'prodi_id', 'angkatan',
        'semester', 'kelas', 'foto', 'status',
        'no_hp', 'alamat', 'dosen_pa_id',
    ];

    public function user()      { return $this->belongsTo(User::class); }
    public function prodi()     { return $this->belongsTo(Prodi::class); }
    public function krs()       { return $this->hasMany(Krs::class); }
    public function nilai()     { return $this->hasMany(Nilai::class); }
    public function pembayaran(){ return $this->hasMany(Pembayaran::class); }
    public function absensi()   { return $this->hasMany(Absensi::class); }

    /** Dosen Pembimbing Akademik */
    public function dosenPa()   { return $this->belongsTo(Dosen::class, 'dosen_pa_id'); }

    public function tugasSubmissions()
    {
        return $this->hasMany(TugasSubmission::class);
    }

    public function kuisSubmissions()
    {
        return $this->hasMany(KuisSubmission::class);
    }

    /**
     * Foto URL — path relatif (bukan absolute URL) supaya tetap berfungsi
     * di domain manapun (localhost, staging, produksi) tanpa perlu diubah.
     */
    public function getFotoUrlAttribute(): ?string
    {
        return $this->foto ? '/api/storage-file/' . $this->foto : null;
    }
}
