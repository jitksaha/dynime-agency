<?php
/**
 * Drop corrupted tables and re-run the complete import
 */
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden'); echo "Access Denied."; exit;
}

header('Content-Type: text/plain; charset=utf-8');

// Detect environment: are we in the nested public_html subfolder or the doc root?
$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$homeDir = dirname($docRoot);
$apiDir  = $homeDir . '/dynime-api';
$envPath = $apiDir . '/.env';

echo "Document root: $docRoot\n";
echo "Looking for .env at: $envPath\n";

if (!file_exists($envPath)) { echo "Error: .env not found.\n"; exit; }

// Parse .env
$db_host = '127.0.0.1'; $db_port = '3306'; $db_database = $db_username = $db_password = '';
foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if (str_starts_with(trim($line), '#')) continue;
    [$k, $v] = array_pad(explode('=', $line, 2), 2, '');
    $v = trim(trim($v), '"\'');
    match(trim($k)) {
        'DB_HOST'     => $db_host     = $v,
        'DB_PORT'     => $db_port     = $v,
        'DB_DATABASE' => $db_database = $v,
        'DB_USERNAME' => $db_username = $v,
        'DB_PASSWORD' => $db_password = $v,
        default       => null,
    };
}

try {
    $pdo = new PDO("mysql:host=$db_host;port=$db_port;dbname=$db_database;charset=utf8mb4", $db_username, $db_password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    echo "Connected to: $db_database\n\n";
} catch (Exception $e) {
    echo "DB connection failed: " . $e->getMessage() . "\n"; exit;
}

$pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");

$tables = ['site_settings', 'portfolio_projects', 'blog_posts', 'job_applications', 'country_eligibility'];
foreach ($tables as $tbl) {
    try {
        $pdo->exec("DROP TABLE IF EXISTS `$tbl`");
        echo "Dropped: $tbl\n";
    } catch (Exception $e) {
        echo "Failed to drop $tbl: " . $e->getMessage() . "\n";
    }
}

$pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
echo "\nAll done. Now run: /public_html/run-complete-import.php?token=deploy_token_7782\n";
