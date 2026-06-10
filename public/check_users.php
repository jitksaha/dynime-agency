<?php
/**
 * Diagnostic helper to check users in the database
 */

$envFile = '/home/ssamokxvqc/dynime-api/.env';

header('Content-Type: text/plain; charset=utf-8');
echo "=== User Check ===\n";
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $config = [];
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2) + [NULL, NULL];
        if ($name !== NULL) {
            $config[trim($name)] = trim($value);
        }
    }
    
    try {
        $dsn = "mysql:host=" . $config['DB_HOST'] . ";dbname=" . $config['DB_DATABASE'] . ";charset=utf8mb4";
        $pdo = new PDO($dsn, $config['DB_USERNAME'], $config['DB_PASSWORD'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        
        echo "\n--- Admin Users ---\n";
        $stmt = $pdo->query("SELECT id, name, email, role, is_active FROM `admin_users`");
        $admins = $stmt->fetchAll();
        foreach ($admins as $admin) {
            echo "ID: {$admin['id']} | Name: {$admin['name']} | Email: {$admin['email']} | Role: {$admin['role']} | Active: {$admin['is_active']}\n";
        }
        
        echo "\n--- Profiles (Client Users) ---\n";
        $stmt = $pdo->query("SELECT id, email, full_name FROM `profiles`");
        $clients = $stmt->fetchAll();
        foreach ($clients as $client) {
            echo "ID: {$client['id']} | Name: {$client['full_name']} | Email: {$client['email']}\n";
        }
        
    } catch (Exception $e) {
        echo "Database error: " . $e->getMessage() . "\n";
    }
} else {
    echo "ERROR: .env file does not exist.\n";
}
