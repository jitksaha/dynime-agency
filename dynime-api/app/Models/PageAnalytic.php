<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PageAnalytic extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'path', 'entity_type', 'entity_id',
        'user_agent', 'ip_address', 'country', 'referer',
    ];

    protected function casts(): array {
        return ['created_at' => 'datetime'];
    }
}
