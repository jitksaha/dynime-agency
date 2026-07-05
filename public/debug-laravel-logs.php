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

$content = file_get_contents($logPath);
if ($content === false) {
    echo "Failed to read file contents.";
    exit;
}

$lines = explode("\n", $content);
$tail = array_slice($lines, -40);
echo "<pre>" . htmlspecialchars(implode("\n", $tail)) . "</pre>";
