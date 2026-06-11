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
    echo "Running data:migrate-supabase from local JSON file...\n";
    
    $jsonPath = database_path('seeders/supabase_export.json');
    if (!file_exists($jsonPath)) {
        echo "ERROR: JSON file not found at: $jsonPath\n";
        exit;
    }
    
    echo "Found JSON file at: $jsonPath (Size: " . round(filesize($jsonPath) / 1024, 2) . " KB)\n";
    
    $output = new \Symfony\Component\Console\Output\BufferedOutput();
    $exitCode = Illuminate\Support\Facades\Artisan::call('data:migrate-supabase', [], $output);
    
    echo "Exit Code: " . $exitCode . "\n";
    echo "Output:\n" . $output->fetch() . "\n";
    
    echo "Sync operation completed successfully!\n";
} catch (\Exception $e) {
    echo "Error running migration: " . $e->getMessage() . "\n";
}
