<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied";
    exit;
}

header('Content-Type: application/json; charset=utf-8');

$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$homeDir = dirname($docRoot);
$apiDir = $homeDir . '/dynime-api';

try {
    if (function_exists('opcache_reset')) {
        opcache_reset();
    }
    
    require $apiDir . '/vendor/autoload.php';
    $app = require_once $apiDir . '/bootstrap/app.php';
    
    $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    
    \Illuminate\Support\Facades\Cache::flush();
    
    $tables = \Illuminate\Support\Facades\DB::select('SHOW TABLES');
    $tablesList = array_map(function($t) {
        return current((array)$t);
    }, $tables);
    
    $hasNotificationSettings = in_array('notification_settings', $tablesList);
    
    $siteSettingsCount = \Illuminate\Support\Facades\DB::table('site_settings')->count();
    
    $notificationSettings = \Illuminate\Support\Facades\DB::table('notification_settings')->get();
    
    echo json_encode([
        'success' => true,
        'message' => 'OPcache reset and Laravel cache flushed successfully!',
        'notification_settings' => $notificationSettings,
    ]);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
}


