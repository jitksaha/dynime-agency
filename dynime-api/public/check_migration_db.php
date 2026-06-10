<?php

define('LARAVEL_START', microtime(true));

if (file_exists($maintenance = __DIR__.'/../storage/framework/down')) {
    require $maintenance;
}

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

header('Content-Type: text/plain');

try {
    echo "Database check:\n";
    
    $tables = ['office_locations', 'careers', 'job_applications', 'site_settings', 'employees'];
    
    foreach ($tables as $table) {
        if (\Illuminate\Support\Facades\Schema::hasTable($table)) {
            $count = DB::table($table)->count();
            echo "- Table '{$table}': {$count} rows\n";
            if ($table === 'employees') {
                $employees = DB::table('employees')->get(['id', 'full_name', 'email', 'status']);
                foreach ($employees as $emp) {
                    echo "  * Employee: {$emp->full_name} ({$emp->email}) -> Status: {$emp->status}\n";
                }
            }
            if ($table === 'site_settings') {
                $settings = DB::table('site_settings')->where('key', 'home_sections')->first();
                if ($settings) {
                    echo "  * home_sections key found in site_settings. Value length: " . strlen($settings->value) . "\n";
                } else {
                    echo "  * home_sections key NOT found in site_settings\n";
                }
            }
        } else {
            echo "- Table '{$table}': DOES NOT EXIST\n";
        }
    }
} catch (\Exception $e) {
    echo "Error checking DB: " . $e->getMessage() . "\n" . $e->getTraceAsString();
}
