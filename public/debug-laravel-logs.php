<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once dirname(__DIR__) . '/dynime-api/vendor/autoload.php';
$app = require_once dirname(__DIR__) . '/dynime-api/bootstrap/app.php';

$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

try {
    echo "<h3>Direct Controller Execution...</h3>";
    $repository = $app->make(App\Repositories\Contracts\JobRepositoryInterface::class);
    $controller = new App\Http\Controllers\Api\JobController($repository);
    
    // Instantiate request and force validation using form request mock
    $request = App\Http\Requests\JobSearchRequest::create('/api/v1/jobs', 'GET');
    $request->setContainer($app);
    
    // Mock request validator manually to bypass Laravel FormRequest routing dependency
    $factory = $app->make(Illuminate\Validation\Factory::class);
    $validator = $factory->make($request->all(), $request->rules());
    $request->setValidator($validator);
    
    $response = $controller->index($request);
    echo "<b>Response Status:</b> " . $response->getStatusCode() . "<br/>";
    echo "<b>Content:</b> <pre>" . htmlspecialchars(substr($response->getContent(), 0, 1000)) . "</pre>";
} catch (\Throwable $e) {
    echo "<h3>Exception caught:</h3>";
    echo "<b>Message:</b> " . htmlspecialchars($e->getMessage()) . "<br/>";
    echo "<b>File:</b> " . htmlspecialchars($e->getFile()) . " on line " . $e->getLine() . "<br/>";
    echo "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
}
