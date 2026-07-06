<?php
/**
 * Custom Admin and API Setup Utility
 */

$deployToken = 'deploy_token_7782';

if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied.";
    exit;
}

header('Content-Type: text/html; charset=utf-8');
echo "<h1>Superadmin & API Router Setup Utility</h1>";

$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$homeDir = dirname($docRoot);
$apiDir = $homeDir . '/dynime-api';
$envPath = $apiDir . '/.env';

// 1. Update .env file with quotes and Superadmin credentials
if (file_exists($envPath)) {
    echo "<p>Updating .env file with quoted database variables and Superadmin credentials...</p>";
    $envContent = file_get_contents($envPath);
    
    // Parse existing DB details to ensure we preserve them
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $db_host = '127.0.0.1';
    $db_port = '3306';
    $db_database = 'u740731947_dynime';
    $db_username = 'u740731947_dynime';
    $db_password = '';
    
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $key = trim($parts[0]);
            $val = trim(trim($parts[1]), '"\'');
            if ($key === 'DB_HOST') $db_host = $val;
            if ($key === 'DB_PORT') $db_port = $val;
            if ($key === 'DB_DATABASE') $db_database = $val;
            if ($key === 'DB_USERNAME') $db_username = $val;
            if ($key === 'DB_PASSWORD') $db_password = $val;
        }
    }
    
    // Generate fresh .env content
    $templatePath = $apiDir . '/.env.example';
    if (file_exists($templatePath)) {
        $newEnv = file_get_contents($templatePath);
        $newEnv = str_replace('DB_HOST=127.0.0.1', 'DB_HOST="' . $db_host . '"', $newEnv);
        $newEnv = str_replace('DB_PORT=3306', 'DB_PORT="' . $db_port . '"', $newEnv);
        $newEnv = str_replace('DB_DATABASE=dynime_db', 'DB_DATABASE="' . $db_database . '"', $newEnv);
        $newEnv = str_replace('DB_USERNAME=dynime_user', 'DB_USERNAME="' . $db_username . '"', $newEnv);
        $newEnv = str_replace('DB_PASSWORD=', 'DB_PASSWORD="' . $db_password . '"', $newEnv);
        
        // APP_KEY generation if empty
        if (strpos($newEnv, 'APP_KEY=') !== false && (trim(explode("\n", explode('APP_KEY=', $newEnv)[1])[0]) === '')) {
            $appKey = 'base64:' . base64_encode(random_bytes(32));
            $newEnv = str_replace('APP_KEY=', 'APP_KEY=' . $appKey, $newEnv);
        }
    } else {
        $appKey = 'base64:' . base64_encode(random_bytes(32));
        $newEnv = "APP_NAME=\"Dynime API\"\nAPP_ENV=production\nAPP_KEY=$appKey\nAPP_DEBUG=false\nAPP_URL=https://dynime.com/api\nFRONTEND_URL=https://dynime.com\n\nDB_CONNECTION=mysql\nDB_HOST=\"$db_host\"\nDB_PORT=\"$db_port\"\nDB_DATABASE=\"$db_database\"\nDB_USERNAME=\"$db_username\"\nDB_PASSWORD=\"$db_password\"\n\nCACHE_STORE=file\nSESSION_DRIVER=file\nSESSION_LIFETIME=120\nSESSION_SECURE_COOKIE=true\nQUEUE_CONNECTION=database\n\nMAIL_MAILER=smtp\nMAIL_HOST=smtp.hostinger.com\nMAIL_PORT=587\nMAIL_USERNAME=contact@dynime.com\nMAIL_PASSWORD=\nMAIL_ENCRYPTION=tls\nMAIL_FROM_ADDRESS=contact@dynime.com\nMAIL_FROM_NAME=\"Dynime\"\n\nFILESYSTEM_DISK=public\n";
    }
    
    // Add/overwrite Admin & Flowmingo details
    if (strpos($newEnv, 'ADMIN_EMAIL=') === false) {
        $newEnv .= "\nADMIN_EMAIL=\"mail.dynime@gmail.com\"\nADMIN_PASSWORD=\"Dynime123!\"\n";
    } else {
        $newEnv = preg_replace('/ADMIN_EMAIL=.*/', 'ADMIN_EMAIL="mail.dynime@gmail.com"', $newEnv);
        $newEnv = preg_replace('/ADMIN_PASSWORD=.*/', 'ADMIN_PASSWORD="Dynime123!"', $newEnv);
    }

    if (strpos($newEnv, 'FLOWMINGO_API_KEY=') === false) {
        $newEnv .= "\nFLOWMINGO_API_URL=\"https://apis.flowmingo.ai/company\"\nFLOWMINGO_API_KEY=\"fl_live_0VYl27roG.PbF9Yv7iPR8UI81o4zaSU8OaicK1qfGQgsHnIAGVAYM\"\nFLOWMINGO_API_TIMEOUT=\"10\"\nFLOWMINGO_API_RETRIES=\"3\"\nFLOWMINGO_API_RETRY_DELAY=\"100\"\nFLOWMINGO_WEBHOOK_SECRET=\"whsec_f9ff03a2fce35a5e1b7fdd3a05085e5ed23fcf4f6cd31f6577884774be80834d\"\n";
    } else {
        $newEnv = preg_replace('/FLOWMINGO_API_URL=.*/', 'FLOWMINGO_API_URL="https://apis.flowmingo.ai/company"', $newEnv);
        $newEnv = preg_replace('/FLOWMINGO_API_KEY=.*/', 'FLOWMINGO_API_KEY="fl_live_0VYl27roG.PbF9Yv7iPR8UI81o4zaSU8OaicK1qfGQgsHnIAGVAYM"', $newEnv);
    }
    
    if (file_put_contents($envPath, $newEnv) !== false) {
        echo "<p style='color:green;'>Success: Updated backend .env file with quoted credentials and Flowmingo API Key.</p>";
    } else {
        echo "<p style='color:red;'>Error: Failed to write to .env file.</p>";
    }

    // Clear stale cached configs and routes
    foreach (['config.php', 'routes-v7.php', 'services.php', 'packages.php'] as $cacheFile) {
        $fullCachePath = $apiDir . '/bootstrap/cache/' . $cacheFile;
        if (file_exists($fullCachePath)) {
            @unlink($fullCachePath);
            echo "<p>Cleared cached file: <code>$cacheFile</code></p>";
        }
    }
} else {
    echo "<p style='color:red;'>Error: .env file not found at $envPath.</p>";
}

