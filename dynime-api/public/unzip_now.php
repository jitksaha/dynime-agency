<?php

header('Content-Type: text/plain');

$possiblePaths = [
    '/home/ssamokxvqc/dynime.com/dynime-api.zip',
    '/home/ssamokxvqc/public_html/dynime-api.zip',
    __DIR__ . '/dynime-api.zip',
    __DIR__ . '/../dynime-api.zip',
    __DIR__ . '/../../dynime-api.zip',
    __DIR__ . '/../../dynime.com/dynime-api.zip',
    __DIR__ . '/../../public_html/dynime-api.zip'
];

$foundZip = null;
echo "Searching for dynime-api.zip...\n";
foreach ($possiblePaths as $path) {
    $real = realpath($path);
    if ($real && file_exists($real)) {
        echo "- Found at: $real (Size: " . round(filesize($real) / 1024 / 1024, 2) . " MB)\n";
        $foundZip = $real;
        break;
    } else {
        echo "- Not found at: $path\n";
    }
}

if (!$foundZip) {
    echo "ERROR: Could not find dynime-api.zip in any of the search paths!\n";
    exit;
}

$extractTo = '/home/ssamokxvqc/dynime-api';
echo "Extracting to: $extractTo...\n";

if (!class_exists('ZipArchive')) {
    echo "ERROR: ZipArchive extension is not enabled on this PHP server!\n";
    exit;
}

$zip = new ZipArchive;
if ($zip->open($foundZip) === TRUE) {
    if (!is_dir($extractTo)) {
        mkdir($extractTo, 0755, true);
    }
    
    if ($zip->extractTo($extractTo)) {
        $zip->close();
        echo "SUCCESS: Backend successfully extracted and deployed!\n";
        // Delete the zip for security
        @unlink($foundZip);
        echo "Deleted source ZIP file.\n";
    } else {
        echo "ERROR: Failed to extract ZIP file. Check directory permissions of: $extractTo\n";
    }
} else {
    echo "ERROR: Could not open the ZIP file.\n";
}
