<?php
/**
 * Automated API & Frontend Deployment Helper for Hostinger
 * Unzips dynime-api.zip and dynime-frontend.zip dynamically
 */

$deployToken = 'deploy_token_7782'; // Security token

if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied: Invalid token.";
    exit;
}

header('Content-Type: text/html; charset=utf-8');
echo "<h2>cPanel Deployment Webhook</h2>";

if (!class_exists('ZipArchive')) {
    echo "Error: ZipArchive extension is not enabled on this server's PHP configuration.<br/>";
    exit;
}

// 1. Process Frontend ZIP (extracts directly to the current public_html directory)
$frontendZip = __DIR__ . '/dynime-frontend.zip';
if (file_exists($frontendZip)) {
    echo "Processing Frontend ZIP...<br/>";
    $zip = new ZipArchive;
    if ($zip->open($frontendZip) === TRUE) {
        $extractTo = __DIR__;
        echo "Extracting frontend package directly to <code>$extractTo</code>...<br/>";
        if ($zip->extractTo($extractTo)) {
            $zip->close();
            unlink($frontendZip); // Delete zip file after extraction
            echo "<span style='color:green; font-weight:bold;'>Success!</span> Frontend successfully extracted and deployed.<br/>";
        } else {
            echo "<span style='color:red; font-weight:bold;'>Error:</span> Failed to extract frontend ZIP. Check folder permissions.<br/>";
        }
    } else {
        echo "Error: Could not open the frontend ZIP file.<br/>";
    }
} else {
    echo "Note: Frontend ZIP (dynime-frontend.zip) not found, skipping frontend extraction.<br/>";
}

// 2. Process Backend ZIP (extracts to sibling dynime-api directory)
$zipFile = __DIR__ . '/dynime-api.zip';
if (!file_exists($zipFile)) {
    $zipFile = dirname(__DIR__) . '/dynime-api.zip';
}
if (!file_exists($zipFile)) {
    $zipFile = '/home/u740731947/domains/dynime.com/public_html/dynime-api.zip';
}

$homeDir = dirname($_SERVER['DOCUMENT_ROOT'] ?? '/home/u740731947/public_html');
$apiDir = $homeDir . '/dynime-api';

if (file_exists($zipFile)) {
    echo "Processing Backend ZIP...<br/>";
    $zip = new ZipArchive;
    if ($zip->open($zipFile) === TRUE) {
        if (!is_dir($apiDir)) {
            mkdir($apiDir, 0755, true);
        }
        echo "Extracting backend package to <code>$apiDir</code>...<br/>";
        if ($zip->extractTo($apiDir)) {
            $zip->close();
            unlink($zipFile); // Delete zip file after extraction
            echo "<span style='color:green; font-weight:bold;'>Success!</span> Backend successfully extracted and deployed.<br/>";
        } else {
            echo "<span style='color:red; font-weight:bold;'>Error:</span> Failed to extract backend ZIP. Check folder permissions.<br/>";
        }
    } else {
        echo "Error: Could not open the backend ZIP file.<br/>";
    }
} else {
    echo "Note: Backend ZIP (dynime-api.zip) not found, skipping backend extraction.<br/>";
}

