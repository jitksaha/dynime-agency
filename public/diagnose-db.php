<?php
/**
 * Database Diagnostic Tool for Hostinger
 * Parses the backend .env and tests connection & table presence
 */

$deployToken = 'deploy_token_7782';

if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied: Invalid token.";
    exit;
}

header('Content-Type: text/plain; charset=utf-8');
echo "=== DYNIME DATABASE DIAGNOSTIC ===\n\n";

$homeDir = dirname($_SERVER['DOCUMENT_ROOT'] ?? '/home/ssamokxvqc/public_html');
$envPath = $homeDir . '/dynime-api/.env';

echo "Looking for .env at: $envPath\n";

if (!file_exists($envPath)) {
    echo "ERROR: .env file does not exist at $envPath. Please create one on Hostinger.\n";
    exit;
}

// Parse .env
$env = [];
$lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($lines as $line) {
    if (strpos(trim($line), '#') === 0) continue;
    $parts = explode('=', $line, 2);
    if (count($parts) === 2) {
        $key = trim($parts[0]);
        $val = trim($parts[1]);
        // Remove quotes
        $val = trim($val, '"\'');
        $env[$key] = $val;
    }
}

$db_host = $env['DB_HOST'] ?? '127.0.0.1';
$db_port = $env['DB_PORT'] ?? '3306';
$db_database = $env['DB_DATABASE'] ?? '';
$db_username = $env['DB_USERNAME'] ?? '';
$db_password = $env['DB_PASSWORD'] ?? '';

echo "Loaded configuration:\n";
echo "DB_HOST: " . $db_host . "\n";
echo "DB_PORT: " . $db_port . "\n";
echo "DB_DATABASE: " . $db_database . "\n";
echo "DB_USERNAME: " . $db_username . "\n";
echo "DB_PASSWORD length: " . strlen($db_password) . "\n\n";

if (empty($db_database) || empty($db_username)) {
    echo "ERROR: DB_DATABASE or DB_USERNAME is not configured in .env.\n";
    exit;
}

echo "Attempting to connect to database...\n";
try {
    $dsn = "mysql:host=$db_host;port=$db_port;dbname=$db_database;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    $pdo = new PDO($dsn, $db_username, $db_password, $options);
    echo "SUCCESS: Connected to database successfully!\n\n";

    // Check tables
    echo "Listing tables:\n";
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    if (empty($tables)) {
        echo "No tables found! You need to run database migrations.\n";
    } else {
        foreach ($tables as $table) {
            echo " - $table\n";
        }
        
        // If users table exists, check if there is an admin user
        if (in_array('users', $tables)) {
            $userCount = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
            echo "\nNumber of users in 'users' table: $userCount\n";
            if ($userCount > 0) {
                echo "User emails:\n";
                $users = $pdo->query("SELECT email, role FROM users LIMIT 10")->fetchAll();
                foreach ($users as $user) {
                    echo " - {$user['email']} (Role: {$user['role']})\n";
                }
            } else {
                echo "Warning: 'users' table is empty. No accounts exist.\n";
            }
        }
    }

} catch (PDOException $e) {
    echo "CONNECTION FAILED: " . $e->getMessage() . "\n";
}
