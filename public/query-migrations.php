<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied";
    exit;
}

header('Content-Type: text/plain; charset=utf-8');

$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$homeDir = dirname($docRoot);
$envPath = $homeDir . '/dynime-api/.env';

if (!file_exists($envPath)) {
    echo "No .env file found.";
    exit;
}

$env = [];
$lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($lines as $line) {
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
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    echo "Connected to: $db_database\n\n";

    // Describe job_applications table columns
    echo "--- JOB APPLICATIONS COLUMNS ---\n";
    $stmt = $pdo->query("DESCRIBE job_applications");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "{$row['Field']} - {$row['Type']} - Null: {$row['Null']} - Default: " . json_encode($row['Default']) . "\n";
    }

    // Describe careers table columns
    echo "--- CAREERS COLUMNS ---\n";
    $stmt = $pdo->query("DESCRIBE careers");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "{$row['Field']} - {$row['Type']} - Null: {$row['Null']} - Default: " . json_encode($row['Default']) . "\n";
    }

    echo "\n--- CAREER DETAIL (growth-revenue-lead) ---\n";
    $stmt = $pdo->prepare("SELECT * FROM careers WHERE slug = ?");
    $stmt->execute(['growth-revenue-lead']);
    $career = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($career) {
        print_r($career);
    } else {
        echo "Not found.\n";
    }

    echo "\n--- MIGRATIONS TABLE ---\n";
    $stmt = $pdo->query("SELECT migration, batch FROM migrations ORDER BY batch DESC, migration DESC");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "Batch {$row['batch']}: {$row['migration']}\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
