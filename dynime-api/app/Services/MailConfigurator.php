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
        // Retrieve settings from database (always use general SMTP config to keep configuration in one place)
        $host = SiteSetting::get("smtp_host");
        $port = SiteSetting::get("smtp_port");
        $username = SiteSetting::get("smtp_username");
        $password = SiteSetting::get("smtp_password");
        $encryption = SiteSetting::get("smtp_encryption");
        $fromAddress = SiteSetting::get("smtp_from_address");
        $fromName = SiteSetting::get("smtp_from_name");

        // If even general is empty, fallback to .env configuration
        $host = $host ?: env('MAIL_HOST', '127.0.0.1');
        $port = $port ?: env('MAIL_PORT', 587);
        $username = $username ?: env('MAIL_USERNAME');
        $password = $password ?: env('MAIL_PASSWORD');
        $encryption = $encryption ?: env('MAIL_ENCRYPTION', 'tls');
        $fromAddress = $fromAddress ?: env('MAIL_FROM_ADDRESS', 'contact@dynime.com');
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
