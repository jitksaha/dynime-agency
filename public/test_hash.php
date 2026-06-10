<?php
/**
 * Test Laravel Auth directly on the live server
 */

header('Content-Type: text/plain; charset=utf-8');

$bootstrap = '/home/ssamokxvqc/dynime-api/bootstrap/app.php';
$autoload = '/home/ssamokxvqc/dynime-api/vendor/autoload.php';

if (!file_exists($bootstrap) || !file_exists($autoload)) {
    echo "ERROR: Laravel bootstrap or autoload not found.\n";
    exit;
}

// Clear persistent server environment variables (like those cached in FPM process)
// to force Laravel's Dotenv to load the double-quoted password correctly.
foreach (['DB_CONNECTION', 'DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD'] as $var) {
    putenv($var);
    unset($_ENV[$var], $_SERVER[$var]);
}

require $autoload;
$app = require_once $bootstrap;


$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\AdminUser;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

echo "Laravel Bootstrapped successfully.\n";

$email = 'mail.dynime@gmail.com';
$password = 'Dynime123!';

echo "--- Raw Environment Variables ---\n";
foreach (['$_ENV' => $_ENV, '$_SERVER' => $_SERVER, 'getenv' => []] as $source => $array) {
    echo "Source: $source\n";
    if ($source === 'getenv') {
        foreach (['DB_CONNECTION', 'DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD'] as $var) {
            echo "  $var: " . getenv($var) . " (len: " . strlen(getenv($var)) . ")\n";
        }
    } else {
        foreach ($array as $key => $val) {
            if (strpos($key, 'DB_') === 0) {
                echo "  $key: " . (is_string($val) ? $val : json_encode($val)) . " (len: " . (is_string($val) ? strlen($val) : 0) . ")\n";
            }
        }
    }
}

try {
    $user = AdminUser::where('email', $email)->first();


    if ($user) {
        echo "User found in database!\n";
        echo "User ID: " . $user->id . "\n";
        echo "User Name: " . $user->name . "\n";
        echo "User Email: " . $user->email . "\n";
        echo "User Role: " . $user->role . "\n";
        echo "Is Active: " . ($user->is_active ? 'Yes' : 'No') . "\n";
        echo "DB Password Hash: " . $user->password . "\n";
        
        // Check manual verify
        $manualVerify = password_verify($password, $user->password);
        echo "password_verify check: " . ($manualVerify ? "SUCCESS" : "FAILED") . "\n";
        
        // Check Laravel Hash::check
        $hashCheck = Hash::check($password, $user->password);
        echo "Hash::check check: " . ($hashCheck ? "SUCCESS" : "FAILED") . "\n";
        
        // Test re-hashing and verifying
        $newHashed = Hash::make($password);
        echo "New generated hash: " . $newHashed . "\n";
        echo "Verifying new generated hash: " . (Hash::check($password, $newHashed) ? "SUCCESS" : "FAILED") . "\n";
        
    } else {
        echo "ERROR: User mail.dynime@gmail.com NOT found in admin_users table!\n";
    }
} catch (\Exception $e) {
    echo "EXCEPTION: " . $e->getMessage() . "\n";
    echo "TRACE:\n" . $e->getTraceAsString() . "\n";
}

// Check what connection we are using
echo "\n--- DB Configuration ---\n";
echo "DB Default Connection Name: " . DB::getDefaultConnection() . "\n";
echo "Config DB Host: " . config('database.connections.mysql.host') . "\n";
echo "Config DB Database: " . config('database.connections.mysql.database') . "\n";
echo "Config DB Username: " . config('database.connections.mysql.username') . "\n";
echo "Config DB Password Length: " . strlen(config('database.connections.mysql.password')) . "\n";
try {
    $dbName = DB::connection()->getDatabaseName();
    echo "DB Database Name in Laravel: $dbName\n";
} catch (\Exception $e) {
    echo "DB name error: " . $e->getMessage() . "\n";
}

