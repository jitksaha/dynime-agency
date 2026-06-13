<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied.";
    exit;
}

header('Content-Type: text/plain; charset=utf-8');
echo "=== ADVANCED DIRECTORY LISTING ===\n\n";

$docRoot = $_SERVER['DOCUMENT_ROOT'];
$target = isset($_GET['dir']) ? $_GET['dir'] : $docRoot;

// Resolve clean path
$target = realpath($target);
echo "Target Directory: $target\n\n";

if ($target === false || !is_dir($target)) {
    echo "ERROR: Directory not found or access denied.\n";
    exit;
}

$files = scandir($target);
foreach ($files as $file) {
    if ($file === '.' || $file === '..') continue;
    $path = $target . '/' . $file;
    if (is_dir($path)) {
        echo " [DIR]  $file\n";
    } else {
        echo " [FILE] $file (" . filesize($path) . " bytes)\n";
    }
}
