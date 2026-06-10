<?php
/**
 * Diagnostic helper to check database tables and .env existence.
 */

header('Content-Type: text/plain; charset=utf-8');
echo "=== Environment Check ===\n";

// Print raw server environment status
echo "\n--- Raw process/environment status ---\n";
echo "getenv('DB_PASSWORD'): " . getenv('DB_PASSWORD') . " (len: " . (getenv('DB_PASSWORD') !== false ? strlen(getenv('DB_PASSWORD')) : 'false') . ")\n";
echo "\$_ENV['DB_PASSWORD']: " . ($_ENV['DB_PASSWORD'] ?? 'not set') . " (len: " . (isset($_ENV['DB_PASSWORD']) ? strlen($_ENV['DB_PASSWORD']) : 0) . ")\n";
echo "\$_SERVER['DB_PASSWORD']: " . ($_SERVER['DB_PASSWORD'] ?? 'not set') . " (len: " . (isset($_SERVER['DB_PASSWORD']) ? strlen($_SERVER['DB_PASSWORD']) : 0) . ")\n";

// Search for environment files
echo "\n--- Searching for .env files ---\n";
$searchPaths = [
    '/home/ssamokxvqc/dynime.com/.env',
    '/home/ssamokxvqc/dynime-api/.env',
    '/home/ssamokxvqc/.env'
];
foreach ($searchPaths as $path) {
    if (file_exists($path)) {
        echo "Found environment file: $path (size: " . filesize($path) . " bytes)\n";
    } else {
        echo "Not found: $path\n";
    }
}

$envFile = '/home/ssamokxvqc/dynime-api/.env';

if (file_exists($envFile)) {
    echo "\nParsing .env file at: $envFile\n";
    
    // Parse it securely
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $config = [];
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2) + [NULL, NULL];
        if ($name !== NULL) {
            $name = trim($name);
            $value = trim($value);
            // Strip wrapping quotes if present
            if ((strpos($value, '"') === 0 && strrpos($value, '"') === strlen($value) - 1) ||
                (strpos($value, "'") === 0 && strrpos($value, "'") === strlen($value) - 1)) {
                $value = substr($value, 1, -1);
            }
            $config[$name] = $value;
        }
    }
    
    echo "Parsed DB_CONNECTION: " . ($config['DB_CONNECTION'] ?? 'Not set') . "\n";
    echo "Parsed DB_HOST: " . ($config['DB_HOST'] ?? 'Not set') . "\n";
    echo "Parsed DB_DATABASE: " . ($config['DB_DATABASE'] ?? 'Not set') . "\n";
    echo "Parsed DB_USERNAME: " . ($config['DB_USERNAME'] ?? 'Not set') . "\n";
    echo "Parsed DB_PASSWORD (length): " . (isset($config['DB_PASSWORD']) ? strlen($config['DB_PASSWORD']) : 'Not set') . "\n";
    
    // Try PDO connection
    try {
        $dsn = "mysql:host=" . $config['DB_HOST'] . ";dbname=" . $config['DB_DATABASE'] . ";charset=utf8mb4";
        $pdo = new PDO($dsn, $config['DB_USERNAME'], $config['DB_PASSWORD'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        echo "Database connection via parsed config: SUCCESS!\n";
        
        // Show tables
        echo "\n=== Database Tables ===\n";
        $stmt = $pdo->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        foreach ($tables as $table) {
            $countStmt = $pdo->query("SELECT COUNT(*) FROM `$table`");
            $count = $countStmt->fetchColumn();
            echo "- $table ($count rows)\n";
        }
    } catch (Exception $e) {
        echo "Database connection ERROR: " . $e->getMessage() . "\n";
    }
} else {
    echo "ERROR: .env file DOES NOT EXIST at: $envFile\n";
}

