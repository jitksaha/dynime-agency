<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasDynamicIdType;

class Service extends Model
{
    use HasDynamicIdType;
    protected $fillable = [
        'slug', 'title', 'category', 'excerpt', 'description',
        'icon', 'cover_image_url', 'features', 'pricing',
        'sort_order', 'is_active', 'is_featured', 'meta_title', 'meta_desc',
    ];

    protected function casts(): array {
        return [
            'features' => 'array',
            'pricing' => 'array',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
        ];
    }

    public function scopeActive($query) {
        return $query->where('is_active', true)->orderBy('sort_order');
    }
}
