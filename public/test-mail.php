<?php
// Boot Laravel
require __DIR__ . '/../dynime-api/vendor/autoload.php';
$app = require_once __DIR__ . '/../dynime-api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    echo "Configuring mailer...<br/>";
    \App\Services\MailConfigurator::configure('careers');
    echo "Mailer configured successfully!<br/>";
    
    echo "Sending test email...<br/>";
    Illuminate\Support\Facades\Mail::raw('Test body', function ($message) {
        $message->to('contact@dynime.com')->subject('Test SMTP from Dynime');
    });
    echo "Email sent successfully!<br/>";
} catch (\Throwable $e) {
    echo "<h3>Error caught:</h3>";
    echo "Message: " . $e->getMessage() . "<br/>";
    echo "File: " . $e->getFile() . " (Line " . $e->getLine() . ")<br/>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
}
