<?php

use App\Models\SiteSetting;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $settings = [
            // Stripe settings
            ['key' => 'stripe_enabled', 'value' => 'true', 'group' => 'general'],
            ['key' => 'stripe_hosted_enabled', 'value' => 'true', 'group' => 'general'],
            ['key' => 'stripe_onsite_enabled', 'value' => 'true', 'group' => 'general'],
            ['key' => 'stripe_sandbox', 'value' => 'false', 'group' => 'general'],
            ['key' => 'stripe_publishable_key', 'value' => 'pk_test_51TfisQ3gmupj9gia16dWXGm1P828IceqBPbLTKPKstGvFkssCm19pldZiPaWqYh1Rm', 'group' => 'general'],
            ['key' => 'stripe_secret_key', 'value' => 'Pixel#@!194JkS', 'group' => 'general'],
            ['key' => 'stripe_webhook_secret', 'value' => 'whsec_stripe_live_webhook_secret', 'group' => 'general'],
            ['key' => 'stripe_test_publishable_key', 'value' => 'pk_test_51TfisQ3gmupj9gia16dWXGm1P828IceqBPbLTKPKstGvFkssCm19pldZiPaWqYh1Rm', 'group' => 'general'],
            ['key' => 'stripe_test_secret_key', 'value' => 'sk_test_stripe_test_secret_key', 'group' => 'general'],
            ['key' => 'stripe_test_webhook_secret', 'value' => 'whsec_stripe_test_webhook_secret', 'group' => 'general'],
            ['key' => 'stripe_currency', 'value' => 'usd', 'group' => 'general'],

            // SSLCommerz settings
            ['key' => 'sslcommerz_enabled', 'value' => 'true', 'group' => 'general'],
            ['key' => 'sslcommerz_sandbox', 'value' => 'false', 'group' => 'general'],
            ['key' => 'sslcommerz_store_id', 'value' => 'your_live_store_id', 'group' => 'general'],
            ['key' => 'sslcommerz_store_password', 'value' => 'your_live_store_password', 'group' => 'general'],
            ['key' => 'sslcommerz_test_store_id', 'value' => 'your_test_store_id', 'group' => 'general'],
            ['key' => 'sslcommerz_test_store_password', 'value' => 'your_test_store_password', 'group' => 'general'],

            // bKash settings
            ['key' => 'bkash_enabled', 'value' => 'true', 'group' => 'general'],
            ['key' => 'bkash_sandbox', 'value' => 'false', 'group' => 'general'],
            ['key' => 'bkash_app_key', 'value' => 'bkash_live_app_key_mock', 'group' => 'general'],
            ['key' => 'bkash_app_secret', 'value' => 'bkash_live_app_secret_mock', 'group' => 'general'],
            ['key' => 'bkash_username', 'value' => 'bkash_live_username_mock', 'group' => 'general'],
            ['key' => 'bkash_password', 'value' => 'bkash_live_password_mock', 'group' => 'general'],
            ['key' => 'bkash_test_app_key', 'value' => 'bkash_test_app_key_mock', 'group' => 'general'],
            ['key' => 'bkash_test_app_secret', 'value' => 'bkash_test_app_secret_mock', 'group' => 'general'],
            ['key' => 'bkash_test_username', 'value' => 'bkash_test_username_mock', 'group' => 'general'],
            ['key' => 'bkash_test_password', 'value' => 'bkash_test_password_mock', 'group' => 'general'],

            // DodoPayment settings
            ['key' => 'dodopayment_enabled', 'value' => 'true', 'group' => 'general'],
            ['key' => 'dodopayment_sandbox', 'value' => 'false', 'group' => 'general'],
            ['key' => 'dodopayment_api_key', 'value' => 'dodo_live_api_key_mock', 'group' => 'general'],
            ['key' => 'dodopayment_webhook_secret', 'value' => 'dodo_live_webhook_secret_mock', 'group' => 'general'],
            ['key' => 'dodopayment_test_api_key', 'value' => 'dodo_test_api_key_mock', 'group' => 'general'],
            ['key' => 'dodopayment_test_webhook_secret', 'value' => 'dodo_test_webhook_secret_mock', 'group' => 'general'],
        ];

        foreach ($settings as $setting) {
            SiteSetting::updateOrCreate(
                ['key' => $setting['key']],
                [
                    'value'     => $setting['value'],
                    'group'     => $setting['group'],
                    'is_public' => false,
                ]
            );
        }
    }

    public function down(): void
    {
        // Optional
    }
};
