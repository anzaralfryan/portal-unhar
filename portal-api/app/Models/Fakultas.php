<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Fakultas extends Model
{
    use HasFactory;

    protected $table = 'fakultas';
    protected $fillable = ['nama', 'kode'];

    public function prodi()
    {
        return $this->hasMany(Prodi::class);
    }
}