<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    exit('Forbidden');
}

header('Content-Type: application/json');

$apiKey = 'fl_live_0VYl27roG.PbF9Yv7iPR8UI81o4zaSU8OaicK1qfGQgsHnIAGVAYM';
$projId = '24f36035-a874-4dff-96f3-240e1fa77bb1';
$postId = '90c13500-e507-4c67-965a-18e744d920e4';

$endpoints = [
    'hiring_project_detail' => "https://apis.flowmingo.ai/company/integration/hiring/project/v1/{$projId}",
    'hiring_post_detail' => "https://apis.flowmingo.ai/company/integration/hiring/job-post/v1/{$postId}",
    'hiring_posts_scoped' => "https://apis.flowmingo.ai/company/integration/hiring/job-posts/v1/{$postId}",
    'project_details_general' => "https://apis.flowmingo.ai/company/integration/projects/v1/{$projId}",
    'posts_general' => "https://apis.flowmingo.ai/company/integration/job-posts/v1/{$postId}",
    'me_integration' => "https://apis.flowmingo.ai/company/integration/me/v1"
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
