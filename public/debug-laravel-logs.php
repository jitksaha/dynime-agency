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
    $content = file_get_contents($path);
    if ($content !== false) {
        $lines = explode("\n", $content);
        $errors = [];
        foreach (array_reverse($lines) as $line) {
            if (strpos($line, 'production.ERROR') !== false || strpos($line, 'local.ERROR') !== false) {
                $errors[] = $line;
                if (count($errors) >= 15) break;
            }
        }
        echo "<h3>Latest 15 Laravel Errors:</h3><pre style='background:#f6f8fa; padding:12px; border-radius:6px; overflow:auto;'>" . htmlspecialchars(implode("\n", $errors)) . "</pre>";
    }
}
