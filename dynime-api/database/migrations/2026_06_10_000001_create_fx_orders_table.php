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
        if (Schema::hasTable('fx_orders')) {
            return;
        }

        Schema::create('fx_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('order_no')->nullable()->unique();
            $table->timestamp('order_date')->useCurrent();
            $table->string('base_currency');
            $table->decimal('base_amount', 20, 8);
            $table->string('quote_currency');
            $table->decimal('quote_amount', 20, 8);
            $table->decimal('cost_rate_usd', 20, 8)->default(0);
            $table->decimal('sell_rate_usd', 20, 8)->default(0);
            $table->decimal('cost_usd', 20, 8)->default(0);
            $table->decimal('revenue_usd', 20, 8)->default(0);
            $table->decimal('fee_usd', 20, 8)->default(0);
            $table->decimal('profit_usd', 20, 8)->default(0);
            $table->string('status')->default('completed');
            $table->string('counterparty_name')->nullable();
            $table->string('counterparty_contact')->nullable();
            $table->string('payment_method_in')->nullable();
            $table->string('payment_method_out')->nullable();
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->index(['base_currency', 'quote_currency'], 'idx_fx_orders_currencies');
            $table->index(['status', 'order_date'], 'idx_fx_orders_status_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fx_orders');
    }
};
