<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied";
    exit;
}

header('Content-Type: application/json');

try {
    $apiDir = dirname(__DIR__) . '/dynime-api';
    require $apiDir . '/vendor/autoload.php';
    $app = require_once $apiDir . '/bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();

    $settings = DB::table('notification_settings')->get();
    $logs = DB::table('whatsapp_send_log')->orderBy('created_at', 'desc')->limit(20)->get();

    echo json_encode([
        'settings' => $settings,
        'logs' => $logs
    ], JSON_PRETTY_PRINT);
} catch (\Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
