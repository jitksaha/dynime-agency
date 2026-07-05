<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$token = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $token) {
    header('HTTP/1.1 403 Forbidden');
    exit('Denied');
}

$path = dirname(__DIR__) . '/dynime-api/storage/logs/laravel.log';
if (file_exists($path)) {
    // Show last 30 lines of file regardless of log level to catch uncaught startup exceptions
    $content = file_get_contents($path);
    if ($content !== false) {
        $lines = explode("\n", $content);
        $tail = array_slice($lines, -60);
        echo "<h3>Latest 60 Lines:</h3><pre style='background:#f6f8fa; padding:12px; border-radius:6px; overflow:auto;'>" . htmlspecialchars(implode("\n", $tail)) . "</pre>";
    }
}
