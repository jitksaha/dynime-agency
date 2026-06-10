<?php
/**
 * Diagnostic tool to reset admin password securely
 */

$envFile = '/home/ssamokxvqc/dynime-api/.env';

header('Content-Type: text/plain; charset=utf-8');
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
        ]);
        
        $newPassword = 'Dynime123!';
        $hashed = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
        
        $stmt = $pdo->prepare("UPDATE `admin_users` SET `password` = ? WHERE `email` = ?");
        $stmt->execute([$hashed, 'mail.dynime@gmail.com']);
        
        if ($stmt->rowCount() > 0) {
            echo "SUCCESS: Password for mail.dynime@gmail.com has been reset to: $newPassword\n";
        } else {
            echo "INFO: User mail.dynime@gmail.com not found, or password was already set to this hash.\n";
        }
        
    } catch (Exception $e) {
        echo "Database error: " . $e->getMessage() . "\n";
    }
} else {
    echo "ERROR: .env file does not exist.\n";
}
