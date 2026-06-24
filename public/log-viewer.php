<?php
// Simple log viewer for debugging 500 errors
$logFile = __DIR__ . '/../storage/logs/laravel.log';
if (!file_exists($logFile)) {
    echo "Log file does not exist at " . htmlspecialchars($logFile);
    exit;
}

$lines = [];
$file = new SplFileObject($logFile, 'r');
$file->seek(PHP_INT_MAX);
$totalLines = $file->key();

$start = max(0, $totalLines - 100);
$file->seek($start);

while (!$file->eof()) {
    $lines[] = $file->fgets();
}

echo "<pre>" . htmlspecialchars(implode("", array_reverse(array_filter($lines)))) . "</pre>";
