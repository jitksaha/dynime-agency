<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Job extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'ats_jobs';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'flowmingo_job_id',
        'slug',
        'title',
        'department',
        'employment_type',
        'location',
        'salary_min',
        'salary_max',
        'salary_currency',
        'description',
        'responsibilities',
        'requirements',
        'benefits',
        'experience',
        'remote',
        'featured',
        'status',
        'apply_url',
        'published_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'responsibilities' => 'array',
            'requirements' => 'array',
            'benefits' => 'array',
            'remote' => 'boolean',
            'featured' => 'boolean',
            'published_at' => 'datetime',
        ];
    }
}
