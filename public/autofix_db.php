<?php
/**
 * Auto DB connection fixer
 */

header('Content-Type: text/plain; charset=utf-8');
echo "=== Auto Database Fixer ===\n";

$dbName = 'ssamokxvqc_dynimeagency';
$possibleUsers = [
    'ssamokxvqc_dynimeagency',
    'ssamokxvqc_admin',
    'ssamokxvqc_user',
    'ssamokxvqc_db'
];
$password = 'Pixel#@!194JkS';

$successUser = null;

foreach ($possibleUsers as $user) {
    echo "Testing User: $user ... ";
    try {
        $dsn = "mysql:host=127.0.0.1;dbname=$dbName;charset=utf8mb4";
        $pdo = new PDO($dsn, $user, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 3
        ]);
        echo "SUCCESS!\n";
        $successUser = $user;
        break;
    } catch (Exception $e) {
        echo "FAILED: " . $e->getMessage() . "\n";
    }
}

if ($successUser) {
    $envFile = '/home/ssamokxvqc/dynime-api/.env';
    
    // Build the .env file content
    $envContent = <<<EOT
APP_NAME=Dynime
APP_ENV=production
APP_KEY=base64:IHYmoIqAW8A0dIFNKufg+cBAO+b/idwKUXyeNfYRPn8=
APP_DEBUG=false
APP_URL=https://dynime.com

LOG_CHANNEL=stack
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE={$dbName}
DB_USERNAME={$successUser}
DB_PASSWORD={$password}

SESSION_DRIVER=file
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null

FILESYSTEM_DISK=public
QUEUE_CONNECTION=sync
CACHE_STORE=file

BCRYPT_ROUNDS=12
EOT;

    if (file_put_contents($envFile, $envContent) !== false) {
        chmod($envFile, 0640);
        echo "SUCCESS: .env file updated with working credentials.\n";
    } else {
        echo "ERROR: Could not write .env file to $envFile.\n";
    }
} else {
    echo "ERROR: None of the tested username/password combinations could connect to the database.\n";
}
