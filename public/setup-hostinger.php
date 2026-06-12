<?php
/**
 * Hostinger Automated Setup and Diagnostics Tool
 * Dynamically resolves paths, configures the API symlink, tests DB, and runs migrations.
 */

$deployToken = 'deploy_token_7782';

if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied: Invalid token.";
    exit;
}

header('Content-Type: text/html; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT");

$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$homeDir = dirname($docRoot);
$apiDir = $homeDir . '/dynime-api';
$apiPublicDir = $apiDir . '/public';
$apiSymlink = $docRoot . '/api';
$envPath = $apiDir . '/.env';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Hostinger Automated Setup & Diagnostics</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #f9fafb; color: #1f2937; }
        h1, h2, h3 { color: #111827; }
        pre { background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 8px; overflow-x: auto; font-family: monospace; }
        .card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .success { color: #059669; font-weight: bold; }
        .error { color: #dc2626; font-weight: bold; }
        .warning { color: #d97706; font-weight: bold; }
        .btn { display: inline-block; background: #635bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; border: none; cursor: pointer; }
        .btn:hover { background: #4f46e5; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; font-weight: bold; margin-bottom: 5px; }
        .form-group input { width: 100%; max-width: 400px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; box-sizing: border-box; }
    </style>
</head>
<body>
    <h1>Hostinger Automated Setup & Diagnostics</h1>
    
    <div class="card">
        <h2>1. Path Resolution</h2>
        <?php
        echo "<p>Document Root: <code>$docRoot</code></p>";
        echo "<p>Detected Home Directory: <code>$homeDir</code></p>";
        echo "<p>API Code Directory: <code>$apiDir</code> " . (is_dir($apiDir) ? "<span class='success'>[Exists]</span>" : "<span class='error'>[Missing]</span>") . "</p>";
        echo "<p>API Public Directory: <code>$apiPublicDir</code> " . (is_dir($apiPublicDir) ? "<span class='success'>[Exists]</span>" : "<span class='error'>[Missing]</span>") . "</p>";
        echo "<p>API Symlink Location: <code>$apiSymlink</code> " . (file_exists($apiSymlink) ? (is_link($apiSymlink) ? "<span class='success'>[Exists as Symlink]</span>" : "<span class='warning'>[Exists as normal file/folder]</span>") : "<span class='error'>[Missing]</span>") . "</p>";
        ?>
    </div>

    <div class="card">
        <h2>2. Configure/Recreate API Symlink</h2>
        <?php
        if (isset($_GET['action']) && $_GET['action'] === 'symlink') {
            if (is_link($apiSymlink)) {
                unlink($apiSymlink);
            } elseif (file_exists($apiSymlink)) {
                if (is_dir($apiSymlink)) {
                    rename($apiSymlink, $apiSymlink . '_bak_' . time());
                } else {
                    unlink($apiSymlink);
                }
            }
            
            // Try creating symlink
            if (symlink($apiPublicDir, $apiSymlink)) {
                echo "<p class='success'>Success: Symlink successfully created! requests to /api/ will route to dynime-api/public.</p>";
            } else {
                echo "<p class='error'>Error: Failed to create symlink. If symlinks are disabled by Hostinger, we will try using an index.php wrapper instead.</p>";
                
                // Fallback logic: create public_html/api directory and place custom index.php pointing to dynime-api/public/index.php
                if (!is_dir($apiSymlink)) {
                    mkdir($apiSymlink, 0755, true);
                }
                $fallbackIndex = $apiSymlink . '/index.php';
                $indexCode = "<?php\n// Fallback router for environments where symlinks are disabled\ndefine('LARAVEL_START', microtime(true));\nrequire '" . $apiDir . "/vendor/autoload.php';\n\$app = require_once '" . $apiDir . "/bootstrap/app.php';\n\$kernel = \$app->make(Illuminate\Contracts\Http\Kernel::class);\n\$response = \$kernel->handle(\n    \$request = Illuminate\Http\Request::capture()\n)->send();\n\$kernel->terminate(\$request, \$response);\n";
                if (file_put_contents($fallbackIndex, $indexCode) !== false) {
                    echo "<p class='success'>Success: Created physical folder /api/ with index.php routing wrapper! Requests to /api/ will work correctly.</p>";
                } else {
                    echo "<p class='error'>Error: Failed to write fallback index.php router wrapper.</p>";
                }
            }
        } else {
            echo '<p><a href="?token=' . $deployToken . '&action=symlink" class="btn">Configure API Access (Symlink or Wrapper)</a></p>';
        }
        ?>
    </div>

    <div class="card">
        <h2>3. Database Configuration (.env)</h2>
        <?php
        if (isset($_POST['save_env'])) {
            $db_host = $_POST['db_host'] ?? '127.0.0.1';
            $db_port = $_POST['db_port'] ?? '3306';
            $db_database = $_POST['db_database'] ?? '';
            $db_username = $_POST['db_username'] ?? '';
            $db_password = $_POST['db_password'] ?? '';
            
            $templatePath = $apiDir . '/.env.example';
            $envContent = '';
            if (file_exists($templatePath)) {
                $envContent = file_get_contents($templatePath);
                $envContent = str_replace('DB_HOST=127.0.0.1', 'DB_HOST=' . $db_host, $envContent);
                $envContent = str_replace('DB_PORT=3306', 'DB_PORT=' . $db_port, $envContent);
                $envContent = str_replace('DB_DATABASE=dynime_db', 'DB_DATABASE=' . $db_database, $envContent);
                $envContent = str_replace('DB_USERNAME=dynime_user', 'DB_USERNAME=' . $db_username, $envContent);
                $envContent = str_replace('DB_PASSWORD=', 'DB_PASSWORD=' . $db_password, $envContent);
                
                // APP_KEY generation if empty
                if (strpos($envContent, 'APP_KEY=') !== false && (trim(explode("\n", explode('APP_KEY=', $envContent)[1])[0]) === '')) {
                    $appKey = 'base64:' . base64_encode(random_bytes(32));
                    $envContent = str_replace('APP_KEY=', 'APP_KEY=' . $appKey, $envContent);
                }
            } else {
                $appKey = 'base64:' . base64_encode(random_bytes(32));
                $envContent = "APP_NAME=\"Dynime API\"\nAPP_ENV=production\nAPP_KEY=$appKey\nAPP_DEBUG=false\nAPP_URL=https://dynime.com/api\nFRONTEND_URL=https://dynime.com\n\nDB_CONNECTION=mysql\nDB_HOST=$db_host\nDB_PORT=$db_port\nDB_DATABASE=$db_database\nDB_USERNAME=$db_username\nDB_PASSWORD=$db_password\n\nCACHE_STORE=file\nSESSION_DRIVER=file\nSESSION_LIFETIME=120\nSESSION_SECURE_COOKIE=true\nQUEUE_CONNECTION=database\n\nMAIL_MAILER=smtp\nMAIL_HOST=smtp.hostinger.com\nMAIL_PORT=587\nMAIL_USERNAME=contact@dynime.com\nMAIL_PASSWORD=\nMAIL_ENCRYPTION=tls\nMAIL_FROM_ADDRESS=contact@dynime.com\nMAIL_FROM_NAME=\"Dynime\"\n\nFILESYSTEM_DISK=public\n";
            }
            
            if (file_put_contents($envPath, $envContent) !== false) {
                echo "<p class='success'>Success: .env file created/updated successfully!</p>";
            } else {
                echo "<p class='error'>Error: Failed to write to <code>$envPath</code>. Check directory permissions.</p>";
            }
        }

        // Test existing connection
        if (file_exists($envPath)) {
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

            echo "<h3>Current Database Config:</h3>";
            echo "<ul>";
            echo "<li>Host: <code>$db_host:$db_port</code></li>";
            echo "<li>Database: <code>$db_database</code></li>";
            echo "<li>User: <code>$db_username</code></li>";
            echo "<li>Password: " . (!empty($db_password) ? "<span class='success'>Configured</span>" : "<span class='error'>Not Configured</span>") . "</li>";
            echo "</ul>";

            try {
                $dsn = "mysql:host=$db_host;port=$db_port;dbname=$db_database;charset=utf8mb4";
                $pdo = new PDO($dsn, $db_username, $db_password, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]);
                echo "<p class='success'>Successfully connected to the database!</p>";

                $stmt = $pdo->query("SHOW TABLES");
                $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
                echo "<p>Total Tables Found: " . count($tables) . "</p>";

                if (in_array('users', $tables)) {
                    $userCount = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
                    echo "<p>Users in database: <strong>$userCount</strong></p>";
                    if ($userCount > 0) {
                        $users = $pdo->query("SELECT email, role FROM users LIMIT 5")->fetchAll();
                        echo "<ul>";
                        foreach ($users as $u) {
                            echo "<li><code>{$u['email']}</code> (Role: <code>{$u['role']}</code>)</li>";
                        }
                        echo "</ul>";
                    }
                } else {
                    echo "<p class='warning'>Warning: 'users' table does not exist. Database needs migration.</p>";
                }
            } catch (PDOException $e) {
                echo "<p class='error'>Database connection failed: " . $e->getMessage() . "</p>";
            }
        } else {
            echo "<p class='warning'>No .env file found. Use the form below to create one.</p>";
        }
        ?>

        <h3>Setup/Update Database Configuration</h3>
        <form method="post" action="?token=<?php echo $deployToken; ?>">
            <div class="form-group">
                <label>Database Host:</label>
                <input type="text" name="db_host" value="<?php echo htmlspecialchars($db_host ?? '127.0.0.1'); ?>" required>
            </div>
            <div class="form-group">
                <label>Database Port:</label>
                <input type="text" name="db_port" value="<?php echo htmlspecialchars($db_port ?? '3306'); ?>" required>
            </div>
            <div class="form-group">
                <label>Database Name:</label>
                <input type="text" name="db_database" value="<?php echo htmlspecialchars($db_database ?? ''); ?>" required placeholder="e.g. u740731947_dynime">
            </div>
            <div class="form-group">
                <label>Database Username:</label>
                <input type="text" name="db_username" value="<?php echo htmlspecialchars($db_username ?? ''); ?>" required placeholder="e.g. u740731947_user">
            </div>
            <div class="form-group">
                <label>Database Password:</label>
                <input type="password" name="db_password" value="<?php echo htmlspecialchars($db_password ?? ''); ?>" required>
            </div>
            <button type="submit" name="save_env" class="btn">Save & Create .env File</button>
        </form>
    </div>

    <div class="card">
        <h2>4. Run Database Migrations & Seeds</h2>
        <p>This runs Laravel's artisan command to migrate and seed the database.</p>
        <?php
        if (isset($_GET['action']) && $_GET['action'] === 'migrate') {
            echo "<pre>";
            $command = "cd " . escapeshellarg($apiDir) . " && php artisan migrate --force 2>&1";
            echo "Running: $command\n\n";
            $output = shell_exec($command);
            echo htmlspecialchars($output);
            
            if (isset($_GET['seed']) && $_GET['seed'] === 'true') {
                $commandSeed = "cd " . escapeshellarg($apiDir) . " && php artisan db:seed --force 2>&1";
                echo "\nRunning: $commandSeed\n\n";
                $outputSeed = shell_exec($commandSeed);
                echo htmlspecialchars($outputSeed);
            }
            echo "</pre>";
        } else {
            echo '<p>';
            echo '<a href="?token=' . $deployToken . '&action=migrate" class="btn" style="margin-right:10px;">Run Migrations Only</a>';
            echo '<a href="?token=' . $deployToken . '&action=migrate&seed=true" class="btn" style="background:#059669;">Run Migrations + Seed</a>';
            echo '</p>';
        }
        ?>
    </div>
</body>
</html>
