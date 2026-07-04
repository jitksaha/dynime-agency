<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    exit('Forbidden');
}

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$homeDir = dirname($docRoot);
$apiDir  = $homeDir . '/dynime-api';

echo "DocRoot: $docRoot\nHomeDir: $homeDir\nApiDir: $apiDir\n";
echo "Autoload exists: " . (file_exists($apiDir . '/vendor/autoload.php') ? 'YES' : 'NO') . "\n";

try {
    require $apiDir . '/vendor/autoload.php';
    $app = require_once $apiDir . '/bootstrap/app.php';
    echo "Laravel Bootstrapped successfully.\n";
    
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();
    echo "Kernel Bootstrapped successfully.\n";

    echo "Running flowmingo:sync...\n";
    $exitCode = Illuminate\Support\Facades\Artisan::call('flowmingo:sync');
    $output   = Illuminate\Support\Facades\Artisan::output();
    echo "Exit Code: $exitCode\nOutput:\n$output\n";
} catch (Throwable $e) {
    echo "EXCEPTION: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
}
