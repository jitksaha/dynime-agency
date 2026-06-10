<?php
/**
 * Diagnostic helper to clear Laravel config cache
 */

header('Content-Type: text/plain; charset=utf-8');
echo "=== Laravel Cache Clearer ===\n";

$cacheFiles = [
    '/home/ssamokxvqc/dynime-api/bootstrap/cache/config.php',
    '/home/ssamokxvqc/dynime-api/bootstrap/cache/routes-v7.php',
    '/home/ssamokxvqc/dynime-api/bootstrap/cache/services.php',
    '/home/ssamokxvqc/dynime-api/bootstrap/cache/packages.php'
];

foreach ($cacheFiles as $file) {
    if (file_exists($file)) {
        echo "Found cache file: $file. Deleting... ";
        if (unlink($file)) {
            echo "DELETED!\n";
        } else {
            echo "FAILED to delete.\n";
        }
    } else {
        echo "Cache file not present: $file\n";
    }
}

// Alternatively, let's try running php artisan config:clear
echo "\nAttempting artisan command execution...\n";
try {
    $output = [];
    $retval = null;
    exec('php /home/ssamokxvqc/dynime-api/artisan config:clear 2>&1', $output, $retval);
    echo "Command return code: $retval\n";
    echo "Command output:\n" . implode("\n", $output) . "\n";
} catch (Exception $e) {
    echo "Failed to run artisan command: " . $e->getMessage() . "\n";
}
