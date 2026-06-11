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
    echo "Running data:migrate-supabase...\n";
    
    // Check if there is an exported JSON file we can migrate from, or if we should pull from Supabase directly.
    // Let's run the migration command.
    $output = new \Symfony\Component\Console\Output\BufferedOutput();
    
    // First let's try to run with --export option to get latest data from Supabase first
    echo "Step 1: Exporting from Supabase to local JSON...\n";
    $exitCode = Illuminate\Support\Facades\Artisan::call('data:migrate-supabase', ['--export' => true], $output);
    echo "Exit Code: " . $exitCode . "\n";
    echo "Output:\n" . $output->fetch() . "\n";
    
    echo "\nStep 2: Migrating from local JSON to MySQL...\n";
    $output2 = new \Symfony\Component\Console\Output\BufferedOutput();
    $exitCode2 = Illuminate\Support\Facades\Artisan::call('data:migrate-supabase', [], $output2);
    echo "Exit Code: " . $exitCode2 . "\n";
    echo "Output:\n" . $output2->fetch() . "\n";
    
    echo "\nSync operation completed successfully!\n";
} catch (\Exception $e) {
    echo "Error running migration: " . $e->getMessage() . "\n";
}
