<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Announcement extends Model
{
    use HasUuids;

    protected $table = 'announcements';
    
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'title', 'body', 'body_html', 'pinned', 'audience',
        'target_role', 'department', 'is_published', 'publish_at',
        'expires_at', 'author_id'
    ];

    protected function casts(): array
    {
        return [
            'pinned' => 'boolean',
            'is_published' => 'boolean',
            'publish_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }
}
