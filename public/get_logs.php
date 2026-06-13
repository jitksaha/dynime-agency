<?php
/**
 * Diagnostic helper to print recent Laravel logs
 */

$homeDir = dirname($_SERVER['DOCUMENT_ROOT'] ?? '/home/u740731947/domains/dynime.com/public_html');
$logFile = $homeDir . '/dynime-api/storage/logs/laravel.log';

header('Content-Type: text/plain; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT");

if (function_exists('opcache_reset')) {
    @opcache_reset();
}
if (file_exists($logFile)) {
    echo "=== Laravel Logs (Last 500 lines) ===\n";
    $lines = file($logFile);
    $lastLines = array_slice($lines, -500);
    echo implode("", $lastLines);
} else {
    echo "ERROR: log file not found at: $logFile\n";
    
    // Check php error logs in the directory
    $localLog = $_SERVER['DOCUMENT_ROOT'] . '/error_log';
    if (file_exists($localLog)) {
        echo "\n=== PHP error_log (Last 50 lines) ===\n";
        $lines = file($localLog);
        $lastLines = array_slice($lines, -50);
        echo implode("", $lastLines);
    } else {
        echo "ERROR: Local error_log not found either at: $localLog\n";
    }
}
