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
$targetDirToDelete = $currentDir . DIRECTORY_SEPARATOR . 'public_html';

echo "Current Directory: $currentDir\n";
echo "Target Directory to Delete: $targetDirToDelete\n\n";

if (!is_dir($targetDirToDelete)) {
    echo "Target directory does not exist or is not a directory. Nothing to delete.\n";
    exit;
}

// Safety check to ensure we do not delete the actual root directory
if (realpath($targetDirToDelete) === realpath($currentDir)) {
    echo "SAFETY TRIGGERED: Target directory resolves to current directory. Deletion aborted.\n";
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

if (deleteDirectory($targetDirToDelete)) {
    echo "\nSuccess! Nested public_html folder and all its contents have been successfully deleted.\n";
} else {
    echo "\nError: Failed to delete nested public_html folder fully. Some files may still remain.\n";
}
