<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied";
    exit;
}

header('Content-Type: text/plain; charset=utf-8');
$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$homeDir = dirname($docRoot);
$migrationsDir = $homeDir . '/dynime-api/database/migrations';

echo "Migrations Dir: $migrationsDir\n";
echo "Exists: " . (is_dir($migrationsDir) ? 'YES' : 'NO') . "\n";

if (is_dir($migrationsDir)) {
    $files = scandir($migrationsDir);
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            echo $file . "\n";
        }
    }
}
