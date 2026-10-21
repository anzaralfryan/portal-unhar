<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Ruangan extends Model
{
    protected $table    = 'ruangan';
    protected $fillable = ['nama', 'gedung', 'kapasitas', 'is_aktif'];
    protected $casts    = ['is_aktif' => 'boolean'];
}
