<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OfficeLocation extends Model
{
    protected $fillable = [
        'name', 'address', 'city', 'country', 'phone',
        'email', 'coordinates', 'is_active', 'sort_order',
    ];

    protected function casts(): array {
        return ['is_active' => 'boolean'];
    }
}
