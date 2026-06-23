<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied";
    exit;
}

header('Content-Type: application/json; charset=utf-8');

$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$homeDir = dirname($docRoot);
$apiDir = $homeDir . '/dynime-api';

try {
    if (function_exists('opcache_reset')) {
        opcache_reset();
    }
    
    require $apiDir . '/vendor/autoload.php';
    $app = require_once $apiDir . '/bootstrap/app.php';
    
    $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    
    \Illuminate\Support\Facades\Cache::flush();
    
    $tables = \Illuminate\Support\Facades\DB::select('SHOW TABLES');
    $tablesList = array_map(function($t) {
        return current((array)$t);
    }, $tables);
    
    $hasNotificationSettings = in_array('notification_settings', $tablesList);
    
    $siteSettingsCount = \Illuminate\Support\Facades\DB::table('site_settings')->count();
    
    $routingExists = \Illuminate\Support\Facades\DB::table('notification_settings')->where('key', 'email_routing')->exists();
    if ($routingExists) {
        \Illuminate\Support\Facades\DB::table('notification_settings')->where('key', 'email_routing')->update([
            'value' => json_encode([
                'general_receive' => 'contact@dynime.com',
                'general_from' => 'noreply@dynime.com',
                'general_reply_to' => 'support@dynime.com',
                'orders_receive' => 'orders@dynime.com',
                'orders_from' => 'orders@dynime.com',
                'orders_reply_to' => 'support@dynime.com',
                'jobs_receive' => 'careers@dynime.com',
                'jobs_from' => 'careers@dynime.com',
                'jobs_reply_to' => 'hr@dynime.com'
            ]),
            'updated_at' => now()
        ]);
    } else {
        \Illuminate\Support\Facades\DB::table('notification_settings')->insert([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'key' => 'email_routing',
            'value' => json_encode([
                'general_receive' => 'contact@dynime.com',
                'general_from' => 'noreply@dynime.com',
                'general_reply_to' => 'support@dynime.com',
                'orders_receive' => 'orders@dynime.com',
                'orders_from' => 'orders@dynime.com',
                'orders_reply_to' => 'support@dynime.com',
                'jobs_receive' => 'careers@dynime.com',
                'jobs_from' => 'careers@dynime.com',
                'jobs_reply_to' => 'hr@dynime.com'
            ]),
            'updated_at' => now()
        ]);
    }

    $identitiesExists = \Illuminate\Support\Facades\DB::table('notification_settings')->where('key', 'email_identities')->exists();
    if ($identitiesExists) {
        \Illuminate\Support\Facades\DB::table('notification_settings')->where('key', 'email_identities')->update([
            'value' => json_encode([
                '*' => [
                    'from_email' => 'notifications@dynime.com',
                    'from_name' => 'Dynime',
                    'reply_to' => 'support@dynime.com'
                ],
                'admin-new-submission' => [
                    'from_email' => 'notifications@dynime.com',
                    'from_name' => 'Dynime',
                    'reply_to' => 'support@dynime.com'
                ],
                'contact-confirmation' => [
                    'from_email' => 'noreply@dynime.com',
                    'from_name' => 'Dynime',
                    'reply_to' => 'support@dynime.com'
                ],
                'order-status-update' => [
                    'from_email' => 'orders@dynime.com',
                    'from_name' => 'Dynime',
                    'reply_to' => 'support@dynime.com'
                ],
                'service-renewal-reminder' => [
                    'from_email' => 'notifications@dynime.com',
                    'from_name' => 'Dynime',
                    'reply_to' => 'support@dynime.com'
                ]
            ]),
            'updated_at' => now()
        ]);
    } else {
        \Illuminate\Support\Facades\DB::table('notification_settings')->insert([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'key' => 'email_identities',
            'value' => json_encode([
                '*' => [
                    'from_email' => 'notifications@dynime.com',
                    'from_name' => 'Dynime',
                    'reply_to' => 'support@dynime.com'
                ],
                'admin-new-submission' => [
                    'from_email' => 'notifications@dynime.com',
                    'from_name' => 'Dynime',
                    'reply_to' => 'support@dynime.com'
                ],
                'contact-confirmation' => [
                    'from_email' => 'noreply@dynime.com',
                    'from_name' => 'Dynime',
                    'reply_to' => 'support@dynime.com'
                ],
                'order-status-update' => [
                    'from_email' => 'orders@dynime.com',
                    'from_name' => 'Dynime',
                    'reply_to' => 'support@dynime.com'
                ],
                'service-renewal-reminder' => [
                    'from_email' => 'notifications@dynime.com',
                    'from_name' => 'Dynime',
                    'reply_to' => 'support@dynime.com'
                ]
            ]),
            'updated_at' => now()
        ]);
    }


    $notificationSettings = \Illuminate\Support\Facades\DB::table('notification_settings')->get();
    
    echo json_encode([
        'success' => true,
        'message' => 'OPcache reset, Laravel cache flushed and database records updated successfully!',
        'notification_settings' => $notificationSettings,
    ]);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
}



