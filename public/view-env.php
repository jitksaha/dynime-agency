<?php
header('Content-Type: text/plain; charset=utf-8');

$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied.";
    exit;
}

$homeDir = dirname($_SERVER['DOCUMENT_ROOT'] ?? '/home/ssamokxvqc/public_html');
$envPath = $homeDir . '/dynime-api/.env';

if (!file_exists($envPath)) {
    echo "ERROR: .env not found at $envPath.\n";
    exit;
}

echo "=== Hostinger .env File Contents ===\n\n";
echo file_get_contents($envPath);
