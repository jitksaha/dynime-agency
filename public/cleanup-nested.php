<?php
/**
 * Safely removes the nested public_html folder if it exists.
 */
$token = 'deploy_token_7782';

if (!isset($_GET['token']) || $_GET['token'] !== $token) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied";
    exit;
}

$nestedPublicHtml = dirname(__DIR__) . '/public_html';

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

if (is_dir($nestedPublicHtml)) {
    rrmdir($nestedPublicHtml);
    echo "Successfully cleaned up nested public_html directory.";
} else {
    echo "No nested public_html directory found.";
}
