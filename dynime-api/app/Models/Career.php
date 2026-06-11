<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Career extends Model
{
    protected $fillable = [
        'slug', 'title', 'department', 'location', 'employment_type',
        'experience_level', 'salary_range', 'description', 'content_html',
        'responsibilities', 'requirements', 'hero_image_url', 'vacancies',
        'is_active', 'is_featured', 'sort_order', 'view_count', 'posted_at',
        'meta_title', 'meta_desc', 'posting_channels',
    ];

    protected function casts(): array {
        return [
            'responsibilities' => 'array',
            'requirements' => 'array',
            'posting_channels' => 'array',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'posted_at' => 'datetime',
        ];
    }

    public function applications(): HasMany {
        return $this->hasMany(JobApplication::class);
    }

    public function scopeActive($query) {
        return $query->where('is_active', true)->orderBy('sort_order');
    }

    public function incrementView(): void {
        $this->increment('view_count');
    }
}
