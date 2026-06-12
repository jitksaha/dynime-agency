<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class OrdersController extends Controller
{
    private function loadPaymentSettings(string $prefix): array
    {
        $rows = DB::table('site_settings')
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

        // Handle sandbox vs live mode override
        $sandboxKey = $prefix . '_sandbox';
        $isSandbox = isset($settings[$sandboxKey]) && ($settings[$sandboxKey] === 'true' || $settings[$sandboxKey] === true || $settings[$sandboxKey] === '1' || $settings[$sandboxKey] === 1);

        if ($isSandbox) {
            foreach ($settings as $key => $val) {
                $testKey = str_replace($prefix . '_', $prefix . '_test_', $key);
                $testValRow = DB::table('site_settings')
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
                    if ($testVal !== null && $testVal !== '') {
                        $settings[$key] = is_array($testVal) ? $testVal : (string)$testVal;
                    }
                }
            }
        }

        return $settings;
    }

    private function fetchUsdToBdt(): float
    {
        try {
            $res = Http::timeout(5)->get('https://open.er-api.com/v6/latest/USD');
            if ($res->successful()) {
                $body = $res->json();
                $rate = (double)($body['rates']['BDT'] ?? 0);
                if ($rate > 0) {
                    return $rate;
                }
            }
        } catch (\Exception $e) {
            Log::warning('USD->BDT FX API failed: ' . $e->getMessage());
        }
        return 120.0;
    }

    private function bkashBase(bool $sandbox): string
    {
        return $sandbox
            ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
            : 'https://tokenized.pay.bka.sh/v1.2.0-beta';
    }

    private function bkashGrantToken(array $s, bool $sandbox): string
    {
        $url = $this->bkashBase($sandbox) . '/tokenized/checkout/token/grant';
        $res = Http::withHeaders([
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'username' => $s['bkash_username'] ?? '',
            'password' => $s['bkash_password'] ?? '',
        ])->post($url, [
            'app_key' => $s['bkash_app_key'] ?? '',
            'app_secret' => $s['bkash_app_secret'] ?? '',
        ]);

        if (!$res->successful()) {
            throw new \Exception('bKash token grant HTTP failed: ' . $res->status());
        }

        $data = $res->json();
        if (!isset($data['id_token'])) {
            throw new \Exception('bKash token grant failed: ' . ($data['statusMessage'] ?? $data['errorMessage'] ?? 'No id_token'));
        }

        return $data['id_token'];
    }

    private function roundMoney($val)
    {
        return round((double)$val, 2);
    }

    private function normalizeMilestoneStages(float $total, array $stages): array
    {
        $sumPct = 0;
        foreach ($stages as $s) {
            $sumPct += (double)($s['percent'] ?? 0);
        }
        if ($sumPct <= 0) return [];
        
        $allocated = 0;
        $computed = [];
        foreach ($stages as $i => $s) {
            $pct = (double)($s['percent'] ?? 0);
            $amt = $this->roundMoney(($pct / $sumPct) * $total);
            if ($i === count($stages) - 1) {
                $amt = $this->roundMoney($total - $allocated);
            }
            $allocated += $amt;
            $computed[] = [
                'label' => $s['label'] ?? 'Stage ' . ($i + 1),
                'percent' => $pct,
                'amount' => $amt,
            ];
        }
        return $computed;
    }

    private function validateCoupon(string $code, float $subtotal): array
    {
        $coupon = DB::table('coupons')
            ->where('code', trim($code))
            ->where('is_active', true)
            ->first();

        if (!$coupon) {
            return ['valid' => false, 'error' => 'Coupon not found or inactive'];
        }

        $now = now();
        if ($coupon->starts_at && $now->lt($coupon->starts_at)) {
            return ['valid' => false, 'error' => 'Coupon not active yet'];
        }
        if ($coupon->expires_at && $now->gt($coupon->expires_at)) {
            return ['valid' => false, 'error' => 'Coupon expired'];
        }

        if ($coupon->usage_limit && $coupon->usage_count >= $coupon->usage_limit) {
            return ['valid' => false, 'error' => 'Coupon usage limit reached'];
        }

        if ($coupon->min_order_amount && $subtotal < $coupon->min_order_amount) {
            return ['valid' => false, 'error' => 'Subtotal does not meet minimum requirement: $' . $coupon->min_order_amount];
        }

        $discount = 0;
        if ($coupon->discount_type === 'percentage') {
            $discount = ($coupon->discount_value / 100) * $subtotal;
        } else {
            $discount = (double)$coupon->discount_value;
        }

        if ($coupon->max_discount_amount && $discount > $coupon->max_discount_amount) {
            $discount = (double)$coupon->max_discount_amount;
        }

        $discount = min($discount, $subtotal);

        $milestoneStages = [];
        if ($coupon->is_milestone && $coupon->milestone_stages) {
            $decoded = json_decode($coupon->milestone_stages, true);
            $milestoneStages = is_array($decoded) ? $decoded : [];
        }

        return [
            'valid' => true,
            'code' => $coupon->code,
            'discount_amount' => $discount,
            'is_milestone' => (bool)$coupon->is_milestone,
            'milestone_mode' => $coupon->milestone_mode,
            'milestone_stages' => $milestoneStages,
        ];
    }

    private function redeemCoupon(string $code)
    {
        try {
            DB::table('coupons')
                ->where('code', $code)
                ->increment('usage_count');
        } catch (\Exception $e) {
            Log::error('Coupon redemption failed: ' . $e->getMessage());
        }
    }

    public function processPayment(Request $request): JsonResponse
    {
        $preGeneratedOrderId = (string)Str::uuid();
        try {
            $body = $request->all();
            $gateway = $body['gateway'] ?? null;
            $couponCode = $body['coupon_code'] ?? null;
            $customerName = $body['customer_name'] ?? null;
            $customerEmail = $body['customer_email'] ?? null;
            $items = $body['items'] ?? [];
            $total = (double)($body['total'] ?? 0);
            $chargeNow = (double)($body['charge_now'] ?? $total);
            $clientOrigin = $request->header('origin');

            $existingOrder = null;
            if (!empty($body['existing_order_id'])) {
                $existingOrder = DB::table('orders')->where('id', $body['existing_order_id'])->first();
                if (!$existingOrder) {
                    return response()->json(['message' => 'Invoice not found'], 404);
                }
                if (in_array($existingOrder->status, ['paid', 'completed', 'refunded'])) {
                    return response()->json(['message' => 'This invoice is already paid.'], 403);
                }
                $items = json_decode($existingOrder->items, true) ?: [];
                $total = (double)$existingOrder->total;
                $customerEmail = $existingOrder->customer_email;
                $customerName = $existingOrder->customer_name ?: $customerName;
                $body['items'] = $items;
                $body['total'] = $total;
                $body['customer_email'] = $customerEmail;
                $body['customer_name'] = $customerName;
                $body['currency'] = $existingOrder->currency ?: ($body['currency'] ?? 'USD');
                $body['billing_address'] = json_decode($existingOrder->billing_address, true) ?: ($body['billing_address'] ?? []);
                $body['service_brief'] = json_decode($existingOrder->service_brief, true) ?: ($body['service_brief'] ?? []);
                $body['notes'] = $existingOrder->notes ?? ($body['notes'] ?? null);
            }

            $finalOrderId = $existingOrder ? $existingOrder->id : $preGeneratedOrderId;

            if (!$gateway || !$customerEmail || empty($items) || !$total) {
                return response()->json(['message' => 'Missing required fields: gateway, customer_email, items, total'], 403);
            }

            $trustedItems = $items;
            $subtotal = $total;
            if ($existingOrder) {
                $subtotal = (double)($existingOrder->subtotal ?? $total);
            } else {
                $productIds = collect($items)->pluck('id')->filter(function($id) {
                    return is_string($id) && strlen($id) > 0;
                })->toArray();

                $priceMap = [];
                if (!empty($productIds)) {
                    $uuids = [];
                    $slugs = [];
                    foreach ($productIds as $id) {
                        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id)) {
                            $uuids[] = $id;
                        } else {
                            $slugs[] = $id;
                        }
                    }

                    $dbProducts = DB::table('products')
                        ->where('is_active', true)
                        ->where(function($query) use ($uuids, $slugs) {
                            if (!empty($uuids)) {
                                $query->orWhereIn('id', $uuids);
                            }
                            if (!empty($slugs)) {
                                $query->orWhereIn('slug', $slugs);
                            }
                        })
                        ->select('id', 'slug', 'price')
                        ->get();

                    foreach ($dbProducts as $p) {
                        $priceMap[$p->id] = (double)$p->price;
                        $priceMap[$p->slug] = (double)$p->price;
                    }
                }

                $trustedItems = array_map(function($it) use ($priceMap) {
                    $trusted = $priceMap[$it['id']] ?? null;
                    if ($trusted !== null) {
                        $it['price'] = $trusted;
                    }
                    return $it;
                }, $items);

                $subtotal = 0;
                foreach ($trustedItems as $it) {
                    $subtotal += (double)$it['price'] * (int)$it['quantity'];
                }
            }

            $discount_amount = 0;
            $applied_coupon = null;
            $milestoneStages = [];
            $milestoneMode = null;

            if ($existingOrder) {
                $discount_amount = (double)($existingOrder->discount_amount ?? 0);
                $applied_coupon = $existingOrder->coupon_code;
                $total = (double)$existingOrder->total;
            } else if ($couponCode && is_string($couponCode) && trim($couponCode)) {
                $validation = $this->validateCoupon($couponCode, $subtotal);
                if (!$validation['valid']) {
                    return response()->json(['message' => $validation['error']], 403);
                }
                $discount_amount = (double)$validation['discount_amount'];
                $applied_coupon = $validation['code'];
                $milestoneStages = $validation['milestone_stages'];
                $milestoneMode = $validation['milestone_mode'];
            }

            if (!$existingOrder) {
                $total = (double)max(0, $this->roundMoney($subtotal - $discount_amount));
            }

            $isMilestone = !empty($milestoneStages);
            $computedStages = $isMilestone ? $this->normalizeMilestoneStages($total, $milestoneStages) : [];
            if ($isMilestone && count($computedStages) < 2) {
                return response()->json(['message' => 'Milestone coupon needs at least 2 payment stages'], 403);
            }
            $chargeNow = $isMilestone ? $computedStages[0]['amount'] : $total;

            if ($isMilestone) {
                $body['items'] = [[
                    'id' => 'milestone-advance',
                    'name' => $computedStages[0]['label'] . ' (' . $computedStages[0]['percent'] . '% of $' . number_format($total, 2) . ')',
                    'price' => $chargeNow,
                    'quantity' => 1,
                ]];
            }
            $body['total'] = $chargeNow;

            $settingsGateway = ($gateway === 'stripe_onsite') ? 'stripe' : $gateway;
            $settings = $this->loadPaymentSettings($settingsGateway);
            if (($settings[$settingsGateway . '_enabled'] ?? 'false') !== 'true') {
                return response()->json(['message' => $gateway . ' is not enabled.'], 403);
            }

            $user_id = $request->user('sanctum')?->id;

            $result = [];
            if ($gateway === 'stripe') {
                $secretKey = $settings['stripe_secret_key'] ?? null;
                if (!$secretKey) {
                    throw new \Exception('Stripe credentials not configured.');
                }
                $stripeCurrency = $settings['stripe_currency'] ?? 'usd';
                $lineItems = [];
                foreach ($body['items'] as $item) {
                    $lineItems[] = [
                        'price_data' => [
                            'currency' => $stripeCurrency,
                            'product_data' => [
                                'name' => $item['name'],
                            ],
                            'unit_amount' => (int)round($item['price'] * 100),
                        ],
                        'quantity' => $item['quantity'],
                    ];
                }

                $stripeSuccessUrl = ($clientOrigin ?: 'http://localhost:5002') . '/payment/status/{CHECKOUT_SESSION_ID}';
                $stripeCancelUrl = ($clientOrigin ?: 'http://localhost:5002') . '/checkout?payment=cancelled';

                $stripeRes = Http::asForm()
                    ->withToken($secretKey)
                    ->post('https://api.stripe.com/v1/checkout/sessions', [
                        'mode' => 'payment',
                        'customer_email' => $customerEmail,
                        'success_url' => $stripeSuccessUrl,
                        'cancel_url' => $stripeCancelUrl,
                        'line_items' => $lineItems,
                    ]);

                if (!$stripeRes->successful()) {
                    throw new \Exception('Stripe error: ' . ($stripeRes->json()['error']['message'] ?? $stripeRes->body()));
                }

                $session = $stripeRes->json();
                $result = [
                    'checkout_url' => $session['url'],
                    'session_id' => $session['id'],
                    'gateway' => 'stripe',
                ];
            } else if ($gateway === 'stripe_onsite') {
                $secretKey = $settings['stripe_secret_key'] ?? null;
                if (!$secretKey) {
                    throw new \Exception('Stripe credentials not configured.');
                }
                $stripeCurrency = $settings['stripe_currency'] ?? 'usd';

                $stripeRes = Http::asForm()
                    ->withToken($secretKey)
                    ->post('https://api.stripe.com/v1/payment_intents', [
                        'amount' => (int)round($body['total'] * 100),
                        'currency' => strtolower($stripeCurrency),
                        'receipt_email' => $customerEmail,
                        'description' => 'Order ' . $finalOrderId,
                        'metadata' => [
                            'order_id' => $finalOrderId,
                        ],
                        'automatic_payment_methods' => [
                            'enabled' => 'true',
                        ],
                    ]);

                if (!$stripeRes->successful()) {
                    throw new \Exception('Stripe error: ' . ($stripeRes->json()['error']['message'] ?? $stripeRes->body()));
                }

                $pi = $stripeRes->json();
                $result = [
                    'client_secret' => $pi['client_secret'],
                    'session_id' => $pi['id'],
                    'gateway' => 'stripe_onsite',
                ];
            } else if ($gateway === 'sslcommerz') {
                $storeId = $settings['sslcommerz_store_id'] ?? null;
                $storePassword = $settings['sslcommerz_store_password'] ?? null;
                if (!$storeId || !$storePassword) {
                    throw new \Exception('SSLCommerz credentials not configured.');
                }
                $isSandbox = ($settings['sslcommerz_sandbox'] ?? 'false') === 'true';
                $baseUrl = $isSandbox
                    ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
                    : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';
                $tranId = 'TXN_' . time() . '_' . Str::random(6);
                $origin = $clientOrigin ?: 'http://localhost:5002';
                
                $sslSuccessUrl = $origin . '/api/v1/orders/public/sslcommerz-callback?status=success&origin=' . urlencode($origin);
                $sslFailUrl = $origin . '/api/v1/orders/public/sslcommerz-callback?status=fail&origin=' . urlencode($origin);
                $sslCancelUrl = $origin . '/api/v1/orders/public/sslcommerz-callback?status=cancel&origin=' . urlencode($origin);

                $sslRes = Http::asForm()->post($baseUrl, [
                    'store_id' => $storeId,
                    'store_passwd' => $storePassword,
                    'total_amount' => (string)$body['total'],
                    'currency' => 'USD',
                    'multi_card_name' => 'mastercard,visacard,amexcard',
                    'tran_id' => $tranId,
                    'success_url' => $sslSuccessUrl,
                    'fail_url' => $sslFailUrl,
                    'cancel_url' => $sslCancelUrl,
                    'cus_name' => $customerName,
                    'cus_email' => $customerEmail,
                    'cus_add1' => 'N/A',
                    'cus_city' => 'N/A',
                    'cus_country' => 'Bangladesh',
                    'cus_phone' => 'N/A',
                    'shipping_method' => 'NO',
                    'product_name' => collect($body['items'])->pluck('name')->implode(', '),
                    'product_category' => 'Digital',
                    'product_profile' => 'non-physical-goods',
                ]);

                if (!$sslRes->successful()) {
                    throw new \Exception('SSLCommerz HTTP error: ' . $sslRes->status());
                }

                $sslData = $sslRes->json();
                if (($sslData['status'] ?? '') !== 'SUCCESS') {
                    throw new \Exception('SSLCommerz error: ' . ($sslData['failedreason'] ?? json_encode($sslData)));
                }

                $result = [
                    'checkout_url' => $sslData['GatewayPageURL'],
                    'session_id' => $tranId,
                    'gateway' => 'sslcommerz',
                ];
            } else if ($gateway === 'dodopayment') {
                $apiKey = $settings['dodopayment_api_key'] ?? null;
                if (!$apiKey) {
                    throw new \Exception('DodoPayment credentials not configured.');
                }
                $isSandbox = ($settings['dodopayment_sandbox'] ?? 'false') === 'true';
                $baseUrl = $isSandbox ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';
                $currency = strtoupper($settings['dodopayment_currency'] ?? 'USD');

                $dodoFetch = function (string $path, array $payload) use ($baseUrl, $apiKey) {
                    $res = Http::withToken($apiKey)->post($baseUrl . $path, $payload);
                    if (!$res->successful()) {
                        throw new \Exception('DodoPayment error [' . $res->status() . ']: ' . $res->body());
                    }
                    return $res->json();
                };

                $productCart = [];
                foreach ($body['items'] as $item) {
                    $product = $dodoFetch('/products', [
                        'name' => substr($item['name'] ?? 'Order item', 0, 100),
                        'tax_category' => 'digital_products',
                        'price' => [
                            'currency' => $currency,
                            'price' => (int)round((double)$item['price'] * 100),
                            'discount' => 0,
                            'purchasing_power_parity' => false,
                            'type' => 'one_time_price',
                        ],
                    ]);
                    $productCart[] = [
                        'product_id' => $product['product_id'],
                        'quantity' => (int)$item['quantity'],
                    ];
                }

                $dodoReturnUrl = ($clientOrigin ?: 'http://localhost:5002') . '/payment/status/' . $preGeneratedOrderId;
                $payment = $dodoFetch('/payments', [
                    'payment_link' => true,
                    'billing' => [
                        'country' => $settings['dodopayment_default_country'] ?? 'US',
                        'city' => 'N/A',
                        'state' => 'N/A',
                        'street' => 'N/A',
                        'zipcode' => '00000',
                    ],
                    'customer' => [
                        'email' => $customerEmail,
                        'name' => $customerName ?: $customerEmail,
                    ],
                    'product_cart' => $productCart,
                    'return_url' => $dodoReturnUrl,
                ]);

                $result = [
                    'checkout_url' => $payment['payment_link'],
                    'session_id' => $payment['payment_id'],
                    'gateway' => 'dodopayment',
                ];
            } else if ($gateway === 'keeal') {
                $secretKey = $settings['keeal_secret_key'] ?? null;
                if (!$secretKey) {
                    throw new \Exception('Keeal credentials not configured.');
                }
                $keealCurrency = $settings['keeal_currency'] ?? 'usd';
                $lineItems = [];
                foreach ($body['items'] as $item) {
                    $lineItems[] = [
                        'price_data' => [
                            'currency' => strtolower($keealCurrency),
                            'product_data' => [
                                'name' => $item['name'],
                            ],
                            'unit_amount' => (int)round($item['price'] * 100),
                        ],
                        'quantity' => $item['quantity'],
                    ];
                }

                $keealSuccessUrl = ($clientOrigin ?: 'http://localhost:5002') . '/payment/status/' . $finalOrderId . '?keeal=success';
                $keealCancelUrl = ($clientOrigin ?: 'http://localhost:5002') . '/checkout?payment=cancelled';

                $keealRes = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $secretKey,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ])->post('https://api.keeal.com/v1/checkout/sessions', [
                    'mode' => 'payment',
                    'customer_email' => $customerEmail,
                    'success_url' => $keealSuccessUrl,
                    'cancel_url' => $keealCancelUrl,
                    'line_items' => $lineItems,
                    'metadata' => [
                        'order_id' => $finalOrderId,
                    ]
                ]);

                if (!$keealRes->successful()) {
                    $keealStatus = $keealRes->status();
                    if ($keealStatus === 403 || $keealStatus === 401) {
                        throw new \Exception('Keeal API key is invalid or unauthorized (HTTP ' . $keealStatus . '). Please update your Keeal secret key in Payment Gateways settings.');
                    }
                    $keealErrMsg = $keealRes->json()['error']['message'] ?? $keealRes->json()['message'] ?? $keealRes->body();
                    throw new \Exception('Keeal error (HTTP ' . $keealStatus . '): ' . $keealErrMsg);
                }

                $session = $keealRes->json();
                $result = [
                    'checkout_url' => $session['url'],
                    'session_id' => $session['id'],
                    'gateway' => 'keeal',
                ];
            } else if ($gateway === 'bkash') {
                $isSandbox = ($settings['bkash_sandbox'] ?? 'false') === 'true';
                $fxRate = $this->fetchUsdToBdt();
                $usdTotal = (double)$body['total'];
                $bdtTotal = round($usdTotal * $fxRate, 2);

                $orderId = $existingOrder ? $existingOrder->id : null;
                if (!$orderId) {
                    $orderId = $preGeneratedOrderId;
                    DB::table('orders')->insert([
                        'id' => $orderId,
                        'customer_name' => $customerName,
                        'customer_email' => $customerEmail,
                        'items' => json_encode(array_map(function($i) {
                            return ['id' => $i['id'], 'name' => $i['name'], 'price' => $i['price'], 'quantity' => $i['quantity']];
                        }, $trustedItems)),
                        'total' => $usdTotal,
                        'status' => 'pending',
                        'currency' => 'USD',
                        'notes' => trim('bKash charge: ৳' . number_format($bdtTotal, 2) . ' BDT (rate 1 USD = ' . number_format($fxRate, 4) . ' BDT). ' . ($body['notes'] ?? '')),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $token = $this->bkashGrantToken($settings, $isSandbox);
                $callbackURL = ($clientOrigin ?: 'http://localhost:5002') . '/api/v1/orders/public/bkash-callback?order=' . $orderId . '&origin=' . urlencode($clientOrigin ?: '');
                $amount = number_format($bdtTotal, 2, '.', '');

                $createRes = Http::withHeaders([
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                    'Authorization' => $token,
                    'X-APP-Key' => $settings['bkash_app_key'],
                ])->post($this->bkashBase($isSandbox) . '/tokenized/checkout/create', [
                    'mode' => '0011',
                    'payerReference' => $customerEmail,
                    'callbackURL' => $callbackURL,
                    'amount' => $amount,
                    'currency' => 'BDT',
                    'intent' => 'sale',
                    'merchantInvoiceNumber' => (string)$orderId,
                ]);

                if (!$createRes->successful()) {
                    throw new \Exception('bKash create API failed: HTTP ' . $createRes->status());
                }

                $createData = $createRes->json();
                if (!isset($createData['bkashURL']) || !isset($createData['paymentID'])) {
                    throw new \Exception('bKash payment failed: ' . ($createData['statusMessage'] ?? $createData['errorMessage'] ?? 'Unknown error'));
                }

                DB::table('orders')->where('id', $orderId)->update([
                    'stripe_session_id' => $createData['paymentID'],
                    'payment_gateway' => 'bkash',
                    'updated_at' => now(),
                ]);

                $result = [
                    'checkout_url' => $createData['bkashURL'],
                    'session_id' => (string)$orderId,
                    'payment_id' => $createData['paymentID'],
                    'gateway' => 'bkash',
                    'sandbox' => $isSandbox,
                    'fx_rate' => $fxRate,
                    'bdt_amount' => $bdtTotal,
                    'usd_amount' => $usdTotal,
                    '_skip_order_insert' => true,
                ];
            } else if ($gateway === 'bank_transfer') {
                $accounts = [];
                try {
                    $raw = $settings['bank_transfer_accounts'] ?? '[]';
                    $accounts = is_string($raw) ? json_decode($raw, true) : (is_array($raw) ? $raw : []);
                } catch (\Exception $e) {
                    $accounts = [];
                }
                if (empty($accounts)) {
                    throw new \Exception('No bank accounts configured.');
                }
                $sessionId = 'bt_' . time() . '_' . Str::random(8);
                $result = [
                    'session_id' => $sessionId,
                    'gateway' => 'bank_transfer',
                    'pending' => true,
                    'accounts' => $accounts,
                    'instructions' => $settings['bank_transfer_instructions'] ?? '',
                    'display_name' => $settings['bank_transfer_display_name'] ?? 'Bank Transfer',
                    'message' => 'Order placed. Please complete bank transfer.',
                ];
            }

            $orderTotal = $isMilestone ? $chargeNow : $total;
            $orderSubtotal = $isMilestone ? $chargeNow : $subtotal;
            $orderDiscount = $isMilestone ? 0 : $discount_amount;
            $orderItems = $isMilestone
                ? $body['items']
                : array_map(function($i) {
                    return ['id' => $i['id'], 'name' => $i['name'], 'price' => $i['price'], 'quantity' => $i['quantity']];
                }, $trustedItems);

            $milestoneServiceBrief = $isMilestone ? [
                'milestone_root' => true,
                'milestone_mode' => $milestoneMode,
                'milestone_stages' => $computedStages,
                'milestone_project_total' => $total,
                'milestone_advance_amount' => $chargeNow,
                'milestone_coupon' => $applied_coupon,
            ] : [];

            $taxFields = isset($body['tax']) && is_array($body['tax']) ? [
                'tax_amount' => (double)($body['tax']['amount'] ?? 0),
                'tax_percent' => (double)($body['tax']['percent'] ?? 0),
                'tax_mode' => $body['tax']['mode'] ?? null,
                'tax_label' => $body['tax']['label'] ?? null,
            ] : [];

            $finalOrderId = $existingOrder ? $existingOrder->id : $preGeneratedOrderId;

            if (!$existingOrder && !isset($result['_skip_order_insert'])) {
                $brief = array_merge($body['service_brief'] ?? [], $milestoneServiceBrief);
                DB::table('orders')->insert(array_merge([
                    'id' => $finalOrderId,
                    'customer_name' => $customerName,
                    'customer_email' => $customerEmail,
                    'items' => json_encode($orderItems),
                    'subtotal' => $orderSubtotal,
                    'total' => $orderTotal,
                    'status' => 'pending',
                    'stripe_session_id' => $result['session_id'] ?? null,
                    'payment_gateway' => $gateway,
                    'coupon_code' => $applied_coupon,
                    'discount_amount' => $orderDiscount,
                    'service_brief' => json_encode($brief),
                    'billing_address' => json_encode($body['billing_address'] ?? []),
                    'notes' => $body['notes'] ?? null,
                    'currency' => $body['currency'] ?? 'USD',
                    'user_id' => $user_id,
                    'referral_code' => $body['referral_code'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ], $taxFields));
            } else if ($existingOrder) {
                $patch = [
                    'payment_gateway' => $gateway,
                    'status' => 'pending',
                    'referral_code' => $body['referral_code'] ?? null,
                    'updated_at' => now(),
                ];
                if ($gateway !== 'bkash' && isset($result['session_id'])) {
                    $patch['stripe_session_id'] = $result['session_id'];
                }
                if ($user_id) {
                    $patch['user_id'] = $user_id;
                }
                DB::table('orders')->where('id', $existingOrder->id)->update($patch);
            } else if (isset($result['_skip_order_insert'])) {
                $orderId = $result['session_id'];
                $brief = array_merge($body['service_brief'] ?? [], $milestoneServiceBrief);
                DB::table('orders')->where('id', $orderId)->update(array_merge([
                    'coupon_code' => $applied_coupon,
                    'discount_amount' => $orderDiscount,
                    'total' => $orderTotal,
                    'subtotal' => $orderSubtotal,
                    'items' => json_encode($orderItems),
                    'service_brief' => json_encode($brief),
                    'billing_address' => json_encode($body['billing_address'] ?? []),
                    'notes' => $body['notes'] ?? null,
                    'currency' => $body['currency'] ?? 'USD',
                    'payment_gateway' => $gateway,
                    'user_id' => $user_id,
                    'referral_code' => $body['referral_code'] ?? null,
                    'updated_at' => now(),
                ], $taxFields));
                $finalOrderId = $orderId;
            }

            if ($isMilestone && $finalOrderId) {
                $milestoneRows = [];
                foreach ($computedStages as $i => $s) {
                    $milestoneRows[] = [
                        'id' => (string)Str::uuid(),
                        'parent_order_id' => $finalOrderId,
                        'child_order_id' => $i === 0 ? $finalOrderId : null,
                        'sequence' => $i + 1,
                        'label' => $s['label'],
                        'percent' => $s['percent'],
                        'amount' => $s['amount'],
                        'currency' => $body['currency'] ?? 'USD',
                        'status' => $i === 0 ? 'invoiced' : 'pending',
                        'invoiced_at' => $i === 0 ? now() : null,
                        'metadata' => json_encode([]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                DB::table('order_milestones')->insert($milestoneRows);
            }

            if ($applied_coupon && !$existingOrder) {
                $this->redeemCoupon($applied_coupon);
            }

            if ($customerEmail) {
                DB::table('abandoned_checkouts')
                    ->where('email', trim(strtolower($customerEmail)))
                    ->update([
                        'status' => 'completed',
                        'updated_at' => now(),
                    ]);
            }

            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('[processPayment] Error processing payment: ' . $e->getMessage());
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function handleBkashCallback(Request $request): \Illuminate\Http\RedirectResponse
    {
        $orderId = $request->query('order');
        $paymentID = $request->query('paymentID');
        $status = $request->query('status');
        $origin = $request->query('origin', 'http://localhost:5002');

        $failRedirect = $origin . '/payment/status/' . $orderId . '?bkash=fail';
        $cancelRedirect = $origin . '/payment/status/' . $orderId . '?bkash=cancel';
        $successRedirect = $origin . '/payment/status/' . $orderId . '?bkash=success';

        $recordFailure = function (string $statusStr, string $notes) use ($orderId, $paymentID) {
            if (!$orderId) return;
            try {
                DB::table('orders')->where('id', $orderId)->update([
                    'status' => $statusStr,
                    'payment_verification' => json_encode([
                        'provider' => 'bkash',
                        'paymentID' => $paymentID,
                        'verified_at' => now()->toIso8601String(),
                        'notes' => $notes,
                    ]),
                    'updated_at' => now(),
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to record bkash failure: ' . $e->getMessage());
            }
        };

        if (!$orderId || !$paymentID) {
            $recordFailure('failed', 'Missing callback parameters from bKash.');
            return redirect()->away($failRedirect . '&reason=missing_callback');
        }

        if ($status && strtolower($status) === 'cancel') {
            $recordFailure('cancelled', 'Customer cancelled bKash checkout.');
            return redirect()->away($cancelRedirect);
        }

        if ($status && strtolower($status) === 'failure') {
            $recordFailure('failed', 'bKash reported transaction failure.');
            return redirect()->away($failRedirect);
        }

        try {
            $settings = $this->loadPaymentSettings('bkash');
            $isSandbox = ($settings['bkash_sandbox'] ?? 'false') === 'true';

            $token = $this->bkashGrantToken($settings, $isSandbox);
            $res = Http::withHeaders([
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'Authorization' => $token,
                'X-APP-Key' => $settings['bkash_app_key'],
            ])->post($this->bkashBase($isSandbox) . '/tokenized/checkout/execute', [
                'paymentID' => $paymentID,
            ]);

            if (!$res->successful()) {
                throw new \Exception('bKash execute failed: HTTP ' . $res->status());
            }

            $data = $res->json();
            $transactionStatus = strtolower($data['transactionStatus'] ?? '');
            $isCompleted = $transactionStatus === 'completed';

            if (!$isCompleted) {
                DB::table('orders')->where('id', $orderId)->update([
                    'status' => 'failed',
                    'payment_verification' => json_encode([
                        'provider' => 'bkash',
                        'paymentID' => $paymentID,
                        'transactionStatus' => $transactionStatus,
                        'statusMessage' => $data['statusMessage'] ?? null,
                        'verified_at' => now()->toIso8601String(),
                        'notes' => 'bKash execute did not complete.',
                    ]),
                    'updated_at' => now(),
                ]);
                return redirect()->away($failRedirect . '&reason=execute_incomplete');
            }

            DB::table('orders')->where('id', $orderId)->update([
                'status' => 'paid',
                'payment_verification' => json_encode([
                    'provider' => 'bkash',
                    'paymentID' => $paymentID,
                    'trxID' => $data['trxID'] ?? null,
                    'amount' => $data['amount'] ?? null,
                    'merchantInvoiceNumber' => $data['merchantInvoiceNumber'] ?? null,
                    'transactionStatus' => $transactionStatus,
                    'verified_at' => now()->toIso8601String(),
                ]),
                'updated_at' => now(),
            ]);

            return redirect()->away($successRedirect);
        } catch (\Exception $err) {
            Log::error('[bkash-callback] error: ' . $err->getMessage());
            $recordFailure('failed', $err->getMessage());
            return redirect()->away($failRedirect);
        }
    }

    public function handleSslcommerzCallback(Request $request): \Illuminate\Http\RedirectResponse
    {
        $body = $request->all();
        $statusQuery = $request->query('status');
        $originQuery = $request->query('origin', 'http://localhost:5002');

        $status = strtoupper($body['status'] ?? $statusQuery ?? '');
        $tranId = $body['tran_id'] ?? null;

        $failRedirect = $originQuery . '/checkout?payment=failed';
        $cancelRedirect = $originQuery . '/checkout?payment=cancelled';

        if (!$tranId) {
            return redirect()->away($failRedirect . '&reason=missing_tran_id');
        }

        $order = DB::table('orders')->where('stripe_session_id', $tranId)->first();
        if (!$order) {
            return redirect()->away($failRedirect . '&reason=order_not_found');
        }

        $successRedirect = $originQuery . '/payment/status/' . urlencode($tranId);

        $recordFailure = function (string $statusStr, string $notes) use ($order, $tranId, $body) {
            try {
                DB::table('orders')->where('id', $order->id)->update([
                    'status' => $statusStr,
                    'payment_verification' => json_encode([
                        'provider' => 'sslcommerz',
                        'tran_id' => $tranId,
                        'val_id' => $body['val_id'] ?? null,
                        'verified_at' => now()->toIso8601String(),
                        'notes' => $notes,
                    ]),
                    'updated_at' => now(),
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to record sslcommerz failure: ' . $e->getMessage());
            }
        };

        if ($status === 'CANCEL' || $status === 'CANCELLED') {
            $recordFailure('cancelled', 'Customer cancelled SSLCommerz checkout.');
            return redirect()->away($cancelRedirect);
        }

        if ($status === 'FAIL' || $status === 'FAILED') {
            $recordFailure('failed', 'SSLCommerz reported transaction failure.');
            return redirect()->away($failRedirect);
        }

        if ($status === 'VALID' || $status === 'VALIDATED') {
            try {
                DB::table('orders')->where('id', $order->id)->update([
                    'status' => 'paid',
                    'payment_verification' => json_encode([
                        'provider' => 'sslcommerz',
                        'tran_id' => $tranId,
                        'val_id' => $body['val_id'] ?? null,
                        'amount' => $body['amount'] ?? null,
                        'card_type' => $body['card_type'] ?? null,
                        'verified_at' => now()->toIso8601String(),
                    ]),
                    'updated_at' => now(),
                ]);

                return redirect()->away($successRedirect);
            } catch (\Exception $err) {
                Log::error('[sslcommerz-callback] error: ' . $err->getMessage());
                $recordFailure('failed', $err->getMessage());
                return redirect()->away($failRedirect);
            }
        }

        return redirect()->away($failRedirect);
    }

    public function handleStripeWebhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $signature = $request->header('stripe-signature');

        try {
            $settings = $this->loadPaymentSettings('stripe');
            $webhookSecret = $settings['stripe_webhook_secret'] ?? null;
            if (!$webhookSecret) {
                return response()->json(['error' => 'Stripe webhook secret not configured'], 400);
            }

            if (!$signature) {
                return response()->json(['error' => 'Missing stripe signature'], 400);
            }

            $parts = [];
            foreach (explode(',', $signature) as $part) {
                $kv = explode('=', $part);
                if (count($kv) === 2) {
                    $parts[$kv[0]] = $kv[1];
                }
            }

            if (!isset($parts['t']) || !isset($parts['v1'])) {
                return response()->json(['error' => 'Invalid signature format'], 400);
            }

            $computed = hash_hmac('sha256', $parts['t'] . '.' . $payload, $webhookSecret);
            if (!hash_equals($computed, $parts['v1'])) {
                return response()->json(['error' => 'Invalid stripe signature'], 400);
            }

            $event = json_decode($payload, true);
            $obj = $event['data']['object'] ?? [];
            $sessionId = $obj['id'] ?? $obj['payment_intent'] ?? '';

            $status = null;
            switch ($event['type'] ?? '') {
                case 'checkout.session.completed':
                case 'checkout.session.async_payment_succeeded':
                case 'payment_intent.succeeded':
                    $status = 'paid';
                    break;
                case 'checkout.session.async_payment_failed':
                case 'payment_intent.payment_failed':
                    $status = 'failed';
                    break;
                case 'charge.refunded':
                    $status = 'refunded';
                    break;
                case 'checkout.session.expired':
                    $status = 'expired';
                    break;
                default:
                    return response()->json(['received' => true, 'ignored' => $event['type'] ?? '']);
            }

            $order = DB::table('orders')->where('stripe_session_id', $sessionId)->first();
            if (!$order) {
                return response()->json(['received' => true, 'status' => $status, 'error' => 'Order not found for session ' . $sessionId]);
            }

            DB::table('orders')->where('id', $order->id)->update([
                'status' => $status,
                'payment_verification' => json_encode([
                    'provider' => 'stripe',
                    'verified_at' => now()->toIso8601String(),
                    'signature_valid' => true,
                    'authoritative_status' => $event['type'] ?? null,
                ]),
                'updated_at' => now(),
            ]);

            return response()->json(['received' => true, 'type' => $event['type'], 'status' => $status, 'order_id' => $order->id]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function handleDodoWebhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $signature = $request->header('x-dodo-signature');

        try {
            $settings = $this->loadPaymentSettings('dodopayment');
            $webhookSecret = $settings['dodopayment_webhook_secret'] ?? null;
            if (!$webhookSecret) {
                return response()->json(['error' => 'DodoPayment webhook secret not configured'], 400);
            }

            if (!$signature) {
                return response()->json(['error' => 'Missing Dodo signature'], 400);
            }

            $computed = hash_hmac('sha256', $payload, $webhookSecret);
            $cleanHeader = str_replace('sha256=', '', $signature);

            if (!hash_equals($computed, $cleanHeader)) {
                return response()->json(['error' => 'Invalid Dodo signature'], 400);
            }

            $body = json_decode($payload, true);
            $paymentId = $body['data']['payment_id'] ?? $body['payment_id'] ?? $body['order_id'] ?? $body['data']['order_id'] ?? null;

            if (!$paymentId) {
                return response()->json(['error' => 'Missing payment_id or order_id'], 400);
            }

            $rawStatus = $body['data']['status'] ?? $body['status'] ?? '';
            $rawEvent = $body['type'] ?? $body['event'] ?? '';
            $checkString = strtolower($rawStatus . ' ' . $rawEvent);

            $status = null;
            if (Str::contains($checkString, ['succeeded', 'paid', 'completed'])) {
                $status = 'paid';
            } else if (Str::contains($checkString, ['failed'])) {
                $status = 'failed';
            } else if (Str::contains($checkString, ['refunded'])) {
                $status = 'refunded';
            } else if (Str::contains($checkString, ['cancelled'])) {
                $status = 'cancelled';
            } else {
                return response()->json(['received' => true, 'ignored' => $rawEvent ?: $rawStatus]);
            }

            $order = DB::table('orders')
                ->where('stripe_session_id', $paymentId)
                ->orWhere('id', $paymentId)
                ->first();

            if (!$order) {
                return response()->json(['received' => true, 'status' => $status, 'error' => 'Order not found for paymentId ' . $paymentId]);
            }

            DB::table('orders')->where('id', $order->id)->update([
                'status' => $status,
                'payment_verification' => json_encode([
                    'provider' => 'dodopayment',
                    'verified_at' => now()->toIso8601String(),
                    'signature_valid' => true,
                    'authoritative_status' => $rawStatus ?: $rawEvent,
                ]),
                'updated_at' => now(),
            ]);

            return response()->json(['received' => true, 'status' => $status, 'order_id' => $order->id]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function handleKeealWebhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $signature = $request->header('keeal-signature') ?: $request->header('stripe-signature') ?: $request->header('x-keeal-signature');

        try {
            $settings = $this->loadPaymentSettings('keeal');
            $webhookSecret = $settings['keeal_webhook_secret'] ?? null;

            if ($webhookSecret && $signature) {
                $parts = [];
                foreach (explode(',', $signature) as $part) {
                    $kv = explode('=', $part);
                    if (count($kv) === 2) {
                        $parts[$kv[0]] = $kv[1];
                    }
                }

                if (isset($parts['t']) && isset($parts['v1'])) {
                    $computed = hash_hmac('sha256', $parts['t'] . '.' . $payload, $webhookSecret);
                    if (!hash_equals($computed, $parts['v1'])) {
                        return response()->json(['error' => 'Invalid Keeal signature'], 400);
                    }
                } else {
                    $computed = hash_hmac('sha256', $payload, $webhookSecret);
                    $cleanHeader = str_replace('sha256=', '', $signature);
                    if (!hash_equals($computed, $signature) && !hash_equals($computed, $cleanHeader)) {
                        return response()->json(['error' => 'Invalid Keeal signature'], 400);
                    }
                }
            }

            $event = json_decode($payload, true);
            if (!$event) {
                return response()->json(['error' => 'Invalid JSON payload'], 400);
            }

            $type = $event['type'] ?? '';
            $obj = $event['data']['object'] ?? $event;
            $sessionId = $obj['id'] ?? $obj['payment_intent'] ?? $obj['session_id'] ?? '';
            $orderId = $obj['metadata']['order_id'] ?? $obj['order_id'] ?? null;

            $status = null;
            if (in_array($type, ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'payment_intent.succeeded'])) {
                $status = 'paid';
            } else if (in_array($type, ['checkout.session.async_payment_failed', 'payment_intent.payment_failed'])) {
                $status = 'failed';
            } else if ($type === 'charge.refunded') {
                $status = 'refunded';
            } else {
                $rawStatus = strtolower($event['status'] ?? $obj['status'] ?? '');
                if (in_array($rawStatus, ['paid', 'succeeded', 'success', 'completed'])) {
                    $status = 'paid';
                } else if (in_array($rawStatus, ['failed', 'fail'])) {
                    $status = 'failed';
                } else if (in_array($rawStatus, ['refunded', 'refund'])) {
                    $status = 'refunded';
                }
            }

            if (!$status) {
                return response()->json(['received' => true, 'ignored' => $type ?: ($event['status'] ?? 'unknown')]);
            }

            $query = DB::table('orders');
            if ($sessionId) {
                $query->where('stripe_session_id', $sessionId);
            } else if ($orderId) {
                $query->where('id', $orderId);
            } else {
                return response()->json(['error' => 'Missing transaction session identifier'], 400);
            }

            $order = $query->first();
            if (!$order && $orderId && $sessionId) {
                $order = DB::table('orders')->where('id', $orderId)->first();
            }

            if (!$order) {
                return response()->json(['received' => true, 'status' => $status, 'error' => 'Order not found']);
            }

            DB::table('orders')->where('id', $order->id)->update([
                'status' => $status,
                'payment_verification' => json_encode([
                    'provider' => 'keeal',
                    'verified_at' => now()->toIso8601String(),
                    'signature_valid' => !empty($signature),
                    'authoritative_status' => $type ?: ($event['status'] ?? null),
                ]),
                'updated_at' => now(),
            ]);

            return response()->json(['received' => true, 'status' => $status, 'order_id' => $order->id]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function findPublicInvoice(Request $request, string $ref): JsonResponse
    {
        $isUuid = (bool)preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $ref);
        
        $query = DB::table('orders');
        if ($isUuid) {
            $query->where(function ($q) use ($ref) {
                $q->where('invoice_number', $ref)
                  ->orWhere('id', $ref);
            });
        } else {
            $query->where('invoice_number', $ref);
        }

        $order = $query->first();

        if (!$order) {
            return response()->json(['message' => 'Invoice not found'], 404);
        }

        $order->items = json_decode($order->items, true);
        $order->service_brief = json_decode($order->service_brief, true);
        $order->billing_address = json_decode($order->billing_address, true);
        $order->payment_verification = json_decode($order->payment_verification, true);

        return response()->json($order);
    }

    public function lookupOrders(Request $request): JsonResponse
    {
        $email = $request->query('email');
        if (!$email) {
            return response()->json(['message' => 'Email is required'], 400);
        }

        $orders = DB::table('orders')
            ->where('customer_email', trim($email))
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($order) {
                $order->items = json_decode($order->items, true);
                $order->service_brief = json_decode($order->service_brief, true);
                $order->billing_address = json_decode($order->billing_address, true);
                $order->payment_verification = json_decode($order->payment_verification, true);
                return $order;
            });

        return response()->json($orders);
    }

    public function getStatusBySession(Request $request, string $sessionId): JsonResponse
    {
        $isUuid = (bool)preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $sessionId);

        $query = DB::table('orders');
        if ($isUuid) {
            $query->where(function ($q) use ($sessionId) {
                $q->where('stripe_session_id', $sessionId)
                  ->orWhere('id', $sessionId);
            });
        } else {
            $query->where('stripe_session_id', $sessionId);
        }

        $order = $query->first();
        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        if ($order->status === 'pending') {
            $isPaid = false;

            if (in_array($order->payment_gateway, ['stripe', 'stripe_onsite']) && $order->stripe_session_id) {
                $settings = $this->loadPaymentSettings('stripe');
                $secretKey = $settings['stripe_secret_key'] ?? null;
                if ($secretKey) {
                    try {
                        $isPaymentIntent = str_starts_with($order->stripe_session_id, 'pi_');
                        $url = $isPaymentIntent
                            ? 'https://api.stripe.com/v1/payment_intents/' . $order->stripe_session_id
                            : 'https://api.stripe.com/v1/checkout/sessions/' . $order->stripe_session_id;

                        $res = Http::withHeaders([
                            'Authorization' => 'Basic ' . base64_encode($secretKey . ':'),
                        ])->get($url);

                        if ($res->successful()) {
                            $data = $res->json();
                            if ($isPaymentIntent) {
                                if (($data['status'] ?? '') === 'succeeded') {
                                    $isPaid = true;
                                }
                            } else {
                                if (($data['payment_status'] ?? '') === 'paid' || ($data['status'] ?? '') === 'complete') {
                                    $isPaid = true;
                                }
                            }
                        }
                    } catch (\Exception $e) {
                        Log::error('[getStatusBySession] Stripe error: ' . $e->getMessage());
                    }
                }
            } else if ($order->payment_gateway === 'dodopayment' && $order->stripe_session_id) {
                $settings = $this->loadPaymentSettings('dodopayment');
                $apiKey = $settings['dodopayment_api_key'] ?? null;
                if ($apiKey) {
                    try {
                        $isSandbox = ($settings['dodopayment_sandbox'] ?? 'false') === 'true';
                        $baseUrl = $isSandbox ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';
                        $res = Http::withToken($apiKey)->get($baseUrl . '/payments/' . $order->stripe_session_id);

                        if ($res->successful()) {
                            $data = $res->json();
                            $statusStr = strtolower($data['status'] ?? '');
                            if (in_array($statusStr, ['succeeded', 'paid', 'completed'])) {
                                $isPaid = true;
                            }
                        }
                    } catch (\Exception $e) {
                        Log::error('[getStatusBySession] DodoPayment error: ' . $e->getMessage());
                    }
                }
            }

            if ($isPaid) {
                DB::table('orders')->where('id', $order->id)->update([
                    'status' => 'paid',
                    'updated_at' => now(),
                ]);
                $order->status = 'paid';
            }
        }

        // Auto-link authenticated user or matching profile email to order if user_id is null
        $user = $request->user('sanctum');
        if ($user && is_null($order->user_id)) {
            DB::table('orders')->where('id', $order->id)->update([
                'user_id' => $user->id,
                'updated_at' => now(),
            ]);
            $order->user_id = $user->id;
        } else if (is_null($order->user_id)) {
            $profile = DB::table('profiles')->where('email', $order->customer_email)->first();
            if ($profile) {
                DB::table('orders')->where('id', $order->id)->update([
                    'user_id' => $profile->id,
                    'updated_at' => now(),
                ]);
                $order->user_id = $profile->id;
            }
        }

        return response()->json([
            'id' => $order->id,
            'status' => $order->status,
        ]);
    }

    public function trackOrder(Request $request, string $term): JsonResponse
    {
        $t = trim($term);
        if (!$t) {
            return response()->json(['message' => 'Query term cannot be empty'], 400);
        }

        $isUuid = (bool)preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $t);

        $query = DB::table('orders');
        if ($isUuid) {
            $query->where(function ($q) use ($t) {
                $q->where('invoice_number', $t)
                  ->orWhere('stripe_session_id', $t)
                  ->orWhere('id', $t);
            });
        } else {
            $query->where(function ($q) use ($t) {
                $q->where('invoice_number', $t)
                  ->orWhere('stripe_session_id', $t);
            });
        }

        $order = $query->orderBy('created_at', 'desc')->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $order->items = json_decode($order->items, true);
        $order->service_brief = json_decode($order->service_brief, true);
        $order->billing_address = json_decode($order->billing_address, true);
        $order->payment_verification = json_decode($order->payment_verification, true);

        return response()->json($order);
    }

    public function getVerificationDetails(Request $request, string $id): JsonResponse
    {
        $order = DB::table('orders')->where('id', $id)->first();
        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $brief = json_decode($order->service_brief, true) ?: [];
        $verification = $brief['identity_verification'] ?? [
            'status' => 'pending',
            'type' => 'kyc',
            'session_id' => 'mock_session_' . Str::random(8),
            'verification_url' => url("/api/v1/orders/public/{$id}/verification/mock-complete"),
        ];

        return response()->json($verification);
    }

    public function startVerification(Request $request, string $id): JsonResponse
    {
        $order = DB::table('orders')->where('id', $id)->first();
        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $brief = json_decode($order->service_brief, true) ?: [];
        $verification = [
            'status' => 'pending',
            'type' => 'kyc',
            'session_id' => 'mock_session_' . Str::random(8),
            'verification_url' => url("/api/v1/orders/public/{$id}/verification/mock-complete"),
        ];

        $brief['identity_verification'] = $verification;
        DB::table('orders')->where('id', $id)->update([
            'service_brief' => json_encode($brief),
            'updated_at' => now(),
        ]);

        return response()->json($verification);
    }

    public function mockComplete(Request $request, string $id): JsonResponse
    {
        $decision = $request->input('decision', 'verified');

        $order = DB::table('orders')->where('id', $id)->first();
        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $brief = json_decode($order->service_brief, true) ?: [];
        $verification = $brief['identity_verification'] ?? [];
        $verification['status'] = $decision;
        $verification['completed_at'] = now()->toIso8601String();

        $brief['identity_verification'] = $verification;
        DB::table('orders')->where('id', $id)->update([
            'service_brief' => json_encode($brief),
            'updated_at' => now(),
        ]);

        return response()->json(['success' => true, 'status' => $decision]);
    }

    public function myOrders(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Auto claim/link any orders matching the user's email that don't have user_id set yet
        DB::table('orders')
            ->where('customer_email', $user->email)
            ->whereNull('user_id')
            ->update([
                'user_id' => $user->id,
                'updated_at' => now(),
            ]);

        $orders = DB::table('orders')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($order) {
                $order->items = json_decode($order->items, true);
                $order->service_brief = json_decode($order->service_brief, true);
                $order->billing_address = json_decode($order->billing_address, true);
                $order->payment_verification = json_decode($order->payment_verification, true);
                return $order;
            });

        return response()->json($orders);
    }

    public function claimOrders(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $invoice = trim($request->input('invoice', ''));
        $email = trim($request->input('email', ''));
        $phone = trim($request->input('phone', ''));

        if (!$invoice) {
            return response()->json(['message' => 'Invoice or order number is required'], 400);
        }

        // Find the order by invoice_number or ID (case-insensitive for invoice_number)
        $order = DB::table('orders')
            ->where('invoice_number', $invoice)
            ->orWhere('id', $invoice)
            ->first();

        if (!$order) {
            return response()->json(['matches' => 0, 'matched_fields' => []]);
        }

        $matchedFields = [];
        $matchedFields[] = 'invoice'; // The invoice number matched since we found the order

        if ($email && strtolower($order->customer_email) === strtolower($email)) {
            $matchedFields[] = 'email';
        }

        if ($phone) {
            $billingAddress = json_decode($order->billing_address, true) ?: [];
            $orderPhone = $billingAddress['phone'] ?? '';
            if ($orderPhone && $this->comparePhone($orderPhone, $phone)) {
                $matchedFields[] = 'phone';
            }
        }

        // We need at least 2 matching fields (including invoice) to claim the order
        if (count($matchedFields) < 2) {
            return response()->json(['matches' => 0, 'matched_fields' => []]);
        }

        // Claim the order by linking it to the current user
        DB::table('orders')->where('id', $order->id)->update([
            'user_id' => $user->id,
            'updated_at' => now(),
        ]);

        return response()->json([
            'invoice' => $order->invoice_number ?: $order->id,
            'matches' => count($matchedFields),
            'matched_fields' => $matchedFields,
        ]);
    }

    private function comparePhone(string $phone1, string $phone2): bool
    {
        $digits1 = preg_replace('/\D/', '', $phone1);
        $digits2 = preg_replace('/\D/', '', $phone2);
        if (strlen($digits1) < 8 || strlen($digits2) < 8) {
            return false;
        }
        return substr($digits1, -8) === substr($digits2, -8);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $limit = $request->query('limit', 10000);
        $orders = DB::table('orders')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($order) {
                $order->items = json_decode($order->items, true);
                $order->service_brief = json_decode($order->service_brief, true);
                $order->billing_address = json_decode($order->billing_address, true);
                $order->payment_verification = json_decode($order->payment_verification, true);
                return $order;
            });

        return response()->json(['data' => $orders]);
    }

    public function adminStore(Request $request): JsonResponse
    {
        $id = (string)Str::uuid();
        $data = $request->all();

        // Validate required fields
        if (empty($data['customer_email']) || empty($data['items']) || !isset($data['total'])) {
            return response()->json(['message' => 'Missing required fields: customer_email, items, total'], 400);
        }

        // Generate invoice number
        $lastOrder = DB::table('orders')
            ->where('invoice_number', 'like', 'INV-%')
            ->orderBy('invoice_number', 'desc')
            ->first();
        
        $nextNum = 1001;
        if ($lastOrder && preg_match('/INV-(\d+)/', $lastOrder->invoice_number, $matches)) {
            $nextNum = ((int)$matches[1]) + 1;
        } else {
            $count = DB::table('orders')->count();
            $nextNum = 1001 + $count;
        }
        $invoiceNumber = 'INV-' . $nextNum;

        // Insert into database
        DB::table('orders')->insert([
            'id' => $id,
            'customer_name' => $data['customer_name'] ?? null,
            'customer_email' => $data['customer_email'],
            'items' => is_array($data['items']) ? json_encode($data['items']) : $data['items'],
            'subtotal' => $data['subtotal'] ?? $data['total'],
            'total' => $data['total'],
            'status' => $data['status'] ?? 'pending',
            'payment_gateway' => $data['payment_gateway'] ?? 'manual',
            'discount_amount' => $data['discount_amount'] ?? 0.00,
            'notes' => $data['notes'] ?? null,
            'billing_address' => is_array($data['billing_address']) ? json_encode($data['billing_address']) : json_encode([]),
            'service_brief' => is_array($data['service_brief']) ? json_encode($data['service_brief']) : json_encode([]),
            'referral_code' => $data['referral_code'] ?? null,
            'currency' => $data['currency'] ?? 'USD',
            'user_id' => $data['user_id'] ?? null,
            'invoice_number' => $invoiceNumber,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $newOrder = DB::table('orders')->where('id', $id)->first();
        if ($newOrder) {
            $newOrder->items = json_decode($newOrder->items, true);
            $newOrder->service_brief = json_decode($newOrder->service_brief, true);
            $newOrder->billing_address = json_decode($newOrder->billing_address, true);
            $newOrder->payment_verification = json_decode($newOrder->payment_verification, true);
        }

        return response()->json($newOrder, 201);
    }

    public function adminShow(string $id): JsonResponse
    {
        $order = DB::table('orders')->where('id', $id)->first();
        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }
        $order->items = json_decode($order->items, true);
        $order->service_brief = json_decode($order->service_brief, true);
        $order->billing_address = json_decode($order->billing_address, true);
        $order->payment_verification = json_decode($order->payment_verification, true);

        return response()->json($order);
    }

    public function adminUpdate(Request $request, string $id): JsonResponse
    {
        $order = DB::table('orders')->where('id', $id)->first();
        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $data = $request->all();
        $updateData = [];

        if ($request->has('status')) {
            $updateData['status'] = $data['status'];
        }
        if ($request->has('refunded_amount')) {
            $updateData['refunded_amount'] = $data['refunded_amount'];
        }
        if ($request->has('refunded_tax_amount')) {
            $updateData['refunded_tax_amount'] = $data['refunded_tax_amount'];
        }
        if ($request->has('refunded_at')) {
            $updateData['refunded_at'] = $data['refunded_at'];
        }
        if ($request->has('refund_reason')) {
            $updateData['refund_reason'] = $data['refund_reason'];
        }
        if ($request->has('service_brief')) {
            $updateData['service_brief'] = is_array($data['service_brief']) ? json_encode($data['service_brief']) : $data['service_brief'];
        }

        if (!empty($updateData)) {
            $updateData['updated_at'] = now();
            DB::table('orders')->where('id', $id)->update($updateData);
        }

        // Check if status changed and trigger email
        if ($request->has('status') && $order->status !== $data['status']) {
            $this->sendOrderStatusEmail($order->customer_email, $order->customer_name, $id, $data['status']);
        }

        $updatedOrder = DB::table('orders')->where('id', $id)->first();
        $updatedOrder->items = json_decode($updatedOrder->items, true);
        $updatedOrder->service_brief = json_decode($updatedOrder->service_brief, true);
        $updatedOrder->billing_address = json_decode($updatedOrder->billing_address, true);
        $updatedOrder->payment_verification = json_decode($updatedOrder->payment_verification, true);

        return response()->json($updatedOrder);
    }

    public function adminDestroy(string $id): JsonResponse
    {
        $exists = DB::table('orders')->where('id', $id)->exists();
        if (!$exists) {
            return response()->json(['ok' => false, 'alreadyDeleted' => true]);
        }
        DB::table('orders')->where('id', $id)->delete();
        return response()->json(['ok' => true]);
    }

    public function requestVerification(Request $request): JsonResponse
    {
        $request->validate([
            'order_id' => 'required|string',
            'type' => 'required|string|in:kyc,kyb',
        ]);

        $id = $request->order_id;
        $type = $request->type;

        $order = DB::table('orders')->where('id', $id)->first();
        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $brief = json_decode($order->service_brief, true) ?: [];
        $verification = [
            'status' => 'pending',
            'type' => $type,
            'session_id' => 'mock_session_' . Str::random(8),
            'verification_url' => url("/api/v1/orders/public/{$id}/verification/mock-complete"),
        ];

        $brief['identity_verification'] = $verification;
        DB::table('orders')->where('id', $id)->update([
            'service_brief' => json_encode($brief),
            'updated_at' => now(),
        ]);

        return response()->json($verification);
    }

    private function sendOrderStatusEmail(string $email, ?string $name, string $orderId, string $status): void
    {
        $statusLabel = ucfirst($status);
        $link = env('FRONTEND_URL', 'https://dynime.com') . "/payment/status/" . urlencode($orderId);

        try {
            \App\Services\MailConfigurator::configure('orders');
            \Illuminate\Support\Facades\Mail::html("
                <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;'>
                    <h2 style='color: #1e1b4b;'>Order Status Updated</h2>
                    <p>Hi " . ($name ?: 'Valued Customer') . ",</p>
                    <p>Your order status has been updated to: <strong>{$statusLabel}</strong>.</p>
                    <p>You can track the live progress of your order using the button below:</p>
                    <div style='margin: 30px 0; text-align: center;'>
                        <a href='{$link}' style='background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Track Your Order</a>
                    </div>
                    <p style='color: #64748b; font-size: 14px;'>If you have any questions, feel free to reply to this email.</p>
                </div>
            ", function ($message) use ($email, $statusLabel) {
                $message->to($email)
                    ->subject("Order Status Update: {$statusLabel} - Dynime");
            });
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("Failed to send order status update email: " . $e->getMessage());
        }
    }
}
