<?php
// Secure temporary script to trigger Flowmingo sync on Hostinger
$token = 'sync_token_3391';

if (!isset($_GET['token']) || $_GET['token'] !== $token) {
    header('HTTP/1.1 403 Forbidden');
    echo "Forbidden";
    exit;
}

define('LARAVEL_START', microtime(true));
require_once __DIR__ . '/../dynime-api/vendor/autoload.php';
$app = require_once __DIR__ . '/../dynime-api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Running flowmingo:sync...<br/>";
$exitCode = Illuminate\Support\Facades\Artisan::call('flowmingo:sync');
echo "Exit Code: " . $exitCode . "<br/>";
echo "Output:<br/><pre>" . htmlspecialchars(Illuminate\Support\Facades\Artisan::output()) . "</pre>";

// Delete self for security
@unlink(__FILE__);
echo "Script deleted itself for security.";
