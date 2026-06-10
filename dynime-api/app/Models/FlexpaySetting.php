<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FlexpaySetting extends Model
{
    protected $table = 'flexpay_settings';

    protected $fillable = [
        'enabled', 'emi_enabled', 'paylater_enabled', 'credit_system_enabled',
        'allowed_tenures', 'paylater_terms', 'processing_fee_percent',
        'down_payment_percent', 'late_fee_amount', 'min_order_amount',
        'max_credit_limit', 'default_currency', 'kyc_provider',
        'auto_approval_enabled', 'auto_approval_max_limit', 'tenure_fee_tiers',
        'card_bin_prefix', 'card_length', 'card_expiry_months', 'card_cvv_length',
        'card_max_cvv_regens', 'card_auto_issue', 'card_default_daily_limit',
        'card_default_weekly_limit', 'card_default_monthly_limit', 'card_default_per_txn_limit'
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'emi_enabled' => 'boolean',
            'paylater_enabled' => 'boolean',
            'credit_system_enabled' => 'boolean',
            'auto_approval_enabled' => 'boolean',
            'card_auto_issue' => 'boolean',
            'allowed_tenures' => 'array',
            'paylater_terms' => 'array',
            'tenure_fee_tiers' => 'array',
            'processing_fee_percent' => 'decimal:2',
            'down_payment_percent' => 'decimal:2',
            'late_fee_amount' => 'decimal:2',
            'min_order_amount' => 'decimal:2',
            'max_credit_limit' => 'decimal:2',
            'auto_approval_max_limit' => 'decimal:2',
            'card_default_daily_limit' => 'decimal:2',
            'card_default_weekly_limit' => 'decimal:2',
            'card_default_monthly_limit' => 'decimal:2',
            'card_default_per_txn_limit' => 'decimal:2',
        ];
    }
}
