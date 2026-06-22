<?php
namespace App\Models;

use App\Traits\HasDynamicIdType;
use Illuminate\Database\Eloquent\Model;

class SeoMeta extends Model
{
    use HasDynamicIdType;
    protected $fillable = [
        'path', 'entity_type', 'entity_id', 'meta_title', 'meta_desc',
        'og_title', 'og_description', 'og_image', 'twitter_title',
        'twitter_desc', 'twitter_image', 'canonical_url',
        'schema_json', 'robots', 'is_active',
    ];

    protected function casts(): array {
        return [
            'schema_json' => 'array',
            'is_active' => 'boolean',
        ];
    }
}
