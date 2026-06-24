<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied";
    exit;
}

header('Content-Type: text/plain');

try {
    $apiDir = dirname(__DIR__) . '/dynime-api';
    require $apiDir . '/vendor/autoload.php';
    $app = require_once $apiDir . '/bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();

    \Illuminate\Support\Facades\Artisan::call('migrate:status');
    echo \Illuminate\Support\Facades\Artisan::output();
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n" . $e->getTraceAsString();
}
