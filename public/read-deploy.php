<?php
header('Content-Type: text/plain');
if (!isset($_GET['token']) || $_GET['token'] !== 'deploy_token_7782') {
    die('Unauthorized');
}

$files = [
    'deploy-api.php',
    '../deploy-api.php',
    '../../deploy-api.php',
    'public_html/deploy-api.php',
];

foreach ($files as $file) {
    if (file_exists($file)) {
        echo "=== $file ===\n";
        $content = file_get_contents($file);
        $lines = explode("\n", $content);
        echo implode("\n", array_slice($lines, 0, 100));
        exit;
    }
}

echo "deploy-api.php not found in: " . implode(', ', $files);
