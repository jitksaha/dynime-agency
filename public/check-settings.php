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
    
    // Check runtime config (which was dynamically overridden in AppServiceProvider)
    echo "\nRuntime Configuration Check:\n";
    echo "filesystems.disks.public.driver: " . config('filesystems.disks.public.driver') . "\n";
    echo "filesystems.disks.public.url: " . config('filesystems.disks.public.url') . "\n";
    echo "filesystems.disks.public.bucket: " . config('filesystems.disks.public.bucket') . "\n";
    echo "filesystems.disks.public.endpoint: " . config('filesystems.disks.public.endpoint') . "\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
