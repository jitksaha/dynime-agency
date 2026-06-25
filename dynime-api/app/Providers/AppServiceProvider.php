<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        try {
            // Load and apply Cloudflare R2 configurations from database settings dynamically
            $r2ConfigRaw = \App\Models\SiteSetting::get('r2_storage_config');
            if ($r2ConfigRaw) {
                $r2Config = is_string($r2ConfigRaw) ? json_decode($r2ConfigRaw, true) : $r2ConfigRaw;
                if (is_array($r2Config) && ($r2Config['enabled'] ?? false)) {
                    config([
                        'filesystems.disks.public.driver' => 's3',
                        'filesystems.disks.public.url' => $r2Config['public_url'] ?? '',
                        'filesystems.disks.public.key' => $r2Config['access_key_id'] ?? '',
                        'filesystems.disks.public.secret' => $r2Config['secret_access_key'] ?? '',
                        'filesystems.disks.public.region' => $r2Config['region'] ?? 'auto',
                        'filesystems.disks.public.bucket' => $r2Config['bucket'] ?? '',
                        'filesystems.disks.public.endpoint' => $r2Config['endpoint'] ?? '',
                        'filesystems.disks.public.use_path_style_endpoint' => filter_var($r2Config['use_path_style_endpoint'] ?? true, FILTER_VALIDATE_BOOLEAN),
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Prevent boot crashes before database is fully migrated
        }
    }
}
