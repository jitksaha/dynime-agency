<?php
header('Content-Type: text/plain');

$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '/home/u740731947/domains/dynime.com/public_html';
$homeDir = dirname($docRoot);

require $homeDir . '/dynime-api/vendor/autoload.php';
$app = require_once $homeDir . '/dynime-api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\SiteSetting;

try {
    $r2Config = SiteSetting::where('key', 'r2_storage_config')->first();
    if ($r2Config) {
        echo "R2 Config Key Exists: YES\n";
        echo "Value: " . print_r($r2Config->value, true) . "\n";
    } else {
        echo "R2 Config Key Exists: NO\n";
    }
    
    $driver = env('FILESYSTEM_PUBLIC_DRIVER');
    $url = env('FILESYSTEM_PUBLIC_URL');
    echo "\nEnvironment Check:\n";
    echo "FILESYSTEM_PUBLIC_DRIVER: " . ($driver ?: 'not set') . "\n";
    echo "FILESYSTEM_PUBLIC_URL: " . ($url ?: 'not set') . "\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
