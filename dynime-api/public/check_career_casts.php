<?php

define('LARAVEL_START', microtime(true));

if (file_exists($maintenance = __DIR__.'/../storage/framework/down')) {
    require $maintenance;
}

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

header('Content-Type: text/plain');

try {
    $careerModelFile = __DIR__ . '/../app/Models/Career.php';
    if (file_exists($careerModelFile)) {
        echo "Career.php exists.\n";
        echo "File content summary:\n";
        $content = file_get_contents($careerModelFile);
        if (strpos($content, 'posting_channels') !== false) {
            echo "SUCCESS: posting_channels is found in Career.php!\n";
        } else {
            echo "FAIL: posting_channels is NOT found in Career.php!\n";
        }
        
        // Output raw file
        echo "\n--- File Content ---\n";
        echo $content;
    } else {
        echo "Career.php does NOT exist at: " . $careerModelFile . "\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage();
}
