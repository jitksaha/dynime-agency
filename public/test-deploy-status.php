<?php
header('Content-Type: text/plain');

$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '/home/u740731947/domains/dynime.com/public_html';
$homeDir = dirname($docRoot);

$paths = [
    'public' => $homeDir . '/dynime-api/storage/app/public',
    'uploads' => $homeDir . '/dynime-api/storage/app/public/uploads',
    'doc_storage' => $docRoot . '/storage',
    'doc_storage_uploads' => $docRoot . '/storage/uploads',
    'doc_uploads' => $docRoot . '/uploads',
];

foreach ($paths as $name => $path) {
    $exists = file_exists($path) ? "YES" : "NO";
    $isDir = is_dir($path) ? "YES" : "NO";
    $count = "N/A";
    if (is_dir($path)) {
        $count = count(array_diff(scandir($path), ['.', '..']));
    }
    echo "$name: Exists=$exists | isDir=$isDir | Count=$count\n";
}
