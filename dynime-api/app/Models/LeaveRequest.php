<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class LeaveRequest extends Model
{
    use HasUuids;

    protected $table = 'leave_requests';
    
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'employee_id', 'leave_type_id', 'from_date', 'to_date', 'days',
        'half_day', 'reason', 'status', 'decision_note', 'decided_by',
        'decided_at', 'created_by'
    ];

    protected function casts(): array
    {
        return [
            'half_day' => 'boolean',
            'decided_at' => 'datetime',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function leaveType()
    {
        return $this->belongsTo(LeaveType::class, 'leave_type_id');
    }
}
