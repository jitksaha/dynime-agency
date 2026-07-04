<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    exit('Forbidden');
}

header('Content-Type: application/json');

$apiKey = 'fl_live_0VYl27roG.PbF9Yv7iPR8UI81o4zaSU8OaicK1qfGQgsHnIAGVAYM';
$url = 'https://apis.flowmingo.ai/company/integration/hiring/candidates/v1';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-Api-Key: ' . $apiKey,
    'Accept: application/json'
]);
$result = curl_exec($ch);
curl_close($ch);

$data = json_decode($result, true);
$cand = $data['data'][0] ?? [];

echo json_encode(array_keys($cand), JSON_PRETTY_PRINT);
