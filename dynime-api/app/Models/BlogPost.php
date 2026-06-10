<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BlogPost extends Model
{
    protected $fillable = [
        'slug', 'title', 'excerpt', 'content', 'cover_image_url',
        'category', 'tags', 'author', 'read_minutes', 'is_published',
        'is_featured', 'sort_order', 'view_count', 'published_at',
        'meta_title', 'meta_desc', 'og_image',
    ];

    protected function casts(): array {
        return [
            'tags' => 'array',
            'is_published' => 'boolean',
            'is_featured' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    public function scopePublished($query) {
        return $query->where('is_published', true)->orderByDesc('published_at');
    }

    public function scopeFeatured($query) {
        return $query->where('is_featured', true);
    }

    public function incrementView(): void {
        $this->increment('view_count');
    }
}
