<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied";
    exit;
}

header('Content-Type: text/plain; charset=utf-8');

$files = scandir('.');
echo "=== public_html files ===\n";
print_r($files);

if (is_dir('assets')) {
    $assets = scandir('assets');
    echo "\n=== assets files ===\n";
    print_r($assets);
} else {
    echo "\n=== assets directory not found ===\n";
}
