<?php
/**
 * Diagnostic helper to check database tables and .env existence.
 */

$envFile = '/home/ssamokxvqc/dynime-api/.env';

header('Content-Type: text/plain; charset=utf-8');
echo "=== Environment Check ===\n";
if (file_exists($envFile)) {
    echo ".env file exists at: $envFile\n";
    
    // Parse it securely
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $config = [];
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2) + [NULL, NULL];
        if ($name !== NULL) {
            $config[trim($name)] = trim($value);
        }
    }
    
    echo "DB_CONNECTION: " . ($config['DB_CONNECTION'] ?? 'Not set') . "\n";
    echo "DB_HOST: " . ($config['DB_HOST'] ?? 'Not set') . "\n";
    echo "DB_DATABASE: " . ($config['DB_DATABASE'] ?? 'Not set') . "\n";
    echo "DB_USERNAME: " . ($config['DB_USERNAME'] ?? 'Not set') . "\n";
    echo "DB_PASSWORD (length): " . (isset($config['DB_PASSWORD']) ? strlen($config['DB_PASSWORD']) : 'Not set') . "\n";
    
    // Try PDO connection
    try {
        $dsn = "mysql:host=" . $config['DB_HOST'] . ";dbname=" . $config['DB_DATABASE'] . ";charset=utf8mb4";
        $pdo = new PDO($dsn, $config['DB_USERNAME'], $config['DB_PASSWORD'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        echo "Database connection: SUCCESS!\n";
        
        // Show tables
        echo "\n=== Database Tables ===\n";
        $stmt = $pdo->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        foreach ($tables as $table) {
            $countStmt = $pdo->query("SELECT COUNT(*) FROM `$table`");
            $count = $countStmt->fetchColumn();
            echo "- $table ($count rows)\n";
        }
        
        // Check site_settings value for home_sections
        echo "\n=== Site Settings for 'home_sections' ===\n";
        if (in_array('site_settings', $tables)) {
            $stmt = $pdo->prepare("SELECT * FROM `site_settings` WHERE `key` = ?");
            $stmt->execute(['home_sections']);
            $row = $stmt->fetch();
            if ($row) {
                echo "Key found! Group: " . $row['group'] . ", Label: " . $row['label'] . "\n";
                echo "Value snippet: " . substr($row['value'], 0, 200) . "...\n";
            } else {
                echo "WARNING: 'home_sections' key NOT found in site_settings table!\n";
            }
        } else {
            echo "WARNING: 'site_settings' table does not exist!\n";
        }
    } catch (Exception $e) {
        echo "Database connection ERROR: " . $e->getMessage() . "\n";
    }
} else {
    echo "ERROR: .env file DOES NOT EXIST at: $envFile\n";
}
