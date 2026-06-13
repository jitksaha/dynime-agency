<?php
/**
 * Cleanup Nested public_html Folder
 * Safely deletes the nested public_html folder and its contents.
 */

$deployToken = 'deploy_token_7782';

if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied.";
    exit;
}

header('Content-Type: text/plain; charset=utf-8');

$currentDir = __DIR__;
$dirName = basename($currentDir);
$parentDir = dirname($currentDir);
$parentDirName = basename($parentDir);

echo "Current Directory: $currentDir\n";
echo "Directory Name: $dirName\n";
echo "Parent Directory: $parentDir\n";
echo "Parent Directory Name: $parentDirName\n\n";

// CRITICAL SAFETY CHECK: Only delete if we are indeed in a nested public_html folder
if ($dirName !== 'public_html' || $parentDirName !== 'public_html') {
    echo "SAFETY TRIGGERED: This script is not running inside a nested public_html folder (e.g. public_html/public_html).\n";
    echo "No files were deleted.\n";
    exit;
}

echo "Safety check passed. Starting recursive deletion of nested public_html folder...\n";

function deleteDirectory($dir) {
    if (!file_exists($dir)) {
        return true;
    }

    if (!is_dir($dir)) {
        return unlink($dir);
    }

    foreach (scandir($dir) as $item) {
        if ($item == '.' || $item == '..') {
            continue;
        }

        if (!deleteDirectory($dir . DIRECTORY_SEPARATOR . $item)) {
            return false;
        }
    }

    return rmdir($dir);
}

// Delete everything in this directory except this script itself (we will delete this script last or let it finish)
$files = scandir($currentDir);
$successCount = 0;
$failCount = 0;

foreach ($files as $file) {
    if ($file == '.' || $file == '..') {
        continue;
    }
    
    $filePath = $currentDir . DIRECTORY_SEPARATOR . $file;
    
    // Skip this script itself so we can finish execution
    if ($file === basename(__FILE__)) {
        continue;
    }
    
    if (is_dir($filePath)) {
        if (deleteDirectory($filePath)) {
            echo "Deleted directory: $file\n";
            $successCount++;
        } else {
            echo "FAILED to delete directory: $file\n";
            $failCount++;
        }
    } else {
        if (unlink($filePath)) {
            echo "Deleted file: $file\n";
            $successCount++;
        } else {
            echo "FAILED to delete file: $file\n";
            $failCount++;
        }
    }
}

echo "\nDeletion complete. Deleted: $successCount, Failed: $failCount.\n";
echo "Please delete this remaining file: " . basename(__FILE__) . " and its parent folder manually or it will be overwritten/cleaned up on next clean deploy.\n";
