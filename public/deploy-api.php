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

// Print server paths for diagnostics
$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '/home/u740731947/domains/dynime.com/public_html';
echo "DOCUMENT_ROOT: " . htmlspecialchars($docRoot) . "<br/>";
echo "Current directory: " . htmlspecialchars(__DIR__) . "<br/>";

// Locate ZIP file paths across multiple possible directories
$zipLocations = [
    __DIR__ . '/backend-release.zip',
    __DIR__ . '/dynime-api.zip',
    dirname(__DIR__) . '/backend-release.zip',
    dirname(__DIR__) . '/dynime-api.zip',
    dirname(dirname(__DIR__)) . '/backend-release.zip',
    $docRoot . '/backend-release.zip',
    $docRoot . '/dynime-api.zip',
    dirname($docRoot) . '/backend-release.zip',
    '/home/u740731947/domains/dynime.com/public_html/backend-release.zip',
    '/home/u740731947/public_html/backend-release.zip',
];

$zipFile = null;
foreach ($zipLocations as $loc) {
    if (file_exists($loc)) {
        $zipFile = $loc;
        echo "Found zip file at: <code>" . htmlspecialchars($loc) . "</code><br/>";
        break;
    }
}

if (!$zipFile) {
    echo "<span style='color:red; font-weight:bold;'>Error:</span> dynime-api.zip not found in any checked locations.<br/>";
    echo "Checked locations list:<br/><ul>";
    foreach ($zipLocations as $loc) {
        echo "<li><code>" . htmlspecialchars($loc) . "</code></li>";
    }
    echo "</ul>";
}

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

// Clean up old archives (excluding dynime-api.zip which is our active deployment bundle)
foreach (glob($docRoot . '/*.zip') as $file) {
    if (basename($file) !== 'dynime-api.zip') {
        @unlink($file);
    }
}
foreach (glob($homeDir . '/*.zip') as $file) {
    if (basename($file) !== 'dynime-api.zip') {
        @unlink($file);
    }
}

function isExecEnabled() {
    if (!function_exists('exec')) {
        return false;
    }
    $disabled = explode(',', ini_get('disable_functions'));
    $disabled = array_map('trim', $disabled);
    return !in_array('exec', $disabled);
}

// Helper: Run Laravel Artisan commands from the extracted app directory
function runLaravelCommand($extractTo, $command) {
    if (!isExecEnabled()) {
        return [
            'command' => $command,
            'exit_code' => 1,
            'output' => 'exec() function is disabled on this server.',
        ];
    }

    $oldCwd = getcwd();
    chdir($extractTo);

    $php = PHP_BINARY ?: 'php';
    $artisan = escapeshellarg($extractTo . '/artisan');
    $cmd = escapeshellarg($php) . ' ' . $artisan . ' ' . $command . ' 2>&1';
    exec($cmd, $output, $exitCode);

    if ($oldCwd !== false) {
        chdir($oldCwd);
    }

    return [
        'command' => $command,
        'exit_code' => $exitCode,
        'output' => implode("\n", $output),
    ];
}

// Helper: Print an Artisan command result
function printLaravelCommandResult($result) {
    $status = $result['exit_code'] === 0
        ? "<span style='color:green; font-weight:bold;'>Success</span>"
        : "<span style='color:red; font-weight:bold;'>Failed</span>";

    echo "<h4>" . htmlspecialchars($result['command']) . " — $status (exit {$result['exit_code']})</h4>";
    echo "<pre style='white-space: pre-wrap; background:#f6f8fa; padding:12px; border-radius:6px;'>" . htmlspecialchars($result['output']) . "</pre>";
}

// Helper: Verify order import/export routes are registered
function verifyOrderRoutes($extractTo) {
    $routeList = runLaravelCommand($extractTo, 'route:list --path=orders');
    printLaravelCommandResult($routeList);

    $requiredRoutes = [
        'GET|HEAD v1/orders/export',
        'POST v1/orders/import',
    ];

    $output = $routeList['output'];
    $missing = array_filter($requiredRoutes, function ($route) use ($output) {
        return strpos($output, $route) === false;
    });

    if (!empty($missing)) {
        echo "<p><span style='color:red; font-weight:bold;'>Route verification failed.</span> Missing: " . htmlspecialchars(implode(', ', $missing)) . "</p>";
        return false;
    }

    echo "<p><span style='color:green; font-weight:bold;'>Route verification passed.</span> Order import/export endpoints are registered.</p>";
    return true;
}

// Check for custom action trigger
if (isset($_GET['action']) && $_GET['action'] === 'sync-r2') {
    echo "<h3>Triggering Storage Sync to Cloudflare R2...</h3>";
    if (!file_exists($extractTo . '/artisan')) {
        echo "<p><span style='color:red; font-weight:bold;'>Error:</span> Laravel artisan file not found at <code>" . htmlspecialchars($extractTo . '/artisan') . "</code>.</p>";
    } else {
        $result = runLaravelCommand($extractTo, 'storage:sync-to-r2');
        printLaravelCommandResult($result);
    }
    exit;
}

