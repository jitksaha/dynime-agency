<?php
// standalone diagnostic script to trace the 500 error in global name replacement

define('LARAVEL_START', microtime(true));

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $app->handle(
    Illuminate\Http\Request::capture()
);

header('Content-Type: text/plain');

try {
    echo "--- 1. Testing Database Connection ---\n";
    $dbName = \Illuminate\Support\Facades\DB::connection()->getDatabaseName();
    echo "Connected to Database: " . $dbName . "\n\n";

    echo "--- 2. Fetching Current Names ---\n";
    $rawCompany = \Illuminate\Support\Facades\DB::table('site_settings')->where('key', 'company_name')->value('value');
    echo "Raw Company Setting: " . var_export($rawCompany, true) . "\n";
    
    $rawSite = \Illuminate\Support\Facades\DB::table('site_settings')->where('key', 'site_name')->value('value');
    echo "Raw Site Setting: " . var_export($rawSite, true) . "\n\n";

    echo "--- 3. Testing Models & Columns Exist ---\n";
    
    echo "Checking Service table...\n";
    $sCount = \App\Models\Service::count();
    echo "Service count: " . $sCount . "\n";
    
    echo "Checking BlogPost table...\n";
    $bCount = \App\Models\BlogPost::count();
    echo "BlogPost count: " . $bCount . "\n";

    echo "Checking Career table...\n";
    $cCount = \App\Models\Career::count();
    echo "Career count: " . $cCount . "\n\n";

    echo "--- 4. Running a Dry-run Replacement ---\n";
    $replace = "Dynime Test LLC";
    
    // Testing the replacement helper
    $currentCompanyName = 'Dynime LLC.';
    if (!empty($rawCompany)) {
        $decoded = json_decode($rawCompany, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $currentCompanyName = is_array($decoded) ? ($decoded['value'] ?? $rawCompany) : $decoded;
        } else {
            $currentCompanyName = trim($rawCompany, '"');
        }
    }
    echo "Detected currentCompanyName: " . $currentCompanyName . "\n";

    $currentSiteName = 'Dynime';
    if (!empty($rawSite)) {
        $decoded = json_decode($rawSite, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $currentSiteName = is_array($decoded) ? ($decoded['value'] ?? $rawSite) : $decoded;
        } else {
            $currentSiteName = trim($rawSite, '"');
        }
    }
    echo "Detected currentSiteName: " . $currentSiteName . "\n";

    // Test a basic string replacement
    $subject = "Welcome to Dynime LLC. Powered by Dynime.";
    $siteReplace = preg_replace('/\s+(llc|inc|ltd|limited|corp|co\.?)\b/i', '', $replace);
    
    $out = $subject;
    if (!empty($currentCompanyName)) {
        $regexCompany = '/' . preg_quote($currentCompanyName, '/') . '/i';
        $out = preg_replace($regexCompany, $replace, $out);
    }
    if (!empty($currentSiteName)) {
        $regexSite = '/' . preg_quote($currentSiteName, '/') . '/i';
        $out = preg_replace($regexSite, $siteReplace, $out);
    }
    echo "Dry run replace output: " . $out . "\n\n";

    echo "--- DIAGNOSTIC RUN PASSED SUCCESSFULLY! ---\n";

} catch (\Throwable $e) {
    echo "\n!!! ERROR ENCOUNTERED !!!\n";
    echo "Message: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
}
