<?php
header('Content-Type: text/plain');

$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '/home/u740731947/domains/dynime.com/public_html';
$homeDir = dirname($docRoot);

// 1. Boot Laravel to check database records for media files
require $homeDir . '/dynime-api/vendor/autoload.php';
$app = require_once $homeDir . '/dynime-api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\MediaFile;
use Illuminate\Support\Facades\DB;

try {
    $count = MediaFile::count();
    echo "Total Media Files in DB: $count\n";
    if ($count > 0) {
        echo "Sample Media Files in DB:\n";
        $files = MediaFile::orderByDesc('created_at')->limit(10)->get();
        foreach ($files as $file) {
            echo "ID: {$file->id} | Path: {$file->path} | URL: {$file->url} | Disk: {$file->disk}\n";
            
            // Check where it actually exists
            $storagePublic = storage_path('app/public/' . $file->path);
            $publicHtmlStorage = $docRoot . '/storage/' . $file->path;
            $publicHtmlUploads = $docRoot . '/' . $file->path;
            
            echo "  - Checking: $storagePublic (" . (file_exists($storagePublic) ? "FOUND" : "NOT FOUND") . ")\n";
            echo "  - Checking: $publicHtmlStorage (" . (file_exists($publicHtmlStorage) ? "FOUND" : "NOT FOUND") . ")\n";
            echo "  - Checking: $publicHtmlUploads (" . (file_exists($publicHtmlUploads) ? "FOUND" : "NOT FOUND") . ")\n";
        }
    }
} catch (\Exception $e) {
    echo "DB Error: " . $e->getMessage() . "\n";
}

// 2. Scan folders
$scanDirs = [
    $homeDir . '/dynime-api/storage/app/public',
    $docRoot . '/storage',
    $docRoot . '/uploads',
];

echo "\n--- Scanning Folders ---\n";
foreach ($scanDirs as $dir) {
    if (file_exists($dir) && is_dir($dir)) {
        $fileList = [];
        $dirIterator = new RecursiveDirectoryIterator($dir);
        $iterator = new RecursiveIteratorIterator($dirIterator);
        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $fileList[] = $file->getPathname();
            }
        }
        echo "Dir: $dir | Total Files: " . count($fileList) . "\n";
        echo "Sample Files:\n";
        foreach (array_slice($fileList, 0, 10) as $f) {
            echo "  - " . str_replace($homeDir, '', $f) . " (" . filesize($f) . " bytes)\n";
        }
    } else {
        echo "Dir: $dir | DOES NOT EXIST\n";
    }
}
