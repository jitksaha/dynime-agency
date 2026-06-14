<?php
/**
 * Automated API Deployment Helper for Hostinger
 * Unzips dynime-api.zip dynamically and performs server-wide Inode cleanup of unnecessary/obsolete files.
 */

// Secure process execution (prevent PHP timeouts and workers blocking)
set_time_limit(0);
ignore_user_abort(true);

$deployToken = 'deploy_token_7782'; // Security token

if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied: Invalid token.";
    exit;
}

header('Content-Type: text/html; charset=utf-8');
echo "<h2>cPanel Backend Deployment & Inode Cleanup Webhook</h2>";

// Helper: Recursively delete a directory and its contents
function rrmdir($dir) {
    if (!file_exists($dir)) return;
    if (is_file($dir) || is_link($dir)) {
        @unlink($dir);
        return;
    }
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($files as $fileinfo) {
        $todo = ($fileinfo->isDir() ? 'rmdir' : 'unlink');
        @$todo($fileinfo->getRealPath());
    }
    @rmdir($dir);
}

// Helper: Delete files by wildcard pattern
function deleteFilesByPattern($pattern) {
    $files = glob($pattern);
    if ($files) {
        foreach ($files as $file) {
            if (is_file($file)) {
                @unlink($file);
            }
        }
    }
}

// Locate ZIP file paths
$zipFile = __DIR__ . '/dynime-api.zip';
if (!file_exists($zipFile)) {
    $zipFile = dirname(__DIR__) . '/dynime-api.zip';
}
if (!file_exists($zipFile)) {
    $zipFile = '/home/u740731947/domains/dynime.com/public_html/dynime-api.zip';
}

$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '/home/u740731947/domains/dynime.com/public_html';
$homeDir = dirname($docRoot);
$extractTo = $homeDir . '/dynime-api';

// --- 1. Cleanup server-wide obsolete and development-only files to save Inodes ---
echo "<h3>Cleaning up unnecessary files and directories...</h3>";

// Clean chrooted/webroot Git & Vite configs if they exist (crucial security + inode optimization)
$unnecessaryDirs = [
    $docRoot . '/.git',
    $docRoot . '/.github',
    $docRoot . '/.vite',
    $docRoot . '/node_modules',
];
foreach ($unnecessaryDirs as $dir) {
    if (is_dir($dir)) {
        echo "Removing leftover directory: <code>$dir</code>... ";
        rrmdir($dir);
        echo "Done.<br/>";
    }
}

// Clean up legacy API backups in webroot (api_bak_*)
$apiBackups = glob($docRoot . '/api_bak_*');
if ($apiBackups) {
    foreach ($apiBackups as $backupDir) {
        if (is_dir($backupDir)) {
            echo "Removing legacy backup directory: <code>$backupDir</code>... ";
            rrmdir($backupDir);
            echo "Done.<br/>";
        }
    }
}

// Clean dev/build files in public_html
$unnecessaryFiles = [
    $docRoot . '/Dockerfile',
    $docRoot . '/Dockerfile.frontend',
    $docRoot . '/docker-compose.yml',
    $docRoot . '/tsconfig.json',
    $docRoot . '/tsconfig.app.json',
    $docRoot . '/tsconfig.node.json',
    $docRoot . '/vite.config.ts',
    $docRoot . '/vitest.config.ts',
    $docRoot . '/eslint.config.js',
    $docRoot . '/postcss.config.js',
    $docRoot . '/tailwind.config.ts',
    $docRoot . '/package.json',
    $docRoot . '/package-lock.json',
    $docRoot . '/bun.lock',
    $docRoot . '/bun.lockb',
    $docRoot . '/README.md',
    $docRoot . '/DEPLOYMENT.md',
    $docRoot . '/DEPLOY-HOSTINGER.md',
];
foreach ($unnecessaryFiles as $file) {
    if (is_file($file)) {
        @unlink($file);
    }
}

// Clean up old archives
deleteFilesByPattern($docRoot . '/*.zip');
deleteFilesByPattern($homeDir . '/*.zip');

// --- 2. Extract backend ZIP ---
echo "<h3>Extracting Backend Package...</h3>";

if (!file_exists($zipFile)) {
    echo "Error: Zip file not found at <code>$zipFile</code>.<br/>";
    exit;
}

if (!class_exists('ZipArchive')) {
    echo "Error: ZipArchive extension is not enabled on this server's PHP configuration.<br/>";
    exit;
}

// Delete old dynime-api folder to clean up removed packages/files (save inodes)
if (is_dir($extractTo)) {
    echo "Clearing old backend version in <code>$extractTo</code> to prevent inode accumulation... ";
    rrmdir($extractTo);
    echo "Done.<br/>";
}

// Re-create extract directory
mkdir($extractTo, 0755, true);

$zip = new ZipArchive;
if ($zip->open($zipFile) === TRUE) {
    echo "Extracting backend package to <code>$extractTo</code>... ";
    
    // Extract zip
    if ($zip->extractTo($extractTo)) {
        $zip->close();
        @unlink($zipFile); // Delete zip file after extraction for security and space
        echo "<span style='color:green; font-weight:bold;'>Success!</span> Backend successfully extracted and deployed.<br/>";
    } else {
        echo "<span style='color:red; font-weight:bold;'>Error:</span> Failed to extract ZIP file. Check folder permissions of <code>$extractTo</code>.<br/>";
    }
} else {
    echo "Error: Could not open the ZIP file.";
}

