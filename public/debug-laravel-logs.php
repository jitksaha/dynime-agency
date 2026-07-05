<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Diagnostic test script for the 500 error on jobs endpoint
require_once dirname(__DIR__) . '/dynime-api/vendor/autoload.php';
$app = require_once dirname(__DIR__) . '/dynime-api/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$request = Illuminate\Http\Request::capture();

try {
    echo "<h3>Attempting Booting...</h3>";
    $response = $kernel->handle($request);
    echo "Boot success! Response code: " . $response->getStatusCode() . "<br/>";
} catch (\Throwable $e) {
    echo "<h3>Exception caught during boot:</h3>";
    echo "<b>Message:</b> " . htmlspecialchars($e->getMessage()) . "<br/>";
    echo "<b>File:</b> " . htmlspecialchars($e->getFile()) . " on line " . $e->getLine() . "<br/>";
    echo "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
}
