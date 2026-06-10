<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class IdCardAssignment extends Model
{
    use HasUuids;

    protected $table = 'id_card_assignments';
    
    public $incrementing = false;
    protected $keyType = 'string';
    
    public $timestamps = false;

    protected $fillable = [
        'card_id', 'company_short', 'kind', 'locked_at', 'qr_payload',
        'subject_email', 'subject_key', 'subject_name', 'created_at'
    ];

    protected function casts(): array
    {
        return [
            'qr_payload' => 'array',
            'locked_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }
}
