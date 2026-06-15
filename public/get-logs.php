<?php
header('Content-Type: text/plain; charset=utf-8');
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied";
    exit;
}

$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$homeDir = dirname($docRoot);
$logFile = $homeDir . '/dynime-api/storage/logs/laravel.log';

if (!file_exists($logFile)) {
    echo "Log file does not exist: $logFile\n";
    exit;
}

echo "=== Laravel Log (Last 150 Lines) ===\n";
$lines = [];
$file = new SplFileObject($logFile);
$file->seek(PHP_INT_MAX);
$totalLines = $file->key();

$start = max(0, $totalLines - 150);
for ($i = $start; $i < $totalLines; $i++) {
    $file->seek($i);
    echo $file->current();
}
