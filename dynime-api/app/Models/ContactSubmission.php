<?php
namespace App\Models;

use App\Traits\HasDynamicIdType;
use Illuminate\Database\Eloquent\Model;

class ContactSubmission extends Model
{
    use HasDynamicIdType;
    protected $fillable = [
        'type', 'name', 'email', 'phone', 'subject',
        'message', 'service', 'status', 'admin_notes',
        'ip_address', 'metadata',
    ];

    protected function casts(): array {
        return [
            'metadata' => 'array',
        ];
    }

    public function scopeNew($query) {
        return $query->where('status', 'new');
    }
}
