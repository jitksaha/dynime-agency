<?php
header('Content-Type: text/plain');

$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '/home/u740731947/domains/dynime.com/public_html';
$homeDir = dirname($docRoot);

echo "Doc Root: $docRoot\n";
echo "Home Dir: $homeDir\n";

$paths = [
    $homeDir . '/dynime-api/storage/app/public',
    $homeDir . '/dynime-api/storage/app/public/uploads',
    $docRoot . '/storage',
    $docRoot . '/storage/uploads',
    $docRoot . '/uploads',
];

foreach ($paths as $path) {
    echo "Path: $path | Exists: " . (file_exists($path) ? "YES" : "NO") . " | is_dir: " . (is_dir($path) ? "YES" : "NO");
    if (is_dir($path)) {
        $files = array_diff(scandir($path), ['.', '..']);
        echo " | File count: " . count($files) . " | Sample: " . implode(', ', array_slice($files, 0, 5)) . "\n";
    } else {
        echo "\n";
    }
}
