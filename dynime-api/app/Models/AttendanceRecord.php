<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class AttendanceRecord extends Model
{
    use HasUuids;

    protected $table = 'attendance_records';
    
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'employee_id', 'work_date', 'clock_in', 'clock_out', 'total_minutes',
        'break_minutes', 'status', 'notes', 'source', 'approved_by',
        'approved_at'
    ];

    protected function casts(): array
    {
        return [
            'work_date' => 'date',
            'clock_in' => 'datetime',
            'clock_out' => 'datetime',
            'approved_at' => 'datetime',
            'total_minutes' => 'decimal:2',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
