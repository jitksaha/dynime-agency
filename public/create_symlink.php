<?php
/**
 * Automated API Symlink Helper for cPanel
 * Maps dynime.com/api to the Laravel public directory
 */

$target = '/home/ssamokxvqc/dynime-api/public';
$shortcut = '/home/ssamokxvqc/dynime.com/api';

header('Content-Type: text/html; charset=utf-8');
echo "<h2>cPanel API Symlink Helper</h2>";

if (file_exists($shortcut)) {
    if (is_link($shortcut)) {
        echo "Symlink already exists. Re-creating...<br/>";
        unlink($shortcut);
    } else {
        echo "Error: A folder or file named 'api' already exists in the document root and is not a symlink. Please rename or delete it first.<br/>";
        exit;
    }
}

if (symlink($target, $shortcut)) {
    echo "<span style='color:green; font-weight:bold;'>Success!</span> The API symlink has been created successfully.<br/>";
    echo "Requests to <code>dynime.com/api/...</code> will now route to <code>$target</code>.";
} else {
    echo "<span style='color:red; font-weight:bold;'>Error:</span> Failed to create the symlink. Verify that the folder path <code>$target</code> exists.";
}
