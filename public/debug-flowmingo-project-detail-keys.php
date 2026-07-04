<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    exit('Forbidden');
}

header('Content-Type: application/json');

$apiKey = 'fl_live_0VYl27roG.PbF9Yv7iPR8UI81o4zaSU8OaicK1qfGQgsHnIAGVAYM';
$projId = '24f36035-a874-4dff-96f3-240e1fa77bb1'; // project id for Content & SEO Specialist

// Check if details are at: /integration/hiring/projects/v1/{projId} (wait, previously we checked `/integration/hiring/projects/v1/24f36...` and got 404, let's verify if there is a plural/singular difference, or custom endpoint)
$endpoints = [
    'single_project_singular' => "https://apis.flowmingo.ai/company/integration/hiring/project/v1/{$projId}",
    'single_project_plural' => "https://apis.flowmingo.ai/company/integration/hiring/projects/v1/{$projId}",
    'single_project_without_v1' => "https://apis.flowmingo.ai/company/integration/hiring/projects/{$projId}"
];

$out = [];
foreach ($endpoints as $name => $url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 4);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'X-Api-Key: ' . $apiKey,
        'Accept: application/json'
    ]);
    $result = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $out[$name] = [
        'status' => $status,
        'response' => json_decode($result, true) ?: $result
    ];
    curl_close($ch);
}

echo json_encode($out, JSON_PRETTY_PRINT);
