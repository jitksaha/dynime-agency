<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class KpiGoal extends Model
{
    use HasUuids;

    protected $table = 'kpi_goals';
    
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'employee_id', 'title', 'description', 'metric', 'unit',
        'target', 'progress', 'weight', 'status', 'period_start',
        'period_end', 'created_by'
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
