<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class KuisSoal extends Model {
    protected $table = 'kuis_soal';
    protected $fillable = ['kuis_id','pertanyaan','opsi','jawaban_benar','urutan'];
    protected $casts = ['opsi' => 'array'];
    public function kuis() { return $this->belongsTo(Kuis::class); }
    public function withoutAnswer(): array {
        return collect($this->toArray())->except('jawaban_benar')->toArray();
    }
}
