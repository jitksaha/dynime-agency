<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Models\SiteSetting;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Fix site_settings id auto-increment if missing in live database
        if (Schema::hasTable('site_settings')) {
            try {
                $type = Schema::getColumnType('site_settings', 'id');
                if ($type === 'string' || $type === 'varchar') {
                    DB::statement("ALTER TABLE `site_settings` DROP PRIMARY KEY;");
                    DB::statement("ALTER TABLE `site_settings` CHANGE `id` `old_uuid` VARCHAR(36);");
                    DB::statement("ALTER TABLE `site_settings` ADD `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY FIRST;");
                } else {
                    DB::statement("ALTER TABLE `site_settings` MODIFY `id` BIGINT UNSIGNED AUTO_INCREMENT;");
                }
            } catch (\Exception $e) {
                // Ignore if already set or fails
            }
        }

        // 1. Sync usa_state_pricing (singular) to usa_state_pricings (plural)
        if (Schema::hasTable('usa_state_pricing') && Schema::hasTable('usa_state_pricings')) {
            DB::statement("SET FOREIGN_KEY_CHECKS = 0;");
            DB::table('usa_state_pricings')->truncate();
            
            $rows = DB::table('usa_state_pricing')->get();
            foreach ($rows as $row) {
                $data = (array)$row;
                unset($data['id']); // Let database assign auto-incrementing integer ID
                DB::table('usa_state_pricings')->insert($data);
            }
            DB::statement("SET FOREIGN_KEY_CHECKS = 1;");
        }

        // 2. Sync service_pricing (singular) to service_pricings (plural)
        if (Schema::hasTable('service_pricing') && Schema::hasTable('service_pricings')) {
            DB::statement("SET FOREIGN_KEY_CHECKS = 0;");
            DB::table('service_pricings')->truncate();
            
            $rows = DB::table('service_pricing')->get();
            foreach ($rows as $row) {
                $data = (array)$row;
                unset($data['id']); // Let database assign auto-incrementing integer ID
                DB::table('service_pricings')->insert($data);
            }
            DB::statement("SET FOREIGN_KEY_CHECKS = 1;");
        }

        // 3. Seed integration configurations in site_settings
        $settings = [
            'zoho_credentials' => [
                'value' => [
                    'client_id' => '1000.RCLV4HOSRLYVRTY8JGEW2EGL0XDKJF',
                    'client_secret' => '6bfdec28600c96fcfdd50aa3b5af99d92acff2610a',
                    'refresh_token' => '1000.177f9fe634bd0faf735e8c88f9789d82.fc3a5b5dfeb0fe67982bbc36f361ec04',
                    'accounts_domain' => 'https://accounts.zoho.com',
                    'api_domain' => 'https://www.zohoapis.com'
                ],
                'group' => 'zoho',
                'label' => 'Zoho CRM Credentials',
                'is_public' => false
            ],
            'google_backup_settings' => [
                'value' => [
                    'clientId' => '',
                    'clientSecret' => '',
                    'connected' => false,
                    'email' => '',
                    'lastBackupStatus' => 'idle',
                    'lastBackupTime' => null
                ],
                'group' => 'backup',
                'label' => 'Google Backup Settings',
                'is_public' => false
            ],
            'smtp_host' => [
                'value' => 'smtp.hostinger.com',
                'group' => 'mail',
                'label' => 'SMTP Host',
                'is_public' => false
            ],
            'smtp_port' => [
                'value' => 465,
                'group' => 'mail',
                'label' => 'SMTP Port',
                'is_public' => false
            ],
            'smtp_username' => [
                'value' => 'notifications@dynime.com',
                'group' => 'mail',
                'label' => 'SMTP Username',
                'is_public' => false
            ],
            'smtp_password' => [
                'value' => 'Pixel#@!194JkS',
                'group' => 'mail',
                'label' => 'SMTP Password',
                'is_public' => false
            ],
            'smtp_encryption' => [
                'value' => 'ssl',
                'group' => 'mail',
                'label' => 'SMTP Encryption',
                'is_public' => false
            ],
            'smtp_from_address' => [
                'value' => 'notifications@dynime.com',
                'group' => 'mail',
                'label' => 'SMTP From Address',
                'is_public' => false
            ],
            'smtp_from_name' => [
                'value' => 'Dynime',
                'group' => 'mail',
                'label' => 'SMTP From Name',
                'is_public' => false
            ]
        ];

        foreach ($settings as $key => $data) {
            SiteSetting::updateOrCreate(
                ['key' => $key],
                [
                    'value' => $data['value'],
                    'group' => $data['group'],
                    'label' => $data['label'],
                    'is_public' => $data['is_public']
                ]
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No down migration required
    }
};
