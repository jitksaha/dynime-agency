<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden'); echo "Access Denied."; exit;
}
header('Content-Type: text/plain; charset=utf-8');

$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$homeDir = dirname($docRoot);
$apiDir  = $homeDir . '/dynime-api';

echo "DOCUMENT_ROOT: $docRoot\n";
echo "HOME DIR: $homeDir\n";
echo "API DIR: $apiDir\n";
echo "API DIR exists: " . (is_dir($apiDir) ? 'YES' : 'NO') . "\n\n";

if (is_dir($apiDir)) {
    echo "Contents of $apiDir:\n";
    $files = scandir($apiDir);
    foreach ($files as $f) {
        if ($f === '.' || $f === '..') continue;
        $fullPath = $apiDir . '/' . $f;
        $type = is_dir($fullPath) ? '[DIR]' : '[FILE]';
        $size = is_file($fullPath) ? ' (' . filesize($fullPath) . ' bytes)' : '';
        echo "  $type $f$size\n";
    }
    
    // Check if public folder exists  
    $publicDir = $apiDir . '/public';
    if (is_dir($publicDir)) {
        echo "\nContents of $publicDir:\n";
        $pfiles = scandir($publicDir);
        foreach ($pfiles as $f) {
            if ($f === '.' || $f === '..') continue;
            echo "  $f\n";
        }
    }
    
    // Check symlinks
    echo "\nChecking for symlinks in public_html/api:\n";
    $apiLink = $docRoot . '/api';
    echo "  $apiLink exists: " . (file_exists($apiLink) ? 'YES' : 'NO') . "\n";
    echo "  is_link: " . (is_link($apiLink) ? 'YES' : 'NO') . "\n";
    if (is_link($apiLink)) {
        echo "  link target: " . readlink($apiLink) . "\n";
    }
}

// Check .htaccess rewrite rules
echo "\nCurrent .htaccess (from doc root):\n";
$htaccess = $docRoot . '/.htaccess';
if (file_exists($htaccess)) {
    echo file_get_contents($htaccess);
} else {
    echo "  Not found\n";
}
