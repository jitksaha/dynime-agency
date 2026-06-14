<?php
/**
 * Quick diagnostics: check if orders/export & orders/import routes exist on production.
 */
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied";
    exit;
}

header('Content-Type: text/plain; charset=utf-8');

$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$homeDir = dirname($docRoot);
$apiDir = $homeDir . '/dynime-api';

echo "=== Dynime API Route Diagnostics ===\n\n";
echo "API Dir: $apiDir\n";
echo "API Dir Exists: " . (is_dir($apiDir) ? 'YES' : 'NO') . "\n";

$routesFile = $apiDir . '/routes/api.php';
echo "Routes File: $routesFile\n";
echo "Routes File Exists: " . (file_exists($routesFile) ? 'YES' : 'NO') . "\n\n";

$apiFolder = $docRoot . '/api';
echo "=== Checking /api Folder and Router Wrapper ===\n";
echo "/api Folder Path: $apiFolder\n";
echo "/api Exists: " . (file_exists($apiFolder) ? 'YES' : 'NO') . "\n";
echo "/api is Link: " . (is_link($apiFolder) ? 'YES' : 'NO') . "\n";
if (is_link($apiFolder)) {
    echo "/api Target: " . readlink($apiFolder) . "\n";
}
$apiIndex = $apiFolder . '/index.php';
echo "/api/index.php Exists: " . (file_exists($apiIndex) ? 'YES' : 'NO') . "\n";
if (file_exists($apiIndex)) {
    echo "--- /api/index.php Contents ---\n";
    echo file_get_contents($apiIndex) . "\n";
    echo "---------------------------------\n";
}
$apiHtaccess = $apiFolder . '/.htaccess';
echo "/api/.htaccess Exists: " . (file_exists($apiHtaccess) ? 'YES' : 'NO') . "\n";
if (file_exists($apiHtaccess)) {
    echo "--- /api/.htaccess Contents ---\n";
    echo file_get_contents($apiHtaccess) . "\n";
    echo "---------------------------------\n";
}
echo "\n";

if (file_exists($routesFile)) {
    $content = file_get_contents($routesFile);
    
    echo "=== Checking for export/import routes ===\n";
    echo "Contains 'orders/export': " . (strpos($content, "orders/export") !== false ? 'YES' : 'NO') . "\n";
    echo "Contains 'orders/import': " . (strpos($content, "orders/import") !== false ? 'YES' : 'NO') . "\n";
    echo "Contains 'adminExport': " . (strpos($content, "adminExport") !== false ? 'YES' : 'NO') . "\n";
    echo "Contains 'adminImport': " . (strpos($content, "adminImport") !== false ? 'YES' : 'NO') . "\n\n";
    
    echo "=== Checking OrdersController ===\n";
    $controllerFile = $apiDir . '/app/Http/Controllers/Api/OrdersController.php';
    echo "Controller Exists: " . (file_exists($controllerFile) ? 'YES' : 'NO') . "\n";
    if (file_exists($controllerFile)) {
        $controllerContent = file_get_contents($controllerFile);
        echo "Contains 'adminExport': " . (strpos($controllerContent, "function adminExport") !== false ? 'YES' : 'NO') . "\n";
        echo "Contains 'adminImport': " . (strpos($controllerContent, "function adminImport") !== false ? 'YES' : 'NO') . "\n";
    }
    
    echo "\n=== Route File Snippet (lines with 'orders') ===\n";
    $lines = explode("\n", $content);
    foreach ($lines as $i => $line) {
        if (stripos($line, 'orders') !== false) {
            echo "L" . ($i+1) . ": " . trim($line) . "\n";
        }
    }
    
    echo "\n=== Checking cached routes ===\n";
    $cachedRoutes = $apiDir . '/bootstrap/cache/routes-v7.php';
    echo "Cached routes file exists: " . (file_exists($cachedRoutes) ? 'YES' : 'NO') . "\n";
    
    // Check all bootstrap/cache files
    $cacheDir = $apiDir . '/bootstrap/cache/';
    if (is_dir($cacheDir)) {
        echo "Cache directory files:\n";
        foreach (scandir($cacheDir) as $f) {
            if ($f === '.' || $f === '..') continue;
            echo "  $f (" . filesize($cacheDir . $f) . " bytes, modified: " . date('Y-m-d H:i:s', filemtime($cacheDir . $f)) . ")\n";
        }
    }
    
    echo "\n=== Boot Laravel and list routes ===\n";
    try {
        require $apiDir . '/vendor/autoload.php';
        $app = require_once $apiDir . '/bootstrap/app.php';
        $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
        $kernel->bootstrap();
        
        $router = $app->make('router');
        $routes = $router->getRoutes();
        
        echo "Total registered routes: " . count($routes) . "\n\n";
        echo "Order-related routes:\n";
        foreach ($routes as $route) {
            $uri = $route->uri();
            if (stripos($uri, 'order') !== false) {
                $methods = implode('|', $route->methods());
                echo "  $methods $uri\n";
            }
        }
    } catch (Exception $e) {
        echo "ERROR: " . $e->getMessage() . "\n";
    }
}
