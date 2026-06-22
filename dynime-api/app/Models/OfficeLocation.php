<?php
namespace App\Models;

use App\Traits\HasDynamicIdType;
use Illuminate\Database\Eloquent\Model;

class OfficeLocation extends Model
{
    use HasDynamicIdType;
    protected $fillable = [
        'name', 'address', 'city', 'country', 'phone',
        'email', 'coordinates', 'is_active', 'sort_order',
    ];

    protected function casts(): array {
        return ['is_active' => 'boolean'];
    }
}
