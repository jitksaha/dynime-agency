<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied";
    exit;
}

header('Content-Type: application/json');
$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$homeDir = dirname($docRoot);
$migrationsDir = $homeDir . '/dynime-api/database/migrations';

if (!is_dir($migrationsDir)) {
    echo json_encode(['error' => 'Directory does not exist']);
    exit;
}

$files = scandir($migrationsDir);
$result = [];
foreach ($files as $file) {
    if ($file !== '.' && $file !== '..') {
        $path = $migrationsDir . '/' . $file;
        $result[] = [
            'name' => $file,
            'mtime' => date('Y-m-d H:i:s', filemtime($path)),
            'size' => filesize($path)
        ];
    }
}

echo json_encode($result, JSON_PRETTY_PRINT);
