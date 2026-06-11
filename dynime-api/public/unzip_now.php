<?php

header('Content-Type: text/plain');

echo "Directory Info:\n";
echo "- __DIR__: " . __DIR__ . "\n";
echo "- DOCUMENT_ROOT: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'N/A') . "\n";
echo "- Real path of __DIR__: " . @realpath(__DIR__) . "\n";

echo "\nListing files in __DIR__:\n";
try {
    $files = @scandir(__DIR__);
    if ($files) {
        foreach ($files as $f) {
            echo "  $f\n";
        }
    } else {
        echo "  Failed to list files in __DIR__\n";
    }
} catch (\Exception $e) {
    echo "  Error: " . $e->getMessage() . "\n";
}

echo "\nListing files in DOCUMENT_ROOT:\n";
try {
    $docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
    if ($docRoot) {
        $files = @scandir($docRoot);
        if ($files) {
            foreach ($files as $f) {
                echo "  $f (Size: " . @filesize($docRoot . '/' . $f) . ")\n";
            }
        } else {
            echo "  Failed to list files in DOCUMENT_ROOT\n";
        }
    }
} catch (\Exception $e) {
    echo "  Error: " . $e->getMessage() . "\n";
}

echo "\nListing parent folders:\n";
$current = __DIR__;
for ($i = 0; $i < 3; $i++) {
    $current = dirname($current);
    echo "- Parent $i: $current\n";
    try {
        $files = @scandir($current);
        if ($files) {
            foreach ($files as $f) {
                if ($f !== '.' && $f !== '..') {
                    echo "  $f\n";
                }
            }
        } else {
            echo "  Failed to list parent $i\n";
        }
    } catch (\Exception $e) {
        echo "  Error: " . $e->getMessage() . "\n";
    }
}
