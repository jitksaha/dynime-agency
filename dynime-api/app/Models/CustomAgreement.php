<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class CustomAgreement extends Model
{
    use HasUuids;

    protected $table = 'custom_agreements';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'title',
        'document_type',
        'reference',
        'effective_date',
        'client_name',
        'client_email',
        'client_company',
        'client_phone',
        'scope',
        'term',
        'payment_terms',
        'jurisdiction',
        'currency',
        'total',
        'clauses',
        'items',
        'provider_signer',
        'provider_signed_date',
        'client_signer',
        'client_signed_date',
        'created_by'
    ];

    protected function casts(): array
    {
        return [
            'clauses' => 'array',
            'items' => 'array',
            'effective_date' => 'date:Y-m-d',
            'provider_signed_date' => 'date:Y-m-d',
            'client_signed_date' => 'date:Y-m-d',
            'total' => 'float',
        ];
    }
}
