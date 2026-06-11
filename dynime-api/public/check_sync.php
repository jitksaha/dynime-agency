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
    $careersCount = \App\Models\Career::count();
    $appsCount = \App\Models\JobApplication::count();
    
    echo "Sync check results:\n";
    echo "- Total careers: $careersCount\n";
    echo "- Total job applications: $appsCount\n";
    
    if ($careersCount > 0) {
        $first = \App\Models\Career::first();
        echo "- First career title: " . $first->title . "\n";
        echo "- First career posting_channels type: " . gettype($first->posting_channels) . "\n";
        echo "- First career posting_channels value: " . json_encode($first->posting_channels) . "\n";
    }
} catch (\Exception $e) {
    echo "Error checking sync: " . $e->getMessage() . "\n";
}
