<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class KeealWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Update site settings for Keeal webhook secrets
        DB::table('site_settings')->where('key', 'keeal_webhook_secret')->update([
            'value' => json_encode('whsec_testsecret'),
            'updated_at' => now()
        ]);
        DB::table('site_settings')->where('key', 'keeal_test_webhook_secret')->update([
            'value' => json_encode('whsec_testsecret'),
            'updated_at' => now()
        ]);
    }

    public function test_webhook_updates_order_to_paid_with_valid_signature(): void
    {
        $orderId = 'ord_test_' . uniqid();

        // 1. Create a dummy order
        DB::table('orders')->insert([
            'id' => $orderId,
            'status' => 'pending',
            'total' => 150.00,
            'stripe_session_id' => 'cs_test_12345',
            'customer_email' => 'john.doe@example.com',
            'customer_name' => 'John Doe',
            'items' => json_encode([]),
            'currency' => 'usd',
            'created_at' => now(),
            'updated_at' => now()
        ]);

        // 2. Prepare payload
        $payload = json_encode([
            'id' => 'evt_test_123',
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id' => 'cs_test_12345',
                    'status' => 'complete',
                    'amount_total' => 15000,
                    'currency' => 'usd',
                    'metadata' => [
                        'order_id' => $orderId
                    ]
                ]
            ]
        ]);

        // 3. Generate Stripe/Keeal signature header (t=timestamp,v1=signature)
        $timestamp = time();
        $webhookSecret = 'whsec_testsecret';
        $signaturePayload = $timestamp . '.' . $payload;
        $signature = hash_hmac('sha256', $signaturePayload, $webhookSecret);
        $signatureHeader = "t={$timestamp},v1={$signature}";

        // 4. Send POST request
        $response = $this->withHeaders([
            'keeal-signature' => $signatureHeader,
            'Content-Type' => 'application/json'
        ])->postJson('/v1/orders/public/keeal-webhook', json_decode($payload, true));

        // 5. Verify response and database update
        $response->assertStatus(200);
        $response->assertJson([
            'received' => true,
            'status' => 'paid',
            'order_id' => $orderId
        ]);

        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'status' => 'paid'
        ]);
    }

    public function test_webhook_rejects_invalid_signature(): void
    {
        $payload = json_encode([
            'id' => 'evt_test_123',
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id' => 'cs_test_12345'
                ]
            ]
        ]);

        $response = $this->withHeaders([
            'keeal-signature' => 't=' . time() . ',v1=invalidsig',
            'Content-Type' => 'application/json'
        ])->postJson('/v1/orders/public/keeal-webhook', json_decode($payload, true));

        $response->assertStatus(400);
        $response->assertJsonStructure(['error']);
    }
}