// 2. Configure Database Record directly via PDO
try {
    $dsn = "mysql:host=$db_host;port=$db_port;dbname=$db_database;charset=utf8mb4";
    $pdo = new PDO($dsn, $db_username, $db_password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    echo "<p>Connected to database successfully. Checking admin user in database...</p>";

    // Ensure ats_jobs table has salary_period column if table exists
    $atsChk = $pdo->query("SHOW TABLES LIKE 'ats_jobs'");
    if ($atsChk->rowCount() > 0) {
        try {
            $pdo->exec("ALTER TABLE ats_jobs ADD COLUMN salary_period VARCHAR(20) NULL AFTER salary_currency");
            echo "<p style='color:green;'>Success: Added salary_period column to ats_jobs table.</p>";
        } catch (\PDOException $e) {
            // Column already exists
        }
    }

    // Ensure newsletter_subscribers table exists
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS newsletter_subscribers (
            id CHAR(36) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            source VARCHAR(100) NULL,
            status VARCHAR(50) DEFAULT 'subscribed',
            metadata JSON NULL,
            subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            unsubscribed_at TIMESTAMP NULL,
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        echo "<p style='color:green;'>Success: Ensured newsletter_subscribers table exists.</p>";
    } catch (\PDOException $e) {
        // Ignore if error
    }
    
    // Laravel uses bcrypt for default passwords
    $hashedPassword = password_hash('Dynime123!', PASSWORD_BCRYPT, ['cost' => 10]);
    
    // Check if table admin_users exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'admin_users'");
    if ($stmt->rowCount() > 0) {
        // Check if admin user exists (by email mail.dynime@gmail.com or admin@dynime.com)
        $chk = $pdo->prepare("SELECT id FROM admin_users WHERE email = 'mail.dynime@gmail.com' OR email = 'admin@dynime.com' LIMIT 1");
        $chk->execute();
        $user = $chk->fetch();
        
        if ($user) {
            $update = $pdo->prepare("UPDATE admin_users SET email = 'mail.dynime@gmail.com', password = :password, name = 'Super Admin', role = 'super_admin' WHERE id = :id");
            $update->execute([
                'password' => $hashedPassword,
                'id' => $user['id']
            ]);
            echo "<p style='color:green;'>Success: Updated existing admin user to <strong>mail.dynime@gmail.com</strong> with password <strong>Dynime123!</strong>.</p>";
        } else {
            $insert = $pdo->prepare("INSERT INTO admin_users (name, email, password, role, is_active, created_at, updated_at) VALUES ('Super Admin', 'mail.dynime@gmail.com', :password, 'super_admin', 1, NOW(), NOW())");
            $insert->execute(['password' => $hashedPassword]);
            echo "<p style='color:green;'>Success: Created new admin user <strong>mail.dynime@gmail.com</strong> with password <strong>Dynime123!</strong>.</p>";
        }
    } else {
        echo "<p style='color:red;'>Error: table <code>admin_users</code> does not exist. Please run migrations first!</p>";
    }
} catch (Exception $e) {
    echo "<p style='color:red;'>Database Error: " . $e->getMessage() . "</p>";
}

// 3. Set up the API Symlink / Router wrapper in the REAL document root
$apiSymlink = $docRoot . '/api';
$apiPublicDir = $apiDir . '/public';

echo "<p>Configuring API access in real document root (<code>$apiSymlink</code>)...</p>";

if (is_link($apiSymlink)) {
    @unlink($apiSymlink);
} elseif (file_exists($apiSymlink)) {
    if (is_dir($apiSymlink)) {
        @rename($apiSymlink, $apiSymlink . '_bak_' . time());
    } else {
        @unlink($apiSymlink);
    }
}

$symlinkCreated = false;
if (function_exists('symlink')) {
    if (@symlink($apiPublicDir, $apiSymlink)) {
        $symlinkCreated = true;
        echo "<p style='color:green;'>Success: Symlink created successfully in real document root!</p>";
    }
}

if (!$symlinkCreated) {
    echo "<p>Symlink failed/disabled. Creating routing folder wrapper instead...</p>";
    if (!is_dir($apiSymlink)) {
        mkdir($apiSymlink, 0755, true);
    }
    $fallbackIndex = $apiSymlink . '/index.php';
    $indexCode = "<?php\ndefine('LARAVEL_START', microtime(true));\nif (isset(\$_SERVER['REQUEST_URI'])) {\n    \$_SERVER['REQUEST_URI'] = preg_replace('/^\\/api/', '', \$_SERVER['REQUEST_URI']);\n}\nrequire '" . $apiDir . "/vendor/autoload.php';\n\$app = require_once '" . $apiDir . "/bootstrap/app.php';\n\$kernel = \$app->make(Illuminate\Contracts\Http\Kernel::class);\n\$response = \$kernel->handle(\n    \$request = Illuminate\Http\Request::capture()\n)->send();\n\$kernel->terminate(\$request, \$response);\n";
    
    $fallbackHtaccess = $apiSymlink . '/.htaccess';
    $htaccessCode = "<IfModule mod_rewrite.c>\n    RewriteEngine On\n    RewriteCond %{REQUEST_FILENAME} !-f\n    RewriteCond %{REQUEST_FILENAME} !-d\n    RewriteRule ^(.*)$ index.php [L,QSA]\n</IfModule>\n";
    
    if (file_put_contents($fallbackIndex, $indexCode) !== false && file_put_contents($fallbackHtaccess, $htaccessCode) !== false) {
        echo "<p style='color:green;'>Success: Created API physical folder router wrapper and .htaccess routing rules!</p>";
    } else {
        echo "<p style='color:red;'>Error: Failed to write router wrapper files.</p>";
    }
}
