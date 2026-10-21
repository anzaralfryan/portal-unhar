<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingKonten extends Model
{
    protected $table = 'landing_kontens';

    protected $fillable = [
        'tipe', 'judul', 'isi', 'gambar', 'kategori',
        'link', 'tanggal_tampil', 'bulan_tampil',
        'urutan', 'aktif', 'meta',
    ];

    protected $casts = [
        'aktif' => 'boolean',
        'meta'  => 'array',
    ];

    // ── Scope: hanya yang aktif, terurut ──
    public function scopeAktif($q)        { return $q->where('aktif', true)->orderBy('urutan')->orderBy('id', 'desc'); }
    public function scopeTipe($q, $tipe)  { return $q->where('tipe', $tipe); }
}
