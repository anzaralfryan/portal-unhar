<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BroadcastLog extends Model
{
    protected $table    = 'broadcast_logs';
    protected $fillable = [
        'judul', 'isi', 'tipe', 'role_target',
        'jumlah_penerima', 'sent_by',
    ];

    /** Admin yang mengirim */
    public function sender()
    {
        return $this->belongsTo(User::class, 'sent_by');
    }
}
