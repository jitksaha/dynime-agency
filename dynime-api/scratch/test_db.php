<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\SiteSetting;

$setting = SiteSetting::where('key', 'keeal_enabled')->first();
echo "Current value: " . json_encode($setting ? $setting->value : null) . "\n";
echo "Current is_public: " . ($setting ? ($setting->is_public ? 'true' : 'false') : 'null') . "\n";

// Try updating
if ($setting) {
    $setting->value = 'true';
    $setting->save();
    echo "Saved to true\n";
    
    $settingRefresh = SiteSetting::where('key', 'keeal_enabled')->first();
    echo "Refreshed value: " . json_encode($settingRefresh->value) . "\n";
}
