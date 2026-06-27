<?php

namespace App\Http\Controllers\Api\Settings;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use App\Models\FlexpaySetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SettingsController extends Controller
{
    public function publicIndex(): JsonResponse
    {
        // Short TTL (30s) so admin changes propagate quickly to visitors.
        // Cache is also explicitly cleared in upsert/bulkUpsert/destroy.
        $settings = Cache::remember('site_settings_public', 30, fn() =>
            SiteSetting::where('is_public', true)
                ->orWhereIn('key', [
                    'stripe_enabled',
                    'stripe_sandbox',
                    'stripe_publishable_key',
                    'stripe_test_publishable_key',
                    'stripe_currency',
                    'keeal_enabled',
                    'keeal_sandbox',
                    'keeal_currency',
                    'gateway_order',
                    // Auto-switcher toggles — must always be public so visitors
                    // see the correct geo-detect behaviour without needing auth
                    'auto_currency_switcher_enabled',
                    'auto_language_switcher_enabled',
                ])
                ->orWhere('key', 'like', '%_enabled')
                ->orWhere('key', 'like', 'gateway_%')
                ->orWhere('key', 'like', 'site_%')
                ->get()
                ->keyBy('key')
                ->map(fn($s) => $s->value)
                ->toArray()
        );
        return response()->json($settings);
    }

    /**
     * Public settings as an array of {key, value} objects — the format
     * that the frontend useSiteSettings() hook expects.
     * No auth required. Short-lived cache so admin changes propagate fast.
     */
    public function publicIndexArray(): JsonResponse
    {
        $map = Cache::remember('site_settings_public', 30, fn() =>
            SiteSetting::where('is_public', true)
                ->orWhereIn('key', [
                    'auto_currency_switcher_enabled',
                    'auto_language_switcher_enabled',
                    'maintenance_mode',
                    'default_theme',
                    'live_chat_enabled',
                ])
                ->orWhere('key', 'like', '%_enabled')
                ->orWhere('key', 'like', 'gateway_%')
                ->orWhere('key', 'like', 'site_%')
                ->orWhere('key', 'like', 'social_%')
                ->get()
                ->keyBy('key')
                ->map(fn($s) => $s->value)
                ->toArray()
        );

        // Convert flat map to [{key, value}] array so the CMS mapper can handle it
        $rows = collect($map)->map(fn($v, $k) => ['key' => $k, 'value' => $v])->values();
        return response()->json($rows);
    }

