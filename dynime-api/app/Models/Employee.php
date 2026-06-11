<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Employee extends Model
{
    use HasUuids;

    protected $table = 'employees';
    
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'full_name', 'email', 'phone', 'nid_passport', 'dob', 'address',
        'joining_date', 'last_working_day', 'probation_end_date',
        'designation', 'department', 'reporting_to', 'employment_type',
        'job_type', 'work_location', 'status', 'pay_cycle', 'gross_salary',
        'currency', 'allowances', 'deductions', 'bank_name', 'bank_account_name',
        'bank_account_number', 'bank_routing', 'photo_url', 'employee_code',
        'team_member_key', 'user_id', 'metadata', 'created_by'
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($employee) {
            if (empty($employee->employee_code)) {
                $employee->employee_code = static::generateEmployeeCode();
            }
        });
    }

    public static function generateEmployeeCode(): string
    {
        $lastEmployee = static::whereNotNull('employee_code')
            ->where('employee_code', 'like', 'DTLE%')
            ->orderByDesc('employee_code')
            ->first();

        $nextNum = 1001;
        if ($lastEmployee) {
            $lastCode = $lastEmployee->employee_code;
            $numPart = (int) substr($lastCode, 4);
            if ($numPart > 0) {
                $nextNum = $numPart + 1;
            }
        }
        
        return 'DTLE' . str_pad((string)$nextNum, 6, '0', STR_PAD_LEFT);
    }

    protected function casts(): array
    {
        return [
            'allowances' => 'array',
            'deductions' => 'array',
            'metadata' => 'array',
            'gross_salary' => 'decimal:2',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}

