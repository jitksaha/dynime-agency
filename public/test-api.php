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
    
    
    $careersCount = \App\Models\Career::count();
    $applicationsCount = \App\Models\JobApplication::count();
    
    echo json_encode([
        'success' => true,
        'message' => 'OPcache reset and Laravel cache flushed successfully!',
        'careers_count' => $careersCount,
        'applications_count' => $applicationsCount
    ]);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
}
