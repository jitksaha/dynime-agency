<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class HRDocument extends Model
{
    use HasUuids;

    protected $table = 'hr_documents';
    
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'employee_id', 'kind', 'title', 'doc_number', 'issue_date',
        'effective_date', 'period_month', 'status', 'snapshot',
        'computed', 'pdf_storage_path', 'sent_to_email', 'sent_at',
        'created_by'
    ];

    protected function casts(): array
    {
        return [
            'snapshot' => 'array',
            'computed' => 'array',
            'sent_at' => 'datetime',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
