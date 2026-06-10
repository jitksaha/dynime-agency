<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use PDO;
use Exception;

class MigrateSupabaseOrders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'orders:migrate-supabase';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate order data from Supabase PostgreSQL to local MySQL';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Starting Supabase -> MySQL Order Migration...");

        $host = 'aws-1-ap-southeast-2.pooler.supabase.com';
        $port = 5432;
        $db = 'postgres';
        $user = 'postgres.isweduliawwjqwhyvwhp';
        $pass = 'Pixel#@!194JkS';

        try {
            $this->info("Connecting to Supabase PostgreSQL...");
            $dsn = "pgsql:host=$host;port=$port;dbname=$db;sslmode=require";
            $supabasePdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => 30
            ]);
            $this->info("Connected successfully to Supabase.");
        } catch (Exception $e) {
            $this->error("Connection to Supabase failed: " . $e->getMessage());
            return Command::FAILURE;
        }

        try {
            $this->info("Fetching orders from Supabase...");
            // Query all orders from the public.orders table
            $stmt = $supabasePdo->query("SELECT * FROM public.orders ORDER BY created_at ASC");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $totalCount = count($rows);
            $this->info("Found {$totalCount} orders on Supabase.");
        } catch (Exception $e) {
            $this->error("Failed to fetch orders from Supabase: " . $e->getMessage());
            return Command::FAILURE;
        }

        $imported = 0;
        $skipped = 0;
        $failed = 0;

        $this->output->progressStart($totalCount);

        foreach ($rows as $row) {
            try {
                // Check if the order already exists locally
                $exists = DB::table('orders')->where('id', $row['id'])->exists();
                if ($exists) {
                    $skipped++;
                    $this->output->progressAdvance();
                    continue;
                }

                // Safely format boolean fields
                $isRecurring = ($row['is_recurring'] === 't' || $row['is_recurring'] === true || $row['is_recurring'] === 1 || $row['is_recurring'] === '1');

                // Safely format timestamps
                $createdAt = $this->formatTimestamp($row['created_at']);
                $updatedAt = $this->formatTimestamp($row['updated_at']);
                $refundedAt = $this->formatTimestamp($row['refunded_at']);

                // Safely format JSON columns (ensure they fallback to empty json if required or null if nullable)
                $items = $row['items'] ?? '[]';
                $paymentVerification = $row['payment_verification'] ?? null;
                $serviceBrief = $row['service_brief'] ?? null;
                $billingAddress = $row['billing_address'] ?? null;

                // Insert the record
                DB::table('orders')->insert([
                    'id' => $row['id'],
                    'customer_email' => $row['customer_email'],
                    'customer_name' => $row['customer_name'] ?? null,
                    'items' => $items,
                    'total' => $row['total'] ?? 0.00,
                    'status' => $row['status'] ?? 'pending',
                    'stripe_session_id' => $row['stripe_session_id'] ?? null,
                    'created_at' => $createdAt ?: now(),
                    'updated_at' => $updatedAt ?: now(),
                    'payment_verification' => $paymentVerification,
                    'coupon_code' => $row['coupon_code'] ?? null,
                    'discount_amount' => $row['discount_amount'] ?? 0.00,
                    'user_id' => $row['user_id'] ?? null,
                    'invoice_number' => $row['invoice_number'] ?? null,
                    'service_brief' => $serviceBrief,
                    'billing_address' => $billingAddress,
                    'subtotal' => $row['subtotal'] ?? 0.00,
                    'currency' => $row['currency'] ?? 'USD',
                    'notes' => $row['notes'] ?? null,
                    'is_recurring' => $isRecurring ? 1 : 0,
                    'billing_cycle' => $row['billing_cycle'] ?? null,
                    'service_category' => $row['service_category'] ?? null,
                    'payment_gateway' => $row['payment_gateway'] ?? null,
                    'tax_amount' => $row['tax_amount'] ?? 0.00,
                    'tax_percent' => $row['tax_percent'] ?? null,
                    'tax_mode' => $row['tax_mode'] ?? null,
                    'tax_label' => $row['tax_label'] ?? null,
                    'refunded_amount' => $row['refunded_amount'] ?? 0.00,
                    'refunded_tax_amount' => $row['refunded_tax_amount'] ?? 0.00,
                    'refunded_at' => $refundedAt,
                    'refund_reason' => $row['refund_reason'] ?? null,
                    'referral_code' => null, // referral_code doesn't exist in Supabase orders
                ]);

                $imported++;
            } catch (Exception $e) {
                $failed++;
                $this->error("\nFailed to import order ID {$row['id']}: " . $e->getMessage());
            }

            $this->output->progressAdvance();
        }

        $this->output->progressFinish();

        $this->info("Migration completed:");
        $this->info("- Imported: {$imported}");
        $this->info("- Skipped (duplicates): {$skipped}");
        $this->info("- Failed: {$failed}");

        return Command::SUCCESS;
    }

    /**
     * Helper method to format pgsql timestamp to mysql datetime format.
     */
    private function formatTimestamp($val)
    {
        if (empty($val)) {
            return null;
        }
        return date('Y-m-d H:i:s', strtotime($val));
    }
}
