<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    exit('Forbidden');
}

$envPath = dirname(__DIR__) . '/dynime-api/.env';
if (!file_exists($envPath)) {
    exit("Error: .env not found");
}

$content = file_get_contents($envPath);
$wrongUrl = 'FLOWMINGO_API_URL=https://api.flowmingo.ai/v1';
$correctUrl = 'FLOWMINGO_API_URL=https://apis.flowmingo.ai/company';

if (strpos($content, $wrongUrl) !== false) {
    $content = str_replace($wrongUrl, $correctUrl, $content);
    file_put_contents($envPath, $content);
    echo "Fixed .env file successfully.\n";
} else {
    echo "FLOWMINGO_API_URL is already correct or wrong URL not found.\n";
}
