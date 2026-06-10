<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobApplication extends Model
{
    protected $fillable = [
        'career_id', 'career_slug', 'full_name', 'email', 'phone',
        'cover_letter', 'resume_path', 'resume_filename', 'status',
        'admin_notes', 'metadata', 'ip_address',
    ];

    protected function casts(): array {
        return [
            'metadata' => 'array',
        ];
    }

    public function career(): BelongsTo {
        return $this->belongsTo(Career::class);
    }
}
