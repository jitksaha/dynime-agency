<?php

namespace App\Services;

use App\Models\SiteSetting;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class MailConfigurator
{
    /**
     * Configure Laravel's mailer at runtime using settings from the database.
     *
     * @param string $type The SMTP configuration context ('general', 'careers', or 'orders')
     * @return void
     */
    public static function configure(string $type = 'general'): void
    {
        $prefix = '';
        if ($type === 'careers') {
            $prefix = 'careers_';
        } elseif ($type === 'orders') {
            $prefix = 'orders_';
        }

        // Retrieve settings from database
        $host = SiteSetting::get("smtp_{$prefix}host");
        $port = SiteSetting::get("smtp_{$prefix}port");
        $username = SiteSetting::get("smtp_{$prefix}username");
        $password = SiteSetting::get("smtp_{$prefix}password");
        $encryption = SiteSetting::get("smtp_{$prefix}encryption");
        $fromAddress = SiteSetting::get("smtp_{$prefix}from_address");
        $fromName = SiteSetting::get("smtp_{$prefix}from_name");

        // Fallback to general settings if specific ones are empty
        if ($type !== 'general' && (empty($host) || empty($username) || empty($password))) {
            $host = $host ?: SiteSetting::get('smtp_host');
            $port = $port ?: SiteSetting::get('smtp_port');
            $username = $username ?: SiteSetting::get('smtp_username');
            $password = $password ?: SiteSetting::get('smtp_password');
            $encryption = $encryption ?: SiteSetting::get('smtp_encryption');
            $fromAddress = $fromAddress ?: SiteSetting::get("smtp_{$prefix}from_address") ?: SiteSetting::get('smtp_from_address');
            $fromName = $fromName ?: SiteSetting::get("smtp_{$prefix}from_name") ?: SiteSetting::get('smtp_from_name');
        }

        // If even general is empty, fallback to .env configuration
        $host = $host ?: env('MAIL_HOST', '127.0.0.1');
        $port = $port ?: env('MAIL_PORT', 587);
        $username = $username ?: env('MAIL_USERNAME');
        $password = $password ?: env('MAIL_PASSWORD');
        $encryption = $encryption ?: env('MAIL_ENCRYPTION', 'tls');
        $fromAddress = $fromAddress ?: env('MAIL_FROM_ADDRESS', 'hello@dynime.com');
        $fromName = $fromName ?: env('MAIL_FROM_NAME', 'Dynime');

        $driver = 'smtp';
        // If the default driver is log and no host is configured in DB, we can use log driver
        if (env('MAIL_MAILER') === 'log' && empty(SiteSetting::get('smtp_host'))) {
            $driver = 'log';
        }

        // Dynamically update config for the 'dynamic' mailer
        config([
            'mail.mailers.dynamic' => [
                'transport' => $driver,
                'host' => $host,
                'port' => (int) $port,
                'encryption' => ($encryption === 'none' || !$encryption) ? null : $encryption,
                'username' => $username,
                'password' => $password,
                'timeout' => null,
            ],
            'mail.default' => 'dynamic',
            'mail.from.address' => $fromAddress,
            'mail.from.name' => $fromName,
        ]);
        
        // Forget resolved mailer instances so it gets resolved fresh with new config
        Mail::forgetMailers();
    }
}
