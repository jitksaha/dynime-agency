<?php

header('Content-Type: text/plain');

echo "Directory Info:\n";
echo "- __DIR__: " . __DIR__ . "\n";
echo "- DOCUMENT_ROOT: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'N/A') . "\n";

$possiblePaths = [
    '/home/ssamokxvqc/dynime-api.zip',
    '/home/ssamokxvqc/dynime.com/dynime-api.zip',
    '/home/ssamokxvqc/public_html/dynime-api.zip',
    dirname(__DIR__) . '/dynime-api.zip',
    dirname(dirname(__DIR__)) . '/dynime-api.zip',
    dirname(dirname(__DIR__)) . '/dynime.com/dynime-api.zip',
];

$foundZip = null;
echo "\nSearching for dynime-api.zip:\n";
foreach ($possiblePaths as $path) {
    if (@file_exists($path)) {
        echo "- Found at: $path (Size: " . round(@filesize($path) / 1024 / 1024, 2) . " MB)\n";
        $foundZip = $path;
        break;
    } else {
        echo "- Not found at: $path\n";
    }
}

if (!$foundZip) {
    echo "\nERROR: Could not find dynime-api.zip in any of the checked locations.\n";
    exit;
}

$extractTo = '/home/ssamokxvqc/dynime-api';
echo "\nExtracting to: $extractTo...\n";

if (!class_exists('ZipArchive')) {
    echo "ERROR: ZipArchive extension is not enabled on this PHP server!\n";
    exit;
}

$zip = new ZipArchive;
if ($zip->open($foundZip) === TRUE) {
    if (!is_dir($extractTo)) {
        @mkdir($extractTo, 0755, true);
    }
    
    if ($zip->extractTo($extractTo)) {
        $zip->close();
        echo "SUCCESS: Backend successfully extracted and deployed!\n";
        @unlink($foundZip);
        echo "Deleted source ZIP file: $foundZip\n";
    } else {
        echo "ERROR: Failed to extract ZIP file. Check directory permissions of: $extractTo\n";
    }
} else {
    echo "ERROR: Could not open the ZIP file.\n";
}
