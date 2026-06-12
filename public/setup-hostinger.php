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
    </style>
</head>
<body>
    <h1>Hostinger Automated Setup & Diagnostics</h1>
    
    <div class="card">
        <h2>1. Path Resolution</h2>
        <?php
        $docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
        $homeDir = dirname($docRoot);
        echo "<p>Document Root: <code>$docRoot</code></p>";
        echo "<p>Detected Home Directory: <code>$homeDir</code></p>";
        
        $apiDir = $homeDir . '/dynime-api';
        $apiPublicDir = $apiDir . '/public';
        $apiSymlink = $docRoot . '/api';
        
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
            if (symlink($apiPublicDir, $apiSymlink)) {
                echo "<p class='success'>Success: Symlink successfully created! requests to /api/ will route to dynime-api/public.</p>";
            } else {
                echo "<p class='error'>Error: Failed to create symlink. Check directory permissions.</p>";
            }
        } else {
            echo '<p><a href="?token=' . $deployToken . '&action=symlink" class="btn">Recreate API Symlink</a></p>';
        }
        ?>
    </div>

    <div class="card">
        <h2>3. Database Connection Test</h2>
        <?php
        $envPath = $apiDir . '/.env';
        if (!file_exists($envPath)) {
            echo "<p class='error'>Error: .env file not found at <code>$envPath</code></p>";
        } else {
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

            echo "<ul>";
            echo "<li>Host: <code>$db_host:$db_port</code></li>";
            echo "<li>Database: <code>$db_database</code></li>";
            echo "<li>User: <code>$db_username</code></li>";
            echo "<li>Password configured: " . (!empty($db_password) ? "<span class='success'>Yes</span>" : "<span class='error'>No</span>") . "</li>";
            echo "</ul>";

            try {
                $dsn = "mysql:host=$db_host;port=$db_port;dbname=$db_database;charset=utf8mb4";
                $pdo = new PDO($dsn, $db_username, $db_password, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]);
                echo "<p class='success'>Successfully connected to the database!</p>";

                // Show tables
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
        }
        ?>
    </div>

    <div class="card">
        <h2>4. Run Database Migrations & Seeds</h2>
        <p>This runs Laravel's artisan command to migrate and seed the database.</p>
        <?php
        if (isset($_GET['action']) && $_GET['action'] === 'migrate') {
            echo "<pre>";
            // Move to artisan directory and run migrate
            $command = "cd " . escapeshellarg($apiDir) . " && php artisan migrate --force 2>&1";
            echo "Running: $command\n\n";
            $output = shell_exec($command);
            echo htmlspecialchars($output);
            
            // Also seed if requested
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
