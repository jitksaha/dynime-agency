<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    exit('Forbidden');
}

header('Content-Type: application/json');

$apiKey = 'fl_live_0VYl27roG.PbF9Yv7iPR8UI81o4zaSU8OaicK1qfGQgsHnIAGVAYM';
$projId = '24f36035-a874-4dff-96f3-240e1fa77bb1'; // project id for Content & SEO Specialist

// Since /integration/hiring/projects/v1 list is valid, let's look at potential keys to query a single item in that resource list
$endpoints = [
    'project_details_hiring' => "https://apis.flowmingo.ai/company/integration/hiring/projects/v1/{$projId}", // wait, let's verify if plural v1 works
    'project_details_direct' => "https://apis.flowmingo.ai/company/integration/projects/v1/{$projId}",
    'project_scoped_job_post_general' => "https://apis.flowmingo.ai/company/integration/projects/{$projId}/job-posts/v1",
    'project_scoped_jobs_hiring_v1' => "https://apis.flowmingo.ai/company/integration/hiring/projects/v1/{$projId}/job-posts/v1",
    'project_details_hiring_singular' => "https://apis.flowmingo.ai/company/integration/hiring/projects/v1/detail/{$projId}"
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
