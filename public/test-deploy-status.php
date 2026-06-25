<?php
header('Content-Type: text/plain');

$zipFile = '/home/u740731947/domains/dynime.com/public_html/dynime-api.zip';
echo "Zip File Exists: " . (file_exists($zipFile) ? "YES" : "NO") . "\n";
if (file_exists($zipFile)) {
    echo "Zip File Size: " . filesize($zipFile) . " bytes\n";
}

$extractTo = '/home/u740731947/domains/dynime.com/dynime-api';
echo "Extract Directory Exists: " . (is_dir($extractTo) ? "YES" : "NO") . "\n";
if (is_dir($extractTo)) {
    echo "Artisan Exists: " . (file_exists($extractTo . '/artisan') ? "YES" : "NO") . "\n";
    echo "Last Modified of artisan: " . (file_exists($extractTo . '/artisan') ? date('Y-m-d H:i:s', filemtime($extractTo . '/artisan')) : 'N/A') . "\n";
}

echo "ZipArchive class loaded: " . (class_exists('ZipArchive') ? "YES" : "NO") . "\n";

// Print recent PHP error log if any
$errorLog = '/home/u740731947/domains/dynime.com/public_html/error_log';
if (file_exists($errorLog)) {
    echo "\n--- Last 20 lines of error_log ---\n";
    $lines = file($errorLog);
    $last_lines = array_slice($lines, -20);
    echo implode("", $last_lines);
} else {
    echo "\nNo error_log found at $errorLog\n";
}
