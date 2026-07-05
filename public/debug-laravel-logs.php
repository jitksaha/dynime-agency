<?php
$token = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $token) {
    header('HTTP/1.1 403 Forbidden');
    exit('Denied');
}

$logPath = dirname(__DIR__) . '/dynime-api/storage/logs/laravel.log';
if (!file_exists($logPath)) {
    echo "Log file not found at: " . htmlspecialchars($logPath);
    exit;
}

$lines = 40;
if (isset($_GET['lines'])) {
    $lines = (int)$_GET['lines'];
}

$file = escapeshellarg($logPath);
$output = shell_exec("tail -n $lines $file 2>&1");
echo "<pre>" . htmlspecialchars($output) . "</pre>";
