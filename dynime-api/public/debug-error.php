<?php
/**
 * Error diagnostic tool — exposes the ACTUAL exception from Laravel bootstrap.
 * DELETE THIS FILE AFTER DEBUGGING.
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

try {
    // Try to bootstrap Laravel
    define('LARAVEL_START', microtime(true));
    
    require __DIR__.'/../vendor/autoload.php';
    
    $app = require_once __DIR__.'/../bootstrap/app.php';
    
    // Create a fake request to /api/v1/jobs
    $request = \Illuminate\Http\Request::create('/api/v1/jobs', 'GET');
    
    // Boot the kernel but catch the exception
    $kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);
    
    $response = $kernel->handle($request);
    
    echo json_encode([
        'status' => $response->getStatusCode(),
        'headers' => $response->headers->all(),
        'content' => json_decode($response->getContent(), true) ?? $response->getContent(),
    ], JSON_PRETTY_PRINT);
    
    $kernel->terminate($request, $response);

} catch (\Throwable $e) {
    echo json_encode([
        'error' => true,
        'exception' => get_class($e),
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => array_slice(array_map(fn($t) => ($t['file'] ?? '?') . ':' . ($t['line'] ?? '?') . ' ' . ($t['class'] ?? '') . ($t['type'] ?? '') . ($t['function'] ?? ''), $e->getTrace()), 0, 10),
    ], JSON_PRETTY_PRINT);
}
