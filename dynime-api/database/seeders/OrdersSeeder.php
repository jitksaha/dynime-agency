<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OrdersSeeder extends Seeder
{
    public function run(): void
    {
        $filePath = database_path('seeders/supabase_complete_export.json');
        if (!file_exists($filePath)) {
            $this->command->error("supabase_complete_export.json not found in database/seeders!");
            return;
        }

        $json = json_decode(file_get_contents($filePath), true);
        if (!isset($json['orders']['rows'])) {
            $this->command->error("No orders found in export file!");
            return;
        }

        $rows = $json['orders']['rows'];
        $this->command->info("Found " . count($rows) . " orders to import. Truncating orders table...");
        
        DB::table('orders')->truncate();

        $chunk = [];
        $count = 0;
        foreach ($rows as $row) {
            // Encode array/object fields to JSON strings
            foreach (['items', 'payment_verification', 'service_brief', 'billing_address'] as $key) {
                if (isset($row[$key]) && is_array($row[$key])) {
                    $row[$key] = json_encode($row[$key]);
                }
            }

            // Ensure is_recurring is boolean or integer 0/1
            if (isset($row['is_recurring'])) {
                $row['is_recurring'] = $row['is_recurring'] ? 1 : 0;
            } else {
                $row['is_recurring'] = 0;
            }

            $cleanRow = [
                'id' => $row['id'] ?? null,
                'customer_email' => $row['customer_email'] ?? '',
                'customer_name' => $row['customer_name'] ?? null,
                'items' => $row['items'] ?? '[]',
                'total' => $row['total'] ?? 0.00,
                'status' => $row['status'] ?? 'pending',
                'stripe_session_id' => $row['stripe_session_id'] ?? null,
                'payment_verification' => $row['payment_verification'] ?? null,
                'coupon_code' => $row['coupon_code'] ?? null,
                'discount_amount' => $row['discount_amount'] ?? 0.00,
                'user_id' => $row['user_id'] ?? null,
                'referral_code' => $row['referral_code'] ?? null,
                'invoice_number' => $row['invoice_number'] ?? null,
                'service_brief' => $row['service_brief'] ?? null,
                'billing_address' => $row['billing_address'] ?? null,
                'subtotal' => $row['subtotal'] ?? null,
                'currency' => $row['currency'] ?? 'USD',
                'notes' => $row['notes'] ?? null,
                'is_recurring' => $row['is_recurring'],
                'billing_cycle' => $row['billing_cycle'] ?? null,
                'service_category' => $row['service_category'] ?? null,
                'payment_gateway' => $row['payment_gateway'] ?? null,
                'tax_amount' => $row['tax_amount'] ?? 0.00,
                'tax_percent' => $row['tax_percent'] ?? null,
                'tax_mode' => $row['tax_mode'] ?? null,
                'tax_label' => $row['tax_label'] ?? null,
                'refunded_amount' => $row['refunded_amount'] ?? 0.00,
                'refunded_tax_amount' => $row['refunded_tax_amount'] ?? 0.00,
                'refunded_at' => $row['refunded_at'] ?? null,
                'refund_reason' => $row['refund_reason'] ?? null,
                'created_at' => isset($row['created_at']) ? date('Y-m-d H:i:s', strtotime($row['created_at'])) : null,
                'updated_at' => isset($row['updated_at']) ? date('Y-m-d H:i:s', strtotime($row['updated_at'])) : null,
            ];

            $chunk[] = $cleanRow;
            $count++;

            if (count($chunk) >= 100) {
                DB::table('orders')->insert($chunk);
                $chunk = [];
            }
        }

        if (count($chunk) > 0) {
            DB::table('orders')->insert($chunk);
        }

        $this->command->info("Successfully imported {$count} orders into local database!");
    }
}
