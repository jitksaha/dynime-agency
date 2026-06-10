<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceAddon extends Model
{
    protected $table = 'service_addons';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'service_slug', 'name', 'description', 'price_usd', 'period', 'is_popular', 'is_active', 'sort_order'
    ];

    protected function casts(): array
    {
        return [
            'price_usd' => 'decimal:2',
            'is_popular' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
