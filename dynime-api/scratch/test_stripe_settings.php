<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// We need to call private method loadPaymentSettings or just copy its logic
class TestLoader {
    public static function load(string $prefix): array
    {
        $rows = \DB::table('site_settings')
            ->where('key', 'like', $prefix . '_%')
            ->get();

        $settings = [];
        foreach ($rows as $row) {
            $val = $row->value;
            if (is_string($val)) {
                $decoded = json_decode($val, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $val = $decoded;
                } else {
                    $val = preg_replace('/^"|"$/', '', $val);
                }
            }
            $settings[$row->key] = is_array($val) ? $val : (string)$val;
        }

        $sandboxKey = $prefix . '_sandbox';
        $isSandbox = isset($settings[$sandboxKey]) && ($settings[$sandboxKey] === 'true' || $settings[$sandboxKey] === true || $settings[$sandboxKey] === '1' || $settings[$sandboxKey] === 1);

        if ($isSandbox) {
            foreach ($settings as $key => $val) {
                $testKey = str_replace($prefix . '_', $prefix . '_test_', $key);
                $testValRow = \DB::table('site_settings')
                    ->where('key', $testKey)
                    ->first();
                if ($testValRow) {
                    $testVal = $testValRow->value;
                    if (is_string($testVal)) {
                        $decoded = json_decode($testVal, true);
                        if (json_last_error() === JSON_ERROR_NONE) {
                            $testVal = $decoded;
                        } else {
                            $testVal = preg_replace('/^"|"$/', '', $testVal);
                        }
                    }
                    $settings[$key] = is_array($testVal) ? $testVal : (string)$testVal;
                }
            }
        }

        return $settings;
    }
}

echo "Stripe settings:\n";
print_r(TestLoader::load('stripe'));

echo "\nKeeal settings:\n";
print_r(TestLoader::load('keeal'));
