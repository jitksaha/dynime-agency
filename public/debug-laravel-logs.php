<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once dirname(__DIR__) . '/dynime-api/vendor/autoload.php';
$app = require_once dirname(__DIR__) . '/dynime-api/bootstrap/app.php';

$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Print Laravel's loaded routes matching jobs to verify uri pattern
$routes = Route::getRoutes();
echo "<h3>Loaded Routes:</h3><ul>";
foreach ($routes as $route) {
    if (strpos($route->uri(), 'jobs') !== false || strpos($route->uri(), 'sync') !== false) {
        echo "<li>[" . implode('|', $route->methods()) . "] " . htmlspecialchars($route->uri()) . "</li>";
    }
}
echo "</ul>";
