<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class HRRequest extends Model
{
    use HasUuids;

    protected $table = 'hr_requests';
    
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'employee_id', 'category', 'priority', 'status', 'subject',
        'details', 'attachments', 'metadata', 'decision_note',
        'decided_by', 'decided_at', 'created_by'
    ];

    protected function casts(): array
    {
        return [
            'attachments' => 'array',
            'metadata' => 'array',
            'decided_at' => 'datetime',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function events()
    {
        return $this->hasMany(HRRequestEvent::class, 'request_id');
    }
}
