<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Dosen extends Model {
    use HasFactory;
    protected $table = 'dosen';
    protected $fillable = ['user_id','nip','prodi_id','jabatan','foto','no_hp','alamat'];
    public function user()   { return $this->belongsTo(User::class); }
    public function prodi()  { return $this->belongsTo(Prodi::class); }
    public function jadwal() { return $this->hasMany(Jadwal::class); }
    public function nilai()  { return $this->hasMany(Nilai::class); }

    /**
     * Foto URL — path relatif (bukan absolute URL) supaya tetap berfungsi
     * di domain manapun (localhost, staging, produksi) tanpa perlu diubah.
     * Browser akan resolve path ini relatif terhadap origin saat ini.
     */
    public function getFotoUrlAttribute(): ?string {
        return $this->foto ? '/api/storage-file/'.$this->foto : null;
    }
}
