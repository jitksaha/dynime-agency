<?php
/**
 * Automated API Deployment Helper for Hostinger
 * Unzips dynime-api.zip dynamically into the parent folder's dynime-api directory
 */

$deployToken = 'deploy_token_7782'; // Security token

if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied: Invalid token.";
    exit;
}

$zipFile = __DIR__ . '/dynime-api.zip';
if (!file_exists($zipFile)) {
    // If running under /public/deploy-api.php, dirname(__DIR__) is the public_html folder
    $zipFile = dirname(__DIR__) . '/dynime-api.zip';
}
if (!file_exists($zipFile)) {
    // Try absolute path under Hostinger domains setup
    $zipFile = '/home/u740731947/domains/dynime.com/public_html/dynime-api.zip';
}
$homeDir = dirname($_SERVER['DOCUMENT_ROOT'] ?? '/home/u740731947/public_html');
$extractTo = $homeDir . '/dynime-api';

header('Content-Type: text/html; charset=utf-8');
echo "<h2>cPanel Backend Deployment Webhook</h2>";

if (!file_exists($zipFile)) {
    echo "Error: Zip file not found at <code>$zipFile</code>.<br/>";
    exit;
}

if (!class_exists('ZipArchive')) {
    echo "Error: ZipArchive extension is not enabled on this server's PHP configuration.<br/>";
    exit;
}

$zip = new ZipArchive;
if ($zip->open($zipFile) === TRUE) {
    // Create directory if it doesn't exist
    if (!is_dir($extractTo)) {
        mkdir($extractTo, 0755, true);
    }
    
    echo "Extracting backend package to <code>$extractTo</code>...<br/>";
    
    // Extract zip
    if ($zip->extractTo($extractTo)) {
        $zip->close();
        unlink($zipFile); // Delete zip file after extraction for security and space
        echo "<span style='color:green; font-weight:bold;'>Success!</span> Backend successfully extracted and deployed.<br/>";
    } else {
        echo "<span style='color:red; font-weight:bold;'>Error:</span> Failed to extract ZIP file. Check folder permissions of <code>$extractTo</code>.<br/>";
    }
} else {
    echo "Error: Could not open the ZIP file.";
}
