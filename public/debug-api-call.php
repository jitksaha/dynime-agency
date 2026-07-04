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

$apiUrl = env('FLOWMINGO_API_URL');
$apiKey = env('FLOWMINGO_API_KEY');

echo "API URL: $apiUrl\n";
echo "API Key Prefix: " . substr($apiKey, 0, 10) . "...\n\n";

$meUrl = "{$apiUrl}/integration/me/v1";
echo "Testing HTTP GET to: $meUrl\n";

$response = Illuminate\Support\Facades\Http::withHeaders([
    'X-Api-Key' => $apiKey,
    'Accept' => 'application/json',
])->get($meUrl);

echo "Status Code: " . $response->status() . "\n";
echo "Response Body:\n" . $response->body() . "\n";
