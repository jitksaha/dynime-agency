<?php
// Secure temporary script to update .env on Hostinger
$token = 'update_token_8892';

if (!isset($_GET['token']) || $_GET['token'] !== $token) {
    header('HTTP/1.1 403 Forbidden');
    echo "Forbidden";
    exit;
}

$envPath = dirname(__DIR__) . '/dynime-api/.env';

if (!file_exists($envPath)) {
    echo "Error: .env file not found at " . htmlspecialchars($envPath);
    exit;
}

$keys = [
    'FLOWMINGO_API_URL' => 'https://api.flowmingo.ai/v1',
    'FLOWMINGO_API_KEY' => 'fl_live_0VYl27roG.PbF9Yv7iPR8UI81o4zaSU8OaicK1qfGQgsHnIAGVAYM',
    'FLOWMINGO_API_TIMEOUT' => '10',
    'FLOWMINGO_API_RETRIES' => '3',
    'FLOWMINGO_API_RETRY_DELAY' => '100',
    'FLOWMINGO_WEBHOOK_SECRET' => 'whsec_f9ff03a2fce35a5e1b7fdd3a05085e5ed23fcf4f6cd31f6577884774be80834d',
];

$content = file_get_contents($envPath);
$lines = explode("\n", $content);

foreach ($keys as $key => $val) {
    $found = false;
    foreach ($lines as $i => $line) {
        if (strpos(trim($line), $key . '=') === 0) {
            $lines[$i] = $key . '=' . $val;
            $found = true;
            break;
        }
    }
    if (!$found) {
        $lines[] = $key . '=' . $val;
    }
}

file_put_contents($envPath, implode("\n", $lines));
echo "Successfully updated .env file keys to use .ai URL.<br/>";

// Delete self for security
@unlink(__FILE__);
echo "Script deleted itself for security.";
