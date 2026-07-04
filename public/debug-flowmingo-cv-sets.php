<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    exit('Forbidden');
}

header('Content-Type: application/json');

$apiKey = 'fl_live_0VYl27roG.PbF9Yv7iPR8UI81o4zaSU8OaicK1qfGQgsHnIAGVAYM';
$setId = '0ccd79a4-dbfd-42c3-a5a8-330bd4c8cb57'; // CV Eval: Content & SEO Specialist set ID
$url = "https://apis.flowmingo.ai/company/integration/hiring/interview-sets/v1/{$setId}/candidates"; // check if we can query subpaths of interview sets

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-Api-Key: ' . $apiKey,
    'Accept: application/json'
]);
$result = curl_exec($ch);
curl_close($ch);

echo $result;
