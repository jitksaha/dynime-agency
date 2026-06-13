<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) { header('HTTP/1.1 403 Forbidden'); echo "Access Denied."; exit; }
header('Content-Type: text/plain; charset=utf-8');

$base = '/home/u740731947/domains/dynime.com/public_html';

// Check dynime-api contents
$apiDir = $base . '/dynime-api';
echo "=== dynime-api directory ===\n";
if (is_dir($apiDir)) {
    $items = scandir($apiDir);
    foreach ($items as $i) {
        if ($i === '.' || $i === '..') continue;
        $p = $apiDir . '/' . $i;
        echo (is_dir($p) ? '[DIR] ' : '[FILE]') . " $i" . (is_file($p) ? ' (' . filesize($p) . ')' : '') . "\n";
    }
} else { echo "NOT FOUND\n"; }

echo "\n=== api symlink check ===\n";
$apiLink = $base . '/api';
echo "api path: $apiLink\n";
echo "exists: " . (file_exists($apiLink) ? 'YES' : 'NO') . "\n";
echo "is_link: " . (is_link($apiLink) ? 'YES' : 'NO') . "\n";
echo "is_dir: " . (is_dir($apiLink) ? 'YES' : 'NO') . "\n";
if (is_link($apiLink)) echo "target: " . readlink($apiLink) . "\n";

echo "\n=== dynime-api/public contents ===\n";
$pubDir = $apiDir . '/public';
if (is_dir($pubDir)) {
    foreach (scandir($pubDir) as $i) {
        if ($i === '.' || $i === '..') continue;
        $p = $pubDir . '/' . $i;
        echo (is_dir($p) ? '[DIR] ' : '[FILE]') . " $i\n";
    }
} else { echo "NO public dir\n"; }

echo "\n=== Server environment ===\n";
echo "SERVER_SOFTWARE: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'unknown') . "\n";
echo "PHP_SAPI: " . PHP_SAPI . "\n";
