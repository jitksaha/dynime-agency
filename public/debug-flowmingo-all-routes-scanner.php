<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    exit('Forbidden');
}

header('Content-Type: application/json');

$apiKey = 'fl_live_0VYl27roG.PbF9Yv7iPR8UI81o4zaSU8OaicK1qfGQgsHnIAGVAYM';
$projId = '24f36035-a874-4dff-96f3-240e1fa77bb1';
$postId = '90c13500-e507-4c67-965a-18e744d920e4';

$routes = [
    "https://apis.flowmingo.ai/company/integration/hiring/jobs/v1",
    "https://apis.flowmingo.ai/company/integration/hiring/jobs/v1/{$postId}",
    "https://apis.flowmingo.ai/company/integration/hiring/job/v1/{$postId}",
    "https://apis.flowmingo.ai/company/integration/hiring/posts/v1",
    "https://apis.flowmingo.ai/company/integration/hiring/posts/v1/{$postId}",
    "https://apis.flowmingo.ai/company/integration/hiring/post/v1/{$postId}",
    "https://apis.flowmingo.ai/company/integration/hiring/job-posts/v1/detail/{$postId}",
    "https://apis.flowmingo.ai/company/integration/hiring/job-posts/v1/details/{$postId}",
    "https://apis.flowmingo.ai/company/integration/hiring/projects/v1/project/{$projId}"
];

$out = [];
foreach ($routes as $url) {
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
    if ($status === 200) {
        $out[$url] = [
            'status' => $status,
            'response' => json_decode($res, true) ?: $res
        ];
    } else {
        $out[$url] = ['status' => $status];
    }
    curl_close($ch);
}

echo json_encode($out, JSON_PRETTY_PRINT);
