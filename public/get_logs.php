<?php
/**
 * Diagnostic helper to print recent Laravel logs
 */

$homeDir = dirname($_SERVER['DOCUMENT_ROOT'] ?? '/home/u740731947/domains/dynime.com/public_html');
$logFile = $homeDir . '/dynime-api/storage/logs/laravel.log';

header('Content-Type: text/plain; charset=utf-8');
if (file_exists($logFile)) {
    echo "=== Laravel Logs (Last 50 lines) ===\n";
    $lines = file($logFile);
    $lastLines = array_slice($lines, -50);
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
