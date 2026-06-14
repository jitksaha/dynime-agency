<?php
/**
 * Read last N lines of laravel.log
 */
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied";
    exit;
}

header('Content-Type: text/plain; charset=utf-8');

$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$homeDir = dirname($docRoot);
$logFile = $homeDir . '/dynime-api/storage/logs/laravel.log';

echo "Log file: $logFile\n";
echo "Exists: " . (file_exists($logFile) ? 'YES' : 'NO') . "\n";

if (file_exists($logFile)) {
    $lines = 100;
    if (isset($_GET['lines'])) {
        $lines = (int)$_GET['lines'];
    }
    
    // Read last N lines efficiently
    $file = new SplFileObject($logFile, 'r');
    $file->seek(PHP_INT_MAX);
    $lastLine = $file->key();
    
    $startLine = max(0, $lastLine - $lines);
    $file->seek($startLine);
    
    while (!$file->eof()) {
        echo $file->current();
        $file->next();
    }
} else {
    echo "No log file found.";
}
