<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->boolean('is_recurring')->default(false)->change();
            $table->decimal('discount_amount', 12, 2)->default(0.00)->change();
            $table->decimal('refunded_amount', 12, 2)->default(0.00)->change();
            $table->decimal('refunded_tax_amount', 12, 2)->default(0.00)->change();
            $table->decimal('tax_amount', 12, 2)->default(0.00)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Restore previous state (not nullable, no default)
            $table->boolean('is_recurring')->default(null)->change();
            $table->decimal('discount_amount', 12, 2)->default(null)->change();
            $table->decimal('refunded_amount', 12, 2)->default(null)->change();
            $table->decimal('refunded_tax_amount', 12, 2)->default(null)->change();
            $table->decimal('tax_amount', 12, 2)->default(null)->change();
        });
    }
};
