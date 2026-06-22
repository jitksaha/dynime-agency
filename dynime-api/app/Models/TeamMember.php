<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasDynamicIdType;

class TeamMember extends Model
{
    use HasDynamicIdType;
    protected $fillable = [
        'name', 'role', 'department', 'bio', 'photo_url',
        'linkedin_url', 'twitter_url', 'email', 'sort_order',
        'is_active', 'is_featured',
    ];

    protected function casts(): array {
        return [
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
        ];
    }

    public function scopeActive($query) {
        return $query->where('is_active', true)->orderBy('sort_order');
    }
}
