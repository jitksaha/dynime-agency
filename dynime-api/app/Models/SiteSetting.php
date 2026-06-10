<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class SiteSetting extends Model
{
    protected $fillable = ['key', 'value', 'group', 'label', 'is_public'];

    protected function casts(): array {
        return [
            'value' => 'array',
            'is_public' => 'boolean',
        ];
    }

    public static function get(string $key, mixed $default = null): mixed {
        if (str_starts_with($key, 'smtp_')) {
            $setting = static::where('key', $key)->first();
            return $setting ? $setting->value : $default;
        }

        return Cache::remember('setting_' . $key, 86400, function () use ($key, $default) {
            $setting = static::where('key', $key)->first();
            return $setting ? $setting->value : $default;
        });
    }

    public static function set(string $key, mixed $value, string $group = 'general'): static {
        Cache::forget('setting_' . $key);
        Cache::forget('site_settings_public');
        return static::updateOrCreate(
            ['key' => $key],
            ['value' => $value, 'group' => $group]
        );
    }
}
