<?php
header('Content-Type: text/plain; charset=utf-8');
echo "=== Directory Listing ===\n\n";

$docRoot = $_SERVER['DOCUMENT_ROOT'];
echo "Document Root: $docRoot\n";

echo "\nFiles in Document Root:\n";
$files = scandir($docRoot);
foreach ($files as $file) {
    if ($file === '.' || $file === '..') continue;
    $path = $docRoot . '/' . $file;
    echo " - $file (" . (is_dir($path) ? "DIR" : "FILE, " . filesize($path) . " bytes") . ")\n";
}

$parent = dirname($docRoot);
echo "\nFiles in Parent Directory ($parent):\n";
$parentFiles = scandir($parent);
foreach ($parentFiles as $file) {
    if ($file === '.' || $file === '..') continue;
    $path = $parent . '/' . $file;
    echo " - $file (" . (is_dir($path) ? "DIR" : "FILE") . ")\n";
}
