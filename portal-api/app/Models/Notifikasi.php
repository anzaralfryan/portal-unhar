<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Notifikasi extends Model {
    use HasFactory;
    protected $table = 'notifikasi';
    protected $fillable = ['user_id','judul','isi','tipe','is_read'];
    protected $casts = ['is_read' => 'boolean'];
    public function user() { return $this->belongsTo(User::class); }
}
