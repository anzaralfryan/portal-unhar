<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class ChatRoom extends Model
{
    protected $table    = 'chat_rooms';
    protected $fillable = ['type', 'nama', 'jadwal_id', 'created_by', 'last_message_at'];
    protected $casts    = ['last_message_at' => 'datetime'];

    public function jadwal()      { return $this->belongsTo(Jadwal::class); }
    public function creator()     { return $this->belongsTo(User::class, 'created_by'); }
    public function participants(){ return $this->hasMany(ChatParticipant::class, 'room_id'); }
    public function messages()    { return $this->hasMany(ChatMessage::class, 'room_id'); }

    public function lastMessage()
    {
        return $this->hasOne(ChatMessage::class, 'room_id')->latestOfMany();
    }

    public function isGroup(): bool { return $this->type === 'group'; }
}
