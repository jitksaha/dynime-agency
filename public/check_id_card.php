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
    echo "Connected successfully to live database.\n\n";

    echo "--- ID Card Assignments for DTLE001001 ---\n";
    $stmt = $pdo->prepare("SELECT * FROM id_card_assignments WHERE card_id = ? OR subject_key LIKE ?");
    $stmt->execute(['DTLE001001', '%jit%']);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($rows);

    echo "\n--- Employees matching Jit ---\n";
    $stmt = $pdo->prepare("SELECT id, full_name, employee_code, team_member_key, email FROM employees WHERE full_name LIKE ?");
    $stmt->execute(['%Jit%']);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($rows);

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
