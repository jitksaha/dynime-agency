<?php

use App\Models\SiteSetting;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $settings = [
            ['key' => 'keeal_enabled', 'value' => 'false', 'group' => 'general', 'is_public' => true],
            ['key' => 'keeal_sandbox', 'value' => 'true', 'group' => 'general', 'is_public' => true],
            ['key' => 'keeal_secret_key', 'value' => '', 'group' => 'general', 'is_public' => false],
            ['key' => 'keeal_webhook_secret', 'value' => '', 'group' => 'general', 'is_public' => false],
            ['key' => 'keeal_test_secret_key', 'value' => '', 'group' => 'general', 'is_public' => false],
            ['key' => 'keeal_test_webhook_secret', 'value' => '', 'group' => 'general', 'is_public' => false],
            ['key' => 'keeal_currency', 'value' => 'usd', 'group' => 'general', 'is_public' => true],
            ['key' => 'gateway_label_keeal', 'value' => 'Keeal', 'group' => 'general', 'is_public' => true],
            ['key' => 'gateway_desc_keeal', 'value' => 'Pay securely via Keeal hosted checkout.', 'group' => 'general', 'is_public' => true],
        ];

        foreach ($settings as $setting) {
            SiteSetting::updateOrCreate(
                ['key' => $setting['key']],
                [
                    'value'     => $setting['value'],
                    'group'     => $setting['group'],
                    'is_public' => $setting['is_public'],
                ]
            );
        }
    }

    public function down(): void
    {
        SiteSetting::where('key', 'like', 'keeal_%')
            ->orWhereIn('key', ['gateway_label_keeal', 'gateway_desc_keeal'])
            ->delete();
    }
};
