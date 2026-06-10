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
        if (!Schema::hasTable('orders')) {
            Schema::create('orders', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('customer_email', 255);
                $table->string('customer_name', 255)->nullable();
                $table->json('items');
                $table->decimal('total', 12, 2);
                $table->string('status', 255);
                $table->string('stripe_session_id', 255)->nullable()->index();
                $table->json('payment_verification')->nullable();
                $table->string('coupon_code', 255)->nullable();
                $table->decimal('discount_amount', 12, 2)->default(0.00);
                $table->string('user_id', 255)->nullable();
                $table->string('invoice_number', 255)->nullable();
                $table->json('service_brief')->nullable();
                $table->json('billing_address')->nullable();
                $table->decimal('subtotal', 12, 2)->nullable();
                $table->string('currency', 255)->nullable();
                $table->text('notes')->nullable();
                $table->tinyInteger('is_recurring')->default(0);
                $table->string('billing_cycle', 255)->nullable();
                $table->string('service_category', 255)->nullable();
                $table->string('payment_gateway', 255)->nullable();
                $table->decimal('tax_amount', 12, 2)->default(0.00);
                $table->decimal('tax_percent', 12, 2)->nullable();
                $table->string('tax_mode', 255)->nullable();
                $table->string('tax_label', 255)->nullable();
                $table->decimal('refunded_amount', 12, 2)->default(0.00);
                $table->decimal('refunded_tax_amount', 12, 2)->default(0.00);
                $table->dateTime('refunded_at')->nullable();
                $table->string('refund_reason', 255)->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
