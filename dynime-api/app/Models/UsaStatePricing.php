<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UsaStatePricing extends Model
{
    protected $table = 'usa_state_pricings';

    protected $fillable = [
        'state', 'abbr', 'llc_formation', 'corp_formation', 'llc_annual',
        'llc_annual_label', 'corp_annual', 'corp_annual_label', 'llc_renewal',
        'corp_renewal', 'state_tax_note', 'franchise_tax', 'notes', 'sort_order', 'is_active'
    ];

    protected function casts(): array
    {
        return [
            'llc_formation' => 'decimal:2',
            'corp_formation' => 'decimal:2',
            'llc_annual' => 'decimal:2',
            'corp_annual' => 'decimal:2',
            'llc_renewal' => 'decimal:2',
            'corp_renewal' => 'decimal:2',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
