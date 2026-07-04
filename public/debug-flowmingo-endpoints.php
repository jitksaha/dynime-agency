<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    exit('Forbidden');
}

ini_set('display_errors', 1);
error_reporting(E_ALL);

$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$homeDir = dirname($docRoot);
$apiDir  = $homeDir . '/dynime-api';

require $apiDir . '/vendor/autoload.php';
$app = require_once $apiDir . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$apiKey = env('FLOWMINGO_API_KEY');

$endpoints = [
    'ai_v1_me' => 'https://api.flowmingo.ai/v1/integration/me/v1',
    'ai_company_me' => 'https://apis.flowmingo.ai/company/integration/me/v1',
    'com_v1_me' => 'https://api.flowmingo.com/v1/integration/me/v1',
    'com_company_me' => 'https://apis.flowmingo.com/company/integration/me/v1',
];

foreach ($endpoints as $name => $url) {
    echo "=== Testing endpoint $name ($url) ===\n";
    try {
        $response = Illuminate\Support\Facades\Http::withHeaders([
            'X-Api-Key' => $apiKey,
            'Accept' => 'application/json',
        ])->timeout(5)->get($url);
        
        echo "Status Code: " . $response->status() . "\n";
        echo "Response Body: " . substr($response->body(), 0, 300) . "\n\n";
    } catch (Throwable $e) {
        echo "Error: " . $e->getMessage() . "\n\n";
    }
}
