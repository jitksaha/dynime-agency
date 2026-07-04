<?php
/**
 * Flowmingo Sync Trigger
 * Called by Hostinger cron every 10 minutes to sync jobs from Flowmingo ATS.
 *
 * Set in Hostinger cPanel Cron Jobs:
 *   */10 * * * * curl -s "https://dynime.com/flowmingo-cron.php?token=deploy_token_7782" >> /dev/null 2>&1
 */

$deployToken = 'deploy_token_7782';

if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

header('Content-Type: application/json');

$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$homeDir = dirname($docRoot);
$apiDir  = $homeDir . '/dynime-api';

if (!is_dir($apiDir)) {
    echo json_encode(['error' => 'API directory not found', 'path' => $apiDir]);
    exit;
}

try {
    require $apiDir . '/vendor/autoload.php';
    $app = require_once $apiDir . '/bootstrap/app.php';

    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();

    // Run the Flowmingo sync command synchronously
    $exitCode = Illuminate\Support\Facades\Artisan::call('flowmingo:sync');
    $output   = Illuminate\Support\Facades\Artisan::output();

    // Clear job-related cache so frontend picks up new jobs immediately
    try {
        Illuminate\Support\Facades\Cache::forget('jobs_list_all');
        Illuminate\Support\Facades\Cache::forget('flowmingo_jobs');
        Illuminate\Support\Facades\Artisan::call('cache:clear');
    } catch (Throwable $ce) {}

    echo json_encode([
        'success'   => $exitCode === 0,
        'exit_code' => $exitCode,
        'output'    => trim($output),
        'timestamp' => date('c'),
    ], JSON_PRETTY_PRINT);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error'   => $e->getMessage(),
        'file'    => $e->getFile(),
        'line'    => $e->getLine(),
    ], JSON_PRETTY_PRINT);
}
