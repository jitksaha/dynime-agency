<?php
header('Content-Type: text/plain');

$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '/home/u740731947/domains/dynime.com/public_html';
$homeDir = dirname($docRoot);

require $homeDir . '/dynime-api/vendor/autoload.php';
$app = require_once $homeDir . '/dynime-api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\SiteSetting;

$keys = [
    'site_google_analytics_id',
    'site_facebook_pixel_id',
    'site_linkedin_insight_id',
    'site_twitter_pixel_id',
    'site_google_site_verification',
    'site_custom_header_scripts',
    'site_custom_footer_scripts'
];

foreach ($keys as $key) {
    $setting = SiteSetting::where('key', $key)->first();
    if ($setting) {
        echo "Key: $key | Public: " . ($setting->is_public ? 'YES' : 'NO') . "\n";
        echo "Value: " . var_export($setting->value, true) . "\n\n";
    } else {
        echo "Key: $key | NOT FOUND\n\n";
    }
}
