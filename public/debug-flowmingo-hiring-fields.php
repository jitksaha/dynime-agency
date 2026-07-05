<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    exit('Forbidden');
}

header('Content-Type: application/json');

$apiKey = 'fl_live_0VYl27roG.PbF9Yv7iPR8UI81o4zaSU8OaicK1qfGQgsHnIAGVAYM';
$projId = '24f36035-a874-4dff-96f3-240e1fa77bb1';

// Let's test if there is a query parameters mapping structure or different base paths
$urls = [
    "https://apis.flowmingo.ai/company/integration/hiring/projects/v1?id={$projId}",
    "https://apis.flowmingo.ai/company/integration/hiring/projects/v1?project_id={$projId}",
    "https://apis.flowmingo.ai/company/integration/hiring/projects/v1?com_project_id={$projId}",
    "https://apis.flowmingo.ai/company/integration/hiring/project-details/v1/{$projId}",
    "https://apis.flowmingo.ai/company/integration/hiring/settings/v1"
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
