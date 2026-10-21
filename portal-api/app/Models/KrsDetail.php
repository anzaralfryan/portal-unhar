<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class KrsDetail extends Model {
    protected $table = 'krs_detail';
    protected $fillable = ['krs_id','jadwal_id'];
    public function krs()   { return $this->belongsTo(Krs::class); }
    public function jadwal(){ return $this->belongsTo(Jadwal::class); }
}
