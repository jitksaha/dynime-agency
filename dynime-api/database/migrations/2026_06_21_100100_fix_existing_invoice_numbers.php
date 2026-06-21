<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Fetch all orders that need their invoice number fixed:
        // We will sort them by created_at to preserve order sequence.
        $orders = DB::table('orders')
            ->orderBy('created_at', 'asc')
            ->get();

        // 2. Identify the highest numeric value currently in the database to prevent collisions.
        $maxNum = 1000;
        foreach ($orders as $order) {
            if ($order->invoice_number && preg_match('/INV-(\d+)/', $order->invoice_number, $matches)) {
                $num = (int)$matches[1];
                if ($num > $maxNum) {
                    $maxNum = $num;
                }
            }
        }

        $nextNum = $maxNum + 1;

        foreach ($orders as $order) {
            $inv = $order->invoice_number;
            
            // If already matches INV-XXXX format (where XXXX is a number), leave it.
            if ($inv && preg_match('/^INV-\d+$/', $inv)) {
                continue;
            }

            $newInv = null;

            // If it is in formats like DYN20261044 or INV202600017
            if ($inv && preg_match('/^(?:DYN|INV)?(\d+)/i', $inv, $matches)) {
                $extractedDigits = $matches[1];
                $newInv = 'INV-' . $extractedDigits;
            }

            // If it is empty, null, "-", or does not match any digits
            if (!$newInv) {
                $newInv = 'INV-' . $nextNum;
                $nextNum++;
            }

            // Check if the generated newInv already exists in another record to avoid duplicates
            $exists = DB::table('orders')
                ->where('invoice_number', $newInv)
                ->where('id', '!=', $order->id)
                ->exists();

            if ($exists) {
                $newInv = 'INV-' . $nextNum;
                $nextNum++;
            }

            DB::table('orders')
                ->where('id', $order->id)
                ->update(['invoice_number' => $newInv]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reverse required
    }
};
