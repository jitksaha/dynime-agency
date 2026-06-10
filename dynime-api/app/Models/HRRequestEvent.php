<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class HRRequestEvent extends Model
{
    use HasUuids;

    protected $table = 'hr_request_events';
    
    public $incrementing = false;
    protected $keyType = 'string';
    
    public $timestamps = false; // database handles created_at default

    protected $fillable = [
        'request_id', 'event_type', 'message', 'author_role', 'author_id', 'metadata', 'created_at'
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function request()
    {
        return $this->belongsTo(HRRequest::class, 'request_id');
    }
}
