<?php

header('Content-Type: text/plain');

echo "Disk Space Diagnostics:\n";
try {
    $path = __DIR__;
    $free = disk_free_space($path);
    $total = disk_total_space($path);
    
    echo "- Path: " . $path . "\n";
    echo "- Free Space: " . round($free / 1024 / 1024, 2) . " MB\n";
    echo "- Total Space: " . round($total / 1024 / 1024, 2) . " MB\n";
    echo "- Used Space: " . round(($total - $free) / 1024 / 1024, 2) . " MB\n";
    echo "- Usage: " . round((($total - $free) / $total) * 100, 2) . "%\n";
    
    // Check write test
    $testFile = __DIR__ . '/write_test.txt';
    $written = @file_put_contents($testFile, 'Disk write test success');
    if ($written) {
        echo "- Write Test: SUCCESS (wrote {$written} bytes)\n";
        @unlink($testFile);
    } else {
        echo "- Write Test: FAILED\n";
    }
} catch (\Exception $e) {
    echo "Error checking disk space: " . $e->getMessage();
}
