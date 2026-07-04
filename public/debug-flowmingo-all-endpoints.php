<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    exit('Forbidden');
}

header('Content-Type: application/json');

$apiKey = 'fl_live_0VYl27roG.PbF9Yv7iPR8UI81o4zaSU8OaicK1qfGQgsHnIAGVAYM';
$endpoints = [
    'job-posts-v1' => 'https://apis.flowmingo.ai/company/integration/hiring/job-posts/v1',
    'interview-sets-v1' => 'https://apis.flowmingo.ai/company/integration/hiring/interview-sets/v1',
    'pipelines-v1' => 'https://apis.flowmingo.ai/company/integration/hiring/pipelines/v1',
    'hiring-v1' => 'https://apis.flowmingo.ai/company/integration/hiring/v1'
];

$out = [];
foreach ($endpoints as $name => $url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'X-Api-Key: ' . $apiKey,
        'Accept: application/json'
    ]);
    $result = curl_exec($ch);
    $out[$name] = json_decode($result, true) ?: $result;
    curl_close($ch);
}

echo json_encode($out, JSON_PRETTY_PRINT);
