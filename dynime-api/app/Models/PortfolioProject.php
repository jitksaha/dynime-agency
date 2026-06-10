<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PortfolioProject extends Model
{
    protected $fillable = [
        'title', 'slug', 'category', 'description', 'content_html',
        'cover_image_url', 'gallery_images', 'client_name', 'project_url',
        'tags', 'is_published', 'is_featured', 'sort_order', 'completed_at',
    ];

    protected function casts(): array {
        return [
            'gallery_images' => 'array',
            'tags' => 'array',
            'is_published' => 'boolean',
            'is_featured' => 'boolean',
            'completed_at' => 'date',
        ];
    }

    public function scopePublished($query) {
        return $query->where('is_published', true)->orderBy('sort_order');
    }
}
