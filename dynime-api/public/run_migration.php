<?php

if (($_GET['token'] ?? '') !== 'run_migration_7782') {
    die('Unauthorized');
}

define('LARAVEL_START', microtime(true));

if (file_exists($maintenance = __DIR__.'/../storage/framework/down')) {
    require $maintenance;
}

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$output = new \Symfony\Component\Console\Output\BufferedOutput();
$status = $kernel->handle(
    new \Symfony\Component\Console\Input\ArgvInput(['artisan', 'data:migrate-supabase']),
    $output
);

echo "Migration finished with status: " . $status . "<br>";
echo "<pre>" . htmlentities($output->fetch()) . "</pre>";
