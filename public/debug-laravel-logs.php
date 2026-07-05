<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once dirname(__DIR__) . '/dynime-api/vendor/autoload.php';
$app = require_once dirname(__DIR__) . '/dynime-api/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

// Force request URI path matching to /dynime-api/public/api/v1/jobs on live system
$request = Illuminate\Http\Request::create('https://dynime.com/dynime-api/public/api/v1/jobs', 'GET');

try {
    echo "<h3>Sending Request to dynime-api/public/api/v1/jobs...</h3>";
    $response = $kernel->handle($request);
    echo "<b>Status Code:</b> " . $response->getStatusCode() . "<br/>";
    
    if ($response->getStatusCode() === 500) {
        if (method_exists($response, 'getOriginalContent') && $response->getOriginalContent() instanceof \Throwable) {
            $e = $response->getOriginalContent();
            echo "<h3>Caught Exception inside Kernel Handle:</h3>";
            echo "<b>Message:</b> " . htmlspecialchars($e->getMessage()) . "<br/>";
            echo "<b>File:</b> " . htmlspecialchars($e->getFile()) . " on line " . $e->getLine() . "<br/>";
            echo "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
        } else {
            echo "<b>Content:</b> <pre>" . htmlspecialchars($response->getContent()) . "</pre>";
        }
    } else {
        echo "<b>Content Preview:</b> <pre>" . htmlspecialchars(substr($response->getContent(), 0, 1000)) . "</pre>";
    }
} catch (\Throwable $e) {
    echo "<h3>Exception caught during execution:</h3>";
    echo "<b>Message:</b> " . htmlspecialchars($e->getMessage()) . "<br/>";
    echo "<b>File:</b> " . htmlspecialchars($e->getFile()) . " on line " . $e->getLine() . "<br/>";
    echo "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
}
