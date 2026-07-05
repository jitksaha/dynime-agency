<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$token = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $token) {
    header('HTTP/1.1 403 Forbidden');
    exit('Denied');
}

$dir = dirname(__DIR__);
echo "App Base Dir: " . htmlspecialchars($dir) . "<br/>";

$logPaths = [
    $dir . '/dynime-api/storage/logs/laravel.log',
    dirname($dir) . '/dynime-api/storage/logs/laravel.log',
    '/home/u740731947/domains/dynime.com/dynime-api/storage/logs/laravel.log'
];

$found = false;
foreach ($logPaths as $path) {
    echo "Checking: " . htmlspecialchars($path) . "... ";
    if (file_exists($path)) {
        echo "FOUND! Size: " . filesize($path) . " bytes.<br/>";
        $content = file_get_contents($path);
        if ($content !== false) {
            $lines = explode("\n", $content);
            $tail = array_slice($lines, -40);
            echo "<pre style='background:#f6f8fa; padding:12px; border-radius:6px; overflow:auto;'>" . htmlspecialchars(implode("\n", $tail)) . "</pre>";
            $found = true;
            break;
        } else {
            echo "Failed to read.<br/>";
        }
    } else {
        echo "Not found.<br/>";
    }
}

if (!$found) {
    echo "Could not load laravel log from any checked paths.";
}
