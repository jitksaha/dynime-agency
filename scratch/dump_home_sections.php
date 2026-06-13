<?php

$envPath = '/Users/jitkumarsaha/Dynime Inc/dynime.com/dynime-api/.env';
$env = [];
foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if (strpos(trim($line), '#') === 0) continue;
    $parts = explode('=', $line, 2);
    if (count($parts) === 2) {
        $env[trim($parts[0])] = trim(trim($parts[1]), '"\'');
    }
}

$db_host = $env['DB_HOST'] ?? '127.0.0.1';
$db_port = $env['DB_PORT'] ?? '3306';
$db_database = $env['DB_DATABASE'] ?? 'dynime_prod';
$db_username = $env['DB_USERNAME'] ?? 'root';
$db_password = $env['DB_PASSWORD'] ?? '';

$dsn = "mysql:host=$db_host;port=$db_port;dbname=$db_database;charset=utf8mb4";
$pdo = new PDO($dsn, $db_username, $db_password, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$stmt = $pdo->prepare("SELECT value FROM site_settings WHERE `key` = ?");
$stmt->execute(['home_sections']);
$val = $stmt->fetchColumn();

$decoded = json_decode($val, true);
if (is_string($decoded)) {
    $decoded = json_decode($decoded, true);
}

if (is_array($decoded) && isset($decoded['team']['items'])) {
    foreach ($decoded['team']['items'] as $i => $item) {
        if (isset($item['name']) && strpos($item['name'], 'Jit') !== false) {
            echo "[$i] " . json_encode($item, JSON_PRETTY_PRINT) . "\n";
        }
    }
}