// --- 2. Extract backend ZIP ---
echo "<h3>Extracting Backend Package...</h3>";

if (!$zipFile || !file_exists($zipFile)) {
    echo "Error: Zip file not found.<br/>";
    exit;
}

if (!class_exists('ZipArchive')) {
    echo "Error: ZipArchive extension is not enabled on this server's PHP configuration.<br/>";
    exit;
}

// Backup existing .env file if it exists to preserve database config
$envBackupPath = tempnam(sys_get_temp_dir(), 'env_');
$envExists = false;
if (file_exists($extractTo . '/.env')) {
    echo "Backing up existing .env configuration... ";
    if (@copy($extractTo . '/.env', $envBackupPath)) {
        $envExists = true;
        echo "Done.<br/>";
    } else {
        echo "<span style='color:red;'>Failed to backup .env</span><br/>";
    }
}

// Delete old dynime-api folder to clean up removed packages/files (save inodes)
if (is_dir($extractTo)) {
    echo "Clearing old backend version... (skipped slow recursive deletion to prevent timeouts)<br/>";
}

// Re-create extract directory
mkdir($extractTo, 0755, true);

// Restore .env file if it was backed up
if ($envExists && file_exists($envBackupPath)) {
    echo "Restoring .env configuration... ";
    if (@copy($envBackupPath, $extractTo . '/.env')) {
        echo "Done.<br/>";
    } else {
        echo "<span style='color:red;'>Failed to restore .env</span><br/>";
    }
    @unlink($envBackupPath);
}

$zip = new ZipArchive;
if ($zip->open($zipFile) === TRUE) {
    echo "Extracting backend package to <code>$extractTo</code>... ";
    
    // Extract zip
    if ($zip->extractTo($extractTo)) {
        $zip->close();
        @unlink($zipFile); // Delete zip file after extraction for security and space
        echo "<span style='color:green; font-weight:bold;'>Success!</span> Backend successfully extracted and deployed.<br/>";
        
        // Clear Laravel caches through Artisan so new routes are recognized on live.
        echo "<h3>Running migrations and clearing application cache...</h3>";

        if (!file_exists($extractTo . '/artisan')) {
            echo "<p><span style='color:red; font-weight:bold;'>Error:</span> Laravel artisan file not found at <code>" . htmlspecialchars($extractTo . '/artisan') . "</code>.</p>";
        } else {
            if (!isExecEnabled()) {
                echo "<p style='color:orange; font-weight:bold;'>exec() is disabled on this server. Manually clearing cache files directly...</p>";
                $cacheFiles = [
                    $extractTo . '/bootstrap/cache/routes-v7.php',
                    $extractTo . '/bootstrap/cache/config.php',
                    $extractTo . '/bootstrap/cache/services.php',
                    $extractTo . '/bootstrap/cache/packages.php',
                ];
                foreach ($cacheFiles as $file) {
                    if (file_exists($file)) {
                        if (@unlink($file)) {
                            echo "Deleted Laravel cache file: <code>" . basename($file) . "</code><br/>";
                        } else {
                            echo "<span style='color:red;'>Failed to delete cache file:</span> <code>" . basename($file) . "</code><br/>";
                        }
                    }
                }
            } else {
                // Run migrations first so new tables/columns are available
                echo "<h4>Running database migrations...</h4>";
                $migrateResult = runLaravelCommand($extractTo, 'migrate --force');
                printLaravelCommandResult($migrateResult);

                $cacheCommands = [
                    'route:clear',
                    'config:clear',
                    'cache:clear',
                ];

                $cacheFailed = false;
                foreach ($cacheCommands as $cacheCommand) {
                    $result = runLaravelCommand($extractTo, $cacheCommand);
                    printLaravelCommandResult($result);
                    if ($result['exit_code'] !== 0) {
                        $cacheFailed = true;
                    }
                }

                $routesVerified = verifyOrderRoutes($extractTo);

                if ($cacheFailed || !$routesVerified) {
                    echo "<p><span style='color:red; font-weight:bold;'>Deployment warning:</span> Backend extracted, but cache clearing or route verification failed. Orders import/export may still return 404/405 until this is fixed.</p>";
                } else {
                    echo "<p><span style='color:green; font-weight:bold;'>Success!</span> Cache cleared and order import/export routes verified.</p>";
                }
            }
        }
    } else {
        echo "<span style='color:red; font-weight:bold;'>Error:</span> Failed to extract ZIP file. Check folder permissions of <code>$extractTo</code>.<br/>";
    }
} else {
    echo "Error: Could not open the ZIP file.";
}

