<?php
/**
 * Fixed API Symlink Helper for Hostinger
 * Maps dynime.com/api → dynime-api/public (Laravel)
 */

$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden'); echo "Access Denied."; exit;
}

header('Content-Type: text/html; charset=utf-8');
echo "<h2>API Symlink Setup</h2>";

$docRoot = $_SERVER['DOCUMENT_ROOT'];
$homeDir = dirname($docRoot);

// Correct paths
$target   = $docRoot . '/dynime-api/public';
$shortcut = $docRoot . '/api';

echo "<p>Document Root: <code>$docRoot</code></p>";
echo "<p>Home Dir: <code>$homeDir</code></p>";
echo "<p>API Source (dynime-api/public): <code>$target</code> — exists: " . (is_dir($target) ? '<b style="color:green">YES</b>' : '<b style="color:red">NO</b>') . "</p>";
echo "<p>Symlink target: <code>$shortcut</code> — exists: " . (file_exists($shortcut) ? 'YES' : 'NO') . "</p>";

if (!is_dir($target)) {
    echo "<p><b style='color:red'>ERROR:</b> dynime-api/public directory does not exist. Cannot create symlink.</p>";
    
    // List dynime-api contents to debug
    $apiDir = $docRoot . '/dynime-api';
    if (is_dir($apiDir)) {
        echo "<p>Contents of dynime-api/:</p><pre>";
        foreach (scandir($apiDir) as $f) {
            if ($f === '.' || $f === '..') continue;
            echo (is_dir($apiDir.'/'.$f) ? '[DIR] ' : '[FILE]') . "$f\n";
        }
        echo "</pre>";
    } else {
        echo "<p>dynime-api directory also does NOT exist.</p>";
    }
    exit;
}

if (file_exists($shortcut)) {
    if (is_link($shortcut)) {
        echo "<p>Symlink already exists. Re-creating...</p>";
        unlink($shortcut);
    } else {
        echo "<p><b style='color:red'>ERROR:</b> A non-symlink 'api' folder exists. Please rename it first.</p>";
        exit;
    }
}

if (symlink($target, $shortcut)) {
    echo "<p><b style='color:green'>✅ SUCCESS!</b> Symlink created: <code>$shortcut</code> → <code>$target</code></p>";
    echo "<p>Requests to <code>dynime.com/api/...</code> will now route to the Laravel backend.</p>";
} else {
    echo "<p><b style='color:red'>ERROR:</b> Failed to create symlink. Symlinks may not be allowed on this hosting plan.</p>";
    
    // Fallback: Create a physical api/ directory with an index.php proxy
    echo "<p>Trying fallback: creating physical api/ directory with PHP proxy...</p>";
    if (!is_dir($shortcut)) {
        mkdir($shortcut, 0755, true);
    }
    
    $proxyContent = '<?php
// Laravel API proxy — routes all /api/ requests to dynime-api/public/index.php
$laravelPublic = dirname(dirname(__FILE__)) . "/dynime-api/public";
$_SERVER["SCRIPT_FILENAME"] = $laravelPublic . "/index.php";
$_SERVER["DOCUMENT_ROOT"] = $laravelPublic;
chdir($laravelPublic);
require $laravelPublic . "/index.php";
';
    
    file_put_contents($shortcut . '/index.php', $proxyContent);
    
    // Also create .htaccess for clean URL routing within api/
    $htContent = 'Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.php [L]
';
    file_put_contents($shortcut . '/.htaccess', $htContent);
    
    echo "<p><b style='color:blue'>Fallback done:</b> Created <code>api/index.php</code> as a PHP include proxy.</p>";
}
