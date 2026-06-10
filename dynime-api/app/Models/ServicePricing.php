<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServicePricing extends Model
{
    protected $table = 'service_pricings';

    protected $fillable = [
        'service_slug', 'service_title', 'is_enabled', 'tiers', 'quote_settings'
    ];

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'tiers' => 'array',
            'quote_settings' => 'array',
        ];
    }
}
