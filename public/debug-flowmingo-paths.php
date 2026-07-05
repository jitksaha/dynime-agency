<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    exit('Forbidden');
}

header('Content-Type: application/json');

$apiKey = 'fl_live_0VYl27roG.PbF9Yv7iPR8UI81o4zaSU8OaicK1qfGQgsHnIAGVAYM';
$projId = '24f36035-a874-4dff-96f3-240e1fa77bb1';

$urls = [
    "https://apis.flowmingo.ai/company/integration/hiring/projects/v1/{$projId}",
    "https://apis.flowmingo.ai/company/integration/hiring/projects/{$projId}/v1",
    "https://apis.flowmingo.ai/company/integration/hiring/project/v1/{$projId}",
    "https://apis.flowmingo.ai/company/integration/hiring/projects/v1/{$projId}/settings",
    "https://apis.flowmingo.ai/company/integration/hiring/projects/v1/detail/{$projId}"
];

$out = [];
foreach ($urls as $url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'X-Api-Key: ' . $apiKey,
        'Accept: application/json'
    ]);
    $res = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $out[$url] = [
        'status' => $status,
        'response' => json_decode($res, true) ?: $res
    ];
    curl_close($ch);
}

echo json_encode($out, JSON_PRETTY_PRINT);
