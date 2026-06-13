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
    echo "ERROR: .env not found.\n";
    exit;
}

// Parse .env
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
$db_database = $env['DB_DATABASE'] ?? '';
$db_username = $env['DB_USERNAME'] ?? '';
$db_password = $env['DB_PASSWORD'] ?? '';

try {
    $dsn = "mysql:host=$db_host;port=$db_port;dbname=$db_database;charset=utf8mb4";
    $pdo = new PDO($dsn, $db_username, $db_password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    echo "Connected successfully to MySQL database: $db_database\n\n";

    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo str_pad("Table Name", 40) . " | Row Count\n";
    echo str_repeat("-", 55) . "\n";
    
    $emptyTables = [];
    $populatedTables = [];
    
    foreach ($tables as $table) {
        try {
            $count = $pdo->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();
            if ($count == 0) {
                $emptyTables[] = $table;
            } else {
                $populatedTables[$table] = $count;
            }
        } catch (Exception $e) {
            echo str_pad($table, 40) . " | ERROR: " . $e->getMessage() . "\n";
        }
    }
    
    echo "--- Populated Tables ---\n";
    foreach ($populatedTables as $table => $count) {
        echo str_pad($table, 40) . " | $count\n";
    }
    
    echo "\n--- Empty Tables ---\n";
    foreach ($emptyTables as $table) {
        echo " - $table\n";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
