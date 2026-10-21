<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Materi extends Model {
    protected $table = 'materi';
    protected $fillable = ['jadwal_id','judul','tipe','file_path','file_size','pertemuan'];
    protected $appends  = ['file_url','ukuran_label'];
    public function jadwal() { return $this->belongsTo(Jadwal::class); }
    public function getFileUrlAttribute(): ?string {
        return $this->file_path ? asset('storage/'.$this->file_path) : null;
    }
    public function getUkuranLabelAttribute(): string {
        if (!$this->file_size) return '';
        $kb = $this->file_size / 1024;
        return $kb >= 1024 ? round($kb/1024, 1).' MB' : round($kb, 0).' KB';
    }
}
