<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteVisit extends Model
{
    protected $table    = 'site_visits';
    protected $fillable = ['user_id', 'role', 'ip_address', 'last_active'];
    protected $casts    = ['last_active' => 'datetime'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
