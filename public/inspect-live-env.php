<?php
// Secure temporary diagnostic script
$token = 'inspect_token_8829';

if (!isset($_GET['token']) || $_GET['token'] !== $token) {
    header('HTTP/1.1 403 Forbidden');
    echo "Forbidden";
    exit;
}

$envPath = dirname(__DIR__) . '/dynime-api/.env';
echo "<h3>.env File Status</h3>";
if (file_exists($envPath)) {
    echo ".env exists.<br/>";
    $lines = file($envPath);
    foreach ($lines as $line) {
        if (strpos($line, 'FLOWMINGO_') === 0) {
            echo htmlspecialchars($line) . "<br/>";
        }
    }
} else {
    echo ".env does not exist.<br/>";
}

echo "<h3>Laravel Config Cache Files</h3>";
$cacheDir = dirname(__DIR__) . '/dynime-api/bootstrap/cache';
$files = ['config.php', 'routes-v7.php', 'services.php', 'packages.php'];
foreach ($files as $file) {
    $path = $cacheDir . '/' . $file;
    if (file_exists($path)) {
        echo "Cache file <code>$file</code> exists (Size: " . filesize($path) . " bytes). ";
        if (isset($_GET['clear_stale'])) {
            if (@unlink($path)) {
                echo "<span style='color:green;'>Deleted.</span><br/>";
            } else {
                echo "<span style='color:red;'>Failed to delete.</span><br/>";
            }
        } else {
            echo "<br/>";
        }
    } else {
        echo "Cache file <code>$file</code> does not exist.<br/>";
    }
}

// Boot Laravel and show config values
define('LARAVEL_START', microtime(true));
require_once __DIR__ . '/../dynime-api/vendor/autoload.php';
$app = require_once __DIR__ . '/../dynime-api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "<h3>Active Config Values in Laravel</h3>";
echo "FLOWMINGO URL config: " . htmlspecialchars(config('services.flowmingo.url')) . "<br/>";
echo "FLOWMINGO KEY config length: " . strlen(config('services.flowmingo.key')) . "<br/>";

// Delete self
if (isset($_GET['delete'])) {
    @unlink(__FILE__);
    echo "Script deleted itself.";
}
