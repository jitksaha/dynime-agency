<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    exit('Forbidden');
}

ini_set('display_errors', 1);
error_reporting(E_ALL);

$apiKey = 'fl_live_0VYl27roG.PbF9Yv7iPR8UI81o4zaSU8OaicK1qfGQgsHnIAGVAYM';

$endpoints = [
    'ai_v1_me' => 'https://api.flowmingo.ai/v1/integration/me/v1',
    'ai_company_me' => 'https://apis.flowmingo.ai/company/integration/me/v1',
    'com_v1_me' => 'https://api.flowmingo.com/v1/integration/me/v1',
    'com_company_me' => 'https://apis.flowmingo.com/company/integration/me/v1',
    'ai_v1_jobs' => 'https://api.flowmingo.ai/v1/integration/hiring/job-posts/v1',
    'ai_company_jobs' => 'https://apis.flowmingo.ai/company/integration/hiring/job-posts/v1'
];

foreach ($endpoints as $name => $url) {
    echo "=== Testing $name ($url) ===\n";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'X-Api-Key: ' . $apiKey,
        'Accept: application/json'
    ]);
    
    $result = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    
    if ($err) {
        echo "Curl Error: $err\n";
    } else {
        echo "Status Code: $status\n";
        echo "Response: " . substr($result, 0, 300) . "\n";
    }
    echo "\n";
}
