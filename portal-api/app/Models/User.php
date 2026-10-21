<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use HasFactory;

    protected $fillable = [
    'name', 'email', 'password', 'role', 'is_active', 'telepon',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = ['is_active' => 'boolean'];

    public function getJWTIdentifier() { return $this->getKey(); }

    public function getJWTCustomClaims() { return ['role' => $this->role]; }

    public function mahasiswa()  { return $this->hasOne(Mahasiswa::class); }
    public function dosen()      { return $this->hasOne(Dosen::class); }
    public function notifikasi() { return $this->hasMany(Notifikasi::class); }
}