    public function syncDbMismatch(Request $request): JsonResponse
    {
        $deployToken = 'deploy_token_7782';
        if ($request->query('token') !== $deployToken) {
            return response()->json(['message' => 'Access Denied'], 403);
        }

        $log = [];
        try {
            \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS = 0;');
            
            // Sync pricing tables
            if (\Schema::hasTable('usa_state_pricing') && \Schema::hasTable('usa_state_pricings')) {
                \DB::table('usa_state_pricings')->truncate();
                $count = \DB::statement("
                    INSERT INTO `usa_state_pricings` (
                        id, state, abbr, llc_formation, corp_formation, llc_annual, llc_annual_label, 
                        corp_annual, corp_annual_label, llc_renewal, corp_renewal, state_tax_note, 
                        franchise_tax, notes, sort_order, is_active, created_at, updated_at
                    ) SELECT 
                        id, state, abbr, llc_formation, corp_formation, llc_annual, llc_annual_label, 
                        corp_annual, corp_annual_label, llc_renewal, corp_renewal, state_tax_note, 
                        franchise_tax, notes, sort_order, is_active, created_at, updated_at 
                    FROM `usa_state_pricing`
                ");
                $log[] = "usa_state_pricing synced successfully.";
            } else {
                $log[] = "usa_state_pricing sync skipped (tables missing).";
            }

            if (\Schema::hasTable('service_pricing') && \Schema::hasTable('service_pricings')) {
                \DB::table('service_pricings')->truncate();
                $count = \DB::statement("
                    INSERT INTO `service_pricings` (
                        id, service_slug, service_title, is_enabled, tiers, quote_settings, created_at, updated_at
                    ) SELECT 
                        id, service_slug, service_title, is_enabled, tiers, quote_settings, created_at, updated_at 
                    FROM `service_pricing`
                ");
                $log[] = "service_pricing synced successfully.";
            } else {
                $log[] = "service_pricing sync skipped (tables missing).";
            }

            // Seed Settings in site_settings
            $settingsToSeed = [
                [
                    'key' => 'zoho_credentials',
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
                [
                    'key' => 'google_backup_settings',
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
                [
                    'key' => 'smtp_host',
                    'value' => 'smtp.hostinger.com',
                    'group' => 'mail',
                    'label' => 'SMTP Host',
                    'is_public' => false
                ],
                [
                    'key' => 'smtp_port',
                    'value' => 465,
                    'group' => 'mail',
                    'label' => 'SMTP Port',
                    'is_public' => false
                ],
                [
                    'key' => 'smtp_username',
                    'value' => 'notifications@dynime.com',
                    'group' => 'mail',
                    'label' => 'SMTP Username',
                    'is_public' => false
                ],
                [
                    'key' => 'smtp_password',
                    'value' => 'Pixel#@!194JkS',
                    'group' => 'mail',
                    'label' => 'SMTP Password',
                    'is_public' => false
                ],
                [
                    'key' => 'smtp_encryption',
                    'value' => 'ssl',
                    'group' => 'mail',
                    'label' => 'SMTP Encryption',
                    'is_public' => false
                ],
                [
                    'key' => 'smtp_from_address',
                    'value' => 'notifications@dynime.com',
                    'group' => 'mail',
                    'label' => 'SMTP From Address',
                    'is_public' => false
                ],
                [
                    'key' => 'smtp_from_name',
                    'value' => 'Dynime',
                    'group' => 'mail',
                    'label' => 'SMTP From Name',
                    'is_public' => false
                ]
            ];

            foreach ($settingsToSeed as $setting) {
                SiteSetting::updateOrCreate(
                    ['key' => $setting['key']],
                    [
                        'value' => $setting['value'],
                        'group' => $setting['group'],
                        'label' => $setting['label'],
                        'is_public' => $setting['is_public']
                    ]
                );
                $log[] = "Seeded setting: " . $setting['key'];
            }

            \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS = 1;');
            Cache::forget('site_settings_public');

            return response()->json(['success' => true, 'log' => $log]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage(), 'log' => $log], 500);
        }
    }

    public function adminIndex(): JsonResponse
    {
        $settings = SiteSetting::orderBy('group')->orderBy('key')->get()
            ->groupBy('group')
            ->map(fn($group) => $group->keyBy('key')->map(fn($s) => $s->value));
        return response()->json($settings);
    }

    public function cmsIndex(): JsonResponse
    {
        $settings = SiteSetting::all();
        return response()->json($settings);
    }

    public function show(string $key): JsonResponse
    {
        $setting = SiteSetting::where('key', $key)->first();
        if (!$setting) {
            return response()->json(['key' => $key, 'value' => null]);
        }
        return response()->json($setting);
    }

    private function isKeyPublic(string $key): bool
    {
        return str_ends_with($key, '_enabled')
            || str_starts_with($key, 'gateway_')
            || str_starts_with($key, 'site_')
            || str_starts_with($key, 'seo_')
            || str_starts_with($key, 'social_')
            || str_starts_with($key, 'contact_')
            || in_array($key, [
                'stripe_currency',
                'stripe_sandbox',
                'stripe_publishable_key',
                'stripe_test_publishable_key',
                'keeal_currency',
                'keeal_sandbox',
                'maintenance_mode'
            ]);
    }

    public function upsert(Request $request): JsonResponse
    {
        $data = $request->validate([
            'key'       => 'required|string|max:255',
            'value'     => 'present',
            'group'     => 'nullable|string|max:100',
            'label'     => 'nullable|string|max:255',
            'is_public' => 'nullable|boolean',
        ]);

        $existing = SiteSetting::where('key', $data['key'])->first();
        $isPublic = $data['is_public'] ?? ($existing ? $existing->is_public : false);
        
        if ($this->isKeyPublic($data['key'])) {
            $isPublic = true;
        }

        $setting = SiteSetting::updateOrCreate(
            ['key' => $data['key']],
            [
                'value'     => $this->parseIncomingValue($data['value']),
                'group'     => $data['group'] ?? 'general',
                'label'     => $data['label'] ?? null,
                'is_public' => $isPublic,
            ]
        );

        Cache::forget('setting_' . $data['key']);
        Cache::forget('site_settings_public');

        return response()->json($setting);
    }

    public function bulkUpsert(Request $request): JsonResponse
    {
        $data = $request->validate([
            'settings'           => 'required|array',
            'settings.*.key'     => 'required|string|max:255',
            'settings.*.value'   => 'present',
            'settings.*.group'   => 'nullable|string|max:100',
            'settings.*.is_public' => 'nullable|boolean',
        ]);

        $updated = [];
        foreach ($data['settings'] as $item) {
            $existing = SiteSetting::where('key', $item['key'])->first();
            $isPublic = $item['is_public'] ?? ($existing ? $existing->is_public : false);
            
            if ($this->isKeyPublic($item['key'])) {
                $isPublic = true;
            }

            $setting = SiteSetting::updateOrCreate(
                ['key' => $item['key']],
                [
                    'value'     => $this->parseIncomingValue($item['value']),
                    'group'     => $item['group'] ?? 'general',
                    'is_public' => $isPublic,
                ]
            );
            Cache::forget('setting_' . $item['key']);
            $updated[] = $setting;
        }

        Cache::forget('site_settings_public');

        return response()->json([
            'message'  => 'Settings saved successfully.',
            'updated'  => count($updated),
        ]);
    }

    public function destroy(string $key): JsonResponse
    {
        SiteSetting::where('key', $key)->delete();
        Cache::forget('setting_' . $key);
        Cache::forget('site_settings_public');
        return response()->json(['message' => 'Setting deleted.']);
    }

    // ── FlexPay Settings ──────────────────────────────────────────────────

    public function getFlexpaySettings(): JsonResponse
    {
        $settings = FlexpaySetting::firstOrCreate(
            ['id' => 1],
            [
                'enabled' => true,
                'emi_enabled' => true,
                'paylater_enabled' => true,
                'credit_system_enabled' => true,
                'allowed_tenures' => [3, 6, 9, 12, 18, 24, 36],
                'paylater_terms' => [30, 60, 90],
                'processing_fee_percent' => 3.00,
                'down_payment_percent' => 0.00,
                'late_fee_amount' => 15.00,
                'min_order_amount' => 500.00,
                'max_credit_limit' => 10000.00,
                'default_currency' => 'USD',
                'kyc_provider' => 'manual',
                'auto_approval_enabled' => false,
                'auto_approval_max_limit' => 1000.00,
                'tenure_fee_tiers' => [
                    ['tenure' => 3, 'fee_percent' => 0],
                    ['tenure' => 6, 'fee_percent' => 0],
                    ['tenure' => 9, 'fee_percent' => 1],
                    ['tenure' => 12, 'fee_percent' => 1],
                    ['tenure' => 24, 'fee_percent' => 3],
                    ['tenure' => 36, 'fee_percent' => 5],
                ],
                'card_bin_prefix' => '545872',
                'card_length' => 16,
                'card_expiry_months' => 36,
                'card_cvv_length' => 3,
                'card_max_cvv_regens' => 3,
                'card_auto_issue' => true,
                'card_default_daily_limit' => 1500.00,
                'card_default_weekly_limit' => 5000.00,
                'card_default_monthly_limit' => 15000.00,
                'card_default_per_txn_limit' => 2500.00,
            ]
        );
        return response()->json($settings);
    }

    public function updateFlexpaySettings(Request $request): JsonResponse
    {
        $settings = FlexpaySetting::firstOrCreate(
            ['id' => 1],
            [
                'enabled' => true,
                'emi_enabled' => true,
                'paylater_enabled' => true,
                'credit_system_enabled' => true,
                'allowed_tenures' => [3, 6, 9, 12, 18, 24, 36],
                'paylater_terms' => [30, 60, 90],
                'processing_fee_percent' => 3.00,
                'down_payment_percent' => 0.00,
                'late_fee_amount' => 15.00,
                'min_order_amount' => 500.00,
                'max_credit_limit' => 10000.00,
                'default_currency' => 'USD',
                'kyc_provider' => 'manual',
                'auto_approval_enabled' => false,
                'auto_approval_max_limit' => 1000.00,
                'tenure_fee_tiers' => [
                    ['tenure' => 3, 'fee_percent' => 0],
                    ['tenure' => 6, 'fee_percent' => 0],
                    ['tenure' => 9, 'fee_percent' => 1],
                    ['tenure' => 12, 'fee_percent' => 1],
                    ['tenure' => 24, 'fee_percent' => 3],
                    ['tenure' => 36, 'fee_percent' => 5],
                ],
                'card_bin_prefix' => '545872',
                'card_length' => 16,
                'card_expiry_months' => 36,
                'card_cvv_length' => 3,
                'card_max_cvv_regens' => 3,
                'card_auto_issue' => true,
                'card_default_daily_limit' => 1500.00,
                'card_default_weekly_limit' => 5000.00,
                'card_default_monthly_limit' => 15000.00,
                'card_default_per_txn_limit' => 2500.00,
            ]
        );
        $data = $request->all();
        $settings->update($data);
        return response()->json($settings);
    }

    // ── Gateway Testing ───────────────────────────────────────────────────

    public function testGateway(Request $request): JsonResponse
    {
        $data = $request->validate([
            'gateway' => 'required|string',
            'credentials' => 'required|array'
        ]);

        $gateway = strtolower($data['gateway']);
        $credentials = $data['credentials'];

        switch ($gateway) {
            case 'stripe':
                $res = $this->testStripe($credentials);
                break;
            case 'keeal':
                $res = $this->testKeeal($credentials);
                break;
            case 'bkash':
                $res = $this->testBkash($credentials);
                break;
            case 'sslcommerz':
                $res = $this->testSSLCommerz($credentials);
                break;
            case 'dodopayment':
                $res = $this->testDodo($credentials);
                break;
            case 'bank_transfer':
                $res = $this->testBankTransfer($credentials);
                break;
            default:
                $res = [
                    'ok' => false,
                    'status' => 'fail',
                    'summary' => "Unknown gateway: {$data['gateway']}",
                    'latency_ms' => 0
                ];
        }

        return response()->json($res);
    }

    private function testStripe(array $c): array
    {
        $sandbox = filter_var($c['sandbox'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $secret = trim($sandbox ? ($c['test_secret_key'] ?? $c['secret_key'] ?? '') : ($c['secret_key'] ?? ''));
        $pub = trim($sandbox ? ($c['test_publishable_key'] ?? $c['publishable_key'] ?? '') : ($c['publishable_key'] ?? ''));

        $errors = [];
        if (!$secret) {
            $errors[] = 'Secret key is required';
        }
        if ($secret && !str_starts_with($secret, 'sk_')) {
            $errors[] = 'Secret key must start with sk_';
        }
        if ($pub && !str_starts_with($pub, 'pk_')) {
            $errors[] = 'Publishable key must start with pk_';
        }
        if ($errors) {
            return ['ok' => false, 'status' => 'fail', 'summary' => $errors[0], 'latency_ms' => 0];
        }

        $start = microtime(true);
        try {
            $ch = curl_init('https://api.stripe.com/v1/balance');
            curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer $secret"]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            $response = curl_exec($ch);
            $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            $ms = round((microtime(true) - $start) * 1000);
            $body = json_decode($response, true) ?? [];

            if ($status === 401) {
                return ['ok' => false, 'status' => 'fail', 'summary' => 'Stripe rejected the secret key (401 Unauthorized).', 'latency_ms' => $ms];
            }
            if ($status !== 200) {
                return ['ok' => false, 'status' => 'fail', 'summary' => "Stripe returned HTTP $status: " . ($body['error']['message'] ?? ''), 'latency_ms' => $ms];
            }

            $mode = str_contains($secret, '_live_') ? 'live' : 'test';
            return [
                'ok' => true,
                'status' => 'pass',
                'summary' => "Stripe key is valid ($mode mode).",
                'latency_ms' => $ms
            ];
        } catch (\Exception $e) {
            return ['ok' => false, 'status' => 'fail', 'summary' => 'Network error contacting Stripe: ' . $e->getMessage(), 'latency_ms' => round((microtime(true) - $start) * 1000)];
        }
    }

    private function testBkash(array $c): array
    {
        $sandbox = filter_var($c['sandbox'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $app_key = trim($sandbox ? ($c['test_app_key'] ?? $c['app_key'] ?? '') : ($c['app_key'] ?? ''));
        $app_secret = trim($sandbox ? ($c['test_app_secret'] ?? $c['app_secret'] ?? '') : ($c['app_secret'] ?? ''));
        $username = trim($sandbox ? ($c['test_username'] ?? $c['username'] ?? '') : ($c['username'] ?? ''));
        $password = trim($sandbox ? ($c['test_password'] ?? $c['password'] ?? '') : ($c['password'] ?? ''));

        if (empty($app_key) || empty($app_secret) || empty($username) || empty($password)) {
            return ['ok' => false, 'status' => 'fail', 'summary' => "Missing required credentials for " . ($sandbox ? "sandbox" : "live") . " mode.", 'latency_ms' => 0];
        }

        $base = $sandbox ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta' : 'https://tokenized.pay.bka.sh/v1.2.0-beta';

        $start = microtime(true);
        try {
            $ch = curl_init("$base/tokenized/checkout/token/grant");
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Accept: application/json',
                "username: " . $username,
                "password: " . $password
            ]);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
                'app_key' => $app_key,
                'app_secret' => $app_secret
            ]));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            $response = curl_exec($ch);
            curl_close($ch);

            $ms = round((microtime(true) - $start) * 1000);
            $body = json_decode($response, true) ?? [];

            if (empty($body['id_token'])) {
                return ['ok' => false, 'status' => 'fail', 'summary' => 'bKash rejected credentials: ' . ($body['statusMessage'] ?? 'Unknown error'), 'latency_ms' => $ms];
            }
            return ['ok' => true, 'status' => 'pass', 'summary' => 'bKash credentials valid (' . ($sandbox ? 'sandbox' : 'live') . ').', 'latency_ms' => $ms];
        } catch (\Exception $e) {
            return ['ok' => false, 'status' => 'fail', 'summary' => 'Network error contacting bKash: ' . $e->getMessage(), 'latency_ms' => round((microtime(true) - $start) * 1000)];
        }
    }

    private function testSSLCommerz(array $c): array
    {
        $sandbox = filter_var($c['sandbox'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $store_id = trim($sandbox ? ($c['test_store_id'] ?? $c['store_id'] ?? '') : ($c['store_id'] ?? ''));
        $store_passwd = trim($sandbox ? ($c['test_store_password'] ?? $c['store_password'] ?? '') : ($c['store_password'] ?? ''));

        if (!$store_id || !$store_passwd) {
            return ['ok' => false, 'status' => 'fail', 'summary' => 'Store ID and Store Password are required for ' . ($sandbox ? 'sandbox' : 'live') . ' mode.', 'latency_ms' => 0];
        }

        $url = $sandbox ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php' : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

        $start = microtime(true);
        try {
            $fields = [
                'store_id' => $store_id,
                'store_passwd' => $store_passwd,
                'total_amount' => '10.00',
                'currency' => 'BDT',
                'tran_id' => 'lov-test-' . time(),
                'success_url' => 'https://example.com/s',
                'fail_url' => 'https://example.com/f',
                'cancel_url' => 'https://example.com/c',
                'cus_name' => 'Lovable Diagnostic',
                'cus_email' => 'test@example.com',
                'cus_add1' => 'test',
                'cus_city' => 'test',
                'cus_country' => 'Bangladesh',
                'cus_phone' => '01700000000',
                'shipping_method' => 'NO',
                'product_name' => 'Diagnostic',
                'product_category' => 'Diagnostic',
                'product_profile' => 'general',
            ];

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($fields));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            $response = curl_exec($ch);
            curl_close($ch);

            $ms = round((microtime(true) - $start) * 1000);
            $body = json_decode($response, true) ?? [];

            $status = $body['status'] ?? 'FAIL';
            if ($status === 'SUCCESS' && !empty($body['sessionkey'])) {
                return ['ok' => true, 'status' => 'pass', 'summary' => 'SSLCommerz credentials valid (' . ($sandbox ? 'sandbox' : 'live') . ').', 'latency_ms' => $ms];
            }
            return ['ok' => false, 'status' => 'fail', 'summary' => 'SSLCommerz rejected credentials: ' . ($body['failedreason'] ?? $status), 'latency_ms' => $ms];
        } catch (\Exception $e) {
            return ['ok' => false, 'status' => 'fail', 'summary' => 'Network error contacting SSLCommerz: ' . $e->getMessage(), 'latency_ms' => round((microtime(true) - $start) * 1000)];
        }
    }

    private function testDodo(array $c): array
    {
        $sandbox = filter_var($c['sandbox'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $apiKey = trim($sandbox ? ($c['test_api_key'] ?? $c['api_key'] ?? '') : ($c['api_key'] ?? ''));

        if (!$apiKey) {
            return ['ok' => false, 'status' => 'fail', 'summary' => 'API key is required for ' . ($sandbox ? 'test' : 'live') . ' mode.', 'latency_ms' => 0];
        }

        $base = $sandbox ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';

        $start = microtime(true);
        try {
            $ch = curl_init("$base/products?page_size=1");
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "Authorization: Bearer $apiKey",
                "Accept: application/json"
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            $response = curl_exec($ch);
            $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            $ms = round((microtime(true) - $start) * 1000);
            $body = json_decode($response, true) ?? [];

            if ($status === 401 || $status === 403) {
                return ['ok' => false, 'status' => 'fail', 'summary' => "DodoPayments rejected the API key (HTTP $status).", 'latency_ms' => $ms];
            }
            if ($status < 200 || $status >= 300) {
                return ['ok' => false, 'status' => 'fail', 'summary' => "DodoPayments returned HTTP $status: " . ($body['message'] ?? ''), 'latency_ms' => $ms];
            }
            return ['ok' => true, 'status' => 'pass', 'summary' => 'DodoPayments API key valid (' . ($sandbox ? 'test' : 'live') . ').', 'latency_ms' => $ms];
        } catch (\Exception $e) {
            return ['ok' => false, 'status' => 'fail', 'summary' => 'Network error contacting DodoPayments: ' . $e->getMessage(), 'latency_ms' => round((microtime(true) - $start) * 1000)];
        }
    }

    private function testBankTransfer(array $c): array
    {
        $accounts = $c['accounts'] ?? [];
        if (is_string($accounts)) {
            $accounts = json_decode($accounts, true) ?? [];
        }
        if (empty($accounts)) {
            return ['ok' => false, 'status' => 'fail', 'summary' => 'Add at least one bank account so customers know where to send funds.', 'latency_ms' => 0];
        }
        foreach ($accounts as $a) {
            if (empty(trim($a['bank_name'] ?? '')) || empty(trim($a['account_name'] ?? '')) || empty(trim($a['account_number'] ?? ''))) {
                return ['ok' => false, 'status' => 'fail', 'summary' => 'Account missing bank name, holder name, or number.', 'latency_ms' => 0];
            }
        }
        return ['ok' => true, 'status' => 'pass', 'summary' => count($accounts) . ' bank account(s) configured.', 'latency_ms' => 0];
    }

    private function testKeeal(array $c): array
    {
        $sandbox = filter_var($c['sandbox'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $secret = trim($sandbox ? ($c['test_secret_key'] ?? $c['secret_key'] ?? '') : ($c['secret_key'] ?? ''));

        if (!$secret) {
            return ['ok' => false, 'status' => 'fail', 'summary' => 'Secret key is required for ' . ($sandbox ? 'test' : 'live') . ' mode.', 'latency_ms' => 0];
        }

        $start = microtime(true);
        try {
            $ch = curl_init('https://api.keeal.com/api/checkout/merchant/sessions?limit=1');
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "Authorization: Bearer $secret",
                "Accept: application/json"
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            $response = curl_exec($ch);
            $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            $ms = round((microtime(true) - $start) * 1000);
            $body = json_decode($response, true) ?? [];

            if ($status === 401 || $status === 403) {
                return ['ok' => false, 'status' => 'fail', 'summary' => 'Keeal rejected the secret key (HTTP ' . $status . '). Please verify your key is correct and active in your Keeal dashboard.', 'latency_ms' => $ms];
            }
            if ($status < 200 || $status >= 300) {
                return ['ok' => false, 'status' => 'fail', 'summary' => "Keeal returned HTTP $status: " . ($body['error']['message'] ?? $body['message'] ?? 'API connection failed'), 'latency_ms' => $ms];
            }

            return [
                'ok' => true,
                'status' => 'pass',
                'summary' => 'Keeal credentials are valid (' . ($sandbox ? 'test' : 'live') . ' mode).',
                'latency_ms' => $ms
            ];
        } catch (\Exception $e) {
            return ['ok' => false, 'status' => 'fail', 'summary' => 'Network error contacting Keeal: ' . $e->getMessage(), 'latency_ms' => round((microtime(true) - $start) * 1000)];
        }
    }

    private function parseIncomingValue($val)
    {
        if (is_string($val)) {
            $decoded = json_decode($val, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $decoded;
            }
        }
        return $val;
    }
}
