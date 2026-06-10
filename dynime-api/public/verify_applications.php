<?php

define('LARAVEL_START', microtime(true));

if (file_exists($maintenance = __DIR__.'/../storage/framework/down')) {
    require $maintenance;
}

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Request;

header('Content-Type: text/plain');

try {
    $request = Request::create('/api/v1/cms/job-applications', 'GET');
    $response = $app->handle($request);
    $content = $response->getContent();
    
    echo "Response preview:\n";
    echo substr($content, 0, 500) . "\n...\n";
    
    $decoded = json_decode($content, true);
    if (is_array($decoded)) {
        if (isset($decoded['data'])) {
            echo "Format: PAGINATED (FAIL) - it contains 'data' wrapper\n";
        } else {
            echo "Format: FLAT ARRAY (SUCCESS) - total items: " . count($decoded) . "\n";
        }
    } else {
        echo "Format: Unknown / Error\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage();
}
