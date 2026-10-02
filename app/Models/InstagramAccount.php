<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InstagramAccount extends Model
{
    protected $fillable = [
        'username',
        'display_name',
        'instagram_user_id',
        'status',
        'session_reference',
        'last_checked_at',
        'last_error',
    ];

    protected function casts(): array
    {
        return ['last_checked_at' => 'datetime'];
    }
}
