<?php
/**
 * Automated Live Environment Configuration Helper
 */

$deployToken = 'deploy_token_7782';

if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied: Invalid token.";
    exit;
}

$envFile = '/home/ssamokxvqc/dynime-api/.env';
$message = '';
$messageColor = 'black';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $dbName = $_POST['db_name'] ?? '';
    $dbUser = $_POST['db_user'] ?? '';
    $dbPass = $_POST['db_pass'] ?? '';
    
    if (empty($dbName) || empty($dbUser)) {
        $message = "Error: Database name and username cannot be empty.";
        $messageColor = 'red';
    } else {
        // Try PDO connection first to verify credentials before saving
        try {
            $dsn = "mysql:host=127.0.0.1;dbname=" . $dbName . ";charset=utf8mb4";
            $pdo = new PDO($dsn, $dbUser, $dbPass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => 5
            ]);
            
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
DB_USERNAME={$dbUser}
DB_PASSWORD={$dbPass}

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
                $message = "Success! .env file written and database connection verified successfully.";
                $messageColor = 'green';
            } else {
                $message = "Error: Could not write .env file to $envFile. Check folder permissions.";
                $messageColor = 'red';
            }
        } catch (Exception $e) {
            $message = "Database connection failed with provided credentials: " . $e->getMessage();
            $messageColor = 'red';
        }
    }
}

// Get current values if file exists
$currentDbName = 'ssamokxvqc_dynimeagency';
$currentDbUser = '';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            if (trim($name) === 'DB_DATABASE') $currentDbName = trim($value);
            if (trim($name) === 'DB_USERNAME') $currentDbUser = trim($value);
        }
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Dynime Database Configurator</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f4f5f6; padding: 40px; color: #333; }
        .card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 500px; margin: 0 auto; }
        h2 { margin-top: 0; color: #111; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; }
        input[type="text"], input[type="password"] { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        button { background: #3b82f6; color: white; border: none; padding: 12px 20px; border-radius: 4px; cursor: pointer; font-weight: 600; width: 100%; }
        button:hover { background: #2563eb; }
        .message { padding: 15px; border-radius: 4px; margin-bottom: 20px; font-weight: 500; }
    </style>
</head>
<body>
    <div class="card">
        <h2>Database Configuration</h2>
        <p>Set up the live database connection credentials for the Laravel backend.</p>
        
        <?php if ($message): ?>
            <div class="message" style="background: <?php echo $messageColor === 'green' ? '#dcfce7' : '#fee2e2'; ?>; color: <?php echo $messageColor; ?>;">
                <?php echo htmlspecialchars($message); ?>
            </div>
        <?php endif; ?>
        
        <form method="POST">
            <div class="form-group">
                <label>Database Name</label>
                <input type="text" name="db_name" value="<?php echo htmlspecialchars($currentDbName); ?>" placeholder="e.g. ssamokxvqc_dynimeagency" required />
            </div>
            
            <div class="form-group">
                <label>Database Username</label>
                <input type="text" name="db_user" value="<?php echo htmlspecialchars($currentDbUser); ?>" placeholder="e.g. ssamokxvqc_admin" required />
            </div>
            
            <div class="form-group">
                <label>Database Password</label>
                <input type="password" name="db_pass" placeholder="Enter database user password" required />
            </div>
            
            <button type="submit">Save and Connect</button>
        </form>
    </div>
</body>
</html>
