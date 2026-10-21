<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class ChatParticipant extends Model
{
    protected $table    = 'chat_participants';
    protected $fillable = ['room_id', 'user_id', 'role_label', 'last_read_at'];
    protected $casts    = ['last_read_at' => 'datetime'];

    public function room() { return $this->belongsTo(ChatRoom::class, 'room_id'); }
    public function user() { return $this->belongsTo(User::class); }
}
